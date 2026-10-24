import test from 'node:test';
import assert from 'node:assert/strict';
import {applyGlobalEquipmentFixes,brandedVisorReplacement,GAMEDAY_CLEAR_VISORS,OAKLEY_CLEAR_VISOR} from '../src/main/tools/equipment/core/globalFixes.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';

test('Quickstart always includes both visor passes and No Drip, including older opt-out presets',()=>{
  for(const options of [{},{noDrip:false},{gameday:true,noDrip:false}]){
    const settings=quickstartSettings(options);
    assert.equal(settings.randomizer.noDripProfile,true);assert.equal(settings.patcher.visorFix,true);assert.equal(settings.patcher.oakleyVisorFix,true);
    assert.equal(settings.patcher.usingEquipmentTruckMod,options.gameday===true);
  }
});
test('GameDay branding uses only the verified clear designs, retains existing GDG choices and preserves tints',()=>{
  assert.equal(brandedVisorReplacement('GearVisor_visorClear',true,()=>0),GAMEDAY_CLEAR_VISORS[0]);
  assert.equal(brandedVisorReplacement(OAKLEY_CLEAR_VISOR,true,()=>.99),GAMEDAY_CLEAR_VISORS[1]);
  for(const asset of GAMEDAY_CLEAR_VISORS)assert.equal(brandedVisorReplacement(asset,true,()=>0),null);
  assert.equal(brandedVisorReplacement('GearVisor_visorDark',true,()=>0),'GearVisor_visorOakley_Dark');
  assert.equal(brandedVisorReplacement('GearVisor_visorClear',false,()=>0),OAKLEY_CLEAR_VISOR);
  for(const invalid of ['__proto__','toString','unknown'])assert.equal(brandedVisorReplacement(invalid,true,()=>0),null);
});
test('the shared patcher brands existing clear visors and adds GameDay visors without exceeding team caps',()=>{
  const players=[],visuals=[],start=['GearVisor_visorClear',OAKLEY_CLEAR_VISOR,GAMEDAY_CLEAR_VISORS[0],'GearVisor_visorDark'];
  for(let row=0;row<20;row++){
    players.push({isEmpty:false,FirstName:'Test',LastName:String(row),Position:'WR',SchoolYear:'Junior',RedshirtStatus:'Previous',TeamIndex:1,CharacterBodyType:'Thin',CharacterVisuals:(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0')});
    visuals.push({isEmpty:false,RawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'Visor',itemAssetName:start[row]??'GearVisor_None'}]}]})});
  }
  const result=applyGlobalEquipmentFixes(players,visuals,10,{seed:5,teamNames:new Map([[1,'Alabama']]),visorFix:true,oakleyVisorFix:true,usingEquipmentTruckMod:true});
  const assets=visuals.map(record=>JSON.parse(record.RawData).loadouts[0].loadoutElements[0].itemAssetName);
  assert.ok(assets.slice(0,3).every(asset=>GAMEDAY_CLEAR_VISORS.includes(asset)));
  assert.equal(assets[3],'GearVisor_visorOakley_Dark');
  assert.ok(assets.slice(4).every(asset=>asset==='GearVisor_None'||GAMEDAY_CLEAR_VISORS.includes(asset)));
  assert.ok(result.visorPlayersChanged>0);assert.ok(assets.filter(asset=>asset!=='GearVisor_None').length<=12);
});
