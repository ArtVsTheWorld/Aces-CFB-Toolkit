import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ToolWorkerClient} from '../src/main/services/toolWorkerClient.js';
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('read-only selection matches existing Home data and invalidates cached metadata when bytes change', {timeout:90000},async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'save-reader-'));
  const reader=new ToolWorkerClient({}, {workerUrl:new URL('../src/main/services/saveReadWorker.js',import.meta.url)});
  const prior=new ToolWorkerClient({memoryFile:path.join(directory,'memory.json'),reportsDirectory:path.join(directory,'reports'),reviewsDirectory:path.join(directory,'reviews')});
  t.after(async()=>{await Promise.all([reader.close(),prior.close()]);fs.rmSync(directory,{recursive:true,force:true});});
  const sources=[path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),path.resolve(process.env.CFB_TEST_OTHER_DYNASTY||'../EXAMPLE SAVES VANILLA GAME/DYNASTY-SECOND-DYNASTY')],originals=sources.map(hash),savePath=path.join(directory,'DYNASTY-SAME-NAME'),schemaDirectory=path.resolve('resources/engine-data'),ids=[];
  for(const [index,source]of sources.entries()){
    fs.copyFileSync(source,savePath);
    const schema=await prior.request('inspect',{savePath,schemaDirectory}),expected=await prior.request('home',{savePath,schemaPath:schema.path});
    const progress=[],snapshot=await reader.request('snapshot',{savePath,schemaDirectory},p=>progress.push(p));
    assert.deepEqual(snapshot.schema,schema);assert.deepEqual(snapshot.context,expected);assert.ok(Number.isInteger(snapshot.dynastyId));ids.push(snapshot.dynastyId);
    assert.ok(progress.some(p=>p.percent===35)&&progress.some(p=>p.percent===92));
    snapshot.context.teams[0].name='not persisted';
    const cached=await reader.request('snapshot',{savePath,schemaDirectory});assert.deepEqual(cached.context,expected,'Cached metadata is detached from callers');
    assert.equal(await reader.request('identity',{savePath,schemaDirectory}),ids[index]);assert.equal(hash(savePath),originals[index]);
  }
  assert.notEqual(ids[0],ids[1],'Another dynasty at the same filename must invalidate cached identity');
  const invalid=path.join(directory,'broken-save');fs.writeFileSync(invalid,'unrecognized');assert.equal((await reader.request('snapshot',{savePath:invalid,schemaDirectory})).schema.supported,false);
  assert.deepEqual(sources.map(hash),originals);assert.equal(fs.existsSync(path.join(directory,'memory.json')),false);
});
