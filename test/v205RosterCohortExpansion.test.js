import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadObservedCatalog,prepareObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {isGeneratedProfile,developmentReferenceProfiles} from '../src/main/tools/rosterGenerator/cohorts.js';
import {modelForPreset,rosterPreset} from '../src/main/tools/rosterGenerator/presets.js';
import {normalizeGenerationSettings,observedFirstNames} from '../src/main/tools/rosterGenerator/settings.js';
import {rosterSamplingPolicy} from '../src/main/tools/rosterGenerator/sampling.js';
import {generateRosterPreview,validateRosterPreview} from '../src/main/tools/rosterGenerator/core.js';
import {WRITE_FIELDS,RATING_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {loadCommentaryMap} from '../src/main/tools/commentary/map.js';
import {createCommentaryMatcher} from '../src/main/tools/commentary/matcher.js';
import {reviewCommentaryObservations} from '../scripts/lib/commentary-observations.mjs';

const base=loadObservedCatalog();
test('catalog includes every audited generated cohort without changing the default development reference',()=>{
  assert.deepEqual(base.catalog.sources.map(s=>[s.id,s.mainProfiles]),[['ea-2026',11730],['generated-2032',11730],['generated-2038',11730]]);
  assert.equal(base.profiles.length,35190);assert.equal(base.profiles.filter(isGeneratedProfile).length,23460);assert.equal(base.catalog.appearances.length,23460);
  assert.equal(base.catalog.names.first.length,1187);assert.equal(base.catalog.names.last.length,4540);
  assert.equal(new Set(base.catalog.appearances.map(a=>a.fields.GenericHeadAssetName)).size,4211);
  assert.ok(developmentReferenceProfiles(base).every(profile=>profile.source===1));
  const policy=rosterSamplingPolicy(base,normalizeGenerationSettings()),reference=base.profiles.filter(p=>p.source===1);
  for(const tier of ['Normal','College_Impact','College_Star','College_Elite'])assert.equal(policy.development[tier],100*reference.filter(p=>p.development===tier).length/reference.length);
  const model=modelForPreset(base,rosterPreset());
  for(const position of base.byPosition.keys()){
    assert.ok(model.byPosition.get(position).some(p=>p.source===2),position);
    assert.ok(model.potentialByPosition.get(position).some(p=>p.source===2),position);
  }
});

test('same-head first-name pools retain every observed pairing, not the first eight alphabetically',()=>{
  const heads=new Map();for(const appearance of base.catalog.appearances){const key=appearance.fields.GenericHeadAssetName;if(!heads.has(key))heads.set(key,new Set());heads.get(key).add(appearance.firstToken);}
  let largePools=0;for(const [head,names]of heads){const result=observedFirstNames(base.catalog,{fields:{GenericHeadAssetName:head}});assert.deepEqual(result,[...names].sort());if(names.size>8)largePools++;}
  assert.equal(largePools,965);
});

test('unknown source references remain rejected for football, appearance and styles',()=>{
  for(const change of [c=>c.profiles[0].source=3,c=>c.profiles[0].source=-1,c=>c.appearances[0].source=3,c=>c.appearances[0].source=0,c=>c.styles[0].source=3,c=>c.sources.push({...c.sources[0]})]){
    const c=structuredClone(base.catalog);change(c);assert.throws(()=>prepareObservedCatalog(c));
  }
});

test('2038 profiles, potential and appearances are used in deterministic validated generation',{timeout:60000},()=>{
  const positions={QB:4,HB:5,FB:2,WR:9,TE:5,LT:4,LG:4,C:3,RG:4,RT:4,LE:4,RE:4,DT:6,LOLB:4,MLB:4,ROLB:4,CB:7,FS:3,SS:3,K:1,P:1};let row=0;
  const targets=Object.entries(positions).flatMap(([position,n])=>Array.from({length:n},()=>{const id=row++;return {row:id,position,visualRow:id,visualOwners:[id],rawData:'{"loadouts":[{"loadoutType":"PlayerOnField","loadoutElements":[]}]}',original:{...Object.fromEntries(WRITE_FIELDS.map(field=>[field,0])),FirstName:'Old',LastName:String(id),OverallRating:70,RecruitingDealbreaker:'Invalid'}};}));
  const preset=rosterPreset(),model=modelForPreset(base,preset),input={team:{name:'Test Team',teamIndex:1,branding:'nike'},targets,model,preset,seed:2038},preview=generateRosterPreview(input);
  assert.ok(preview.summary.targetAchieved);assert.equal(validateRosterPreview(preview,targets,model),true);
  assert.deepEqual(generateRosterPreview({...input,targets:[...targets].reverse()}),preview);
  for(const key of ['football','potential','appearance'])assert.ok(preview.players.some(p=>p.provenance[key].startsWith('generated-2038:')),key);
  for(const player of preview.players){const football=base.byId.get(player.provenance.football);assert.deepEqual(Array.from({length:3},(_,i)=>[player.fields[`MentalAbility${i+1}`],player.fields[`MentalAbilityRank${i+1}`]]),football.mental);assert.deepEqual(Array.from({length:5},(_,i)=>player.fields[`PhysicalAbility${i+1}`]),football.physical);assert.ok(RATING_FIELDS.every(field=>Number.isInteger(player.fields[field])));}
});

test('verified commentary additions match exactly, including suffix and hyphen fallbacks',()=>{
  const proof=JSON.parse(fs.readFileSync(new URL('./fixtures/commentary2038Observations.json',import.meta.url))),map=loadCommentaryMap(new URL('../resources/commentary-data/PlayerCommentaryidMap.txt',import.meta.url)),match=createCommentaryMatcher(map,{allowFirstName:false});
  assert.equal(proof.additions.length,23);assert.equal(map.size,7055);
  for(const item of proof.additions){assert.ok(item.distinctFirstNames>=2);assert.equal(item.rejection,null);assert.deepEqual(item.existingIDNames,[]);assert.equal(map.get(item.name),item.id);assert.equal(match('Unmapped',item.name).id,item.id);assert.equal(match('Unmapped',item.name+' IV').id,item.id);assert.equal(match('Unmapped','Unmapped-'+item.name).id,item.id);}
});

test('name evidence cannot promote fallbacks, conflicting IDs, singletons or shared unknown IDs',()=>{
  const map=new Map([['Known',10],['First',11]]),rows=[
    {first:'A',last:'Good',id:20},{first:'B',last:'Good',id:20},
    {first:'A',last:'Conflicting',id:21},{first:'B',last:'Conflicting',id:22},
    {first:'First',last:'Fallback',id:11},{first:'First',last:'Fallback',id:11},
    {first:'A',last:'KnownCollision',id:10},{first:'B',last:'KnownCollision',id:10},
    {first:'A',last:'Singleton',id:23},
    {first:'A',last:'UnknownAlias',id:24},{first:'B',last:'UnknownAlias',id:24},
    {first:'C',last:'AnotherAlias',id:24},{first:'D',last:'AnotherAlias',id:25},
    {first:'A',last:'Zero',id:0},{first:'B',last:'Zero',id:0},
    {first:'A',last:'Known',id:99}
  ];
  const result=reviewCommentaryObservations(rows,map);assert.deepEqual(result.accepted.map(c=>[c.name,c.id]),[['Good',20]]);assert.equal(result.counts.firstNameFallback,2);assert.equal(result.counts.noID,2);assert.equal(result.mismatches.length,1);assert.equal(map.get('Known'),10);
});
