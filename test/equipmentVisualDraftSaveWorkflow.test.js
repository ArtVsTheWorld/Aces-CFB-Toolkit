import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {loadEquipmentTables,snapshotVisualRawData} from '../src/main/tools/equipment/shared.js';
import {createVisualDraft,finalizeVisualDraft} from '../src/main/tools/equipment/visualDraft.js';
import {snapshotVisualsForVerification,saveEquipmentCandidate} from '../src/main/tools/equipment/visualsSafety.js';
import {isVisualOverflowStorage} from '../src/main/tools/equipment/visualStorage.js';
import {writeFixedSaveCandidate} from '../src/main/services/saveContainer.js';
import {sf,parseRef} from '../src/main/tools/equipment/openSave.js';
const source=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schema=path.resolve('resources/engine-data/C27_486_6.gz'),hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
test('a completely full native pool skips an oversized player, applies a fitting player and reopens the exact accepted plan',{timeout:120000},async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'equipment-native-skips-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const savePath=path.join(directory,'DYNASTY-FULL-POOL'),originalHash=hash(source);fs.copyFileSync(source,savePath);
  let loaded=await loadEquipmentTables(savePath,schema),table=loaded.visuals;
  const targets=table.records.filter(record=>record&&!record.isEmpty&&!isVisualOverflowStorage(record)&&!parseRef(sf(record,'Overflow'))&&typeof sf(record,'RawData')==='string').slice(0,2).map(record=>record.index);assert.equal(targets.length,2);
  for(const row of targets)table.records[row].RawData='{"loadouts":[]}';
  // Manufacture a valid full pool in a disposable fixture. Extra occupied roots
  // contain valid empty appearances, never orphaned raw continuation bytes.
  for(const record of table.records)if(record?.isEmpty){record.Overflow='0'.repeat(32);record.RawData='{"loadouts":[]}';}
  await writeFixedSaveCandidate(loaded.franchise,savePath);loaded=await loadEquipmentTables(savePath,schema);table=loaded.visuals;assert.equal(table.records.filter(record=>record.isEmpty).length,0);
  const baselineHash=hash(savePath),before=snapshotVisualsForVerification(table,snapshotVisualRawData(table.records)),draft=createVisualDraft(table),[skipped,accepted]=targets;
  draft.table.records[skipped].RawData=JSON.stringify({loadouts:[],mustNeverPartiallyAppear:randomBytes(3000).toString('hex')});
  draft.table.records[accepted].RawData='{"loadouts":[],"acceptedMarker":31}';
  const result=finalizeVisualDraft(draft);assert.deepEqual([...result.skippedRows],[skipped]);assert.equal(result.assignments.length,1);assert.equal(result.assignments[0].row,accepted);assert.equal(sf(table.records[skipped],'RawData'),before.get(skipped));assert.equal(sf(draft.table.records[skipped],'RawData'),before.get(skipped));assert.equal(hash(savePath),baselineHash);
  // Apply reloads the unmodified baseline and writes exactly what Preview kept.
  loaded=await loadEquipmentTables(savePath,schema);for(const change of result.assignments){assert.equal(sf(loaded.visuals.records[change.row],'RawData'),change.oldValue);loaded.visuals.records[change.row].RawData=change.newValue;}
  await saveEquipmentCandidate(loaded,schema,before,result.assignments,baselineHash);
  const reopened=await loadEquipmentTables(savePath,schema),expected=new Map(result.assignments.map(change=>[change.row,change.newValue]));for(const [row,raw]of before)if(typeof raw==='string')assert.deepEqual(JSON.parse(sf(reopened.visuals.records[row],'RawData')),JSON.parse(expected.get(row)??raw),'Full root '+row);
  assert.equal(sf(reopened.visuals.records[skipped],'RawData'),before.get(skipped));assert.equal(reopened.visuals.records.filter(record=>record.isEmpty).length,0);assert.equal(fs.statSync(savePath).size,fs.statSync(source).size);assert.equal(hash(source),originalHash);
});
