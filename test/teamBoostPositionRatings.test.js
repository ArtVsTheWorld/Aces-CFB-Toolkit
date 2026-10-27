import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBoostRange as originalValidate,weightsForPlayer as originalWeights} from './legacy-reference/ratings/teamBoost.js';
import {patchTeamRatings,validateBoostRange,weightsForPlayer,POSITION_RELEVANT_RATINGS,SUPPORTED_ATTRIBUTES} from '../src/main/tools/teamBoost/core.js';
import {ARCHETYPE_WEIGHTS,PHYSICAL_RATING_FIELDS} from '../src/main/tools/teamBoost/ratingWeights.js';
const player=(position='WR',type='WR_DeepThreat',extra={})=>({TeamIndex:7,Position:position,PlayerType:type,FirstName:'Test',LastName:'Player',OverallRating:80,...Object.fromEntries(SUPPORTED_ATTRIBUTES.map(field=>[field,70])),...extra});
const boost=(record,options={})=>patchTeamRatings([record],{teamIndex:7,minimum:2,maximum:2,mode:'nonphysical',seed:42,apply:true,...options});

test('all WR archetypes adjust all three route-running ratings without random omissions',()=>{
  for(const type of [...Object.keys(ARCHETYPE_WEIGHTS).filter(key=>key.startsWith('WR|')).map(key=>key.split('|')[1]),'Unknown'])for(const seed of [0,1,42,0xffffffff]){
    const record=player('WR',type),result=boost(record,{seed});
    for(const field of ['ShortRouteRunningRating','MediumRouteRunningRating','DeepRouteRunningRating','CatchingRating','ReleaseRating'])assert.equal(record[field],72,type+' '+field);
    for(const field of ['ThrowAccuracyShortRating','ManCoverageRating','KickAccuracyRating','LongSnapRating','SpeedRating'])assert.equal(record[field],70,'Unrelated/nonselected rating '+field);
    assert.ok(result.ratingChanges.some(change=>change.field==='ShortRouteRunningRating'));
  }
});
test('every archetype uses its full position skill set, with physical/nonphysical modes kept separate',()=>{
  for(const [profile] of Object.entries(ARCHETYPE_WEIGHTS))for(const mode of ['all','physical','nonphysical']){
    const [position,type]=profile.split('|'),record=player(position,type),result=boost(record,{mode});
    const expected=POSITION_RELEVANT_RATINGS[position].filter(field=>mode==='all'||(mode==='physical'?PHYSICAL_RATING_FIELDS.has(field):!PHYSICAL_RATING_FIELDS.has(field)));
    assert.deepEqual(result.ratingChanges.map(change=>change.field).sort(),[...expected].sort(),profile+' '+mode);
    for(const field of SUPPORTED_ATTRIBUTES)assert.equal(record[field],expected.includes(field)?72:70,profile+' '+field);
  }
});
test('position sets include all role skills without unrelated throwing/kicking ratings',()=>{
  const includes=(position,...fields)=>fields.forEach(field=>assert.ok(POSITION_RELEVANT_RATINGS[position].includes(field),position+' '+field));
  includes('TE','CatchingRating','ShortRouteRunningRating','MediumRouteRunningRating','DeepRouteRunningRating','RunBlockRating','PassBlockRating');
  includes('QB','ThrowAccuracyShortRating','ThrowAccuracyMidRating','ThrowAccuracyDeepRating','ThrowUnderPressureRating','PlayActionRating');
  includes('LT','PassBlockPowerRating','PassBlockFinesseRating','RunBlockPowerRating','RunBlockFinesseRating');
  includes('CB','ManCoverageRating','ZoneCoverageRating','PressRating','TackleRating');includes('DT','PowerMovesRating','FinesseMovesRating','BlockSheddingRating');
  assert.deepEqual([...POSITION_RELEVANT_RATINGS.K].sort(),['AwarenessRating','KickAccuracyRating','KickPowerRating'].sort());
});
test('Specific Attributes remains explicit, deduplicated and independent of position',()=>{
  const record=player(),result=boost(record,{mode:'specific',attributes:['ShortRouteRunningRating','KickAccuracyRating','ShortRouteRunningRating']});
  assert.deepEqual(result.ratingChanges.map(change=>change.field),['ShortRouteRunningRating','KickAccuracyRating']);assert.equal(record.KickAccuracyRating,72);assert.equal(record.CatchingRating,70);
});
test('filters, whole-room averages, position ranges and negative/clamped changes are exact; Preview is read only',()=>{
  const records=[player('WR','WR_DeepThreat',{OverallRating:60}),player('WR','WR_Slot',{OverallRating:90}),player('WR','WR_DeepThreat',{TeamIndex:8}),player('QB','QB_FieldGeneral')],before=structuredClone(records);
  const options={teamIndex:7,mode:'nonphysical',minimum:1,maximum:3,positions:['WR'],playerScope:'below-average',scope:{playerRows:['0']},positionRanges:{WR:{minimum:-3,maximum:-3}},seed:44};
  const preview=patchTeamRatings(records,options);assert.deepEqual(records,before);assert.ok(preview.ratingChanges.length);assert.ok(preview.ratingChanges.every(change=>change.row===0&&change.delta===-3&&change.roomAverage===75));
  patchTeamRatings(records,{...options,apply:true});assert.equal(records[0].ShortRouteRunningRating,67);assert.deepEqual(records.slice(1),before.slice(1));
  const cap=player('WR','WR_DeepThreat',{ShortRouteRunningRating:98,MediumRouteRunningRating:99,DeepRouteRunningRating:0});boost(cap,{minimum:5,maximum:5});assert.equal(cap.ShortRouteRunningRating,99);assert.equal(cap.MediumRouteRunningRating,99);assert.equal(cap.DeepRouteRunningRating,5);
});
test('unavailable or nonnumeric fields are skipped rather than initialized from zero',()=>{
  const record=player('WR','Unknown',{ShortRouteRunningRating:null,MediumRouteRunningRating:undefined,DeepRouteRunningRating:'',CatchingRating:NaN,ReleaseRating:false});
  const result=boost(record);assert.ok(!result.ratingChanges.some(change=>['ShortRouteRunningRating','MediumRouteRunningRating','DeepRouteRunningRating','CatchingRating','ReleaseRating'].includes(change.field)));
});
test('seeded adjustments are reproducible and stay within the requested range',()=>{
  const a=player(),b=player();const first=boost(a,{minimum:1,maximum:3,seed:1776}),second=boost(b,{minimum:1,maximum:3,seed:1776});assert.deepEqual(a,b);assert.equal(first.ratingChanges.length,second.ratingChanges.length);assert.ok(first.ratingChanges.every(change=>change.delta>=1&&change.delta<=3));
});
test('copied workbook weight data and range validation remain identical for reference consumers',()=>{
  assert.deepEqual(weightsForPlayer(player()),originalWeights(player()));for(const range of [[1,3],[-99,99],[4,2],[-100,2]])assert.equal(validateBoostRange(...range),originalValidate(...range));
});
