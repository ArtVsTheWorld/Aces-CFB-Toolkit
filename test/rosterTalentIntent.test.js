import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Talent from '../src/shared/rosterTalent.cjs';
import Batch from '../src/shared/rosterBatch.cjs';
import {normalizeGenerationSettings,positionTalentTargets,describeTalentBudget} from '../src/main/tools/rosterGenerator/settings.js';
import {ROSTER_PRESETS} from '../src/main/tools/rosterGenerator/presets.js';
import {NATIVE_SCHEMES,schemeSchema,resolveSchemeContext} from '../src/main/tools/rosterGenerator/schemes.js';
import {composeRosterTargets} from '../src/main/tools/rosterGenerator/composition.js';
import {teamGenerationConfigurations} from '../src/main/tools/rosterGenerator/runner.js';
const countsA={QB:3,HB:5,FB:1,WR:10,TE:5,OL:15,EDGE:6,DT:5,LB:8,CB:7,FS:4,SS:4,'K/P':4},countsB={...countsA,HB:9,FB:3,WR:4,DT:7,LB:6};
const targets=counts=>Object.entries(counts).flatMap(([group,n])=>Array.from({length:n},()=>({position:({OL:'LT',EDGE:'LE',LB:'MLB','K/P':'K'})[group]??group})));
test('every named talent mix recalculates from actual counts, preserving target player average',()=>{
 for(const {id}of Talent.spendingPresets){
  const stale=Talent.presetShares(countsA,id),settings=normalizeGenerationSettings({talentMix:id,talentShares:stale}),players=targets(countsB);
  const budget=describeTalentBudget(players,settings);assert.deepEqual(budget.shares,Talent.presetShares(countsB,id));assert.equal(budget.mix,id);
  const projected=positionTalentTargets(players,{targetAverage:69},settings);assert.deepEqual(projected,Talent.targets(countsB,69,Talent.presetShares(countsB,id)));
  assert.ok(Math.abs(Object.entries(countsB).reduce((n,[p,count])=>n+count*projected[p],0)/players.length-69)<1e-8);
 }
});
test('custom and legacy percentages are not mistaken for named presets or rewritten',()=>{
 const shares=Talent.presetShares(countsA,'defense'),snapshot=structuredClone(shares);
 for(const input of [{talentShares:shares},{talentMix:'custom',talentShares:shares}]){
  const settings=normalizeGenerationSettings(input);assert.equal(settings.talentMix,'custom');positionTalentTargets(targets(countsB),{targetAverage:69},settings);assert.deepEqual(settings.talentShares,snapshot);assert.deepEqual(shares,snapshot);
 }
 assert.equal(normalizeGenerationSettings({positionStrength:{QB:3}}).talentMix,'custom');assert.equal(normalizeGenerationSettings({}).talentMix,'balanced');assert.throws(()=>normalizeGenerationSettings({talentMix:'unknown'}),/talent mix/);
});
test('random schemes resolve before named talent allocation; old saved requirements never override the selection',()=>{
 const bindings=schemeSchema('resources/engine-data/C27_486_6.gz'),evidence={available:true,preferences:{},requirements:{QB:{idealOnRoster:20,minimum:20}},commits:{},commitsKnown:false,warnings:[]};
 for(const source of ['saved','scheme']){
  const settings=normalizeGenerationSettings({rosterMakeup:'scheme',offensiveScheme:'shuffle',defensiveScheme:'shuffle',requirementsSource:source,talentMix:'trenches',talentShares:Talent.presetShares(countsA,'trenches')});
  settings.schemeContext=resolveSchemeContext(settings,evidence,bindings,()=>.4);const players=composeRosterTargets(targets(countsA),settings),budget=describeTalentBudget(players,settings);
  assert.equal(settings.requirementsSource,'scheme');assert.notEqual(settings.schemeContext.requirements.QB.idealOnRoster,20);assert.deepEqual(budget.shares,Talent.presetShares(budget.playerCounts,'trenches'));
 }
});
test('shared named mixes resolve separately for each team, including bulk spending locks',()=>{
 const teams=[{name:'A',teamIndex:1,positionCounts:countsA},{name:'B',teamIndex:2,positionCounts:countsB}],shared={'roster-talent-mix':'offense','roster-talent-shares':JSON.stringify(Talent.presetShares(countsA,'offense'))};
 const result=Batch.build({teams,shared,presets:ROSTER_PRESETS,schemes:NATIVE_SCHEMES,mode:'shuffle',locks:{spending:true},rng:()=>.4});
 for(const team of teams){assert.equal(result[team.name]['roster-talent-mix'],'offense');assert.deepEqual(JSON.parse(result[team.name]['roster-talent-shares']),Talent.presetShares(team.positionCounts,'offense'));}
 const resolved=teamGenerationConfigurations({talentMix:'defense',teamConfigurations:{B:{talentMix:'trenches'}}},['A','B']);assert.equal(resolved.A.settings.talentMix,'defense');assert.equal(resolved.B.settings.talentMix,'trenches');
});
test('UI migration preserves explicit custom shares and prior named bulk mixes, dropping the removed source selector',()=>{
 const context=vm.createContext({RosterTalent:Talent,rosterMigrateSchemes:values=>delete values['roster-requirements-source']});vm.runInContext(fs.readFileSync('src/renderer/roster-generator.js','utf8'),context);
 const migrate=values=>{context.values=values;return vm.runInContext('rosterMigrateTalentValues(values)',context);};
 const shares=JSON.stringify(Talent.presetShares(countsA,'defense'));
 const old=migrate({'roster-talent-shares':shares,'roster-requirements-source':'saved','roster-team-settings':JSON.stringify({A:{'roster-talent-shares':shares,batchSpending:'defense'}})});
 assert.equal(old['roster-talent-mix'],'custom');assert.equal(old['roster-talent-shares'],shares);assert.ok(!('roster-requirements-source'in old));const team=JSON.parse(old['roster-team-settings']).A;assert.equal(team['roster-talent-mix'],'defense');assert.ok(!('batchSpending'in team));
 context.counts=countsB;context.values={'roster-talent-shares':shares,'roster-talent-mix':'custom'};assert.equal(vm.runInContext('rosterRefreshTalentValues(values,counts)["roster-talent-shares"]',context),shares);
});
