import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {QuickstartMemory,equipmentDynastyId} from '../src/main/services/quickstartMemory.js';
import {openCfb27Save} from '../src/main/services/save.js';
import {ReportService} from '../src/main/services/reports.js';
import {runFreshmanEquipment} from '../src/main/tools/equipment/runner.js';
const fixture=new URL('../../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN',import.meta.url),schemaPath=new URL('../resources/engine-data/C27_486_6.gz',import.meta.url).pathname;
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
test('Randomizer tracking: Preview read-only, Apply remembers, protected rerun skips, clear/re-enable and renamed copies', {timeout:180000}, async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-randomizer-memory-')),savePath=path.join(dir,'DYNASTY-TEST'),other=path.join(dir,'DYNASTY-OTHER');
 fs.copyFileSync(fixture,savePath);fs.copyFileSync(fixture,other);
 const quickstartMemory=new QuickstartMemory(path.join(dir,'memory.json')),reports=new ReportService(path.join(dir,'reports'));
 const schema=new URL('../resources/engine-data/C27_486_6.gz',import.meta.url);const {fileURLToPath}=await import('node:url');
 const context={savePath,schemaPath:fileURLToPath(schema),quickstartMemory,reports};
 const dynastyId=await equipmentDynastyId((await openCfb27Save(savePath,context.schemaPath)).franchise);
 const options={includedTeams:['LSU'],positions:['QB'],top:2,protectOriginalEaPlayers:false,randomizeDonors:true,seed:77};
 try{
  const before=hash(savePath),preview=await runFreshmanEquipment({...context,mode:'preview',options});
  assert.ok(preview.details.totalPreviewRows>0);assert.equal(hash(savePath),before);assert.equal(quickstartMemory.snapshot(dynastyId).keys.size,0);
  await assert.rejects(runFreshmanEquipment({...context,savePath:other,mode:'apply',options:{planId:preview.planId}}),/new Randomizer preview/);
  assert.equal(quickstartMemory.snapshot(dynastyId).keys.size,0);
  const applied=await runFreshmanEquipment({...context,mode:'apply',options:{planId:preview.planId}});assert.equal(applied.details.trackingSaved,true);assert.equal(quickstartMemory.snapshot(dynastyId).keys.size,preview.details.totalPreviewRows);
  const protectedRun=await runFreshmanEquipment({...context,savePath:other,mode:'preview',options});assert.equal(protectedRun.details.totalPreviewRows,0);
  const reroll=await runFreshmanEquipment({...context,mode:'preview',options:{...options,protectPreviouslyRandomized:false}});assert.equal(reroll.details.totalPreviewRows,preview.details.totalPreviewRows);
  quickstartMemory.clear(dynastyId);const fresh=await runFreshmanEquipment({...context,mode:'preview',options});assert.equal(fresh.details.totalPreviewRows,preview.details.totalPreviewRows);
 }finally{if(path.dirname(dir)===os.tmpdir()&&path.basename(dir).startsWith('cfb-randomizer-memory-'))fs.rmSync(dir,{recursive:true,force:true});}
});

test('native LeagueID matches preseason and Week 0 saves regardless of filenames',async()=>{
  const {fileURLToPath}=await import('node:url');
  const schema=fileURLToPath(new URL('../resources/engine-data/C27_486_6.gz',import.meta.url));
  const first=await openCfb27Save(fileURLToPath(fixture),schema);
  const later=await openCfb27Save(fileURLToPath(new URL('../../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEWEEK0',import.meta.url)),schema);
  assert.equal(await equipmentDynastyId(first.franchise),await equipmentDynastyId(later.franchise));
});
