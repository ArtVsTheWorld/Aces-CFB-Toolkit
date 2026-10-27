import test from 'node:test';
import assert from 'node:assert/strict';
import {EQUIPMENT_TRUCK_POOLS} from '../src/main/tools/equipment/catalog.js';
import {patchFreshmanEquipment,getBaseDonorPositions,getCrossDonorPositions} from '../src/main/tools/equipment/core/patcher.js';
import {enforceRandomizerPositionRestrictions,isWaistPlaycallBand} from '../src/main/tools/equipment/core/positionRestrictions.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import {VALID_POSITIONS} from '../src/main/tools/equipment/shared.js';
const field=elements=>({loadoutType:'PlayerOnField',loadoutElements:elements}),element=(slotType,itemAssetName)=>({slotType,itemAssetName}),ref=row=>(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
const gear=band=>[field([element('HeadBand',band),element('WaistWear','Handwarmer_Standard'),element('LeftWristWear','GearWrist_wristBandCoach_White'),element('OuterShirt','Gear_JerseyStyle_Standard'),element('InnerShirt','Gear_Undershirt_CompressionTCrewSleeveless_White'),element('HeadWear','GearHelmet_Speed_Flex'),element('FaceMask','GearFaceMask_Speedflex2Bar')])];
test('default donor and cross-position groups keep QBs separate from every other position',()=>{
  assert.deepEqual(getBaseDonorPositions('QB'),['QB']);assert.deepEqual(getCrossDonorPositions('QB'),[]);
  for(const position of VALID_POSITIONS.filter(position=>position!=='QB')){assert.ok(!getBaseDonorPositions(position).includes('QB'),position);assert.ok(!getCrossDonorPositions(position).includes('QB'),position);}
});
test('every waist playcall variant is removed from every non-QB outfit without touching wrist coaches or handwarmers',()=>{
  assert.equal(EQUIPMENT_TRUCK_POOLS.waistPlaycalls.length,9);
  for(const item of EQUIPMENT_TRUCK_POOLS.waistPlaycalls)for(const position of VALID_POSITIONS){
    const loadouts=gear(item.itemName),before=structuredClone(loadouts),changes=enforceRandomizerPositionRestrictions(loadouts,position);
    if(position==='QB'){assert.deepEqual(loadouts,before);assert.deepEqual(changes,[]);continue;}
    assert.equal(changes.length,1);assert.deepEqual(loadouts[0].loadoutElements,before[0].loadoutElements.slice(1));assert.deepEqual(enforceRandomizerPositionRestrictions(loadouts,position),[]);
  }
  const unrelated=[field([element('HeadBand','Custom_Actual_HeadBand'),element('LeftWristWear','GearWrist_wristBandCoach_Black')])],before=structuredClone(unrelated);enforceRandomizerPositionRestrictions(unrelated,'WR');assert.deepEqual(unrelated,before);
});
test('single and mixed donors cannot transfer or retain waist playcalls on non-QBs in either tool, across all mod combinations',()=>{
  for(let flags=0;flags<8;flags++)for(const mixed of [false,true])for(const position of VALID_POSITIONS){
    const mods={unlocked:Boolean(flags&1),raw:Boolean(flags&2),gameday:Boolean(flags&4)},settings=quickstartSettings(mods),band=EQUIPMENT_TRUCK_POOLS.waistPlaycalls[flags%EQUIPMENT_TRUCK_POOLS.waistPlaycalls.length].itemName;
    for(const quickstart of [false,true]){
      const players=[0,1].map(row=>({FirstName:row?'Donor':'Target',LastName:position,Position:position,SchoolYear:row?'Senior':'Freshman',RedshirtStatus:row?'Previous':'Eligible',CharacterBodyType:'Thin',CharacterVisuals:ref(row),TeamIndex:1,OverallRating:row?90:70,isEmpty:false})),visuals=players.map(()=>({isEmpty:false,RawData:JSON.stringify({metadata:7,loadouts:gear(band)})}));
      const result=patchFreshmanEquipment(players,visuals,10,{...(quickstart?settings.randomizer:{}),usingUnlockedMod:mods.unlocked,usingRawAccessoriesMod:mods.raw,usingEquipmentTruckMod:mods.gameday,top:30,seed:1776,noDripProfile:false,unlockedItemChance:0,mixedChance:mixed?1:0,crossMixedChance:0,protectOriginalEaPlayers:false,eligiblePlayer:record=>record===players[0],apply:true});
      assert.equal(result.changes.length,1,position+' '+flags+' '+quickstart);const parsed=JSON.parse(visuals[0].RawData),bands=parsed.loadouts.flatMap(loadout=>loadout.loadoutElements.filter(item=>isWaistPlaycallBand(item.itemAssetName)));
      assert.equal(bands.length,position==='QB'?1:0,position+' '+flags+' '+quickstart+' '+mixed);assert.equal(parsed.metadata,7);assert.equal(JSON.parse(visuals[1].RawData).loadouts[0].loadoutElements[0].itemAssetName,band,'donor remains untouched');
      assert.ok((result.changes[0].equipmentTruckChanges??[]).every(change=>!change.newItem.split(' + ').some(isWaistPlaycallBand)||position==='QB'));
    }
  }
});
