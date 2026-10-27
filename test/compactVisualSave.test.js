import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadEquipmentTables,snapshotVisualRawData} from '../src/main/tools/equipment/shared.js';
import {snapshotVisualsForVerification,saveEquipmentCandidate} from '../src/main/tools/equipment/visualsSafety.js';
import {encodeVisualData} from '../src/main/tools/equipment/visualEncoding.js';
import {isVisualOverflowStorage} from '../src/main/tools/equipment/visualStorage.js';
import {parseRef,sf} from '../src/main/tools/equipment/openSave.js';

const source=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schema=path.resolve('resources/engine-data/C27_486_6.gz'),fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/equipmentCompactIson.json',import.meta.url))),hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
test('native compact appearance saves inline, reopens exactly and supports a subsequent normal edit',{timeout:120000},async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'compact-visual-save-')),savePath=path.join(directory,'DYNASTY-TEST');t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));fs.copyFileSync(source,savePath);const sourceHash=hash(source),size=fs.statSync(savePath).size;
  let loaded=await loadEquipmentTables(savePath,schema),record=loaded.visuals.records.find(record=>record&&!record.isEmpty&&!isVisualOverflowStorage(record)&&typeof sf(record,'RawData')==='string'),row=record.index;
  const before=snapshotVisualsForVerification(loaded.visuals,snapshotVisualRawData(loaded.visuals.records)),field=record.getFieldByKey('RawData').thirdTableField,raw=JSON.stringify(fixture.expected),legacy=encodeVisualData(field.strategy,raw,field.unformattedValue,field.maxLength,field.strategyContext);
  assert.ok(legacy.length>field.maxLength+2,'Reproduce the extra overflow allocation');record.RawData=raw;assert.equal(parseRef(record.Overflow),null,'Lossless representation now fits inline');
  await saveEquipmentCandidate(loaded,schema,before,[{table:'visuals',row,newValue:raw}]);loaded=await loadEquipmentTables(savePath,schema);record=loaded.visuals.records[row];
  assert.deepEqual(JSON.parse(record.RawData),fixture.expected);assert.equal(parseRef(record.Overflow),null);
  for(const [index,original]of before)if(index!==row&&typeof original==='string')assert.equal(sf(loaded.visuals.records[index],'RawData'),original,'Untouched appearance remains byte-for-byte identical');
  const next=JSON.parse(record.RawData),onField=next.loadouts.find(loadout=>loadout.loadoutType==='PlayerOnField'),slot=onField.loadoutElements.find(element=>element.slotType==='MouthWear');assert.ok(slot);slot.itemAssetName='GearMouthpiece_PacifierDualHanging_White';
  const nextBefore=snapshotVisualsForVerification(loaded.visuals,snapshotVisualRawData(loaded.visuals.records)),nextRaw=JSON.stringify(next);record.RawData=nextRaw;await saveEquipmentCandidate(loaded,schema,nextBefore,[{table:'visuals',row,newValue:nextRaw}]);loaded=await loadEquipmentTables(savePath,schema);
  assert.deepEqual(JSON.parse(loaded.visuals.records[row].RawData),next);assert.equal(fs.statSync(savePath).size,size);assert.equal(hash(source),sourceHash);
});
