import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {performance} from 'node:perf_hooks';import {randomUUID} from 'node:crypto';
import {ToolWorkerClient} from '../src/main/services/toolWorkerClient.js';import {saveFingerprint} from '../src/main/tools/jersey/planStore.js';

test('worker reuses current equipment settings across navigation, but refreshes after memory and Apply changes',{timeout:180000},async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'equipment-settings-save-')),source=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),original=saveFingerprint(source),savePath=path.join(directory,'DYNASTY-TEST'),schemaPath=path.resolve('resources/engine-data/C27_486_6.gz');fs.copyFileSync(source,savePath);
  const client=new ToolWorkerClient({memoryFile:path.join(directory,'memory.json'),reportsDirectory:path.join(directory,'reports'),reviewsDirectory:path.join(directory,'reviews')});t.after(async()=>{await client.close();fs.rmSync(directory,{recursive:true,force:true});});
  const timings={};
  for(const toolId of ['freshman-equipment','equipment-quickstart','equipment-patcher']){
    const payload={toolId,savePath,schemaPath},coldProgress=[],warmProgress=[];let start=performance.now();const cold=await client.request('prepare',payload,p=>coldProgress.push(p));const coldMs=performance.now()-start;start=performance.now();const warm=await client.request('prepare',payload,p=>warmProgress.push(p));timings[toolId]={coldMs,warmMs:performance.now()-start};assert.deepEqual(warm,cold);assert.ok(!coldProgress.some(p=>p.message.startsWith('Using current')));assert.ok(warmProgress.some(p=>p.message.startsWith('Using current')));assert.ok(!warmProgress.some(p=>p.message==='Reading save data…'));
  }
  const quick={toolId:'equipment-quickstart',savePath,schemaPath};await client.request('clearMemory',{savePath,schemaPath});let updates=[];await client.request('prepare',quick,p=>updates.push(p));assert.ok(!updates.some(p=>p.message.startsWith('Using current')));
  updates=[];await client.request('prepare',quick,p=>updates.push(p));assert.ok(updates.some(p=>p.message.startsWith('Using current')));
  const patch={toolId:'equipment-patcher',savePath,schemaPath},preview=(await client.request('run',{...patch,mode:'preview',options:{pantsFix:true,protectOriginalEaPlayers:false,includedTeams:['LSU'],seed:1776},audit:{runId:randomUUID()}})).result;assert.ok(preview.details.totalPreviewRows>0);
  const applied=(await client.request('run',{...patch,mode:'apply',options:{planId:preview.planId},audit:{runId:randomUUID()}})).result;assert.equal(applied.status,'completed');assert.equal(saveFingerprint(applied.backupPath),original);
  updates=[];await client.request('prepare',quick,p=>updates.push(p));assert.ok(!updates.some(p=>p.message.startsWith('Using current')),'Apply clears prepared settings');
  // An external replacement at the same path must never reuse the cached DTO.
  fs.writeFileSync(savePath,'not a dynasty save');await assert.rejects(client.request('prepare',quick));assert.equal(saveFingerprint(source),original);
  t.diagnostic(JSON.stringify(timings));
});
