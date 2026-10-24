import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withToolProgress, progressRange, toolProgress, toolProgressCount} from '../src/main/services/toolProgress.js';
import {ToolWorkerClient} from '../src/main/services/toolWorkerClient.js';

test('progress reflects completed stages, stays monotonic and isolates concurrent async contexts', async () => {
  const first=[],second=[];
  await Promise.all([
    withToolProgress(update=>first.push(update),async()=>{
      toolProgress(5,'Reading');
      await progressRange(20,80,async()=>{toolProgressCount(1,4,'Players');await Promise.resolve();toolProgressCount(4,4,'Players');});
      toolProgress(10,'Earlier stage');toolProgress(99,'Verified');
    }),
    withToolProgress(update=>second.push(update),async()=>{await Promise.resolve();toolProgress(25,'Other save');})
  ]);
  assert.deepEqual(first.map(u=>u.percent),[5,35,80,99]);assert.deepEqual(second.map(u=>u.percent),[25]);
  assert.doesNotThrow(()=>toolProgressCount(3,10,'No active UI'));
});

test('worker failures reject a request and later requests still resolve without replaying work', async t => {
  const client=new ToolWorkerClient({memoryFile:'unused',reportsDirectory:'unused',reviewsDirectory:'unused'});
  t.after(()=>client.close());
  await assert.rejects(client.request('unknown'),/Unknown background tool operation/);
  await assert.rejects(client.request('search',{planId:'missing'}),/cached result is no longer available/);
  assert.equal(await client.request('pruneReviews',{ids:[]}),undefined);
  await client.close();
  assert.throws(()=>client.request('unknown'),/closing/);
});

test('preload scopes progress by operation and reports 100 only after a successful result', async()=>{
  const listeners=new Map(),requests=[],pending=[];let api,sequence=0;
  const ipcRenderer={on:(channel,callback)=>listeners.set(channel,callback),invoke:(channel,request)=>{requests.push({channel,request});return new Promise((resolve,reject)=>pending.push({resolve,reject}));}};
  vm.runInNewContext(fs.readFileSync(new URL('../src/main/preload.cjs',import.meta.url),'utf8'),{require:()=>({ipcRenderer,contextBridge:{exposeInMainWorld:(_,value)=>api=value}}),crypto:{randomUUID:()=>String(++sequence)},Set,TypeError});
  const updates=[],unsubscribe=api.onToolProgress(update=>updates.push(update));
  const first=api.prepareTool({toolId:'equipment-patcher'});
  assert.equal(requests[0].request.operationId,'1');
  listeners.get('tools:progress')(null,{operationId:'1',percent:42,message:'Players'});
  assert.equal(updates.at(-1).percent,42);
  pending[0].resolve({ready:true});await first;assert.equal(updates.at(-1).percent,100);
  const failed=api.runTool({toolId:'equipment-patcher',mode:'apply'});pending[1].reject(new Error('Storage full'));await assert.rejects(failed,/Storage full/);
  assert.equal(updates.at(-1).phase,'error');assert.equal(updates.filter(update=>update.operationId==='2'&&update.percent===100).length,0);
  unsubscribe();const count=updates.length;listeners.get('tools:progress')(null,{operationId:'1',percent:50});assert.equal(updates.length,count);
});
