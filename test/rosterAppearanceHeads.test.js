import test from 'node:test';import assert from 'node:assert/strict';
import{PORTRAIT_REVIEWED_HEADS,portraitHeadFamily,createMixHeadHistory,selectPortraitReviewedAppearance}from'../src/main/tools/rosterGenerator/appearanceHeads.js';
import{loadObservedCatalog}from'../src/main/tools/rosterGenerator/catalog.js';import{mulberry32}from'../src/main/tools/longSnap/core.js';
const catalog=loadObservedCatalog().catalog;
test('portrait-reviewed IDs are unique observed tone-4 heads covering all existing positions',()=>{
 assert.equal(PORTRAIT_REVIEWED_HEADS.length,424);assert.equal(new Set(PORTRAIT_REVIEWED_HEADS.map(portraitHeadFamily)).size,70);
 const observed=new Set(catalog.appearances.map(a=>a.fields.GenericHeadAssetName));for(const h of PORTRAIT_REVIEWED_HEADS){assert.ok(observed.has(h));assert.match(h,/_4_[1-4]$/);}
 for(const position of new Set(catalog.appearances.map(a=>a.position)))assert.ok(catalog.appearances.some(a=>a.position===position&&PORTRAIT_REVIEWED_HEADS.includes(a.fields.GenericHeadAssetName)),position);
});
test('mix selection spreads template families before reusing them and stays inside the supplied compatible pool',()=>{
 const chosen=[];for(const family of new Set(PORTRAIT_REVIEWED_HEADS.map(portraitHeadFamily)))chosen.push(...PORTRAIT_REVIEWED_HEADS.filter(h=>portraitHeadFamily(h)===family).slice(0,3));
 const pool=chosen.map(head=>({fields:{GenericHeadAssetName:head},sentinel:head})),history=createMixHeadHistory(),rng=mulberry32(42),families=[];
 for(let i=0;i<70;i++){const a=selectPortraitReviewedAppearance(pool,history,rng);assert.ok(pool.includes(a));families.push(portraitHeadFamily(a.fields.GenericHeadAssetName));}
 assert.equal(new Set(families).size,70);
 for(let i=0;i<200;i++)selectPortraitReviewedAppearance(pool,history,rng);
 assert.equal([...history.families.values()].reduce((a,b)=>a+b,0),270);assert.ok(Math.max(...history.families.values())-Math.min(...history.families.values())<=1);
});
test('small compatible pools keep working and unsupported appearances never become a fallback',()=>{
 const heads=PORTRAIT_REVIEWED_HEADS.filter(h=>portraitHeadFamily(h)===portraitHeadFamily(PORTRAIT_REVIEWED_HEADS[0])).slice(0,3),pool=heads.map(head=>({fields:{GenericHeadAssetName:head}})),history=createMixHeadHistory(),rng=mulberry32(8);
 for(let i=0;i<3;i++)selectPortraitReviewedAppearance(pool,history,rng);assert.equal(history.heads.size,3);
 for(let i=0;i<100;i++)assert.ok(pool.includes(selectPortraitReviewedAppearance(pool,history,rng)));
 const unsupported={fields:{GenericHeadAssetName:'Generic_9999_P_T9999_M_4_1'}};assert.throws(()=>selectPortraitReviewedAppearance([unsupported],history,rng),/portrait-reviewed/);
 assert.equal(selectPortraitReviewedAppearance([unsupported,pool[0]],history,rng),pool[0]);
});
