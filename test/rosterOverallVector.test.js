import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {RATING_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {calculateOverall,formulaIndex} from '../src/main/tools/rosterGenerator/ratings.js';

function previousOverall(profile,formulas){
 const formula=formulas.get(`${profile.position}|${profile.archetype}`),ratings=Object.fromEntries(RATING_FIELDS.map((field,i)=>[field,profile.ratings[i]]));
 let raw=formula.intercept;for(const[field,coefficient]of Object.entries(formula.coefficients)){if(!Number.isFinite(ratings[field]))throw Error(`Missing ${field} in ${profile.id}.`);raw+=ratings[field]*coefficient;}
 return Math.max(formula.minimumOverall,Math.min(formula.maximumOverall,Math.ceil(raw-.5-1e-9)));
}
const catalog=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../src/main/tools/rosterGenerator/data/observed-v1.json.gz',import.meta.url))));
const formulas=formulaIndex(catalog.formulas);

test('direct vector evaluation preserves every observed overall and perturbed rating package',()=>{
 assert.deepEqual(catalog.ratingFields,RATING_FIELDS);assert.equal(catalog.profiles.length,35190);
 for(const profile of catalog.profiles){
  assert.equal(calculateOverall(profile,formulas),previousOverall(profile,formulas),profile.id);
  for(const delta of [-19,17]){
   const altered={...profile,ratings:profile.ratings.map((rating,i)=>Math.max(0,Math.min(99,rating+(i%3===0?delta:0))))};
   assert.equal(calculateOverall(altered,formulas),previousOverall(altered,formulas),`${profile.id}/${delta}`);
  }
 }
});

test('formula rounding, bounds, own fields and later coefficient edits keep their existing meanings',()=>{
 const profile={id:'test',position:'QB',archetype:'Test',ratings:RATING_FIELDS.map(()=>63)},coefficients=Object.assign(Object.create({UnrecognizedInheritedRating:999}),{SpeedRating:1});
 Object.defineProperty(coefficients,'UnrecognizedHiddenRating',{value:999,enumerable:false});
 const formula={position:'QB',playerType:'Test',intercept:.5,coefficients,minimumOverall:12,maximumOverall:99},index=formulaIndex([formula]);
 assert.equal(calculateOverall(profile,index),63);assert.equal(calculateOverall(profile,index),previousOverall(profile,index));
 coefficients.SpeedRating=2;assert.equal(calculateOverall(profile,index),99);
 coefficients.SpeedRating=0;assert.equal(calculateOverall(profile,index),12);
 coefficients.SpeedRating=1;formula.intercept=.50000001;assert.equal(calculateOverall(profile,index),64);
});

test('missing or invalid contributing ratings still fail rather than supplying invented defaults',()=>{
 const profile={id:'ea-2026:13473',position:'TE',archetype:'TE_VerticalThreat',ratings:RATING_FIELDS.map(()=>75)},formula={position:'TE',playerType:'TE_VerticalThreat',intercept:0,coefficients:{AwarenessRating:1},minimumOverall:1,maximumOverall:99},index=formulaIndex([formula]),at=RATING_FIELDS.indexOf('AwarenessRating');
 for(const value of [undefined,null,NaN,Infinity,'75']){const ratings=[...profile.ratings];ratings[at]=value;assert.throws(()=>calculateOverall({...profile,ratings},index),/Missing AwarenessRating in ea-2026:13473/);}
 const ratings=[...profile.ratings];ratings[at]=0;assert.equal(calculateOverall({...profile,ratings},index),1);
 formula.coefficients={UnknownRating:1};ratings.undefined=75;assert.throws(()=>calculateOverall({...profile,ratings},index),/Missing UnknownRating/);
 assert.throws(()=>calculateOverall(profile,new Map()),/No verified OVR formula/);
});
