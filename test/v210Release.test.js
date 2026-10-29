import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {equipmentItem, equipmentDisplayName, UNLOCKED_POOLS, RAW_ACCESSORIES_POOLS, recolorEquipmentItem} from '../src/main/tools/equipment/catalog.js';
import {normalizeModPools,modPoolEditorCatalog} from '../src/main/tools/equipment/core/modPools.js';
import {applyUnlockedRandomizerEquipment} from '../src/main/tools/equipment/core/patcher.js';
import {canGenerateEquipment} from '../src/main/tools/equipment/core/generatedCompatibility.js';
import {auditReport} from '../src/main/services/reportAudit.js';
import {HistoryStore} from '../src/main/services/history.js';
import {tools} from '../src/shared/toolRegistry.js';
const cross='GearWrist_wristTapedMax_WhiteCross';
const loadouts=elements=>[{loadoutType:'PlayerOnField',loadoutElements:structuredClone(elements)}];
test('Jamo sleeves are opt-in; new and legacy callers do not add them by default',()=>{
  const defaults=normalizeModPools();assert.equal(defaults.unlocked.undershirts.chance,0);assert.equal(defaults.unlocked.undershirts.items.length,4);
  const target={position:'WR',branding:'nike'};
  for(const config of [undefined,defaults.unlocked]){const rows=loadouts([]);applyUnlockedRandomizerEquipment(rows,target,()=>0,0,undefined,config);assert.ok(!rows[0].loadoutElements.some(item=>item.slotType==='InnerShirt'));}
  const config=normalizeModPools({unlocked:{undershirts:{chance:100,items:defaults.unlocked.undershirts.items}}}).unlocked;
  // Keep explicit saved selections/chances instead of silently resetting them.
  assert.equal(config.undershirts.chance,100);assert.equal(normalizeModPools({unlocked:{undershirts:{chance:10,items:config.undershirts.items}}}).unlocked.undershirts.chance,10);
  const rows=loadouts([]);applyUnlockedRandomizerEquipment(rows,target,()=>0,0,undefined,config);assert.match(rows[0].loadoutElements.find(item=>item.slotType==='InnerShirt').itemAssetName,/BasicJ_/);
});
test('verified cross wrist tape stays in Unlocked, uses wrist slots and never invents colors',()=>{
  const item=equipmentItem(cross);assert.equal(equipmentDisplayName(cross),'Taped Wrist with Cross');assert.equal(item.origin,'unlocked');assert.deepEqual(item.slots,['LeftWristWear','RightWristWear']);assert.ok(item.tags.includes('GearWrist_Tape'));
  assert.deepEqual(UNLOCKED_POOLS.wristTape.map(item=>item.itemName),[cross]);assert.ok(!Object.values(RAW_ACCESSORIES_POOLS).flat().some(item=>item.itemName===cross));
  assert.equal(recolorEquipmentItem(cross,'black'),cross);assert.ok(modPoolEditorCatalog().unlocked.find(category=>category.id==='wristTape').items.some(item=>item.label==='Taped Wrist with Cross'));
  const config=normalizeModPools({unlocked:{wristTape:{chance:100,items:[cross]}}}).unlocked;
  for(const [key,settings] of Object.entries(config)) if(key!=='wristTape') settings.chance=0;
  const rows=loadouts([]);applyUnlockedRandomizerEquipment(rows,{position:'WR',branding:'nike'},()=>0,0,undefined,config);
  assert.ok(rows[0].loadoutElements.some(item=>item.slotType==='LeftWristWear'&&item.itemAssetName===cross));
  assert.ok(!canGenerateEquipment(loadouts([{slotType:'LeftArmWear',itemAssetName:'GearArmSleeve_Full_White'}]),item,item.slots,'WR'));
  assert.ok(!canGenerateEquipment(loadouts([{slotType:'InnerShirt',itemAssetName:'G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD'}]),item,item.slots,'WR'));
  assert.ok(!canGenerateEquipment(loadouts([{slotType:'LeftElbowWear',itemAssetName:'ElbowGear_RubberBands1'}]),item,item.slots,'WR'));
});
test('app-only release version is captured by new audits and history; legacy entries remain readable',()=>{
  const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));assert.match(pkg.version,/^\d+\.\d+\.\d+$/);assert.ok(tools.every(tool=>!Object.hasOwn(tool,'version')));
  const report=auditReport({headings:['Change'],rows:[['One']]},{runId:'run',appVersion:pkg.version,mode:'apply',options:{}});assert.ok(report.headings.includes('AuditAppVersion'));assert.ok(!report.headings.includes('AuditToolVersion'));assert.equal(report.rows[0][2],pkg.version);
  assert.ok(auditReport({headings:[],rows:[[]]},{toolVersion:'6.0'}).headings.includes('AuditToolVersion'));
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-version-history-'));
  try{const store=new HistoryStore(path.join(directory,'history.json'));store.add({id:'old',toolVersion:'6.0'});store.add({id:'new',appVersion:pkg.version});const reopened=new HistoryStore(store.filePath);reopened.load();assert.equal(reopened.get('new').appVersion,pkg.version);assert.equal(reopened.get('old').toolVersion,'6.0');}finally{fs.rmSync(directory,{recursive:true,force:true});}
});
