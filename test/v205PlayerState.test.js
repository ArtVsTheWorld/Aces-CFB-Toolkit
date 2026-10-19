import test from 'node:test';
import assert from 'node:assert/strict';
import {HEALTHY_FIELDS,WEAR_FIELDS,observedPlayerState,assignRosterCaptains} from '../src/main/tools/rosterGenerator/playerState.js';
import {PRESENTATION_RANGE,rosterPresentations,presentationAssetName} from '../src/main/tools/rosterGenerator/presentation.js';
import {pitchMatches,matchingPitch,PITCH_WEIGHTS} from '../src/main/tools/dealbreaker/pitches.js';
import {patchDealbreakers,DEFAULT_DISTRIBUTION} from '../src/main/tools/dealbreaker/core.js';
import {coordinateHandedEquipment} from '../src/main/tools/rosterGenerator/handedEquipment.js';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';

test('healthy state uses game sentinels and retains rating-independent full health',()=>{
  assert.equal(HEALTHY_FIELDS.InjuryStatus,'Uninjured');assert.equal(HEALTHY_FIELDS.InjuryType,'Invalid_');assert.equal(HEALTHY_FIELDS.CurrentYearSeasonEndingInjuryWeek,30);
  assert.equal(HEALTHY_FIELDS.Fatigue,0);assert.equal(HEALTHY_FIELDS.SeasonHealthPool,1000);assert.equal(HEALTHY_FIELDS.SeasonHealthPoolMax,1000);
  assert.equal(WEAR_FIELDS.length,20);assert.ok(WEAR_FIELDS.every(field=>HEALTHY_FIELDS[field]===10));
  assert.ok(!Object.keys(HEALTHY_FIELDS).some(f=>/Rating|Stats|Award|Age|Birth/.test(f)));
});
test('eligibility, handedness and geography stay tied to observed packages',()=>{
  const catalog=loadObservedCatalog();for(const p of catalog.profiles.filter(p=>p.source>0)){
    assert.ok(['Left','Right'].includes(p.handedness));const fields=observedPlayerState(p);
    assert.equal(fields.PLYR_CONSECYEARSWITHTEAM,p.consecutiveYears);assert.equal(fields.PLYR_HANDEDNESS,p.handedness);
    assert.equal(fields.PLYR_HOME_TOWN,p.home.town);assert.equal(fields.PLYR_HOME_STATE,p.home.state);assert.equal(fields.HomePipeline,p.home.pipeline);assert.ok(!('NearestCity' in fields));
    if(p.classYear==='Freshman'&&p.redshirt==='Eligible')assert.equal(fields.PLYR_CONSECYEARSWITHTEAM,0);
  }
});
test('presentation allocation avoids all existing IDs, wraps safely and does not mutate reservations',()=>{
  const targets=Array.from({length:85},(_,row)=>({row,original:{PresentationId:500100+row}})),reserved=new Set([500000,500001,1048575]),before=[...reserved],a=rosterPresentations(targets,0,reserved);
  assert.equal(new Set(a.values()).size,85);assert.deepEqual([...reserved],before);assert.deepEqual(a,rosterPresentations([...targets].reverse(),0,reserved));
  for(const id of a.values()){assert.ok(id>=PRESENTATION_RANGE.first&&id<=PRESENTATION_RANGE.last);assert.ok(!reserved.has(id));assert.ok(!targets.some(t=>t.original.PresentationId===id));}
  const b=rosterPresentations(targets,0,new Set([...reserved,...a.values()]));assert.ok([...b.values()].every(id=>![...a.values()].includes(id)));
  const wrap=rosterPresentations([{row:1}],PRESENTATION_RANGE.last-PRESENTATION_RANGE.first,new Set([1048575]));assert.equal(wrap.get(1),500000);
  const asset=presentationAssetName("D'Andre",'An-Extremely-Long-Last-Name',1048575);assert.ok(Buffer.byteLength(asset)<=41);assert.match(asset,/_1048575$/);assert.ok(!/[ '\-]/.test(asset));
});
test('captains honor team count, balance offense/defense and reset old flags and patches',()=>{
  const players=['QB','HB','WR','TE','LE','DT','CB','SS','K'].map((position,row)=>({row,position,fields:{SchoolYear:row===2?'Senior':'Sophomore',Personality:'TeamPlayer',OverallRating:70+row,PLYR_ISCAPTAIN:true,CaptainsPatch:'FiveYearGold'}}));
  const result=assignRosterCaptains(players,{captainCount:4});assert.equal(result.selected.length,4);assert.equal(players.filter(p=>p.fields.PLYR_ISCAPTAIN).length,4);assert.ok(players[2].fields.PLYR_ISCAPTAIN);
  assert.ok(players.every(p=>p.fields.CaptainsPatch===(p.fields.PLYR_ISCAPTAIN?'OneYear':'None')));
  assignRosterCaptains(players,{captainCount:0});assert.ok(players.every(p=>!p.fields.PLYR_ISCAPTAIN));
  assignRosterCaptains(players,{captainCount:100});assert.ok(players.every(p=>p.fields.PLYR_ISCAPTAIN));
});
test('ideal pitches are compatible, deterministic, preserve valid choices and reject stale rare pairs',()=>{
  for(const [db,weights]of Object.entries(PITCH_WEIGHTS))for(let seed=0;seed<100;seed++){const pitch=matchingPitch(db,'Invalid',seed,4);assert.ok(pitchMatches(db,pitch));assert.equal(matchingPitch(db,pitch,seed+1,5),pitch);assert.ok(weights[pitch]);}
  assert.equal(pitchMatches('PlayingTime','HometownHero'),false);assert.equal(matchingPitch('Invalid','TheClutch',1),'Invalid');
});
test('dealbreaker changes coordinate pitch without changing rolls, preserved rows or unrelated fields',()=>{
  const fields={FirstName:'Test',LastName:'Player',TeamIndex:1,Position:'WR',SchoolYear:'Freshman',RedshirtStatus:'Eligible',OverallRating:70,RecruitingDealbreaker:'Invalid',IdealRecruitingPitch:'CollegeExperience'},records=Array.from({length:40},(_,i)=>({...fields,FirstName:'Player'+i})),before=structuredClone(records),teamNames=new Map([[1,'Test']]);
  const a=patchDealbreakers(records,{teamNames,seed:20,apply:false}),b=patchDealbreakers(before,{teamNames,seed:20,apply:true});assert.deepEqual(a.changes.map(c=>c.newValue),b.changes.map(c=>c.newValue));
  for(const c of b.changes){assert.ok(pitchMatches(c.newValue,c.newPitch));assert.equal(before[c.row].IdealRecruitingPitch,c.newPitch);}
  assert.ok(records.every(p=>p.IdealRecruitingPitch==='CollegeExperience'));
  const protectedResult=patchDealbreakers(records,{teamNames,seed:20,protectedRows:['0'],protectedValues:['Invalid'],apply:true});assert.equal(protectedResult.changes.length,0);
});
test('QB equipment follows its category donor handedness without touching shoes or non-QBs',()=>{
  const raw=JSON.stringify({keep:1,loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'LeftWristWear',itemAssetName:'GearWrist_wristBandCoach_Black'},{slotType:'RightWristWear',itemAssetName:'GearWrist_None'},{slotType:'LeftHandWear',itemAssetName:'GearHand_None'},{slotType:'RightHandWear',itemAssetName:'GearHand_None'},{slotType:'LeftShoe',itemAssetName:'GearFootwear_shoe_low_NikeVaporEdge'}]}]}),uses=[{group:'upper body + arms',donor:{row:1,position:'QB'}}];
  const result=coordinateHandedEquipment(raw,{position:'QB',fields:{PLYR_HANDEDNESS:'Left'}},uses,()=> 'Right'),json=JSON.parse(result.rawData);assert.equal(json.loadouts[0].loadoutElements.find(e=>e.itemAssetName.includes('wristBandCoach')).slotType,'RightWristWear');assert.equal(json.keep,1);assert.equal(json.loadouts[0].loadoutElements.find(e=>e.slotType==='LeftShoe').itemAssetName,'GearFootwear_shoe_low_NikeVaporEdge');
  assert.equal(coordinateHandedEquipment(raw,{position:'WR',fields:{PLYR_HANDEDNESS:'Left'}},uses,()=> 'Right').rawData,raw);
});
