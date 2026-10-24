import test from 'node:test';
import assert from 'node:assert/strict';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {RATING_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {ATHLETIC_RATINGS,observedAthleticBounds} from '../src/main/tools/rosterGenerator/athleticBounds.js';
import {ATHLETICISM_PROFILES,athleticVariant} from '../src/main/tools/rosterGenerator/athletics.js';
import {ROSTER_PRESETS,modelForPreset,rosterPreset,calibrateProfile} from '../src/main/tools/rosterGenerator/presets.js';
import {calculateOverall} from '../src/main/tools/rosterGenerator/ratings.js';
const base=loadObservedCatalog(),indices=ATHLETIC_RATINGS.map(field=>RATING_FIELDS.indexOf(field)),physical=profile=>indices.map(i=>profile.ratings[i]);

test('every caliber preserves each observed six-rating physical package and its distribution, including 99s',()=>{
 for(const preset of ROSTER_PRESETS){
  const model=modelForPreset(base,preset);
  for(const [position,pool]of model.byPosition){
   for(const profile of pool)assert.deepEqual(physical(profile),physical(base.byId.get(profile.id)),`${preset.id}/${position}/${profile.id}`);
   for(const i of indices)assert.equal(pool.filter(p=>p.ratings[i]===99).length,pool.filter(p=>base.byId.get(p.id).ratings[i]===99).length,`${preset.id}/${position}/${RATING_FIELDS[i]}`);
  }
 }
});

test('OVR offset changes skills and awareness, never 91 speed into 99 speed',()=>{
 const source={id:'physical-fixture',position:'WR',archetype:'test',overall:61,physical:Array(5).fill('None'),ratings:RATING_FIELDS.map(field=>field==='SpeedRating'?91:field==='AwarenessRating'?61:70)};
 const formula={intercept:0,coefficients:{SpeedRating:.1,AwarenessRating:.9},minimumOverall:12,maximumOverall:99},formulas=new Map([['WR|test',formula]]),before=structuredClone(source);
 for(const desired of [40,60,73,83,95]){
  const result=calibrateProfile(source,desired,formulas);assert.deepEqual(physical(result),physical(source));assert.ok(Math.abs(result.overall-desired)<=1);assert.equal(result.overall,calculateOverall(result,formulas));
 }
 assert.deepEqual(source,before);
 const physicalOnly=new Map([['WR|test',{...formula,coefficients:{SpeedRating:1}}]]),unreachable=calibrateProfile(source,99,physicalOnly);assert.equal(unreachable.overall,91,'An unreachable target cannot be met by inflating physical ratings or lying about OVR');
});

test('athletic variants make only modest physical changes, and recalibration cannot amplify or erase them',()=>{
 const model=modelForPreset(base,rosterPreset('all-time'));
 for(const [position,pool]of model.byPosition){
  const sample=[pool.find(p=>p.physical.every(t=>t==='None')),pool.find(p=>p.physical.some(t=>t!=='None'))].filter(Boolean);
  for(const source of sample)for(const variant of ATHLETICISM_PROFILES){
   const result=athleticVariant(model,source,variant.id),limit={balanced:0,outlier:0,cerebral:0,drill:0,speed:2,size:3,technical:2,freak:3}[variant.id],bounds=observedAthleticBounds(model,position,variant.id);
   for(const i of indices)assert.ok(Math.abs(result.ratings[i]-source.ratings[i])<=limit,`${position}/${variant.id}/${RATING_FIELDS[i]}`);
   for(const desired of [45,69,90])assert.deepEqual(physical(calibrateProfile(result,desired,model.formulas,{athleticBounds:bounds})),physical(result),'OVR calibration preserves the physical profile');
   assert.deepEqual(result.physical,source.physical);assert.equal(result.overall,calculateOverall(result,model.formulas));
  }
 }
});
