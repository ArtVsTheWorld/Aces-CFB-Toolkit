import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {ROSTER_PRESETS,rosterPreset,modelForPreset,calibrateProfile} from '../src/main/tools/rosterGenerator/presets.js';
import {generateRosterPreview,buildAppearancePreview} from '../src/main/tools/rosterGenerator/core.js';
import {WRITE_FIELDS,CAP_BOUNDS} from '../src/main/tools/rosterGenerator/contract.js';
import {getToolHandler,executableToolIds} from '../src/main/tools/handlers.js';
import {getTool} from '../src/shared/toolRegistry.js';

test('Roster Generator is registered with normal prepare/run integration and dynasty/roster input',()=>{
  assert.equal(getTool('roster-generator').version, undefined);assert.deepEqual(getTool('roster-generator').input.accepted,['dynasty','roster']);
  assert.equal(typeof getToolHandler('roster-generator').prepare,'function');assert.equal(typeof getToolHandler('roster-generator').run,'function');assert.ok(executableToolIds().includes('roster-generator'));
});
test('all seven calibers reach their target with observed eligibility/ability/cap packages and exact position counts',()=>{
  const base=loadObservedCatalog();
  const positions=['QB','HB','FB','WR','TE','LT','LG','C','RG','RT','LE','RE','DT','LOLB','MLB','ROLB','CB','FS','SS','K','P'];
  const targets=positions.map((position,row)=>({row,position,visualRow:row,visualOwners:[row],rawData:JSON.stringify({loadouts:[{loadoutCategory:'Base'},{loadoutType:'PlayerOnField',loadoutElements:[]}]}),original:{...Object.fromEntries(WRITE_FIELDS.map(field=>[field,0])),FirstName:'Old',LastName:String(row),OverallRating:70}}));
  for(const preset of ROSTER_PRESETS){
    const model=modelForPreset(base,preset),p=generateRosterPreview({team:{name:'Test Team',teamIndex:1,branding:'nike'},targets,model,seed:205,preset});
    assert.ok(p.summary.targetAchieved,`${preset.id}: ${p.summary.newAverage}`);assert.equal(p.players.length,positions.length);assert.equal(p.blocking.length,0);
    for(const player of p.players){
      const observed=base.byId.get(player.provenance.football),source=model.byId.get(player.provenance.football);
      assert.deepEqual(source.physical,observed.physical);assert.deepEqual(source.mental,observed.mental);assert.deepEqual(source.caps,observed.caps);
      assert.ok(source.ratings.every(value=>Number.isInteger(value)&&value>=0&&value<=99));
      source.caps.forEach((cap,i)=>assert.ok(cap>=CAP_BOUNDS[i][0]&&cap<=CAP_BOUNDS[i][1]));
      const potential=base.byId.get(player.provenance.potential);assert.equal(player.fields.TraitDevelopment,potential.development);assert.deepEqual(Array.from({length:6},(_,i)=>player.fields[`SkillGroupCap${i+1}`]),potential.caps);
      if(source.calibration?.offset<0)assert.ok(source.physical.every(tier=>tier==='None'));
    }
  }
  assert.equal(ROSTER_PRESETS.length,7);assert.throws(()=>rosterPreset('unknown'),/supported/);
});
test('rating calibration is deterministic and cannot weaken a package with physical abilities',()=>{
  const model=loadObservedCatalog(),profile=model.profiles.find(profile=>profile.physical.some(tier=>tier!=='None')),before=structuredClone(profile);
  const a=calibrateProfile(profile,40,model.formulas),b=calibrateProfile(profile,40,model.formulas);assert.deepEqual(a,b);assert.ok(a.calibration.offset>=0);assert.deepEqual(profile,before);
});
test('empty Base category placeholders are harmless but unknown appearance layers remain blockers',()=>{
  const appearance=loadObservedCatalog().catalog.appearances[0];
  const empty=buildAppearancePreview({loadouts:[{loadoutCategory:'Base'},{loadoutType:'PlayerOnField',loadoutElements:[]}]},appearance,'nike');assert.deepEqual(empty.unknownLayers,[]);assert.deepEqual(JSON.parse(empty.raw).loadouts[0],{loadoutCategory:'Base'});
  const occupied=buildAppearancePreview({loadouts:[{loadoutCategory:'Base',loadoutElements:[{itemAssetName:'UnknownHead'}]},{loadoutType:'PlayerOnField',loadoutElements:[]}]},appearance,'nike');assert.equal(occupied.unknownLayers.length,1);
});
test('in-app presentation includes modal caliber/team selection, shared review facets, confirmation and preset controls',()=>{
  const renderer=fs.readFileSync(new URL('../src/renderer/renderer.js',import.meta.url),'utf8'),page=fs.readFileSync(new URL('../src/renderer/roster-generator.js',import.meta.url),'utf8');
  for(const token of ['rosterGeneratorPage(tool)','roster-result-filter','rosterGeneratorResults(result)','confirmRegeneration = true','details?.canApply === false'])assert.ok(renderer.includes(token),token);
  for(const token of ['condenseConfiguration','teamPicker','roster-caliber','roster-strength-config','roster-scheme-config','roster-skin-tone','standardPreviewWorkspace','data-generic-view="cards"','data-generic-view="table"'])assert.ok(page.includes(token),token);
});
