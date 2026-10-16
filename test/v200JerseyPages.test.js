import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { normalizeJerseyCustom } from '../src/main/tools/jersey/customRules.js';
import { jerseyConfigurationCatalog } from '../src/main/tools/jersey/shared.js';
import { getRetiredNumbers } from '../src/main/tools/jersey/core/retiredNumbers.js';
import { JERSEY_PERSONALITIES } from '../src/main/tools/jersey/personalities.js';
import { runRenumberEngine } from '../src/main/tools/jersey/core/renumberEngine.js';
import { runNoDuplicatesRoster } from '../src/main/tools/jersey/core/noDuplicatesEngine.js';

const rule = extra => ({ team:'Test',number:3,side:'offense',positions:['WR'],...extra });
const player = (name,overall,personality,extra={}) => ({ FirstName:name,LastName:'Player',TeamIndex:1,Position:'WR',SchoolYear:'Senior',RedshirtStatus:'Previous',IsNIL:false,JerseyNum:80,OverallRating:overall,Age:22,Personality:personality,...extra });
test('jersey personality choices match actual player enum values in both bundled schemas',()=>{
  for(const file of ['C27_468_2.gz','C27_486_6.gz']) {
    const schema=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../resources/engine-data/'+file,import.meta.url))));
    const stack=[schema];let verified=false;
    while(stack.length){const node=stack.pop();if(!node||typeof node!=='object')continue;
      if(node.name==='Personality'&&node.type==='Personality'&&node.enum?._members){assert.ok(JERSEY_PERSONALITIES.every(item=>node.enum._members.some(member=>member._name===item.value)));verified=true;break;}
      stack.push(...Object.values(node).filter(value=>value&&typeof value==='object'));
    }
    assert.ok(verified,file);
  }
});
test('old traditions retain any-personality behavior and invalid types are rejected',()=>{
  assert.equal(normalizeJerseyCustom({customTraditions:[rule({})]}).customTraditions[0].eligiblePersonalities,undefined);
  assert.equal(normalizeJerseyCustom({customTraditions:[rule({personality:''})]}).customTraditions[0].eligiblePersonalities,undefined);
  assert.deepEqual(normalizeJerseyCustom({customTraditions:[rule({personality:'TeamPlayer'})]}).customTraditions[0].eligiblePersonalities,['TeamPlayer']);
  for(const personality of ['Invalid_','FairWeather','Unknown',null]) assert.throws(()=>normalizeJerseyCustom({customTraditions:[rule({personality})]}),/personality type/);
});
for(const mode of ['standard','no-duplicates']) test(`${mode}: custom tradition intersects personality and position without modifying personality`,()=>{
  const records=[player('Higher WR',99,'Entertainer'),player('Eligible Leader',90,'Leader'),player('Leader QB',98,'Leader',{Position:'QB'})];
  const options={...normalizeJerseyCustom({customTraditions:[rule({personality:'Leader'})]}),enableTeamRules:true,enableRetiredNumbers:false,enablePromotions:false,random:()=>0};
  const log=console.log;console.log=()=>{};
  try { if(mode==='standard')runRenumberEngine(new Map([[1,{offense:records,defense:[],specialists:[]}]]),new Map([[1,'Test']]),options);else runNoDuplicatesRoster(records,'Test',options); }
  finally { console.log=log; }
  assert.equal(records.find(player=>player.FirstName==='Eligible Leader').JerseyNum,3);
  assert.notEqual(records.find(player=>player.FirstName==='Higher WR').JerseyNum,3);
  assert.notEqual(records.find(player=>player.FirstName==='Leader QB').JerseyNum,3);
  assert.equal(records.find(player=>player.FirstName==='Higher WR').Personality,'Entertainer');
  assert.equal(records.find(player=>player.FirstName==='Eligible Leader').Personality,'Leader');
});
test('retired-number configuration uses the same defaults and aliases as allocation',()=>{
  const catalog=jerseyConfigurationCatalog([{isEmpty:false,TeamIndex:1,DisplayName:'LSU'},{isEmpty:false,TeamIndex:2,DisplayName:'Louisiana State'},{isEmpty:false,TeamIndex:3,DisplayName:'Custom Team'}]);
  assert.deepEqual(catalog.retiredNumbers.LSU,[20,21,37]);assert.deepEqual(catalog.retiredNumbers['Louisiana State'],catalog.retiredNumbers.LSU);assert.deepEqual(catalog.retiredNumbers['Custom Team'],[]);
  assert.deepEqual([...getRetiredNumbers('LSU',{LSU:[]})],[]);
  assert.deepEqual([...getRetiredNumbers('LSU',{LSU:[9]})],[9]);
});
test('jersey editor has three real pages, jersey-number visuals, and no section-jump links',()=>{
  const script=fs.readFileSync(new URL('../src/renderer/jersey-settings.js',import.meta.url),'utf8'),refinements=fs.readFileSync(new URL('../src/renderer/refinements.js',import.meta.url),'utf8');
  for(const page of ['locks','retired','traditions'])assert.ok(script.includes(`data-jersey-page="${page}"`));
  assert.match(script,/jersey-number-art/);assert.match(script,/data-rule-personality/);assert.match(script,/prepared\.retiredNumbers/);
  assert.match(refinements,/classList\.contains\("jersey-custom-editor"\)\) return/);
  assert.doesNotMatch(refinements,/Details & Exceptions|inline-option-help/);
});
