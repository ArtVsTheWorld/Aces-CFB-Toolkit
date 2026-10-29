import test from 'node:test';import assert from 'node:assert/strict';
import NoDrip from '../src/shared/noDrip.cjs';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import {patchFreshmanEquipment,noDripChanceForPosition} from '../src/main/tools/equipment/core/patcher.js';

test('agreed individual defaults are shared by both tools, match the supplied screenshots and are enabled in both tools',()=>{
  const randomizer=normalizeEquipmentOptions({},true),quickstart=quickstartSettings({unlocked:true,raw:true,gameday:true}).randomizer;
  assert.equal(randomizer.noDripProfile,true);assert.equal(quickstart.noDripProfile,true);assert.deepEqual(randomizer.noDripPercentages,NoDrip.defaults);assert.deepEqual(quickstart.noDripPercentages,NoDrip.defaults);
  for(const row of NoDrip.rows)assert.equal(noDripChanceForPosition(row.position),row.chance/100,row.position);
  assert.deepEqual(NoDrip.defaults,{QB:1,HB:1,FB:15,WR:1,TE:10,LT:75,LG:80,C:80,RG:80,RT:75,LE:25,RE:25,DT:40,LOLB:15,MLB:10,ROLB:15,CB:1,FS:1,SS:1,K:50,P:50});assert.equal(normalizeEquipmentOptions({noDripProfile:false},true).noDripProfile,false);assert.equal(normalizeEquipmentOptions({},false).noDripProfile,false);assert.equal(quickstart.allowDonorOnlyNoDrip,true);assert.deepEqual(quickstart.donorOnlyPositions,['K','P']);
  const independent=NoDrip.normalize({LE:2,RE:93,LT:4,RT:7,MLB:34,LOLB:66,FS:11,SS:22,K:0,P:100});for(const [position,value]of Object.entries({LE:2,RE:93,LT:4,RT:7,MLB:34,LOLB:66,FS:11,SS:22,K:0,P:100}))assert.equal(independent[position],value);
  for(const bad of [{QB:1.5},{K:-1},{P:101},{WR:''},{Unknown:5},null,[]])assert.throws(()=>NoDrip.normalize(bad));
});
test('legacy groups and saved controls expand without changing their old probabilities',()=>{
  const old=NoDrip.normalize({skill:10,balanced:20,heavy:30});assert.equal(old.QB,20);assert.equal(old.HB,20);assert.equal(old.WR,10);assert.equal(old.LE,30);assert.equal(old.FB,30);assert.equal(old.P,30);
  const partial=NoDrip.normalize({skill:0});assert.equal(partial.QB,3);assert.equal(partial.LT,6);assert.equal(partial.WR,0);
  const values={'equipment-no-drip':true,'equipment-no-drip-skill':'9','equipment-no-drip-balanced':'17','equipment-no-drip-heavy':'41','equipment-no-drip-QB':'2'};NoDrip.migrateSettings(values);assert.equal(values['equipment-no-drip-QB'],'2');assert.equal(values['equipment-no-drip-HB'],'17');assert.equal(values['equipment-no-drip-FB'],'41');assert.equal(values['equipment-no-drip-CB'],'9');assert.equal(values['equipment-no-drip-heavy'],undefined);assert.equal(values['equipment-no-drip'],true);const again={...values};NoDrip.migrateSettings(values);assert.deepEqual(values,again);
});

function population(position,n,extra={}){
  const ref=row=>(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0'),players=Array.from({length:n+1},(_,row)=>({isEmpty:false,FirstName:'Player'+row,LastName:'Test',Position:position,SchoolYear:row?'Freshman':'Senior',RedshirtStatus:'Eligible',CharacterBodyType:'Thin',CharacterVisuals:ref(row),TeamIndex:1,OverallRating:row?80:99,IsNIL:false}));
  const loadout=()=>({loadoutType:'PlayerOnField',loadoutElements:[{slotType:'HeadWear',itemAssetName:'GearHelmet_Speed_Flex'},{slotType:'Towel',itemAssetName:'GearTowel_White'},{slotType:'NeckWear',itemAssetName:'NeckWear_Turtleneck_Tight_White'},{slotType:'InnerSocks',itemAssetName:'Gear_Socks_Mid'},{slotType:'FacePaint',itemAssetName:'FaceMarks_EyeBlack'}]});
  const visuals=players.map(()=>({isEmpty:false,RawData:JSON.stringify({loadouts:[loadout(),loadout()]})}));
  const options={...quickstartSettings({unlocked:true,raw:true,gameday:true}).randomizer,top:1,seed:1776,eligiblePlayer:p=>p!==players[0],protectOriginalEaPlayers:false,apply:true,...extra};
  const donor=visuals[0].RawData,result=patchFreshmanEquipment(players,visuals,10,options);assert.equal(visuals[0].RawData,donor);return {result,visuals};
}
test('specialists get one cleanup roll per player across outfits, without modded additions or donor edits',()=>{
  for(const position of ['K','P']){
    const {result}=population(position,600);assert.equal(result.changes.length,600);assert.ok(result.noDripPlayers>=250&&result.noDripPlayers<=350,position+': '+result.noDripPlayers);
    for(const change of result.changes){for(const key of ['unlockedChanges','rawChanges','equipmentTruckChanges'])assert.deepEqual(change[key],[]);const loadouts=JSON.parse(change.newRawData).loadouts;assert.ok(loadouts.every(l=>l.loadoutElements.find(e=>e.slotType==='FacePaint').itemAssetName==='FaceMarks_EyeBlack'));const socks=loadouts.map(l=>l.loadoutElements.find(e=>e.slotType==='InnerSocks').itemAssetName);assert.deepEqual(socks,[change.noDrip?'Gear_Socks_Low':'Gear_Socks_Mid',change.noDrip?'Gear_Socks_Low':'Gear_Socks_Mid']);}
    assert.equal(population(position,10,{noDripPercentages:{[position]:0}}).result.noDripPlayers,0);assert.equal(population(position,10,{noDripPercentages:{[position]:100}}).result.noDripPlayers,10);
  }
});
test('disabled profiles do not clean anyone even when their position chance is100',()=>{const {result}=population('K',10,{noDripProfile:false,noDripPercentages:{K:100}});assert.ok(result.changes.every(change=>!change.noDrip));for(const change of result.changes)assert.ok(JSON.parse(change.newRawData).loadouts.every(l=>l.loadoutElements.find(e=>e.slotType==='InnerSocks').itemAssetName==='Gear_Socks_Mid'));});
