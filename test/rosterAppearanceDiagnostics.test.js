import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import{buildAppearancePreview,rosterPlayerIssue,generateRosterPreview}from'../src/main/tools/rosterGenerator/core.js';
import{loadObservedCatalog}from'../src/main/tools/rosterGenerator/catalog.js';import{rosterPreset,modelForPreset}from'../src/main/tools/rosterGenerator/presets.js';import{WRITE_FIELDS}from'../src/main/tools/rosterGenerator/contract.js';
import{renderRosterGeneratorReport,rosterGeneratorCsv}from'../src/main/tools/rosterGenerator/report.js';import{displayPosition}from'../src/shared/localization.js';
import{validateRosterGeneratorSeason}from'../src/main/tools/rosterGenerator/season.js';
const appearance={loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[]}]},raw=layer=>({keep:1,loadouts:[layer,...structuredClone(appearance.loadouts)]});
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function context(){const c=vm.createContext({escapeHtml,localizedPosition:displayPosition,state:{page:'roster-generator'}});vm.runInContext(fs.readFileSync(new URL('../src/renderer/results-ui.js',import.meta.url),'utf8'),c);return c;}

test('unsupported-layer diagnostics identify exact layer, item and extra metadata without changing recognition',()=>{
 const layer={loadoutCategory:'Base',customFlag:1,loadoutElements:[{slotType:'LeftArmTattoo',itemAssetName:'Custom_Unknown',blendSettings:7}]},input=raw(layer),before=structuredClone(input),result=buildAppearancePreview(input,appearance,'nike');
 assert.deepEqual(result.unknownLayers,['Base']);assert.deepEqual(result.unknownLayerDetails,[{index:0,type:null,category:'Base',extraFields:['customFlag'],items:[{slot:'LeftArmTattoo',asset:'Custom_Unknown',extraFields:['blendSettings']}]}]);assert.deepEqual(JSON.parse(result.raw).loadouts[0],layer);assert.deepEqual(input,before);
 const portrait=buildAppearancePreview(raw({loadoutType:'Portrait',loadoutElements:[]}),appearance,'nike');assert.equal(portrait.unknownLayerDetails[0].type,'Portrait');
});
test('known vanilla and Unlocked tattoos remain supported, unknown and malformed tattoo entries remain blocked',()=>{
 for(const itemAssetName of ['ArmTattoo_None','ArmTattoo_Generic1','CujoMatty_ArmTats_35']){const result=buildAppearancePreview(raw({loadoutCategory:'Base',loadoutElements:[{slotType:'LeftArmTattoo',itemAssetName}]}),appearance,'nike');assert.deepEqual(result.unknownLayers,[]);assert.deepEqual(result.unknownLayerDetails,[]);}
 for(const item of [null,7,{slotType:'LeftArmTattoo',itemAssetName:'CujoMatty_ArmTats_999'}]){const result=buildAppearancePreview(raw({loadoutCategory:'Base',loadoutElements:[item]}),appearance,'nike');assert.equal(result.unknownLayers.length,1);assert.equal(result.unknownLayerDetails[0].items.length,1);}
});
test('player issues carry original identity and jersey 0, never the generated replacement name',()=>{
 const target={row:42,visualRow:17,position:'TE',original:{FirstName:'Cam',LastName:'Original',JerseyNum:0,Position:'WR'}},issue=rosterPlayerIssue(target,'Unsupported appearance',{layers:['Base']});assert.equal(issue.player,'Cam Original');assert.equal(issue.position,'WR');assert.equal(issue.jersey,0);assert.equal(issue.row,42);assert.equal(issue.visualRow,17);assert.deepEqual(issue.layers,['Base']);assert.equal(rosterPlayerIssue({row:9},'Problem').player,'Player row 9');
});
test('Needs attention shows original player, number and position, with safe fallback for older previews',()=>{
 const c=context();c.result={resultKind:'roster-generator',details:{blocking:[{row:42,team:'Team',player:'Cam Original',position:'MLB',jersey:0,reason:'Unsupported appearance'}],changes:[{row:42,team:'Team',player:'Generated Replacement',oldPlayer:'Cam Original',before:{JerseyNum:8,Position:'WR'}}]}};let html=vm.runInContext('runIssueMarkup(result)',c);assert.match(html,/Team · #0 Cam Original \(MIKE\) · Unsupported appearance/);assert.doesNotMatch(html,/Generated Replacement/);
 delete c.result.details.blocking[0].player;delete c.result.details.blocking[0].jersey;delete c.result.details.blocking[0].position;html=vm.runInContext('runIssueMarkup(result)',c);assert.match(html,/#8 Cam Original \(WR\)/);
 c.result.details.changes=[];html=vm.runInContext('runIssueMarkup(result)',c);assert.match(html,/Player row 42/);
});
test('issue labels escape user-facing player/team text and preserve other tools and team-wide errors',()=>{
 const c=context();c.result={resultKind:'roster-generator',details:{blocking:[{row:3,team:'A<B',player:'Name<script>',position:'WR',jersey:3,reason:'Unsafe & unknown'},{reason:'Team-wide warning'}]}};const html=vm.runInContext('runIssueMarkup(result)',c);assert.match(html,/A&lt;B/);assert.match(html,/Name&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/Team-wide warning/);
 c.result={resultKind:'equipment-mapper',details:{blocked:[{row:3,team:'A',player:'Mapper Name',reason:'Conflict'}]}};assert.equal(vm.runInContext('runIssues(result).blocked[0]',c),'A · Mapper Name · Conflict');
});
test('real generation replaces unknown appearance layers while shared-row blockers keep original identity in app/CSV/HTML',()=>{
 const base=loadObservedCatalog(),preset=rosterPreset('competitive'),positions=['QB','HB','FB','WR','TE','LT','LG','C','RG','RT','LE','RE','DT','LOLB','MLB','ROLB','CB','FS','SS','K','P'];
 const targets=positions.map((position,row)=>({row,position,visualRow:row,visualOwners:row===3?[3,4]:[row],rawData:JSON.stringify(raw(row===3?{loadoutCategory:'Base',unknownMetadata:1,loadoutElements:[{slotType:'LeftArmTattoo',itemAssetName:'UnknownCustomTattoo'}]}:{loadoutCategory:'Base'})),original:{...Object.fromEntries(WRITE_FIELDS.map(f=>[f,0])),FirstName:'Original',LastName:'Player'+row,JerseyNum:row,Position:position,OverallRating:70}}));const before=structuredClone(targets),preview=generateRosterPreview({team:{name:'Test Team',teamIndex:1,branding:'nike'},targets,model:modelForPreset(base,preset),preset,seed:256});
 assert.equal(preview.blocking.length,1);assert.equal(preview.blocking[0].player,'Original Player3');assert.equal(preview.blocking[0].jersey,3);assert.equal(preview.players[3].appearanceAudit.reset.mode,'complete');assert.ok(!preview.players[3].rawData.includes('UnknownCustomTattoo'));assert.equal(preview.canApply,false);assert.deepEqual(targets,before);
 const csv=rosterGeneratorCsv(preview),diagnostics=JSON.parse(csv.rows[0][csv.headings.indexOf('PreviewDiagnosticsJSON')]);assert.equal(diagnostics.blocking[0].player,'Original Player3');assert.match(diagnostics.blocking[0].reason,/shares appearance/);assert.ok(csv.rows[3][csv.headings.indexOf('BeforeRawData')].includes('UnknownCustomTattoo'));assert.match(renderRosterGeneratorReport(preview),/#3 Original Player3 \(WR\): This player shares appearance data/);
 const c=context();c.result={resultKind:'roster-generator',mode:'preview',details:{canApply:false,blocking:preview.blocking}};assert.equal(vm.runInContext('runStatus(result).title',c),'Apply Blocked');
});

test('existing dynasty preseason and regular season use the supported generation window',()=>{assert.equal(validateRosterGeneratorSeason({CurrentWeekType:'PreSeason',CurrentWeek:0}).currentWeekType,'PreSeason');assert.equal(validateRosterGeneratorSeason({CurrentWeekType:'RegularSeason',CurrentWeek:8}).currentWeek,8);assert.throws(()=>validateRosterGeneratorSeason({CurrentWeekType:'OffSeason',CurrentWeek:0}),/available from the preseason/);});
