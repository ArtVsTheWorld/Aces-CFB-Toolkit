import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {normalizeGenerationSettings,positionTalentTargets,archetypeWeight,toneWeights,observedFirstNames} from '../src/main/tools/rosterGenerator/settings.js';
import {validateRosterGeneratorSeason} from '../src/main/tools/rosterGenerator/season.js';
import {rosterPreset,modelForPreset} from '../src/main/tools/rosterGenerator/presets.js';
import {generateRosterPreview,validateRosterPreview} from '../src/main/tools/rosterGenerator/core.js';
import {finishGeneratedRoster,standardRosterNumbers} from '../src/main/tools/rosterGenerator/finishing.js';
import {createRosterStrata} from '../src/main/tools/rosterGenerator/sampling.js';
import {WRITE_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {runRenumberEngine} from '../src/main/tools/jersey/core/renumberEngine.js';
import {mulberry32} from '../src/main/tools/longSnap/core.js';
import {OFFENSE,SPECIALISTS} from '../src/main/tools/jersey/shared.js';
import RULES from '../src/main/tools/jersey/core/rules.js';

const sizes={QB:4,HB:5,FB:2,WR:9,TE:5,LT:4,LG:4,C:3,RG:4,RT:4,LE:4,RE:4,DT:6,LOLB:4,MLB:4,ROLB:4,CB:7,FS:3,SS:3,K:1,P:1};
function targets(){let row=0;return Object.entries(sizes).flatMap(([position,n])=>Array.from({length:n},()=>{const id=row++;return {row:id,position,visualRow:id,visualOwners:[id],rawData:'{"loadouts":[{"loadoutType":"PlayerOnField","loadoutElements":[]}]}',original:{...Object.fromEntries(WRITE_FIELDS.map(field=>[field,0])),FirstName:'Original',LastName:String(id),RecruitingDealbreaker:'Invalid',OverallRating:70}};}));}
const team={name:'Test Team',teamIndex:1,branding:'nike'};
function build(options={},id='building-blocks',seed=205){const input=targets(),settings=normalizeGenerationSettings(options),preset=rosterPreset(id),model=modelForPreset(loadObservedCatalog(),preset,settings,positionTalentTargets(input,preset,settings));return {input,model,preview:generateRosterPreview({team,targets:input,model,preset,seed})};}

test('position talent is weighted, zero-sum, validated and bounded',()=>{
  const input=targets(),preset=rosterPreset(),settings=normalizeGenerationSettings({positionStrength:{QB:10,WR:5,OL:-3}}),budget=positionTalentTargets(input,preset,settings);
  const counts={};for(const p of input){const g=['LT','LG','C','RG','RT'].includes(p.position)?'OL':['LE','RE'].includes(p.position)?'EDGE':['LOLB','MLB','ROLB'].includes(p.position)?'LB':['K','P'].includes(p.position)?'K/P':p.position;counts[g]=(counts[g]??0)+1;}
  assert.ok(Math.abs(Object.entries(counts).reduce((n,[g,c])=>n+c*budget[g],0)/input.length-69)<1e-8);assert.ok(budget.QB>69);assert.ok(budget.OL<69);assert.ok(Object.entries(budget).some(([group,value])=>group!=='QB'&&group!=='WR'&&value<69));
  for(const value of [1.5,11,-11,'5',NaN])assert.throws(()=>normalizeGenerationSettings({positionStrength:{QB:value}}));assert.throws(()=>normalizeGenerationSettings({positionStrength:{Age:1}}));assert.throws(()=>normalizeGenerationSettings({offensiveScheme:'invented'}));
});
test('all revised calibers meet the team target and stronger QB rooms trade talent with the rest',()=>{
  for(const id of ['startup','fcs','building-blocks','competitive','contender','blue-blood','all-time']){const {preview}=build({},id);assert.ok(preview.summary.targetAchieved,`${id}: ${preview.summary.newAverage}`);assert.ok(Math.abs(preview.summary.newAverage-rosterPreset(id).targetAverage)<.1);}
  const {preview}=build({positionStrength:{QB:8,WR:3,OL:-3}});assert.ok(preview.summary.targetAchieved);assert.ok(preview.summary.positionStrength.QB.actual>72);assert.ok(Math.abs(preview.summary.positionStrength.QB.actual-preview.summary.positionStrength.QB.target)<2);assert.ok(preview.summary.positionStrength.OL.actual<70);assert.ok(Math.abs(preview.summary.newAverage-69)<.1);
});
test('scheme weights favor actual supported archetypes without eliminating any',()=>{
  const air=normalizeGenerationSettings({offensiveScheme:'air-raid',defensiveScheme:'3-4'});assert.equal(archetypeWeight('QB','QB_FieldGeneral',air),3);assert.equal(archetypeWeight('QB','QB_PureScrambler',air),1);assert.equal(archetypeWeight('DT','DT_NoseTackle',air),3);assert.equal(archetypeWeight('CB','CB_Zone',air),1);
  const a=build({offensiveScheme:'option',defensiveScheme:'nickel'});assert.ok(a.preview.summary.targetAchieved);for(const p of a.preview.players)assert.ok(a.model.byId.has(p.provenance.football));
});
test('tone presets use verified 1–8 tones; names only come from the exact observed head pool',()=>{
  const base=loadObservedCatalog(),appearance=base.catalog.appearances.find(item=>observedFirstNames(base.catalog,item).length>1);assert.ok(appearance);assert.deepEqual(observedFirstNames(base.catalog,appearance),[...new Set(base.catalog.appearances.filter(item=>item.fields.GenericHeadAssetName===appearance.fields.GenericHeadAssetName).map(item=>item.firstToken))].sort());
  const big=build({skinTonePreset:'big-sky'}).preview,hbcu=build({skinTonePreset:'hbcu'}).preview;
  const light=big.players.filter(p=>p.provenance.skinTone<=4).length,dark=hbcu.players.filter(p=>[6,7].includes(p.provenance.skinTone)).length;assert.ok(light/big.players.length>.60);assert.ok(dark/hbcu.players.length>.85);
  for(const p of [...big.players,...hbcu.players]){const face=base.catalog.appearances.find(a=>a.id===p.provenance.appearance);assert.ok(observedFirstNames(base.catalog,face).includes(p.fields.FirstName));assert.ok(p.provenance.skinTone>=1&&p.provenance.skinTone<=8);}
});
test('development targets have seeded variation and are controlled only by Roster Potential',()=>{
  const base=loadObservedCatalog(),input=targets(),totals={};
  for(const potential of ['standard','dead-end','low','high','sky']){
    const settings=normalizeGenerationSettings({rosterPotential:potential}),model=modelForPreset(base,rosterPreset('building-blocks'),settings);let sum={Normal:0,College_Impact:0,College_Star:0,College_Elite:0};const variants=new Set();
    for(let seed=0;seed<20;seed++){const strata=createRosterStrata(input,model,seed);variants.add(JSON.stringify(strata.expectedDevelopment));for(const value of strata.byRow.values())sum[value.development]++;}
    totals[potential]=Object.fromEntries(Object.entries(sum).map(([key,value])=>[key,value/20]));if(potential!=='dead-end')assert.ok(variants.size>1);
  }
  assert.equal(totals['dead-end'].Normal,input.length);assert.ok(totals.low.Normal>70);assert.ok(totals.low.College_Star<1);assert.ok(totals.low.College_Elite<.5);assert.ok(totals.high.College_Elite>=4);assert.ok(totals.sky.College_Elite>=8);assert.ok(totals.sky.Normal<30);
  const standard=modelForPreset(base,rosterPreset('startup')),strong=modelForPreset(base,rosterPreset('all-time'));
  assert.deepEqual(standard.sampling.development,strong.sampling.development);assert.deepEqual(standard.sampling.classes,strong.sampling.classes);
});
test('finishing reuses long-snap/dealbreaker fixes then the exact Standard number engine',()=>{
  const players=[{row:0,position:'TE',fields:{FirstName:'Alex',LastName:'North',SchoolYear:'Senior',RedshirtStatus:'Previous',OverallRating:70,LongSnapRating:1,RecruitingDealbreaker:'Invalid'}},{row:1,position:'LT',fields:{FirstName:'Casey',LastName:'West',SchoolYear:'Junior',RedshirtStatus:'Eligible',OverallRating:75,LongSnapRating:99,RecruitingDealbreaker:'PlayingStyle'}}];
  const audit=finishGeneratedRoster(players,team,15);assert.equal(audit.longSnap.length,2);assert.ok(players[0].fields.LongSnapRating>=45);assert.ok(players[1].fields.LongSnapRating<=75);assert.notEqual(players[1].fields.RecruitingDealbreaker,'PlayingStyle');assert.equal(audit.jersey.teamTraditions,false);assert.equal(audit.jersey.retiredProtection,false);
  const seed=99,random=mulberry32(seed),sides={offense:[],defense:[],specialists:[]};for(const input of players){const pool=RULES[input.position].preferred.flat(),number=pool[Math.floor(random()*pool.length)],record={...input.fields,Position:input.position,TeamIndex:0,IsNIL:false,JerseyNum:number,originalJerseyNum:number,row:input.row};sides[SPECIALISTS.has(input.position)?'specialists':OFFENSE.has(input.position)?'offense':'defense'].push(record);}runRenumberEngine(new Map([[0,sides]]),new Map([[0,team.name]]),{enableTeamRules:false,enableRetiredNumbers:false,enablePromotions:true,random});assert.deepEqual(standardRosterNumbers(players,team.name,seed).assigned,new Map(Object.values(sides).flat().map(p=>[p.row,p.JerseyNum])));
  const {input,model,preview}=build();for(const field of ['LongSnapRating','RecruitingDealbreaker','JerseyNum']){const copy=structuredClone(preview);copy.players[0].fields[field]=field==='RecruitingDealbreaker'?'PlayingStyle':99;assert.throws(()=>validateRosterPreview(copy,input,model));}
});
test('week gate allows only preseason and week zero, and no seed control remains',()=>{
  for(const CurrentWeekType of ['PreSeason','RegularSeason'])assert.doesNotThrow(()=>validateRosterGeneratorSeason({CurrentWeekType,CurrentWeek:0}));
  for(const [CurrentWeekType,CurrentWeek] of [['RegularSeason',1],['BowlSeason1',17],['OffSeason',0],['PreSeason',1],['RegularSeason',-1],['',0]])assert.throws(()=>validateRosterGeneratorSeason({CurrentWeekType,CurrentWeek}),/only in Preseason or Week 0/);
  const page=fs.readFileSync(new URL('../src/renderer/roster-generator.js',import.meta.url),'utf8');assert.ok(!page.includes('id="roster-seed"'));assert.ok(page.includes('roster-strength-config'));assert.ok(page.includes('roster-scheme-config'));
});
