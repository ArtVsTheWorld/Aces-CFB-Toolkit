// Private EXAMPLE SAVES regression. Never writes to the user's original save.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runRosterGenerator} from '../src/main/tools/rosterGenerator/runner.js';
import {saveFingerprint,takePlan} from '../src/main/tools/jersey/planStore.js';
import {loadEquipmentTables} from '../src/main/tools/equipment/shared.js';
import {mapperPlayers} from '../src/main/tools/equipmentMapper/runner.js';
import {snapshotProtectedPlayers,verifyProtectedPlayers} from '../src/main/tools/rosterGenerator/safety.js';
import {WRITE_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {sf} from '../src/main/tools/equipment/openSave.js';
import {applyUnlockedTattooPlan} from '../src/main/tools/equipment/core/tattoos.js';
import {removeNonePlaceholders} from '../src/main/tools/equipment/visualDraft.js';
import {prepareVisualWrite,tryPreparedVisualWrite} from '../src/main/tools/equipment/visualStorage.js';
import {writeCsv} from '../src/main/services/files.js';

const fixture="C:/Users/Art/Documents/EA SPORTS College Football 27/saves/DYNASTY-EASTPOINTFINTEST";
const schemaPath=path.resolve('resources/engine-data/C27_486_6.gz');

test('East Point tattooed roster previews, applies and reopens without changing protected or unselected players',{timeout:120000,skip:!fs.existsSync(fixture)},async t=>{
  const sourceHash=saveFingerprint(fixture),directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-roster-tattoo-')),savePath=path.join(directory,'DYNASTY-TATTOO-TEST');
  t.after(()=>{
    if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('cfb-roster-tattoo-'))throw new Error('Unsafe test cleanup.');
    fs.rmSync(directory,{recursive:true,force:true});
  });
  fs.copyFileSync(fixture,savePath,fs.constants.COPYFILE_EXCL);
  // User-provided fixtures evolve. Seed the reported extra appearance layer
  // deterministically on our owned copy instead of depending on the live save.
  const seeded=await loadEquipmentTables(savePath,schemaPath,true,false);
  const target=mapperPlayers(seeded,{includeInactive:true}).find(p=>p.team==='East Point');
  assert.ok(target,'Fixture contains East Point');
  const raw=JSON.parse(target.rawData);
  applyUnlockedTattooPlan(raw,{arms:{left:{asset:'CujoMatty_ArmTats_35',label:'Arm Tattoo 35'}}});
  removeNonePlaceholders(raw);
  assert.ok(tryPreparedVisualWrite(prepareVisualWrite(seeded.visuals.records[target.visualRow],JSON.stringify(raw))));
  await seeded.franchise.save();
  const baseline=saveFingerprint(savePath);
  const before=await loadEquipmentTables(savePath,schemaPath,true,false),playersBefore=mapperPlayers(before,{includeInactive:true});
  const tattooed=playersBefore.filter(p=>p.team==='East Point'&&p.rawData.includes('CujoMatty_ArmTats_'));
  assert.ok(tattooed.length>0,'Fixture must contain the reported Unlocked tattoo layers.');
  let reportNumber=0;
  const context={savePath,schemaPath,reports:{create:report=>writeCsv(path.join(directory,`report-${++reportNumber}.csv`),report.headings,report.rows)}};
  const preview=await runRosterGenerator({...context,mode:'preview',options:{teams:['East Point'],preset:'all-time',talentMix:'playmakers',rosterAge:'standard',rosterPotential:'high'}});
  assert.equal(saveFingerprint(savePath),baseline);assert.equal(preview.details.canApply,true);assert.deepEqual(preview.details.blocking,[]);
  const rows=takePlan(preview.planId).previewRows,selectedRows=new Set(rows.map(row=>row.row)),protectedPlayers=snapshotProtectedPlayers(before.players,selectedRows);
  assert.equal(rows.length,85);assert.ok(tattooed.every(p=>selectedRows.has(p.row)));
  for(const row of rows)assert.ok(!row.rawData.includes('CujoMatty_ArmTats_'));
  const applied=await runRosterGenerator({...context,mode:'apply',options:{planId:preview.planId,confirmRegeneration:true}});
  const reopened=await loadEquipmentTables(savePath,schemaPath,true,false);
  verifyProtectedPlayers(protectedPlayers,reopened.players);
  for(const row of rows){
    for(const field of WRITE_FIELDS)assert.equal(sf(reopened.players.records[row.row],field),row.fields[field],row.row+'/'+field);
    assert.deepEqual(JSON.parse(sf(reopened.visuals.records[row.visualRow],'RawData')),JSON.parse(row.rawData));
  }
  for(const p of playersBefore.filter(p=>!selectedRows.has(p.row)))assert.equal(sf(reopened.visuals.records[p.visualRow],'RawData'),p.rawData,'Unselected visual '+p.row);
  assert.equal(saveFingerprint(applied.backupPath),baseline);assert.equal(saveFingerprint(fixture),sourceHash);
  assert.equal(fs.statSync(savePath).size,fs.statSync(fixture).size);
});
