import test from 'node:test';
import assert from 'node:assert/strict';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {ATHLETIC_RATINGS,observedAthleticBounds} from '../src/main/tools/rosterGenerator/athleticBounds.js';
import {ATHLETICISM_PROFILES,athleticVariant} from '../src/main/tools/rosterGenerator/athletics.js';
import {RATING_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {calibrateProfile,modelForPreset,rosterPreset} from '../src/main/tools/rosterGenerator/presets.js';
import {calculateOverall} from '../src/main/tools/rosterGenerator/ratings.js';
const base=loadObservedCatalog();
const index=field=>RATING_FIELDS.indexOf(field);

test('athletic profile weights total 100 with Balanced filling the remainder',()=>{
 assert.deepEqual(Object.fromEntries(ATHLETICISM_PROFILES.map(p=>[p.id,p.weight])),{balanced:85,speed:2,size:2,technical:3,freak:1,outlier:1,cerebral:3,drill:3});
 assert.equal(ATHLETICISM_PROFILES.reduce((n,p)=>n+p.weight,0),100);
});

test('athletic ranges use all three unmodified dynasty cohorts and exact position aliases',()=>{
 assert.deepEqual(base.catalog.sources.map(s=>s.year),[2026,2032,2038]);
 for(const [position,pool]of base.byPosition){
  const bounds=observedAthleticBounds(base,position);
  for(const field of ATHLETIC_RATINGS){const i=index(field),values=pool.map(p=>p.ratings[i]);assert.deepEqual(bounds[i],{minimum:Math.max(1,Math.min(...values)),maximum:Math.max(...values)},`${position}/${field}`);}
  assert.equal(bounds[index('AwarenessRating')],null,'Mental and positional skills are not capped by athletic ranges');
 }
 assert.deepEqual(observedAthleticBounds(base,'LE'),observedAthleticBounds(base,'LEDG'));
 assert.deepEqual(observedAthleticBounds(base,'MLB'),observedAthleticBounds(base,'MIKE'));
 assert.throws(()=>observedAthleticBounds(base,'Unknown'),/No observed/);
});

test('DT calibration cannot create 99 speed/acceleration, including the two-point rare-profile allowance',()=>{
 const source=base.byPosition.get('DT').find(p=>p.physical.every(t=>t==='None'));
 const exaggerated={...source,ratings:source.ratings.map((rating,i)=>ATHLETIC_RATINGS.includes(RATING_FIELDS[i])?99:rating)};
 for(const profile of ATHLETICISM_PROFILES){
  const bounds=observedAthleticBounds(base,'DT',profile.id),result=calibrateProfile(exaggerated,99,base.formulas,{athleticBounds:bounds});
  assert.equal(bounds[index('SpeedRating')].maximum,['freak','outlier'].includes(profile.id)?92:90);
  assert.equal(bounds[index('AccelerationRating')].maximum,['freak','outlier'].includes(profile.id)?97:95);
  assert.ok(result.ratings[index('SpeedRating')]<=bounds[index('SpeedRating')].maximum);
  assert.ok(result.ratings[index('AccelerationRating')]<=bounds[index('AccelerationRating')].maximum);
  assert.equal(result.overall,calculateOverall(result,base.formulas));
 }
 assert.equal(exaggerated.ratings[index('SpeedRating')],99,'Calibration does not mutate its input');
});

test('low and high caliber models and every athletic variant retain position ranges and observed ability floors',()=>{
 for(const presetId of ['startup','all-time']){
  const model=modelForPreset(base,rosterPreset(presetId));
  for(const [position,pool]of model.byPosition){
   const ordinary=observedAthleticBounds(model,position);
   for(const player of pool)for(const field of ATHLETIC_RATINGS){const i=index(field);assert.ok(player.ratings[i]>=ordinary[i].minimum&&player.ratings[i]<=ordinary[i].maximum,`${presetId}/${position}/${field}`);}
   // Include ordinary, ability-bearing and the fastest observed package in each room.
   const candidates=[pool[0],pool.find(p=>p.physical.some(t=>t!=='None')),pool.reduce((a,b)=>a.ratings[index('SpeedRating')]>b.ratings[index('SpeedRating')]?a:b)].filter(Boolean);
   for(const source of candidates)for(const profile of ATHLETICISM_PROFILES){
    const result=athleticVariant(model,source,profile.id),bounds=observedAthleticBounds(model,position,profile.id),raw=base.byId.get(source.id);
    for(const field of ATHLETIC_RATINGS){const i=index(field);assert.ok(result.ratings[i]>=bounds[i].minimum&&result.ratings[i]<=bounds[i].maximum,`${presetId}/${position}/${profile.id}/${field}`);}
    if(raw.physical.some(t=>t!=='None'))assert.ok(result.ratings.every((value,i)=>value>=raw.ratings[i]),'Unknown physical-ability requirements are never weakened');
    assert.deepEqual(result.physical,raw.physical);assert.equal(result.overall,calculateOverall(result,base.formulas));
   }
  }
 }
});
