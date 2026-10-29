import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EQUIPMENT_ITEMS,equipmentItem} from '../src/main/tools/equipment/catalog.js';
import {allowedPoolPosition,canGenerateEquipment,createGeneratedEquipmentState,enforceGeneratedEquipmentCompatibility,recordGeneratedEquipment} from '../src/main/tools/equipment/core/generatedCompatibility.js';
import {applyModdedRandomizerEquipment,mulberry32} from '../src/main/tools/equipment/core/patcher.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import {modPoolDefinitions,normalizeModPools} from '../src/main/tools/equipment/core/modPools.js';
import {mapperLibrary,buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
import {writeCsv} from '../src/main/services/files.js';
import {createCommentaryMatcher} from '../src/main/tools/commentary/matcher.js';

const restricted=['LT','LG','C','RG','RT','DT','K','P'];
const element=(slotType,itemAssetName)=>({slotType,itemAssetName});
const outfit=elements=>[{loadoutType:'PlayerOnField',loadoutElements:elements}];
const forbidden=item=>/balaclava|turtleneck|string towel/i.test(item.displayName)||item.category==='Gloves'&&!/^GearHand_tapedHand/.test(item.itemName)&&!/_None$/i.test(item.itemName);

test('all named catalog variants obey pool-only position restrictions, with taped hands kept for linemen',()=>{
  const items=EQUIPMENT_ITEMS.filter(forbidden);
  assert.ok(items.length>50);
  for(const position of restricted)for(const item of items)assert.equal(allowedPoolPosition(item,position),false,position+' '+item.displayName);
  const tape=EQUIPMENT_ITEMS.filter(item=>/^GearHand_tapedHand/.test(item.itemName));assert.ok(tape.length);
  for(const item of tape){for(const position of restricted.slice(0,6))assert.equal(canGenerateEquipment(outfit([]),item,item.slots,position),true);for(const position of ['K','P'])assert.equal(allowedPoolPosition(item,position),false);}
});

test('real combined mod rolls cannot add forbidden items to restricted positions across seeds',()=>{
  const options=normalizeEquipmentOptions({usingUnlockedMod:true,usingRawAccessoriesMod:true,usingEquipmentTruckMod:true,extraEquipmentChance:100},true);
  for(const categories of Object.values(options.modPools))for(const settings of Object.values(categories))settings.chance=100;
  for(const position of restricted)for(let seed=0;seed<20;seed++){
    const loadouts=outfit([]),state=createGeneratedEquipmentState(loadouts);
    applyModdedRandomizerEquipment(loadouts,{position,branding:'nike'},mulberry32(seed),1,state,options);
    enforceGeneratedEquipmentCompatibility(loadouts,state,position);
    for(const e of loadouts[0].loadoutElements){const item=equipmentItem(e.itemAssetName,options);if(item)assert.equal(allowedPoolPosition(item,position),true,position+' '+item.displayName);}
  }
});

test('pool final checks preserve donor items but undo a forbidden new addition',()=>{
  const glove=EQUIPMENT_ITEMS.find(item=>item.itemName==='GearHand_glove_AdidasAdizero11_black');assert.ok(glove);
  const loadouts=outfit([element('LeftHandWear',glove.itemName)]),state=createGeneratedEquipmentState(loadouts);
  assert.deepEqual(enforceGeneratedEquipmentCompatibility(loadouts,state,'DT'),[]);
  loadouts[0].loadoutElements.push(element('RightHandWear',glove.itemName));recordGeneratedEquipment(state,['RightHandWear'],glove.itemName);
  assert.equal(enforceGeneratedEquipmentCompatibility(loadouts,state,'DT').length,1);
  assert.deepEqual(loadouts[0].loadoutElements,[element('LeftHandWear',glove.itemName)]);
});

test('pool restrictions do not prevent intentional Mapper edits for linemen',()=>{
  const players=[{row:1,visualRow:1,player:'Lin Guy',team:'Test',position:'DT',branding:'adidas',rawData:JSON.stringify({loadouts:outfit([element('LeftHandWear','GearHand_None')])})},
    {row:2,visualRow:2,player:'Donor Guy',team:'Test',position:'WR',branding:'adidas',rawData:JSON.stringify({loadouts:outfit([element('LeftHandWear','GearHand_glove_AdidasAdizero11_black')])})}];
  const library=mapperLibrary(players),result=buildMapperPreview(players,library,[{action:'replace',sourceId:library.items.find(i=>i.asset==='GearHand_None').id,replacementId:library.items.find(i=>i.asset==='GearHand_glove_AdidasAdizero11_black').id,matchMode:'item',positions:['DT']}]);
  assert.equal(result.blocked.length,0);assert.equal(result.changes.length,1);assert.equal(result.compatibilityWarnings.length,0);
});

test('tattoo defaults are 30% Fill for Patcher and Quickstart while explicit saved choices survive',()=>{
  const defaults=normalizeEquipmentOptions({},false);assert.equal(defaults.unlockedTattooCap,30);assert.equal(defaults.fillFrequencies.tattoos,true);assert.equal(defaults.unlockedTattooFix,false);
  const custom=normalizeEquipmentOptions({unlockedTattooCap:17,fillFrequencies:{tattoos:false}},false);assert.equal(custom.unlockedTattooCap,17);assert.equal(custom.fillFrequencies.tattoos,false);
  const q=quickstartSettings({unlocked:true});assert.equal(q.patcher.unlockedTattooCap,30);assert.equal(q.patcher.fillFrequencies.tattoos,true);assert.equal(q.patcher.unlockedTattooFix,true);
  assert.equal(quickstartSettings({unlocked:false}).patcher.unlockedTattooFix,false);
});

test('wrist brace support is catalogued but never selected in default mod pools',()=>{
  const brace=equipmentItem('GearWrist_wristbrace_CompressShort_Black');assert.equal(brace.displayName,'Wrist Brace Support Black');
  const pools=normalizeModPools();for(const categories of Object.values(pools))for(const category of Object.values(categories))assert.ok(!category.items.includes(brace.itemName));
  for(const categories of Object.values(modPoolDefinitions()))for(const category of categories)assert.ok(!category.defaultItems.includes(brace.itemName));
});

test('streamed reports preserve CSV bytes across chunks and remove incomplete writes on failure',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-report-polish-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const file=path.join(directory,'report.csv'),headings=['Name','Detail','Number'],rows=Array.from({length:12000},(_,i)=>['José, "Q"','line 1\nline 2 — '+('x'.repeat(100)),i%2?null:i]);
  const cell=value=>{const s=String(value??'');return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};
  const expected=[headings,...rows].map(row=>row.map(cell).join(',')+'\r\n').join('');
  writeCsv(file,headings,(function*(){yield*rows;})());assert.equal(fs.readFileSync(file,'utf8'),expected);
  assert.throws(()=>writeCsv(file,headings,(function*(){yield rows[0];throw Error('broken source');})()),/broken source/);
  assert.equal(fs.readFileSync(file,'utf8'),expected);assert.deepEqual(fs.readdirSync(directory),['report.csv']);
});

test('memoized commentary names retain first-name rules, per-analysis options and independent results',()=>{
  const map=new Map([['Ware',1],['Smith',2],['James',3]]),matcher=createCommentaryMatcher(map,{allowPhonetic:true});
  const last=matcher('X','Wear');assert.equal(last.id,1);last.id=99;assert.equal(matcher('X','Wear').id,1);
  assert.equal(matcher('Wear','Unmatched').id,0);assert.equal(matcher('James','Jones-Smith').source,'last');assert.equal(matcher('James','Unmatched').source,'first');
  assert.equal(createCommentaryMatcher(map,{allowPhonetic:false})('X','Wear').id,0);
});
