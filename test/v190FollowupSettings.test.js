import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { POSITION_GROUPS, positionGroup } from '../src/shared/positionGroups.js';
import { HELMET_MODELS, DEFAULT_HELMET_WEIGHTS, normalizeHelmetDistribution, normalizeFacemaskPools, rollCompatibleFacemask, facemaskFitsHelmet } from '../src/main/tools/equipment/core/helmets.js';
import { normalizeEquipmentOptions } from '../src/main/tools/equipment/runner.js';
import { applyGlobalEquipmentFixes, rollRolledJerseyUndershirt } from '../src/main/tools/equipment/core/globalFixes.js';
import { DEFAULT_VISOR_FREQUENCIES, DEFAULT_UNDERSHIRT_WEIGHTS, UNDERSHIRT_ASSETS, normalizeUndershirtWeights, normalizeVisorFrequencies } from '../src/main/tools/equipment/core/passSettings.js';
import { mulberry32 } from '../src/main/tools/equipment/core/patcher.js';
import { createModelConfig, customModelPresets } from '../src/main/tools/forceWin/core/modelProfiles.js';
import { CUSTOM_MODEL_FIELDS, normalizeCustomModel } from '../src/main/tools/forceWin/core/customModel.js';
import CONFIG from '../src/main/tools/forceWin/core/config.js';
import { FORCE_WIN_SCHEMA } from '../src/main/tools/forceWin/core/schema.js';
import { processSchedule, applyAssignments } from '../src/main/tools/forceWin/core/scheduleProcessor.js';
import { calculateDisparity } from '../src/main/tools/forceWin/core/disparityCalculator.js';
import { createCommentaryMatcher, normalizeName } from '../src/main/tools/commentary/matcher.js';
import { loadCommentaryMap } from '../src/main/tools/commentary/map.js';
import { ReportService } from '../src/main/services/reports.js';
import { writeCsv } from '../src/main/services/files.js';
import { parseCsv } from '../src/main/services/reportAudit.js';
import { tools } from '../src/shared/toolRegistry.js';
import { ToolPresets } from '../src/main/services/toolPresets.js';
import { SettingsStore } from '../src/main/services/settings.js';

const ref = (row, table = 10) => table.toString(2).padStart(15,'0') + row.toString(2).padStart(17,'0');
const player = (row, position) => ({ FirstName:'Test', LastName:String(row), Position:position, TeamIndex:1, IsNIL:false, CharacterVisuals:ref(row), SchoolYear:'Freshman', CharacterBodyType:'Standard' });
const item = (slotType,itemAssetName) => ({slotType,itemAssetName});
const visual = elements => ({isEmpty:false, RawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:elements}]})});
const all = id => ({...Object.fromEntries(HELMET_MODELS.map(model=>[model.id,0])),[id]:100});

test('whole grouped visor settings keep previous defaults and allow OL, FB and K/P explicitly', () => {
  assert.deepEqual(normalizeVisorFrequencies(), DEFAULT_VISOR_FREQUENCIES);
  for (const [group, aliases] of Object.entries({ OL:['LT','LG','C','RG','RT'], EDGE:['LE','RE','LEDG','REDG'], LB:['LOLB','MLB','ROLB','SAM','MIKE','WILL'], 'K/P':['K','P'] })) for (const alias of aliases) assert.equal(positionGroup(alias),group);
  for (const value of [-1,101,1.5,'',null]) assert.throws(()=>normalizeVisorFrequencies({OL:value}),/whole/);
  const positions = ['LT','RT','FB','K','P','SAM','REDG'];
  const run = percent => { const visuals=positions.map(()=>visual([item('Visor','GearVisor_None')])); applyGlobalEquipmentFixes(positions.map((p,i)=>player(i,p)),visuals,10,{visorFix:true,visorFrequencies:Object.fromEntries(POSITION_GROUPS.map(p=>[p,percent])),seed:190}); return visuals; };
  assert.ok(run(100).every(v=>v.RawData.includes('GearVisor_visorOakley_clear')));
  assert.ok(run(0).every(v=>v.RawData.includes('GearVisor_None')));
  assert.deepEqual(run(100),run(100));
});
test('custom undershirt mixes use exact supported assets for both body groups and reject fractional/invalid totals', () => {
  assert.deepEqual(normalizeUndershirtWeights(),DEFAULT_UNDERSHIRT_WEIGHTS);
  for (const key of Object.keys(UNDERSHIRT_ASSETS)) {
    const mix=Object.fromEntries(Object.keys(UNDERSHIRT_ASSETS).map(k=>[k,k===key?100:0]));
    for (const body of ['Lean','Standard','Muscular']) assert.equal(rollRolledJerseyUndershirt(mulberry32(190),'custom',body,{regular:mix,large:mix}),UNDERSHIRT_ASSETS[key]);
  }
  assert.throws(()=>normalizeUndershirtWeights({regular:{...DEFAULT_UNDERSHIRT_WEIGHTS.regular,white:34}}),/total/);
  assert.throws(()=>normalizeUndershirtWeights({large:{...DEFAULT_UNDERSHIRT_WEIGHTS.large,white:30.5}}),/whole/);
  assert.equal(normalizeEquipmentOptions({},false).tapeColorMode,'accessory');
});
test('all masks remain in their compatible helmet pools; specialist masks start off but can be explicitly selected', () => {
  const defaults=normalizeFacemaskPools({});
  for (const model of HELMET_MODELS) {
    assert.deepEqual(defaults[model.id],model.defaultMasks);
    for (const mask of model.masks) for (const position of POSITION_GROUPS) {
      const pool=normalizeFacemaskPools({[model.id]:[mask]});
      assert.equal(rollCompatibleFacemask(model.id,position,()=>.8,pool),mask);
      assert.ok(facemaskFitsHelmet(mask,model.id));
    }
    if (model.defaultMasks.some(mask=>!/Kicker|Trench/i.test(mask))) assert.ok(model.defaultMasks.every(mask=>!/Kicker|Trench/i.test(mask)));
  }
  assert.throws(()=>normalizeFacemaskPools({GearHelmet_Speed_Flex:['GearFaceMask_F72Bar']}),/compatible/);
  assert.throws(()=>normalizeFacemaskPools({GearHelmet_Speed_Flex:[]}),/at least one/);
  const model=HELMET_MODELS.find(m=>m.id==='GearHelmet_Speed_Flex'), chosen=model.masks.at(-1), current=model.masks.find(m=>m!==chosen);
  const visuals=[visual([item('HeadWear',model.id),item('FaceMask',current),item('LeftShoe','Keep')])];
  const result=applyGlobalEquipmentFixes([player(0,'LT')],visuals,10,{helmetFix:true,helmetDistribution:{mode:'custom',global:all(model.id),positions:{}},facemaskPools:{[model.id]:[chosen]},seed:190});
  assert.equal(result.helmetChanges.length,1); assert.ok(visuals[0].RawData.includes(chosen)); assert.ok(visuals[0].RawData.includes('Keep'));
});
test('grouped helmet presets deterministically average old individual positions and explicit groups take priority', () => {
  const old={mode:'custom',global:DEFAULT_HELMET_WEIGHTS,positions:{LE:all('GearHelmet_Axiom'),RE:all('GearHelmet_VicisZero2Trench')}};
  const value=normalizeHelmetDistribution(old); assert.equal(value.positions.EDGE.GearHelmet_Axiom,50); assert.equal(value.positions.EDGE.GearHelmet_VicisZero2Trench,50);
  assert.equal(normalizeHelmetDistribution({...old,positions:{...old.positions,EDGE:all('GearHelmet_VicisZero2')}}).positions.EDGE.GearHelmet_VicisZero2,100);
});
test('every custom-model starting preset preserves the original calibrated values and disparity', () => {
  const get=(object,path)=>path.split('.').reduce((value,key)=>value[key],object);
  const team=value=>({ratings:Object.fromEntries(['overall','offense','defense','qb','wr','te','rb','ol','dl','lb','db','st'].map(k=>[k,value]))});
  for (const [key,preset] of Object.entries(customModelPresets())) {
    assert.deepEqual(normalizeCustomModel(preset),preset);
    const base=createModelConfig(key), custom=createModelConfig('custom',CONFIG,preset);
    for (const field of CUSTOM_MODEL_FIELDS) assert.equal(get(custom,field.path),get(base,field.path),key+'/'+field.path);
    assert.deepEqual(calculateDisparity({favorite:team(90),underdog:team(70),favoriteLocation:"home",config:custom}),calculateDisparity({favorite:team(90),underdog:team(70),favoriteLocation:"home",config:base}));
  }
  const invalid=structuredClone(customModelPresets().balanced); invalid.values['coaching.continuity.neutralSeasons']=1.5; assert.throws(()=>normalizeCustomModel(invalid),/whole/);
  invalid.values['coaching.continuity.neutralSeasons']=1; invalid.values['finalWeights.matchupAdvantage']=.9; assert.throws(()=>normalizeCustomModel(invalid),/total/);
  assert.throws(()=>createModelConfig('custom',CONFIG,null),/Configure and save/);
});
test('weekly custom force-win limits retain strongest new assignments, protect active weeks, and only write ForceWin', () => {
  const team=(rating,index)=>({ DisplayName:'Team'+index,TeamIndex:index,TEAM_TYPE:'College',...Object.fromEntries(Object.entries(FORCE_WIN_SCHEMA.team).filter(([key])=>['overall','offense','defense','qb','wr','te','rb','ol','dl','lb','db','st'].includes(key)).map(([,field])=>[field,rating])) });
  const teams={header:{tableId:20},records:[team(95,0),team(75,1),team(65,2),team(55,3)]};
  const records=[0,1,2,3].flatMap(week=>[1,2,3].map(away=>({SeasonYear:0,SeasonWeek:week,SeasonWeekType:'RegularSeason',GameStatus:'Unplayed',HomeScore:0,AwayScore:0,ForceWin:'None',HomeTeam:ref(0,20),AwayTeam:ref(away,20),BowlGame:false})));
  const initial=structuredClone(records), preset=customModelPresets().balanced; preset.maxForceWinsPerWeek=1;
  const run=()=>processSchedule({records,teamTable:teams,context:{currentSeasonRecord:0,currentWeek:1},modelProfile:'custom',customModel:preset,involvement:'maximum',random:()=>0});
  const result=run(); assert.equal(result.changes.length,2); assert.deepEqual(result.changes.map(g=>g.week),[2,3]); assert.ok(result.changes.every(g=>g.underdog.row===3));
  assert.equal(result.summary.weeklyLimitSuppressed,4); assert.deepEqual(records,initial); assert.deepEqual(result.changes.map(g=>g.index),run().changes.map(g=>g.index));
  applyAssignments(result.changes);
  records.forEach((record,index)=>Object.keys(record).filter(field=>field!=='ForceWin').forEach(field=>assert.equal(record[field],initial[index][field])));
  assert.equal(records.filter(r=>r.ForceWin==='Home').length,2);
});
test('every unsuffixed commentary name supports Jr., Sr., III, IV and V without phonetic matching', () => {
  const map=loadCommentaryMap(new URL('../resources/commentary-data/PlayerCommentaryidMap.txt',import.meta.url)), match=createCommentaryMatcher(map,{allowPhonetic:false,allowFirstName:false});
  const normalized=new Map(); for (const [name,id] of map) if(!normalized.has(normalizeName(name))) normalized.set(normalizeName(name),id);
  for (const [name,id] of map) if (!/\s(?:jr\.?|sr\.?|ii|iii|iv|v)$/i.test(name)) for (const suffix of ['Jr.','Sr.','III','IV','V']) assert.equal(match('John',name+' '+suffix).id,normalized.get(normalizeName(name+' '+suffix)) ?? normalized.get(normalizeName(name)),name+' '+suffix);
});
test('audited CSV handles quoted multiline gear data and records full run context without affecting ordinary reports', t => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-report-audit-')); t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const audit={runId:'run',toolVersion:'5.5',mode:'apply',savePath:'C:/test',options:{facemaskPools:{helmet:['mask']},customModel:customModelPresets().balanced}};
  const reports=new ReportService(directory).forRun(audit);
  const file=reports.createRaw({toolId:'equipment-patcher',toolName:'Patcher',prefix:'audit',content:'Player,Before,After\r\nName,"line one\nline two, ""quoted""",new\r\nSecond,old,new\r\n'});
  const [headers,row]=parseCsv(fs.readFileSync(file,'utf8')); assert.equal(row[1],'line one\nline two, "quoted"'); assert.deepEqual(JSON.parse(row.at(-1)),audit.options); assert.equal(row[headers.indexOf('AuditRunMode')],'apply');
  assert.deepEqual(JSON.parse(fs.readFileSync(file+'.meta.json','utf8')).audit,audit);
});
test('all configurable tool presets persist grouped weights, pools, sliders and NIL selection without saving cached plans', t => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-new-presets-')); t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const settings=new SettingsStore(path.join(directory,'settings.json')); settings.load(); const presets=new ToolPresets(settings);
  const configuration={version:1,values:{'helmet-distribution-json':JSON.stringify({mode:'custom',global:DEFAULT_HELMET_WEIGHTS,positions:{OL:all('GearHelmet_VicisZero2Trench')}}),'facemask-pools-json':JSON.stringify(normalizeFacemaskPools({})),'force-custom-model-json':JSON.stringify(customModelPresets().chaos),'equipment-skip-nil':false,'visor-frequency-LB':'17','undershirt-large-white':'30'},teamSelections:{'equipment-included':['LSU']}};
  for (const tool of tools.filter(t=>t.status==='available')) presets.save({toolId:tool.id,name:'Round trip',configuration});
  const reopened=new SettingsStore(settings.filePath); reopened.load(); const loaded=new ToolPresets(reopened).list(); assert.equal(loaded.length,tools.filter(t=>t.status==='available').length); loaded.forEach(preset=>assert.deepEqual(preset.configuration,configuration));
});
test("large CSV reports use bounded writes and preserve every quoted row", t => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),"cfb-large-report-")); t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const file=path.join(directory,"report.csv"), value=JSON.stringify({ gear:"test, \"quoted\"\n"+ "x".repeat(150000) });
  const rows=Array.from({length:30},(_,i)=>[i,value]); writeCsv(file,["Row","RawData"],rows);
  const parsed=parseCsv(fs.readFileSync(file,"utf8")); assert.equal(parsed.length,31); rows.forEach((row,i)=>assert.deepEqual(parsed[i+1],row.map(String)));
  assert.deepEqual(fs.readdirSync(directory),["report.csv"]);
});
test("new live-sourced optional masks never enter default selections or implicit rolls", () => {
  const inventory=JSON.parse(fs.readFileSync(new URL("../src/main/tools/equipment/equipmentLiveFacemasks.json",import.meta.url),"utf8"));
  assert.equal(inventory.items.length,20);
  for(const item of inventory.items) { const models=HELMET_MODELS.filter(model=>model.masks.includes(item.itemName)); assert.ok(models.length); for(const model of models) { assert.ok(!model.defaultMasks.includes(item.itemName)); for(let i=0;i<=100;i++) assert.notEqual(rollCompatibleFacemask(model.id,"WR",()=>i/100),item.itemName); } }
});
