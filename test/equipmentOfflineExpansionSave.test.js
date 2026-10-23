import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ReportService} from '../src/main/services/reports.js';
import {parseCsv} from '../src/main/services/reportAudit.js';
import {prepareEquipmentTool,runFreshmanEquipment,runEquipmentPatcher} from '../src/main/tools/equipment/runner.js';
import {loadEquipmentTables} from '../src/main/tools/equipment/shared.js';
import {sf} from '../src/main/tools/equipment/openSave.js';
import {modPoolDefinitions} from '../src/main/tools/equipment/core/modPools.js';
import {EQUIPMENT_TRUCK_POOLS} from '../src/main/tools/equipment/catalog.js';

const fixture=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schemaPath=path.resolve('resources/engine-data/C27_486_6.gz');
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const disabled=origin=>Object.fromEntries(modPoolDefinitions()[origin].map(category=>[category.id,{chance:0,items:[]} ]));
const rawCombos=modPoolDefinitions().raw.find(category=>category.id==='facepaint').items.filter(item=>item.itemName.includes('RawEarringsCombo')).map(item=>item.itemName);
for(const mode of ['randomizer','tattoos'])test(`offline expansion ${mode}: Preview/Apply/reopen, backup and complete CSV audit`,{timeout:120000},async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-offline-pools-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const savePath=path.join(directory,'DYNASTY-OFFLINE-TEST'),reports=new ReportService(path.join(directory,'reports'));
  fs.copyFileSync(fixture,savePath);const original=hash(savePath);
  const prepared=await prepareEquipmentTool({savePath,schemaPath});
  assert.ok(prepared.modPoolCategories.eljax.some(category=>category.id==='chinCovers'&&category.items.length===4));
  const newTattoo='v_Tattoos_Japanese_05_ArmFloating_v01';
  const pool=Object.fromEntries(modPoolDefinitions().eljax.map(category=>[category.id,{chance:100,items:category.items.map(item=>item.itemName)}]));
  const options=mode==='randomizer'?{includedTeams:['LSU','Alabama','Georgia','Texas','Florida','USC'],positions:['QB','WR'],classes:[],top:1,skipNilPlayers:false,usingEquipmentTruckMod:true,usingRawAccessoriesMod:true,crossPositionPercent:0,multipleDonorPercent:40,modPools:{eljax:pool,raw:{...disabled('raw'),facepaint:{chance:100,items:rawCombos}}}}:{includedTeams:['LSU'],skipNilPlayers:false,unlockedTattooFix:true,unlockedTattooCap:100,unlockedTattooSelection:[newTattoo]};
  const run=mode==='randomizer'?runFreshmanEquipment:runEquipmentPatcher;
  const preview=await run({savePath,schemaPath,reports,mode:'preview',options});
  assert.equal(hash(savePath),original);assert.ok(preview.details.totalPreviewRows>0);
  const applied=await run({savePath,schemaPath,reports,mode:'apply',options:{planId:preview.planId}});
  assert.equal(applied.status,'completed');assert.equal(hash(applied.backupPath),original);assert.deepEqual(applied.details.changes,preview.details.changes);
  const reopened=await loadEquipmentTables(savePath,schemaPath),[headings,...data]=parseCsv(fs.readFileSync(applied.reportPath,'utf8'));
  const rows=data.map(row=>Object.fromEntries(headings.map((heading,index)=>[heading,row[index]])));
  assert.ok(rows.length>0);
  assert.ok(rows[0].ResolvedOptionsJSON);
  const ids=new Set(),waistIds=new Set(EQUIPMENT_TRUCK_POOLS.waistPlaycalls.map(item=>item.itemName));
  for(const row of rows){
    assert.equal(sf(reopened.visuals.records[Number(row.CharacterVisualsRow)],'RawData'),row.AfterRawData);
    assert.ok(row.ChangedSlotsAndMetadata);
    const parsed=JSON.parse(row.AfterRawData);
    for(const layer of parsed.loadouts)for(const element of layer.loadoutElements??[]){
      ids.add(element.itemAssetName);
      if(waistIds.has(element.itemAssetName)){assert.equal(element.slotType,'HeadBand');assert.equal(row.Position,'QB');}
      if(element.itemAssetName.startsWith('gearmouthpiece_brandlogochincover_'))assert.equal(element.slotType,'Reserved');
      if(element.itemAssetName===newTattoo){assert.equal(layer.loadoutCategory,'Base');assert.match(element.slotType,/^(Left|Right)ArmTattoo$/);}
    }
  }
  if(mode==='randomizer'){
    assert.ok([...ids].some(id=>id.startsWith('gearmouthpiece_brandlogochincover_')));
    assert.ok([...ids].some(id=>waistIds.has(id)));
    assert.ok(ids.has('handwarmer_standard_logo'));assert.ok(ids.has('thighpad_numbercross_v57'));
    assert.ok([...ids].some(id=>rawCombos.includes(id)),'selected RAW combinations actually persist');
  }else assert.ok(ids.has(newTattoo));
});
