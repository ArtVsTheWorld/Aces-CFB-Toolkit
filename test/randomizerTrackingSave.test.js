import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {QuickstartMemory} from '../src/main/services/quickstartMemory.js';
import {ReportService} from '../src/main/services/reports.js';
import {runFreshmanEquipment} from '../src/main/tools/equipment/runner.js';
const fixture=new URL('../../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN',import.meta.url),schemaPath=new URL('../resources/engine-data/C27_486_6.gz',import.meta.url).pathname;
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
test('Randomizer tracking: Preview read-only, Apply remembers, protected rerun skips, clear/re-enable and separate files', {timeout:180000}, async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-randomizer-memory-')),savePath=path.join(dir,'DYNASTY-TEST'),other=path.join(dir,'DYNASTY-OTHER');
 fs.copyFileSync(fixture,savePath);fs.copyFileSync(fixture,other);
 const quickstartMemory=new QuickstartMemory(path.join(dir,'memory.json')),reports=new ReportService(path.join(dir,'reports'));
 const schema=new URL('../resources/engine-data/C27_486_6.gz',import.meta.url);const {fileURLToPath}=await import('node:url');
 const context={savePath,schemaPath:fileURLToPath(schema),quickstartMemory,reports};
 const options={includedTeams:['LSU'],positions:['QB'],top:2,protectOriginalEaPlayers:false,randomizeDonors:true,seed:77};
 try{
  const before=hash(savePath),preview=await runFreshmanEquipment({...context,mode:'preview',options});
  assert.ok(preview.details.totalPreviewRows>0);assert.equal(hash(savePath),before);assert.equal(quickstartMemory.snapshot(savePath).keys.size,0);
  await assert.rejects(runFreshmanEquipment({...context,savePath:other,mode:'apply',options:{planId:preview.planId}}),/new Randomizer preview/);
  assert.equal(quickstartMemory.snapshot(savePath).keys.size,0);
  const applied=await runFreshmanEquipment({...context,mode:'apply',options:{planId:preview.planId}});assert.equal(applied.details.trackingSaved,true);assert.equal(quickstartMemory.snapshot(savePath).keys.size,preview.details.totalPreviewRows);assert.equal(quickstartMemory.snapshot(other).keys.size,0);
  const protectedRun=await runFreshmanEquipment({...context,mode:'preview',options});assert.equal(protectedRun.details.totalPreviewRows,0);
  const reroll=await runFreshmanEquipment({...context,mode:'preview',options:{...options,protectPreviouslyRandomized:false}});assert.equal(reroll.details.totalPreviewRows,preview.details.totalPreviewRows);
  quickstartMemory.clear(savePath);const fresh=await runFreshmanEquipment({...context,mode:'preview',options});assert.equal(fresh.details.totalPreviewRows,preview.details.totalPreviewRows);
 }finally{if(path.dirname(dir)===os.tmpdir()&&path.basename(dir).startsWith('cfb-randomizer-memory-'))fs.rmSync(dir,{recursive:true,force:true});}
});
