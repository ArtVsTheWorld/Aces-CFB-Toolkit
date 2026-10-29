import test from 'node:test';import assert from 'node:assert/strict';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {modelForPreset,rosterPreset} from '../src/main/tools/rosterGenerator/presets.js';
import {athleticReferences,selectAthleticPackage,calibratedAthleticProfile,appearancePoolForPhysicalPackage} from '../src/main/tools/rosterGenerator/athleticSelection.js';
import {RATING_FIELDS,WRITE_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {ATHLETIC_RATINGS,observedAthleticBounds} from '../src/main/tools/rosterGenerator/athleticBounds.js';
import {generateRosterPreview,validateRosterPreview,solveFootballProfiles} from '../src/main/tools/rosterGenerator/core.js';
import {normalizeGenerationSettings,positionTalentTargets} from '../src/main/tools/rosterGenerator/settings.js';
import {mulberry32} from '../src/main/tools/longSnap/core.js';
const base=loadObservedCatalog(),preset=rosterPreset('all-time'),model=modelForPreset(base,preset),index=f=>RATING_FIELDS.indexOf(f);
const sizes={QB:4,HB:5,FB:2,WR:9,TE:5,LT:4,LG:4,C:3,RG:4,RT:4,LE:4,RE:4,DT:6,LOLB:4,MLB:4,ROLB:4,CB:7,FS:3,SS:3,K:1,P:1};
function targets(){let row=0;return Object.entries(sizes).flatMap(([position,n])=>Array.from({length:n},()=>{const id=row++;return {row:id,position,visualRow:id,visualOwners:[id],rawData:'{"loadouts":[{"loadoutType":"PlayerOnField","loadoutElements":[]}]}',original:{...Object.fromEntries(WRITE_FIELDS.map(f=>[f,0])),FirstName:'Original',LastName:String(id),OverallRating:70}};}));}
test('conditional references use unmodified EA data and remain in the requested exact position',()=>{
 for(const position of ['WR','QB','DT','LT','FS']){
  const reference=athleticReferences(model,position,null,85,'Senior','Previous');assert.ok(reference.pool.length);assert.ok(reference.pool.every(p=>p.source===0&&p.position===position));assert.ok(reference.scales.every(s=>Number.isFinite(s)&&s>=4));
 }
 assert.equal(athleticReferences(model,'Unknown',null,80),null);
 const missing=athleticReferences(model,'TE','UnknownFutureArchetype',99,'Senior','Previous');assert.ok(missing.fallbackLevel>=3);assert.ok(missing.pool.every(p=>p.position==='TE'));
});
test('an appropriate native WR package is preferred over a weak package promoted by 20+ overall points',()=>{
 const pool=model.byPosition.get('WR'),weak=pool.find(p=>base.byId.get(p.id).overall<=58&&p.physical.every(t=>t==='None')&&p.ratings[index('SpeedRating')]<83);assert.ok(weak);
 const observed=base.byId.get(weak.id),good=pool.find(p=>p.classYear===observed.classYear&&p.redshirt===observed.redshirt&&p.archetype===observed.archetype&&Math.abs(base.byId.get(p.id).overall-80)<=3&&p.physical.every(t=>t==='None'));assert.ok(good);
 for(let seed=0;seed<20;seed++){
  const selected=selectAthleticPackage(model,[weak,good],80,'balanced',mulberry32(seed),observed.archetype);assert.equal(selected.profile.id,good.id);assert.equal(selected.profile.overall,80);
  for(const candidate of selected.pool)for(const field of ATHLETIC_RATINGS)assert.equal(candidate.ratings[index(field)],base.byId.get(good.id).ratings[index(field)],'Balancing retains the complete physical vector');
 }
});
test('target-specific athletic variants cannot reuse a stale calibration or weaken ability floors',()=>{
 const source=model.byPosition.get('WR').find(p=>p.physical.every(t=>t==='None'));
 const low=calibratedAthleticProfile(model,source,75,'speed'),high=calibratedAthleticProfile(model,source,90,'speed');assert.equal(low.overall,75);assert.equal(high.overall,90);assert.notDeepEqual(low.ratings,high.ratings);
 const active=model.byPosition.get('DT').find(p=>p.physical.some(t=>t!=='None')),native=base.byId.get(active.id),result=calibratedAthleticProfile(model,active,40,'balanced');assert.deepEqual(result.physical,native.physical);assert.ok(result.ratings.every((value,i)=>value>=native.ratings[i]));assert.ok(result.ratings[index('SpeedRating')]<=observedAthleticBounds(model,'DT')[index('SpeedRating')].maximum);
});
test('normal appearance selection retains a nearby observed body; deliberate size outliers keep their pool',()=>{
 const source=model.byPosition.get('HB')[0],all=base.catalog.appearances.filter(a=>a.position==='HB'),observed=all.find(a=>a.id===source.id),selected=appearancePoolForPhysicalPackage(model,all,source,'balanced');assert.ok(observed);assert.ok(selected.includes(observed));assert.ok(selected.every(a=>Math.abs(a.fields.Height-observed.fields.Height)*3+Math.abs(a.fields.Weight-observed.fields.Weight)<=12));assert.strictEqual(appearancePoolForPhysicalPackage(model,all,source,'outlier'),all);
});
test('unsorted rosters replay exactly, preserve settings and reject physical provenance/diagnostic tampering',()=>{
 const input=targets().reverse(),settings=normalizeGenerationSettings({talentMix:'playmakers',rosterAge:'veteran',rosterPotential:'high'}),m=modelForPreset(base,preset,settings,positionTalentTargets(input,preset,settings)),args={team:{name:'Test Team',teamIndex:1,branding:'nike'},targets:input,model:m,preset,seed:246},preview=generateRosterPreview(args);
 assert.deepEqual(preview.summary.settings,settings);assert.ok(preview.summary.targetAchieved);assert.ok(preview.players.every(p=>p.provenance.athleticSelection));assert.equal(validateRosterPreview(preview,input,m),true);
 const corrupted=structuredClone(preview);corrupted.players[0].provenance.athleticSelection.referenceId='made-up';assert.throws(()=>validateRosterPreview(corrupted,input,m),/conditional selection/);
 const diagnostic=structuredClone(preview);diagnostic.summary.athletics.QB.physicalMeans.SpeedRating=99;assert.throws(()=>validateRosterPreview(diagnostic,input,m),/diagnostics/);
});
test('All-Time athletic distributions improve without giving linemen skill-position speed',()=>{
 const input=targets(),runs=Array.from({length:12},(_,seed)=>solveFootballProfiles(input,model,seed+246,preset)),means=position=>ATHLETIC_RATINGS.map(field=>{const values=runs.flatMap(r=>r.selected.filter(p=>p.target.position===position).map(p=>p.profile.ratings[index(field)]));return values.reduce((a,b)=>a+b,0)/values.length;});
 assert.ok(means('WR')[0]>=88&&means('WR')[0]<95);assert.ok(means('CB')[0]>=89&&means('CB')[0]<96);assert.ok(means('FS')[0]>=85&&means('FS')[0]<94);
 for(const run of runs)for(const item of run.selected){const bounds=observedAthleticBounds(model,item.target.position,item.athleticProfile);for(const field of ATHLETIC_RATINGS)assert.ok(item.profile.ratings[index(field)]>=bounds[index(field)].minimum&&item.profile.ratings[index(field)]<=bounds[index(field)].maximum);if(item.target.position==='DT')assert.ok(item.profile.ratings[index('SpeedRating')]<99);}
});
test('scheme preferences remain usable for rare profiles with a restricted ability-free class pool',()=>{
 const input=targets(),settings=normalizeGenerationSettings({rosterAge:'veteran',rosterPotential:'low',offensiveScheme:'OFF_AIR_RAID',defensiveScheme:'DEF_BASE4_3'});
 for(const preset of [rosterPreset('startup'),rosterPreset('all-time')]){
  const m=modelForPreset(base,preset,settings,positionTalentTargets(input,preset,settings));
  for(let seed=1;seed<=10;seed++){const solved=solveFootballProfiles(input,m,seed*2767,preset);assert.equal(solved.selected.length,input.length);assert.ok(Math.abs(solved.actualSum/input.length-preset.targetAverage)<=1);}
 }
});
