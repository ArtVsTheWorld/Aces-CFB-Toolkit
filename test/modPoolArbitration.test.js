import test from 'node:test';
import assert from 'node:assert/strict';
import {applyModdedRandomizerEquipment,applyUnlockedRandomizerEquipment,patchFreshmanEquipment,mulberry32} from '../src/main/tools/equipment/core/patcher.js';
import {modPoolDefinitions,normalizeModPools} from '../src/main/tools/equipment/core/modPools.js';
import {createGeneratedEquipmentState,enforceGeneratedEquipmentCompatibility} from '../src/main/tools/equipment/core/generatedCompatibility.js';
const defs=modPoolDefinitions(),target={position:'WR',branding:'Nike'},outfit=()=>[{loadoutType:'PlayerOnField',keep:42,loadoutElements:[]}];
const disabled=origin=>Object.fromEntries(defs[origin].map(category=>[category.id,{chance:0,items:[]}]));
const pick=(origin,category)=>defs[origin].find(c=>c.id===category).items[0].itemName;
function options(categories){return {usingUnlockedMod:true,usingRawAccessoriesMod:true,usingEquipmentTruckMod:true,modPools:normalizeModPools(Object.fromEntries(Object.keys(defs).map(origin=>[origin,{...disabled(origin),...Object.fromEntries((categories[origin]??[]).map(category=>[category,{chance:100,items:[pick(origin,category)]}]))}])))};}
const gear=(outfits,slot)=>outfits[0].loadoutElements.find(e=>e.slotType===slot)?.itemAssetName;
test('all three independently rolled sleeve pools get a fair opportunity without last-provider overwrites',()=>{
 const config=options({unlocked:['armSleeves'],raw:['armSleeves'],eljax:['armSleeves']}),wins={unlocked:0,raw:0,eljax:0};
 for(let seed=0;seed<900;seed++){
  const outfits=outfit(),state=createGeneratedEquipmentState(outfits),audit=applyModdedRandomizerEquipment(outfits,target,mulberry32(seed),1,state,config),asset=gear(outfits,'LeftArmWear');
  const origin=Object.keys(wins).find(origin=>asset===pick(origin,'armSleeves'));assert.ok(origin,asset);wins[origin]++;
  assert.equal(gear(outfits,'RightArmWear'),asset);assert.equal(outfits[0].keep,42);assert.deepEqual(enforceGeneratedEquipmentCompatibility(outfits,state,'WR'),[]);
  for(const [source,changes]of Object.entries(audit))for(const change of changes){assert.equal(source,origin);assert.ok(change.slots.every(slot=>gear(outfits,slot)===asset));}
 }
 for(const [origin,count]of Object.entries(wins))assert.ok(count>220&&count<380,origin+': '+count);
});
test('noncompeting successful pool rolls survive together and zero/empty categories stay off',()=>{
 const config=options({unlocked:['socks'],raw:['skullcaps'],eljax:['visors']}),outfits=outfit(),state=createGeneratedEquipmentState(outfits),audit=applyModdedRandomizerEquipment(outfits,target,mulberry32(12),1,state,config);
 for(const [origin,category,slot]of [['unlocked','socks','InnerSocks'],['raw','skullcaps','GuardianCap'],['eljax','visors','Visor']]){assert.equal(gear(outfits,slot),pick(origin,category));assert.equal(audit[origin].length,1);}
 assert.equal(outfits[0].loadoutElements.length,3);
 const empty=outfit();applyModdedRandomizerEquipment(empty,target,mulberry32(12),1,undefined,options({}));assert.deepEqual(empty,outfit());
});
test('one provider preserves its existing seeded equipment and RNG behavior',()=>{
 const config=options({unlocked:['armSleeves','socks','neckwear']});config.usingRawAccessoriesMod=false;config.usingEquipmentTruckMod=false;
 const a=outfit(),b=outfit(),ra=mulberry32(1234),rb=mulberry32(1234),sa=createGeneratedEquipmentState(a),sb=createGeneratedEquipmentState(b);
 const actual=applyModdedRandomizerEquipment(a,target,ra,.1,sa,config),expected=applyUnlockedRandomizerEquipment(b,target,rb,.1,sb,config.modPools.unlocked);
 assert.deepEqual(a,b);assert.deepEqual(actual.unlocked,expected);assert.equal(ra(),rb());
});

test('Quickstart specialist mode keeps donor gear and facepaint without pool additions or accessory removal',()=>{
 const ref=row=>(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
 for(const position of ['K','P']){
  const players=[0,1].map(row=>({isEmpty:false,FirstName:'Player'+row,LastName:'Test',Position:position,SchoolYear:row?'Senior':'Freshman',RedshirtStatus:'Eligible',CharacterBodyType:'Thin',CharacterVisuals:ref(row),TeamIndex:1,OverallRating:80,IsNIL:false}));
  const visuals=players.map((_,row)=>({isEmpty:false,RawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'HeadWear',itemAssetName:'GearHelmet_Speed_Flex'},{slotType:'FacePaint',itemAssetName:row?'FaceMarks_EyeBlack':'FaceMarks_None'},{slotType:'InnerSocks',itemAssetName:'Gear_Socks_Mid'},{slotType:'HandWarmer',itemAssetName:'HandWarmer_Donor'}]}]})}));
  const result=patchFreshmanEquipment(players,visuals,10,{...options({unlocked:['socks'],raw:['skullcaps'],eljax:['visors']}),seed:12,top:1,eligiblePlayer:record=>record===players[0],donorOnlyPositions:['K','P'],noDripProfile:true,noDripPercentages:{heavy:100},apply:true});
  assert.equal(result.changes.length,1);const change=result.changes[0];assert.equal(change.noDrip,false);for(const key of ['unlockedChanges','rawChanges','equipmentTruckChanges'])assert.deepEqual(change[key],[]);
  const outfits=JSON.parse(visuals[0].RawData).loadouts;assert.equal(gear(outfits,'InnerSocks'),'Gear_Socks_Mid');assert.equal(gear(outfits,'FacePaint'),'FaceMarks_EyeBlack');assert.equal(gear(outfits,'GuardianCap'),undefined);
 }
});

test('later cross-slot pool proposals cannot remove an already accepted incompatible accessory',()=>{
 const config=options({unlocked:['balaclavas'],raw:['skullcaps']});const wins={unlocked:0,raw:0};
 for(let seed=1;seed<=100;seed++){
  const outfits=outfit();outfits.push(structuredClone(outfits[0]));outfits.forEach(o=>o.loadoutElements.push({slotType:'HeadWear',itemAssetName:'GearHelmet_Speed_Flex',unchanged:42}));const state=createGeneratedEquipmentState(outfits),audit=applyModdedRandomizerEquipment(outfits,target,mulberry32(seed),1,state,config);
  const successful=Object.entries(audit).filter(([,changes])=>changes.length);assert.equal(successful.length,1,'Overlapping head layers allow only one source');wins[successful[0][0]]++;
  assert.deepEqual(enforceGeneratedEquipmentCompatibility(outfits,state,'WR'),[],'Final validation does not remove an earlier winner');assert.deepEqual(outfits[0],outfits[1]);assert.equal(outfits[0].loadoutElements[0].unchanged,42);
 }
 assert.ok(wins.unlocked>25&&wins.raw>25,'Both physical-slot winners are possible');
});
