import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ROSTER_PRESETS,ROSTER_CALIBER_OPTIONS,rosterPreset,resolveRosterPreset,modelForPreset} from '../src/main/tools/rosterGenerator/presets.js';
import {teamGenerationConfigurations} from '../src/main/tools/rosterGenerator/runner.js';
import {normalizeGenerationSettings,positionTalentTargets} from '../src/main/tools/rosterGenerator/settings.js';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {generateRosterPreview,validateRosterPreview} from '../src/main/tools/rosterGenerator/core.js';
import {WRITE_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {VALID_POSITIONS} from '../src/main/tools/equipment/shared.js';
import {validatePresetConfiguration} from '../src/main/services/toolPresets.js';
import Batch from '../src/shared/rosterBatch.cjs';
import {NATIVE_SCHEMES} from '../src/main/tools/rosterGenerator/schemes.js';
import {mulberry32} from '../src/main/tools/longSnap/core.js';
import {positionGroup} from '../src/shared/positionGroups.js';

const targets=average=>VALID_POSITIONS.flatMap(position=>[position,position]).map((position,row)=>({row,position,visualRow:row,visualOwners:[row],rawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[]}]}),original:{...Object.fromEntries(WRITE_FIELDS.map(f=>[f,0])),FirstName:'Original',LastName:String(row),Position:position,OverallRating:average+(row%3),RecruitingDealbreaker:'Invalid',CurrentNILCompensation:30}}));

test('Match Existing resolves the full current roster average without rounding or mutating fixed calibers',()=>{
 const choice=rosterPreset('match-existing'),before=JSON.stringify(choice),input=targets(70),average=input.reduce((n,t)=>n+t.original.OverallRating,0)/input.length;
 assert.equal(ROSTER_CALIBER_OPTIONS.length,8);assert.equal(ROSTER_PRESETS.length,7);assert.equal(rosterPreset().id,'building-blocks');assert.equal(choice.targetAverage,undefined);
 const resolved=resolveRosterPreset(choice,input);assert.equal(resolved.targetAverage,average);assert.equal(resolved.minimumAverage,average-1);assert.equal(resolved.maximumAverage,average+1);assert.equal(JSON.stringify(choice),before);
 for(const preset of ROSTER_PRESETS)assert.equal(resolveRosterPreset(preset,[]),preset);
 for(const input of [[],null,[{original:{OverallRating:undefined}}],[{original:{OverallRating:NaN}}],[{original:{OverallRating:100}}],[{original:{OverallRating:0}}],[{original:{OverallRating:'72'}}]])assert.throws(()=>resolveRosterPreset(choice,input),/valid current overall/);
 assert.throws(()=>modelForPreset({},choice),/current roster/);
});

test('shared/individual/preset settings retain the choice rather than a stale target from another team',()=>{
 const options={preset:'match-existing',teamConfigurations:{C:{preset:'competitive'}}},config=teamGenerationConfigurations(options,['A','B','C']);
 assert.equal(config.A.preset,'match-existing');assert.equal(config.B.preset,'match-existing');assert.equal(config.C.preset,'competitive');assert.equal(config.A.settings.rosterAge,'standard');
 const copy=validatePresetConfiguration({version:1,values:{'roster-caliber':'match-existing','roster-team-settings':JSON.stringify({C:{'roster-caliber':'competitive'}})}});assert.equal(copy.values['roster-caliber'],'match-existing');assert.ok(!JSON.stringify(copy).includes('targetAverage'));
 const a=resolveRosterPreset(rosterPreset(config.A.preset),targets(63)),b=resolveRosterPreset(rosterPreset(config.B.preset),targets(78));assert.equal(b.targetAverage-a.targetAverage,15);
 assert.throws(()=>teamGenerationConfigurations({preset:'match-existing',teamConfigurations:{A:{targetAverage:90}}},['A']),/Invalid team/);
});

test('Match Existing generation reaches fractional targets for different teams while keeping validated physical packages',()=>{
 const base=loadObservedCatalog(),settings=normalizeGenerationSettings();
 for(const [index,average]of [64,78].entries()){
  const input=targets(average),preset=resolveRosterPreset(rosterPreset('match-existing'),input),model=modelForPreset(base,preset,settings,positionTalentTargets(input,preset,settings)),preview=generateRosterPreview({team:{name:'Test '+index,teamIndex:index+1,branding:'nike'},targets:input,model,preset,seed:256+index});
  assert.equal(preview.blocking.length,0);assert.equal(preview.summary.targetAchieved,true);assert.equal(preview.summary.oldAverage,preset.targetAverage);assert.ok(Math.abs(preview.summary.newAverage-preset.targetAverage)<.1,JSON.stringify(preview.summary));assert.doesNotThrow(()=>validateRosterPreview(preview,input,model));
  for(const p of preview.players){assert.equal(p.provenance.requestedPositionAverage,model.talentTargets[positionGroup(p.position)]);assert.ok(Number.isFinite(p.fields.SpeedRating));assert.ok(p.fields.SpeedRating>=1&&p.fields.SpeedRating<=99);}
 }
});

test('batch defaults retain all previous seeded choices; Match Existing can be locked, copied or explicitly weighted',()=>{
 const teams=[{name:'A',teamIndex:1,averageOverall:77,positionCounts:{QB:3,WR:8,'K/P':2}},{name:'B',teamIndex:2,averageOverall:61,positionCounts:{QB:3,WR:8,'K/P':2}}],shared={'roster-caliber':'match-existing','roster-age':'standard','roster-potential':'standard','roster-offense':'random','roster-defense':'random'},base={teams,shared,schemes:NATIVE_SCHEMES};
 for(const mode of ['identity','variety','shuffle'])assert.deepEqual(Batch.build({...base,presets:ROSTER_CALIBER_OPTIONS,mode,rng:mulberry32(256)}),Batch.build({...base,presets:ROSTER_PRESETS,mode,rng:mulberry32(256)}));
 for(const settings of [{locks:{caliber:true}},{mode:'variety',caliberWeights:{'match-existing':100}}]){const result=Batch.build({...base,presets:ROSTER_CALIBER_OPTIONS,...settings,rng:mulberry32(256)});assert.equal(result.A['roster-caliber'],'match-existing');assert.equal(result.B['roster-caliber'],'match-existing');}
});

test('shared and team talent estimates use the correct current team average instead of the Building Blocks fallback',()=>{
 const page=fs.readFileSync(new URL('../src/renderer/roster-generator.js',import.meta.url),'utf8');let selection=['A','B'],value='match-existing';
 const context=vm.createContext({configurationRead:()=>({value}),selected:()=>selection,document:{getElementById:()=>({value})}});vm.runInContext(page,context);
 const prepared={presets:ROSTER_CALIBER_OPTIONS,teams:[{name:'A',rosterSize:40,averageOverall:65.5},{name:'B',rosterSize:80,averageOverall:80.5}]};
 context.prepared=prepared;context.root={dataset:{}};assert.equal(vm.runInContext('rosterCaliberAverage(root,prepared)',context),75.5);context.root={dataset:{rosterTeam:'A'}};assert.equal(vm.runInContext('rosterCaliberAverage(root,prepared)',context),65.5);
 context.root={dataset:{rosterTeam:'B'}};assert.equal(vm.runInContext('rosterCaliberAverage(root,prepared)',context),80.5);value='all-time';assert.equal(vm.runInContext('rosterCaliberAverage(root,prepared)',context),83);value='match-existing';selection=[];context.root={dataset:{}};assert.ok(Number.isNaN(vm.runInContext('rosterCaliberAverage(root,prepared)',context)));
});
