import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {prepareObservedCatalog,loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {generateRosterPreview,validateRosterPreview,allocateRosterNumbers,buildAppearancePreview} from '../src/main/tools/rosterGenerator/core.js';
import {CATALOG_VERSION,RATING_FIELDS,CAP_FIELDS,CAP_BOUNDS,WRITE_FIELDS,validateFootballProfile} from '../src/main/tools/rosterGenerator/contract.js';
import {calculateOverall,formulaIndex} from '../src/main/tools/rosterGenerator/ratings.js';
import {renderRosterGeneratorReport,rosterGeneratorCsv} from '../src/main/tools/rosterGenerator/report.js';
import {getToolHandler} from '../src/main/tools/handlers.js';

function catalog({ratings=[63,69,72,75,82],position='QB'}={}){
  return prepareObservedCatalog({version:CATALOG_VERSION,capBounds:CAP_BOUNDS,ratingFields:RATING_FIELDS,sources:[{id:'ea',sha256:'a'.repeat(64)},{id:'generated',sha256:'b'.repeat(64)}],names:{first:['Alex','Casey','Devon','Taylor','Jordan','Sam'],last:['North','South','West','East','Fields','River','Stone']},profiles:ratings.map((value,i)=>({id:`p${i}`,source:1,position,archetype:`${position}_Test`,classYear:i%2?'Junior':'Freshman',redshirt:i%2?'Previous':'Eligible',development:i%2?'College_Impact':'Normal',storedOverall:value,ratings:RATING_FIELDS.map(()=>value),caps:CAP_FIELDS.map(()=>12+i),physical:['None','None','None','None','None'],mental:[['None','None'],['None','None'],['None','None']],progression:[i*10,i],personality:'Leader'})),appearances:[{id:'appearance',position,branding:'nike',fields:{GenericHeadAssetName:'Generic_0107_P_T0005_T_8_2',PLYR_GENERICHEAD:'NoHead',CharacterBodyType:'Standard',Height:74,Weight:55,PLYR_PORTRAIT:107,PortraitForceSilhouette:false,PortraitSwappableLibraryPath:'library_icons_brt'},loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{itemAssetName:'GearFaceMask_Speedflex2Bar_WR'},{slotType:'HeadWear',itemAssetName:'GearHelmet_Speed_Flex'},{slotType:'LeftShoe',itemAssetName:'GearFootwear_shoe_low_NikeVaporEdge'},{slotType:'RightShoe',itemAssetName:'GearFootwear_shoe_low_NikeVaporEdge'},{slotType:'LeftHandWear',itemAssetName:'GearHand_None'}]}]}],styles:[{id:'style',source:0,position,archetype:`${position}_Test`,values:['Generic','Normal','DefaultStrideLoose']}],formulas:[{position,playerType:`${position}_Test`,intercept:0,coefficients:{SpeedRating:1},minimumOverall:12,maximumOverall:99}]});
}
function targets(n=10,position='QB'){
  return Array.from({length:n},(_,row)=>{const original=Object.fromEntries(WRITE_FIELDS.map(field=>[field,0]));Object.assign(original,{FirstName:'Original',LastName:String(row),OverallRating:80,IsNIL:true});
    Object.defineProperty(original,'Age',{get(){throw new Error('Age must never be read');},enumerable:false});
    return {row,position,visualRow:row,visualOwners:[row],rawData:JSON.stringify({skinTone:3,bodyType:2,jerseyName:'OLD',untouched:{flag:true},loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[]}]}),original};});
}
const make=(model=catalog(),teamTargets=targets(),seed=205)=>generateRosterPreview({team:{name:'Test Team',teamIndex:1,branding:'nike'},targets:teamTargets,model,seed,unavailableNames:['Alex North']});

test('v20.5 prototype is deterministic, immutable, bounded and keeps exact positions without reading Age',()=>{
  const model=catalog(),input=targets(),before=JSON.stringify(input),source=JSON.stringify(model.catalog),a=make(model,input),b=make(model,[...input].reverse());
  assert.deepEqual(a,b);assert.equal(JSON.stringify(input),before);assert.equal(JSON.stringify(model.catalog),source);assert.equal(a.canApply,false);assert.equal(a.summary.players,10);assert.deepEqual(a.summary.positionCounts,{QB:10});assert.ok(a.summary.newAverage>=68&&a.summary.newAverage<=70);
  for(const player of a.players){assert.equal(Object.hasOwn(player.fields,'Age'),false);assert.equal(Object.hasOwn(player.fields,'PLYR_BIRTHDATE'),false);assert.equal(Object.hasOwn(player.fields,'PresentationId'),false);assert.notEqual(`${player.fields.FirstName} ${player.fields.LastName}`,'Alex North');assert.ok(player.provenance.football);assert.equal(player.fields.IsNIL,false);}
  assert.notDeepEqual(make(model,input,206).players,a.players);
});
test('caps, ability ranks, class/redshirt, duplicates and progression are validated as packages',()=>{
  for(const change of [p=>p.caps[0]=21,p=>p.caps[1]=2,p=>p.physical[0]='Diamond',p=>p.mental[0]=['FieldGeneral','None'],p=>p.mental=[['FieldGeneral','Bronze'],['FieldGeneral','Gold'],['None','None']],p=>p.redshirt='Current',p=>p.progression[0]=-1]){const p=structuredClone(catalog().profiles[0]);change(p);assert.throws(()=>validateFootballProfile(p));}
});
test('enumerable legacy age/birth fields are neither accessed nor copied into before/after proposals',()=>{
  const input=targets(1);input[0].original={...input[0].original};
  for(const field of ['Age','PLYR_BIRTHDATE'])Object.defineProperty(input[0].original,field,{enumerable:true,get(){throw new Error(`Forbidden legacy field read: ${field}`);}});
  const result=make(catalog(),input);for(const field of ['Age','PLYR_BIRTHDATE']){assert.equal(Object.hasOwn(result.players[0].before,field),false);assert.equal(Object.hasOwn(result.players[0].fields,field),false);}
});
test('OVR uses complete formula vectors, bounded values and half-down rounding',()=>{
  const model=catalog(),profile=model.profiles[0],formula={position:'QB',playerType:'QB_Test',intercept:.5,coefficients:{SpeedRating:1},minimumOverall:12,maximumOverall:99};
  assert.equal(calculateOverall(profile,formulaIndex([formula])),63);assert.equal(calculateOverall(profile,formulaIndex([{...formula,intercept:100}])),99);assert.throws(()=>calculateOverall(profile,new Map()),/No verified/);
});
test('seed, missing team/profile, oversized roster and exhausted names fail explicitly',()=>{
  for(const seed of [-1,.5,2**32,NaN,'1'])assert.throws(()=>make(catalog(),targets(),seed),/Seed/);
  assert.throws(()=>make(catalog(),[]),/populated/);assert.throws(()=>make(catalog(),targets(1,'LS')),/No observed/);assert.throws(()=>make(catalog(),targets(101)),/oversized/);
  const model=catalog();model.catalog.names={first:['Only'],last:['Name']};assert.throws(()=>make(model,targets(2)),/exhausted/);
});
test('unreachable averages are reported, never met by falsifying ratings or tiers',()=>{
  const p=make(catalog({ratings:[60]}),targets(3));assert.equal(p.summary.newAverage,60);assert.equal(p.summary.targetAchieved,false);assert.ok(p.blocking.some(item=>item.reason.includes('could not reach')));assert.ok(p.players.every(player=>player.fields.SpeedRating===60));
});
test('jersey allocation reuses Standard Mode with traditions and retired rules off, without Age',()=>{
  const players=[...Array.from({length:12},(_,row)=>({row,position:'QB',overall:70})),...Array.from({length:20},(_,i)=>({row:i+12,position:'LT',overall:80}))];
  const a=allocateRosterNumbers(players,'LSU',33);assert.equal(new Set(a.assigned.values()).size,32);for(const player of players){const number=a.assigned.get(player.row);assert.ok(!a.retired.includes(number));if(player.position==='LT')assert.ok(number>=50&&number<=79);}
  assert.throws(()=>allocateRosterNumbers(Array.from({length:31},(_,row)=>({row,position:'LT',overall:80})),'Test Team',1),/could not safely number/);
});
test('appearance adapter clears stale overrides but preserves unknown roots/layers and implicit mask slots',()=>{
  const appearance=catalog().catalog.appearances[0],raw={skinTone:7,bodyType:3,jerseyName:'OLD',keep:{x:[1,2]},loadouts:[{loadoutType:'Base',keep:'head layer'},{loadoutType:'PlayerOnField',loadoutElements:[]}]},before=structuredClone(raw),result=buildAppearancePreview(raw,appearance,'adidas'),parsed=JSON.parse(result.raw);
  assert.deepEqual(raw,before);assert.deepEqual(parsed.keep,before.keep);assert.deepEqual(parsed.loadouts[0],before.loadouts[0]);assert.deepEqual(result.unknownLayers,['Base']);assert.equal(Object.hasOwn(parsed,'skinTone'),false);assert.equal(Object.hasOwn(parsed,'jerseyName'),false);assert.deepEqual(parsed.loadouts[1].loadoutElements[0],appearance.loadouts[0].loadoutElements[0]);assert.ok(result.brandCorrections.some(change=>change.newItem.includes('Adidas')));
});
test('shared appearance owners and extra head/base layers are visible Apply blockers',()=>{
  const input=targets(2);input[0].visualOwners=[0,50];const p=make(catalog(),input);assert.ok(p.blocking.some(item=>item.row===0&&item.reason.includes('another player')));assert.equal(p.canApply,false);
});
test('preview verification rejects independent field, appearance, numbering and evidence tampering',()=>{
  const model=catalog(),input=targets(),p=make(model,input);
  for(const change of [x=>x.players[0].fields.Age=18,x=>x.players[0].fields.TeamIndex=2,x=>x.players[0].fields.SkillGroupCap1=20,x=>x.players[0].fields.PhysicalAbility1='Gold',x=>x.players[0].fields.SpeedRating=99,x=>x.players[0].fields.PlayerType='QB_Other',x=>x.players[0].fields.SchoolYear='Senior',x=>x.players[0].fields.GenericHeadAssetName='Unique_Old',x=>x.players[0].fields.RunningStyleRating='Other',x=>x.players[0].fields.JerseyNum=99,x=>x.players[0].visualRow=999,x=>x.players[0].rawData='{}',x=>x.players[0].provenance.football='missing']){const copy=structuredClone(p);change(copy);assert.throws(()=>validateRosterPreview(copy,input,model));}
});
test('HTML is escaped, searchable and explicitly preview-only; CSV captures exact field and visual evidence',()=>{
  const p=make(),html=renderRosterGeneratorReport({...p,team:{...p.team,name:'<script>alert(1)</script>'}}),csv=rosterGeneratorCsv(p);
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(html.includes('Preview only'));assert.ok(html.includes('script-src'));assert.ok(html.includes('aria-live'));assert.equal(csv.rows.length,p.players.length);for(const key of ['ChangesJSON','BeforeFieldsJSON','AfterFieldsJSON','BeforeRawData','AfterRawData','FootballSource','CatalogSHA256'])assert.ok(csv.headings.includes(key));assert.equal(typeof getToolHandler('roster-generator')?.run,'function');
});
test('compiled bank has proven sources, no paired identities/Age and supports all original formula profiles',()=>{
  const model=loadObservedCatalog();assert.equal(model.profiles.length,35190);assert.equal(model.catalog.appearances.length,23460);assert.equal(model.catalog.sources.length,3);
  const forbidden=new Set(['Age','PLYR_BIRTHDATE','FirstName','LastName','PresentationId']);
  function inspect(value){if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){assert.ok(!forbidden.has(key),`Unexpected identity field ${key}`);inspect(item);}}
  inspect(model.catalog);assert.ok(model.profiles.every(profile=>Number.isInteger(profile.overall)));
  const bytes=fs.readFileSync(new URL('../src/main/tools/rosterGenerator/data/observed-v1.json.gz',import.meta.url));assert.ok(zlib.gunzipSync(bytes).length>bytes.length);assert.equal(model.catalog.appearances.some(item=>Object.values(item.fields).some(value=>String(value).startsWith('Unique_'))),false);
});
