import test from 'node:test';import assert from 'node:assert/strict';
import {normalizePromotionChances,DEFAULT_PROMOTION_CHANCES} from '../src/main/tools/jersey/promotionChances.js';
import {runRenumberEngine} from '../src/main/tools/jersey/core/renumberEngine.js';
import {runNoDuplicatesRoster} from '../src/main/tools/jersey/core/noDuplicatesEngine.js';
const player=(position,number,name)=>({Position:position,JerseyNum:number,originalJerseyNum:number,FirstName:name,LastName:'Test',TeamIndex:1,OverallRating:90,Age:22,SchoolYear:'Senior',RedshirtStatus:'Previous',IsNIL:false,eaRenumberAllowed:true,teamReservedNumbers:new Set(),retiredNumbers:new Set()});
test('promotion overrides validate without replacing missing legacy defaults',()=>{assert.deepEqual(normalizePromotionChances(),{});assert.equal(normalizePromotionChances({WR:0,QB:100}).WR,0);assert.ok(DEFAULT_PROMOTION_CHANCES.WR>0);for(const value of [null,[],{WR:-1},{QB:101},{WR:1.5},{WR:'10'},{BAD:20}])assert.throws(()=>normalizePromotionChances(value));});
test('zero QB chance also preserves a legal fallback number in No Duplicates',()=>{const qb=player('QB',20,'Fallback');runNoDuplicatesRoster([qb],'Test',{promotionChances:{QB:0},enablePromotions:true,enableTeamRules:false,enableRetiredNumbers:false,random:()=>0});assert.equal(qb.JerseyNum,20);});
for(const mode of ['standard','no-duplicates'])test(mode+' honors 0%/100% by position without disabling required corrections',()=>{
 const quiet=console.log;console.log=()=>{};try{
  for(const chance of [0,100]){const wr=player('WR',80,'Receiver'),cb=player('CB',30,'Corner'),bad=player('QB',99,'Invalid');const roster=[wr,cb,bad];const options={promotionChances:{WR:chance,CB:0,QB:0},enableTeamRules:false,enableRetiredNumbers:false,enablePromotions:true,random:()=>.99};
   if(mode==='standard')runRenumberEngine(new Map([[1,{offense:[wr,bad],defense:[cb],specialists:[]}]]),new Map([[1,'Test']]),options);else runNoDuplicatesRoster(roster,'Test',options);
   assert.equal(chance===0?wr.JerseyNum===80:wr.JerseyNum!==80,true);assert.equal(cb.JerseyNum,30);assert.notEqual(bad.JerseyNum,99);
  }
 }finally{console.log=quiet;}
});
