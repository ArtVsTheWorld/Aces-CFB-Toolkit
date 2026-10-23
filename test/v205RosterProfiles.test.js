import test from 'node:test';
import assert from 'node:assert/strict';
import TALENT from '../src/shared/rosterTalent.cjs';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {modelForPreset,rosterPreset,ROSTER_PRESETS} from '../src/main/tools/rosterGenerator/presets.js';
import {normalizeGenerationSettings,ROSTER_AGES,ROSTER_POTENTIALS} from '../src/main/tools/rosterGenerator/settings.js';
import {createRosterStrata,rosterSamplingPolicy} from '../src/main/tools/rosterGenerator/sampling.js';
import {generateRosterPreview,validateRosterPreview} from '../src/main/tools/rosterGenerator/core.js';
import {athleticVariant,appearancePoolForAthletics,potentialCandidates,ATHLETICISM_PROFILES} from '../src/main/tools/rosterGenerator/athletics.js';
import {surnameVariant,makeSurname,validSurname} from '../src/main/tools/rosterGenerator/names.js';
import {WRITE_FIELDS,RATING_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {mulberry32} from '../src/main/tools/longSnap/core.js';
import {rosterGeneratorCsv} from '../src/main/tools/rosterGenerator/report.js';
import {createCommentaryMatcher} from '../src/main/tools/commentary/matcher.js';

const sizes={QB:4,HB:5,FB:2,WR:9,TE:5,LT:4,LG:4,C:3,RG:4,RT:4,LE:4,RE:4,DT:6,LOLB:4,MLB:4,ROLB:4,CB:7,FS:3,SS:3,K:1,P:1};
function targets(){let row=0;return Object.entries(sizes).flatMap(([position,n])=>Array.from({length:n},()=>{const id=row++;return {row:id,position,visualRow:id,visualOwners:[id],rawData:'{"loadouts":[{"loadoutType":"PlayerOnField","loadoutElements":[]}]}',original:{...Object.fromEntries(WRITE_FIELDS.map(field=>[field,0])),FirstName:'Old',LastName:String(id),OverallRating:70,RecruitingDealbreaker:'Invalid'}};}));}
const base=loadObservedCatalog(),input=targets(),team={name:'Test Team',teamIndex:1,branding:'nike'};

test('independent talent edits leave every other group unchanged and require exactly 100% to save',()=>{
  const counts={QB:4,WR:9,OL:19,EDGE:8},initial=TALENT.baseline(counts),first=TALENT.editShare(initial,'QB',initial.QB+5,counts);
  assert.equal(first.QB,initial.QB+5);for(const group of TALENT.groups.filter(g=>g!=='QB'))assert.equal(first[group],initial[group]);
  assert.match(TALENT.allocationError(first),/exactly 100%/);
  const second=TALENT.editShare(first,'WR',first.WR-5,counts);assert.equal(second.QB,first.QB);assert.equal(TALENT.allocationError(second),'');
  const tooLow=TALENT.editShare(second,'QB',0,counts);assert.match(TALENT.allocationError(tooLow),/exactly 100%/);
  assert.deepEqual(TALENT.editShare(second,'FB',50,counts),second);assert.deepEqual(TALENT.editShare(second,'Unknown',50,counts),second);
  for(const invalid of [{QB:100.5},{QB:'100'},{QB:101},{Unknown:100},[],{}])assert.ok(TALENT.allocationError(invalid));
  assert.equal(TALENT.allocationError(null),'');assert.equal(TALENT.allocationError(initial),'');
});

test('caliber has exactly seven choices and does not control age or potential',()=>{
  assert.deepEqual(ROSTER_PRESETS.map(p=>[p.name,p.targetAverage]),[['From Nothing',60],['FCS Call-Up',64],['Building Blocks',69],['Competitive',72],['Contender',75],['Blue Blood',79],['All-Time Team',83]]);
  for(const rosterAge of ROSTER_AGES.map(p=>p.id))for(const rosterPotential of ROSTER_POTENTIALS.map(p=>p.id)){
    const settings=normalizeGenerationSettings({rosterAge,rosterPotential}),low=modelForPreset(base,rosterPreset('startup'),settings),high=modelForPreset(base,rosterPreset('all-time'),settings);
    assert.deepEqual(low.sampling,high.sampling);
    for(const model of [low,high]){const strata=createRosterStrata(input,model,205);assert.equal(strata.byRow.size,input.length);if(rosterAge==='seniors')for(const player of strata.byRow.values()){assert.equal(player.classYear,'Senior');assert.equal(player.redshirt,'Previous');}if(rosterPotential==='dead-end')for(const player of strata.byRow.values())assert.equal(player.development,'Normal');}
  }
  assert.throws(()=>normalizeGenerationSettings({rosterAge:'invented'}));assert.throws(()=>normalizeGenerationSettings({rosterPotential:'invented'}));
});

test('all age/potential combinations generate valid rosters, including young stars and weak redshirt seniors',{timeout:180000},()=>{
  for(const age of ROSTER_AGES)for(const potential of ROSTER_POTENTIALS){
    const preset=rosterPreset(potential.id==='dead-end'?'all-time':age.id==='seniors'?'startup':'building-blocks'),settings=normalizeGenerationSettings({rosterAge:age.id,rosterPotential:potential.id}),model=modelForPreset(base,preset,settings),preview=generateRosterPreview({team,targets:input,model,preset,seed:205});
    assert.ok(preview.summary.targetAchieved,`${age.id}/${potential.id}: ${preview.summary.newAverage}`);assert.equal(preview.blocking.length,0);assert.ok(Math.abs(preview.summary.newAverage-preset.targetAverage)<.1);
    if(age.id==='seniors')for(const player of preview.players){assert.equal(player.fields.SchoolYear,'Senior');assert.equal(player.fields.RedshirtStatus,'Previous');}
    if(potential.id==='dead-end')assert.equal(preview.summary.developmentCounts.Normal,input.length);
    const younger=preview.players.filter(p=>['Freshman','Sophomore'].includes(p.fields.SchoolYear)).length;if(age.id==='youth'){assert.ok(younger/input.length>.6&&younger/input.length<.8);assert.ok(preview.players.some(p=>p.fields.SchoolYear==='Senior'));}if(age.id==='veteran')assert.ok(younger/input.length<.4);
    assert.equal(validateRosterPreview(preview,input,model),true);
    const csv=rosterGeneratorCsv(preview);assert.equal(csv.headings.length,csv.rows[0].length);for(const column of ['PotentialSource','AthleticismProfile','SurnameEvidenceJSON'])assert.ok(csv.headings.includes(column));
  }
});
test('Youth Movement reverses Veteran Heavy class weights without excluding seniors',()=>{
  const youth=rosterSamplingPolicy(base,normalizeGenerationSettings({rosterAge:'youth'})),veteran=rosterSamplingPolicy(base,normalizeGenerationSettings({rosterAge:'veteran'}));
  assert.deepEqual(youth.classes,{Freshman:40,Sophomore:30,Junior:20,Senior:10});assert.deepEqual(Object.values(youth.classes),Object.values(veteran.classes).reverse());
  assert.ok(Object.values(youth.redshirts.Senior).some(weight=>weight>0));
});

test('athletic profiles reshape ratings and observed builds without lowering unknown ability requirements',()=>{
  const model=modelForPreset(base,rosterPreset()),source=model.profiles.find(p=>p.position==='QB'&&p.physical.every(t=>t==='None')),speed=athleticVariant(model,source,'speed'),technical=athleticVariant(model,source,'technical'),freak=athleticVariant(model,source,'freak');
  const value=(profile,field)=>profile.ratings[RATING_FIELDS.indexOf(field)];assert.ok(value(speed,'SpeedRating')>value(technical,'SpeedRating'));assert.ok(value(freak,'SpeedRating')>value(technical,'SpeedRating'));assert.ok(value(technical,'ThrowAccuracyShortRating')>=value(freak,'ThrowAccuracyShortRating'));
  for(const observed of model.profiles.filter(p=>p.physical.some(t=>t!=='None')).slice(0,30))for(const profile of ATHLETICISM_PROFILES){const result=athleticVariant(model,observed,profile.id),raw=base.byId.get(observed.id);assert.ok(result.ratings.every((rating,i)=>Number.isInteger(rating)&&rating>=1&&rating<=99&&rating>=raw.ratings[i]));assert.deepEqual(result.physical,raw.physical);}
  const pool=base.catalog.appearances.filter(p=>p.position==='WR'),small=appearancePoolForAthletics(pool,'speed'),big=appearancePoolForAthletics(pool,'size'),average=(items,field)=>items.reduce((sum,item)=>sum+item.fields[field],0)/items.length;assert.ok(average(small,'Weight')<average(big,'Weight'));assert.ok(average(small,'Height')<average(big,'Height'));
});

test('potential uses whole observed cap packages, with stricter and more lenient alternatives',()=>{
  const score=p=>p.caps.reduce((a,b)=>a+b,0),means={};
  for(const potential of ['dead-end','low','standard','high','sky']){const model=modelForPreset(base,rosterPreset(),normalizeGenerationSettings({rosterPotential:potential})),pool=potentialCandidates(model,'QB','QB_FieldGeneral','Normal');assert.ok(pool.length);means[potential]=pool.reduce((sum,p)=>sum+score(p),0)/pool.length;for(const p of pool)assert.deepEqual(p.caps,base.byId.get(p.id).caps);}
  assert.ok(means['dead-end']<=means.low);assert.ok(means.low<=means.standard);assert.ok(means.standard<=means.high);assert.ok(means.high<=means.sky);
});

test('rare suffix/hyphen generation fits save lengths and remains compatible with surname evidence',()=>{
  const names=base.catalog.names.last,rng=mulberry32(205);let hyphens=0,suffixes=0;const seen=new Set();
  for(let i=0;i<10000;i++){const variant=surnameVariant(names,rng),surname=makeSurname(names,rng,variant);assert.ok(surname);assert.ok(validSurname(surname.value,surname,names));assert.ok(Buffer.byteLength(surname.value)<=21);if(variant.hyphen)hyphens++;if(variant.suffix){suffixes++;seen.add(variant.suffix);}}
  assert.ok(hyphens>50&&hyphens<250);assert.ok(suffixes>100&&suffixes<350);assert.equal(seen.size,4);assert.equal(validSurname('Invented Jr.',{parts:['Invented'],suffix:'Jr.'},names),false);
  const match=createCommentaryMatcher(new Map([['Johnson',101],['Josh-Johnson',102]]));assert.equal(match('Prince','Johnson IV').id,101);assert.equal(match('Prince','Josh-Johnson Jr.').id,102);assert.equal(match('Prince','North-Johnson II').id,101);
});

test('post-preview tampering cannot change athletic identity, potential packages or surname evidence',()=>{
  const preset=rosterPreset(),model=modelForPreset(base,preset),preview=generateRosterPreview({team,targets:input,model,preset,seed:205});
  for(const change of [p=>p.fields.TraitDevelopment='College_Elite',p=>p.fields.SkillGroupCap1=p.fields.SkillGroupCap1===20?2:20,p=>p.provenance.athleticProfile='invented',p=>p.provenance.potential='missing',p=>p.fields.LastName='Unobserved-Invented Jr.']){const copy=structuredClone(preview);change(copy.players[0]);assert.throws(()=>validateRosterPreview(copy,input,model));}
});
