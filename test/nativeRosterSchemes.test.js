import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import fs from 'node:fs';import vm from 'node:vm';
import {NATIVE_SCHEMES,schemeSchema,resolveSchemeContext,nativeArchetypeWeight,recruitingNeeds,schemeRecord,inspectTeamSchemes} from '../src/main/tools/rosterGenerator/schemes.js';
import {normalizeGenerationSettings} from '../src/main/tools/rosterGenerator/settings.js';
import Composition from '../src/shared/rosterComposition.cjs';import Batch from '../src/shared/rosterBatch.cjs';import Talent from '../src/shared/rosterTalent.cjs';
import {composeRosterTargets} from '../src/main/tools/rosterGenerator/composition.js';import {ROSTER_PRESETS} from '../src/main/tools/rosterGenerator/presets.js';import {mulberry32} from '../src/main/tools/longSnap/core.js';
const bindings=schemeSchema(path.resolve('resources/engine-data/C27_486_6.gz')),evidence={available:true,offense:'OFF_OPTION',defense:'DEF_BASE3_4',preferences:{},requirements:{},commits:{QB:2},commitsKnown:true,warnings:[]};
const context=options=>{const settings=normalizeGenerationSettings(options);return {...settings,schemeContext:resolveSchemeContext(settings,evidence,bindings,mulberry32(225))};};
test('all 19 native schemes and 48 archetypes bind to actual enum values, including boundary aliases',()=>{
  assert.equal(NATIVE_SCHEMES.filter(s=>s.side==='offense').length,10);assert.equal(NATIVE_SCHEMES.filter(s=>s.side==='defense').length,9);
  for(const scheme of NATIVE_SCHEMES)for(const entry of Object.values(scheme.positions))for(const want of entry.wants){assert.equal(typeof bindings.types[want.archetype],'number');assert.ok(!/^(First_|Last_)/.test(want.archetype));}
  for(const scheme of NATIVE_SCHEMES){const s=context({offensiveScheme:scheme.side==='offense'?scheme.enum:'OFF_OPTION',defensiveScheme:scheme.side==='defense'?scheme.enum:'DEF_BASE3_4',rosterMakeup:'scheme'});const counts=Composition.counts(85,s.schemeContext.requirements);assert.equal(Object.values(counts).reduce((a,b)=>a+b),85);assert.ok(counts.K>=1&&counts.P>=1);for(const [p,n]of Object.entries(counts))assert.ok(n>=s.schemeContext.requirements[p].minimum);}
});
test('saved numeric philosophy preferences take precedence; manual choices use native tuning',()=>{
  const ev={...evidence,preferences:{QB:[{depthSlot:1,archetypeValue:bindings.types.QB_FieldGeneral,importance:100}]},requirements:{QB:{idealOnRoster:6,minimum:2}}};
  const auto=normalizeGenerationSettings({offensiveScheme:'auto',defensiveScheme:'auto',requirementsSource:'saved'});auto.schemeContext=resolveSchemeContext(auto,ev,bindings,mulberry32(1));
  assert.equal(nativeArchetypeWeight('QB','QB_FieldGeneral',auto),9);assert.equal(nativeArchetypeWeight('QB','QB_PureScrambler',auto),1);assert.equal(auto.schemeContext.requirements.QB.idealOnRoster,NATIVE_SCHEMES.find(s=>s.enum==='OFF_OPTION').positions.QB.idealOnRoster);assert.equal(auto.schemeContext.requirementSources.QB,'Native scheme tuning');assert.match(auto.schemeContext.sources.counts,/Chosen schemes/);assert.equal(auto.schemeContext.requirementSources.WR,'Native scheme tuning');
  const manual=context({offensiveScheme:'OFF_AIR_RAID',defensiveScheme:'DEF_BASE3_4',requirementsSource:'scheme'});assert.ok(nativeArchetypeWeight('QB','QB_Improviser',manual)>nativeArchetypeWeight('QB','QB_PureScrambler',manual));
  assert.equal(normalizeGenerationSettings({offensiveScheme:'air-raid'}).offensiveScheme,'OFF_AIR_RAID');assert.throws(()=>normalizeGenerationSettings({defensiveScheme:'nickel'}),/Older handmade/);
});
test('asset references are never treated as local table indices; null and malformed refs are safe',async()=>{
  const table={name:'TeamPhilosophy',header:{tableId:1},readRecords:async()=>{},records:[{isEmpty:false}]};let assetRead=0;const loaded={franchise:{tables:[table],getReferenceFromAssetId:()=>{assetRead++;return null;}}};
  assert.equal(await schemeRecord(loaded,'1'+'0'.repeat(30)+'1','TeamPhilosophy'),null);assert.equal(assetRead,1);assert.equal(await schemeRecord(loaded,'2'.repeat(32)),null);assert.equal(await schemeRecord(loaded,'0'.repeat(32)),null);
  const ref=(1).toString(2).padStart(15,'0')+'0'.repeat(17);assert.equal((await schemeRecord(loaded,ref,'TeamPhilosophy')).record,table.records[0]);assert.equal(await schemeRecord(loaded,ref,'Coach'),null);
});

test('normal native-scheme fallbacks are diagnostic notes, not Apply warnings',async()=>{
 const loaded={kind:'dynasty',franchise:{tables:[]}},team={teamIndex:1,record:{CurrentOffensiveScheme:bindings.schemes.OFF_OPTION,CurrentDefensiveScheme:bindings.schemes.DEF_BASE3_4}};
 const found=await inspectTeamSchemes(loaded,team,'resources/engine-data/C27_486_6.gz');assert.deepEqual(found.warnings,[]);assert.equal(found.notes.length,2);
 const resolved=resolveSchemeContext(normalizeGenerationSettings({offensiveScheme:'auto',defensiveScheme:'auto'}),found,bindings,mulberry32(225));
 assert.deepEqual(resolved.warnings,[]);assert.deepEqual(resolved.notes,found.notes);assert.equal(resolved.offense.id,'OFF_OPTION');assert.equal(resolved.defense.id,'DEF_BASE3_4');
});
test('local philosophy/config arrays and commitments resolve, while coach ownership uses TeamIndex',async()=>{
  const ref=id=>id.toString(2).padStart(15,'0')+'0'.repeat(17),tables=[],table=(id,name,record,offsetTable=[])=>{const t={name,header:{tableId:id},offsetTable,readRecords:async()=>{},records:[{isEmpty:false,...record}]};tables.push(t);return t;};
  table(1,'TeamPhilosophy',{DepthChartOffensivePhilosophy:ref(2)});table(2,'DepthChartOffensivePhilosophy',{QB:ref(3)});table(3,'DepthChartPositionPhilosophy[]',{arraySize:1,Entry0:ref(4)},[{name:'Entry0',isReference:true}]);table(4,'DepthChartPositionPhilosophy',{PlayerType:'QB_StrongArm',Importance:73});
  table(5,'DepthChartConfig',{OffensiveDepthChartConfigRef:ref(6)});table(6,'OffensiveDepthChartConfig',{QB:ref(7)});table(7,'DepthChartConfigEntry',{IdealNumberOnRoster:5,MinimumCount:2,StarterCount:1,AdditionalStarterCount:0});table(8,'Coach',{TeamIndex:999});table(9,'Player[]',{arraySize:1,Player0:ref(10)},[{name:'Player0',isReference:true}]);table(10,'Player',{Position:'QB'});
  const team={teamIndex:43,record:{index:999,CurrentOffensiveScheme:bindings.schemes.OFF_AIR_RAID,CurrentDefensiveScheme:bindings.schemes.DEF_BASE3_4,Philosophy:ref(1),DepthChartConfig:ref(5),HeadCoach:ref(8),CommittedPlayers:ref(9)}},loaded={kind:'dynasty',franchise:{tables}};
  const found=await inspectTeamSchemes(loaded,team,'resources/engine-data/C27_486_6.gz');assert.equal(found.offense,'OFF_AIR_RAID');assert.equal(found.preferences.QB[0].archetypeValue,bindings.types.QB_StrongArm);assert.equal(found.requirements.QB.idealOnRoster,5);assert.equal(found.commits.QB,1);assert.equal(found.commitsKnown,true);assert.equal(found.coachMatched,false);assert.ok(found.warnings.some(w=>w.includes('ownership')));
  tables.find(t=>t.name==='Coach').records[0].TeamIndex=43;assert.equal((await inspectTeamSchemes(loaded,team,'resources/engine-data/C27_486_6.gz')).coachMatched,true);
  tables.find(t=>t.name==='Player').records[0].Position='Unknown';assert.equal((await inspectTeamSchemes(loaded,team,'resources/engine-data/C27_486_6.gz')).commitsKnown,false);
});
test('composition preserves roster size and links, changes the minimum necessary position assignments and rejects impossible minima',()=>{
  const settings=context({offensiveScheme:'OFF_OPTION',defensiveScheme:'DEF_BASE3_4',rosterMakeup:'scheme'}),targets=Array.from({length:85},(_,row)=>({row,position:'QB',visualRow:row+50,original:{Position:'QB'}}));
  const output=composeRosterTargets(targets,settings),counts=Composition.counts(85,settings.schemeContext.requirements);assert.equal(output.length,85);assert.equal(output.filter(p=>p.position==='QB').length,counts.QB);assert.equal(output.filter(p=>p.position!=='QB').length,85-counts.QB);assert.deepEqual(output.map(p=>[p.row,p.visualRow,p.original]),targets.map(p=>[p.row,p.visualRow,p.original]));assert.deepEqual(output,composeRosterTargets(targets,settings));assert.equal(composeRosterTargets(targets,{rosterMakeup:'preserve'}),targets);
  assert.throws(()=>Composition.counts(2,{QB:{minimum:3,idealOnRoster:3}}),/too small/);
  const needs=recruitingNeeds([{position:'QB',fields:{SchoolYear:'Senior'}},{position:'QB',fields:{SchoolYear:'Freshman'}}],settings.schemeContext);assert.equal(needs.QB.returning,1);assert.equal(needs.QB.commits,2);assert.equal(needs.QB.need,Math.max(0,needs.QB.ideal-3));
  assert.equal(recruitingNeeds([],{...settings.schemeContext,commitsKnown:false}).QB.need,null);
});
test('batch planning is stable, protects overrides, supports locks, weighted caliber pools and roster files',()=>{
  const teams=[{name:'A',teamIndex:10,averageOverall:77,positionCounts:{QB:3,WR:8,'K/P':2},schemes:evidence},{name:'B',teamIndex:2,averageOverall:61,positionCounts:{QB:4,WR:9,'K/P':2},schemes:{available:false}}],shared={'roster-caliber':'competitive','roster-age':'standard','roster-potential':'standard','roster-offense':'random','roster-defense':'random','roster-talent-shares':''};
  const input={teams,shared,presets:ROSTER_PRESETS,schemes:NATIVE_SCHEMES};const a=Batch.build({...input,rng:mulberry32(1)}),b=Batch.build({...input,teams:[...teams].reverse(),rng:mulberry32(1)});assert.deepEqual(a,b);assert.equal(a.A['roster-caliber'],'contender');assert.equal(a.B['roster-caliber'],'startup');assert.equal(a.A['roster-offense'],'auto');assert.ok(NATIVE_SCHEMES.some(s=>s.enum===a.B['roster-offense']));
  for(const v of Object.values(a))assert.equal(Object.values(JSON.parse(v['roster-talent-shares'])).reduce((a,b)=>a+b),100);
  const old=structuredClone(a.A),c=Batch.build({...input,mode:'variety',existing:{A:old},caliberWeights:{'all-time':100},locks:{age:true},pools:{potential:['low'],spending:['trenches']},rng:mulberry32(4)});assert.deepEqual(c.A,old);assert.equal(c.B['roster-caliber'],'all-time');assert.equal(c.B['roster-age'],'standard');assert.equal(c.B['roster-potential'],'low');assert.deepEqual(shared,input.shared);
  assert.throws(()=>Batch.build({...input,mode:'variety',caliberWeights:{startup:0}}),/positive frequency/);
});
test('default caliber frequencies use the requested named preset weights',()=>{
  assert.deepEqual(ROSTER_PRESETS.map(p=>[p.name,p.targetAverage,Batch.defaultCaliberWeights[p.id]]),[['From Nothing',60,0],['FCS Call-Up',64,10],['Building Blocks',69,30],['Competitive',72,30],['Contender',75,20],['Blue Blood',79,10],['All-Time Team',83,0]]);
  assert.equal(Object.values(Batch.defaultCaliberWeights).reduce((a,b)=>a+b,0),100);assert.ok(Object.isFrozen(Batch.defaultCaliberWeights));
  const output=Batch.build({mode:'variety',teams:Array.from({length:100},(_,i)=>({name:String(i),teamIndex:i,positionCounts:{QB:3,WR:8,'K/P':2}})),shared:{},presets:ROSTER_PRESETS,schemes:NATIVE_SCHEMES,rng:mulberry32(225)});
  for(const values of Object.values(output))assert.ok(!['startup','all-time'].includes(values['roster-caliber']));
});
test('renderer scheme counts reuse constrained allocation and modal controls have distinct meanings',()=>{
  const scripts=['roster-schemes.js','roster-batch.js'].map(file=>fs.readFileSync(new URL('../src/renderer/'+file,import.meta.url),'utf8'));scripts.forEach(source=>assert.doesNotThrow(()=>new vm.Script(source)));
  const page=fs.readFileSync(new URL('../src/renderer/roster-generator.js',import.meta.url),'utf8');for(const id of ['roster-makeup','roster-configure-teams'])assert.ok(page.includes(id));assert.ok(scripts[0].includes('RosterComposition.counts'));assert.ok(scripts[1].includes('control.value=next'));assert.ok(scripts[1].includes('Keep Each Team Similar'));assert.ok(scripts[1].includes('Copy to Selected Teams'));assert.ok(scripts[1].includes('dialog.closeEditor()'));
});
test('one Configure Teams window owns both workflows and only commits its draft on Save',()=>{
  const page=fs.readFileSync(new URL('../src/renderer/roster-generator.js',import.meta.url),'utf8'),batch=fs.readFileSync(new URL('../src/renderer/roster-batch.js',import.meta.url),'utf8'),editor=fs.readFileSync(new URL('../src/renderer/roster-team-settings.js',import.meta.url),'utf8');
  assert.ok(page.includes('Configure Teams'));assert.ok(!page.includes('roster-build-batch'));assert.ok(!page.includes('roster-edit-overrides'));
  assert.equal((batch.match(/createConfigurationDialog\(/g)??[]).length,1);assert.ok(!editor.includes('createConfigurationDialog('));assert.ok(!editor.includes('captureToolSettings('));
  assert.ok(batch.includes('mountRosterTeamEditor'));assert.ok(editor.includes('Back to Team List'));assert.ok(batch.includes('let drafts=structuredClone(existing)'));assert.ok(batch.includes('if(changed){control.value=next'));
  for(const id of ['roster-caliber','roster-age','roster-potential','roster-talent-shares','roster-offense','roster-defense','roster-skin-tone','roster-reorder-depth','roster-makeup','roster-talent-mix','roster-talent-counts'])assert.ok(editor.includes(id),id+' remains in the shared full-team editor');
});
