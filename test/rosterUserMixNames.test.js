import test from 'node:test';
import assert from 'node:assert/strict';
import {USER_MIX_SURNAMES,mixNamePools,mixForPlayer,normalizeAppearanceMix} from '../src/main/tools/rosterGenerator/appearanceMixes.js';
import {matchGeneratedNameCommentary} from '../src/main/tools/rosterGenerator/names.js';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {createCommentaryMatcher} from '../src/main/tools/commentary/matcher.js';
import {loadCommentaryMap} from '../src/main/tools/commentary/map.js';
import {normalizeGenerationSettings,positionTalentTargets} from '../src/main/tools/rosterGenerator/settings.js';
import {teamGenerationConfigurations} from '../src/main/tools/rosterGenerator/runner.js';
import {modelForPreset,rosterPreset} from '../src/main/tools/rosterGenerator/presets.js';
import {generateRosterPreview,validateRosterPreview} from '../src/main/tools/rosterGenerator/core.js';
import {WRITE_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {VALID_POSITIONS} from '../src/main/tools/equipment/shared.js';
const model=loadObservedCatalog();
test('all 100 Latino and 88 Polynesian supplied surnames are available without duplicates',()=>{
 for(const [mix,count] of [['latino',100],['polynesian',88]]){
  assert.equal(USER_MIX_SURNAMES[mix].length,count);const p=mixNamePools(model.catalog,mix);
  assert.equal(p.last.length,new Set(p.last).size);
  for(const name of USER_MIX_SURNAMES[mix])assert.ok(p.last.includes(name)&&Buffer.byteLength(name)<=21,name);
  assert.ok(USER_MIX_SURNAMES[mix].some(n=>!model.catalog.names.last.includes(n)));
 }
});
test('optional mixes default to 10 percent and explicit saved percentages survive team configurations',()=>{
 assert.deepEqual(normalizeAppearanceMix(),{appearanceMix:'standard',appearanceMixPercent:10});
 for(const mix of ['latino','polynesian','latino-polynesian'])assert.equal(normalizeGenerationSettings({appearanceMix:mix}).appearanceMixPercent,10);
 const c=teamGenerationConfigurations({appearanceMix:'latino-polynesian',teams:['A','B'],teamConfigurations:{B:{appearanceMix:'polynesian',appearanceMixPercent:50}}},['A','B']);
 assert.equal(c.A.settings.appearanceMixPercent,10);assert.equal(c.B.settings.appearanceMixPercent,50);
 for(const p of [0,10,50,100])assert.equal(normalizeAppearanceMix({appearanceMix:'latino',appearanceMixPercent:p}).appearanceMixPercent,p);
});
test('combined mix gates 10 percent total, with an independent balanced split and deterministic endpoints',()=>{
 const settings={appearanceMix:'latino-polynesian'},counts={standard:0,latino:0,polynesian:0};
 for(let row=0;row<20000;row++){
  const result=mixForPlayer(settings,row,105);counts[result]++;
  assert.equal(result,mixForPlayer(settings,row,105));
  assert.equal(result!=='standard',mixForPlayer({appearanceMix:'latino',appearanceMixPercent:10},row,105)!=='standard');
  assert.equal(mixForPlayer({...settings,appearanceMixPercent:0},row,105),'standard');
  assert.notEqual(mixForPlayer({...settings,appearanceMixPercent:100},row,105),'standard');
 }
 assert.ok(counts.standard>17700&&counts.standard<18300,JSON.stringify(counts));
 assert.ok(counts.latino>800&&counts.latino<1200,JSON.stringify(counts));
 assert.ok(counts.polynesian>800&&counts.polynesian<1200,JSON.stringify(counts));
});
test('approved surnames use their real commentary match or zero without falling back to the first name',()=>{
 const real=createCommentaryMatcher(loadCommentaryMap('resources/commentary-data/PlayerCommentaryidMap.txt'),{allowPhonetic:false,allowFirstName:true});
 const fake=createCommentaryMatcher(new Map([['John',3],['Garcia',9]]),{allowPhonetic:false,allowFirstName:true});
 for(const name of Object.values(USER_MIX_SURNAMES).flat())assert.equal(matchGeneratedNameCommentary('John',name,{parts:[name]},'latino',real).id,real('',name).id,name);
 assert.equal(matchGeneratedNameCommentary('John','Tupouahi',{parts:['Tupouahi']},'polynesian',fake).id,0);
 assert.equal(matchGeneratedNameCommentary('John','Garcia',{parts:['Garcia']},'latino',fake).id,9);
 assert.equal(matchGeneratedNameCommentary('John','Unknown',{parts:['Unknown']},'standard',fake).id,3);
 assert.equal(matchGeneratedNameCommentary('John','Unknown',{parts:['Unknown']},'latino',fake).id,3);
});
test('combined full generation validates concrete pools, preserves ratings and rejects unapproved surnames',()=>{
 const targets=VALID_POSITIONS.flatMap(position=>Array.from({length:3},()=>position)).map((position,row)=>({row,position,visualRow:row,visualOwners:[row],rawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[]}]}),original:{...Object.fromEntries(WRITE_FIELDS.map(f=>[f,0])),FirstName:'Old',LastName:String(row),OverallRating:70,CurrentNILCompensation:30}}));
 const preset=rosterPreset('building-blocks'),settings=normalizeGenerationSettings({appearanceMix:'latino-polynesian',appearanceMixPercent:100}),typed=modelForPreset(model,preset,settings,positionTalentTargets(targets,preset,settings));
 const preview=generateRosterPreview({team:{name:'Test',teamIndex:1,branding:'nike'},targets,model:typed,preset,seed:123});
 assert.equal(preview.blocking.length,0);assert.equal(validateRosterPreview(preview,targets,typed),true);
 assert.deepEqual(new Set(preview.players.map(p=>p.provenance.appearanceMix)),new Set(['latino','polynesian']));
 for(const p of preview.players)assert.ok(p.provenance.surname.parts.every(n=>mixNamePools(model.catalog,p.provenance.appearanceMix).last.includes(n)));
 const bad=structuredClone(preview);bad.players[0].fields.LastName='Invented';bad.players[0].provenance.surname={parts:['Invented'],suffix:''};assert.throws(()=>validateRosterPreview(bad,targets,typed),/surname|name|identity/i);
});
