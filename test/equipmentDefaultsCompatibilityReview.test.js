import test from 'node:test';import assert from 'node:assert/strict';
import{modPoolDefinitions,normalizeModPools}from'../src/main/tools/equipment/core/modPools.js';
import{equipmentItem}from'../src/main/tools/equipment/catalog.js';
import{applyModdedRandomizerEquipment,mulberry32}from'../src/main/tools/equipment/core/patcher.js';
import{canGenerateEquipment,createGeneratedEquipmentState,enforceGeneratedEquipmentCompatibility}from'../src/main/tools/equipment/core/generatedCompatibility.js';
import{enforceEquipmentCompatibility}from'../src/main/tools/equipment/core/compatibility.js';
import{quickstartSettings}from'../src/main/tools/equipmentQuickstart/runner.js';
import{normalizeEquipmentOptions}from'../src/main/tools/equipment/runner.js';
import{mapperCatalog}from'../src/main/tools/equipmentMapper/catalog.js';import{buildMapperPreview}from'../src/main/tools/equipmentMapper/core.js';
const defs=modPoolDefinitions(),empty=()=>({_version:2,...Object.fromEntries(Object.entries(defs).map(([o,c])=>[o,Object.fromEntries(c.map(c=>[c.id,{chance:0,items:[]}]))]))}),elem=(slotType,itemAssetName)=>({slotType,itemAssetName}),outfit=(...elements)=>[{loadoutType:'PlayerOnField',loadoutElements:elements}];
const run=(origin,category,items,position='WR',extra={})=>{const pools=empty();pools[origin][category]={chance:100,items,...extra};const loadouts=outfit(),state=createGeneratedEquipmentState(loadouts),changes=applyModdedRandomizerEquipment(loadouts,{position,branding:'nike'},mulberry32(22),1,state,{usingVanillaPool:true,usingUnlockedMod:true,usingRawAccessoriesMod:true,usingEquipmentTruckMod:true,modPools:pools});return{loadouts,state,changes};};

test('requested CFB 27/Unlocked defaults are identical in Randomizer and Quickstart while explicit presets remain unchanged',()=>{
 const expectedSleeves=defs.vanilla.find(c=>c.id==='armSleeves').items.filter(i=>/^Baggy Arm Sleeve |^Arm Sleeve (Quarter|Half) |^Arm Tape (Long|Short) /.test(i.displayName)).map(i=>i.itemName),expectedWrist=defs.vanilla.find(c=>c.id==='wristGear').items.filter(i=>/^Wrist Taped (Lite|Max|Normal) |^Glove Taped Large |^Wrist Band Normal /.test(i.displayName)).map(i=>i.itemName);
 assert.equal(expectedSleeves.length,20);assert.equal(expectedWrist.length,18);
 for(const p of [normalizeModPools(),quickstartSettings({unlocked:true}).randomizer.modPools]){assert.deepEqual(p.vanilla.armSleeves.items,expectedSleeves);assert.deepEqual(p.vanilla.wristGear.items,expectedWrist);assert.equal(p.vanilla.wristGear.chance,10);assert.equal(p.unlocked.wristTape.chance,3);assert.deepEqual(p.unlocked.towels,{chance:1,items:['Towel2_South']});assert.ok(!p.vanilla.wristGear.items.includes('GearWrist_wristbrace_CompressShort_Black'));}
 const old={_version:2,vanilla:{armSleeves:{chance:27,items:[]},wristGear:{chance:0,items:[]}},unlocked:{wristTape:{chance:83,items:[]},towels:{chance:0,items:[]}}};const normalized=normalizeModPools(old);for(const origin of ['vanilla','unlocked'])for(const [c,choice]of Object.entries(old[origin]))assert.deepEqual(normalized[origin][c],choice);
});

test('large glove tape and String Towels roll only for the requested positions without imposing Mapper/donor restrictions',()=>{
 for(const p of ['QB','HB','FB','WR','TE','LT','LG','C','RG','RT','LEDGE','REDGE','DT','SAM','MIKE','WILL','LOLB','ROLB','LEDG','REDG','CB','FS','SS','K','P']){
  const tape=run('vanilla','wristGear',['GearWrist_gloveTapedLarge_Black'],p),towel=run('unlocked','towels',['Towel2_South'],p);
  assert.equal(tape.changes.vanilla.length>0,['FB','TE','LT','LG','C','RG','RT','LEDGE','REDGE','DT','SAM','MIKE','WILL','LOLB','ROLB','LEDG','REDG'].includes(p),p+' tape');assert.equal(towel.changes.unlocked.length>0,['WR','CB','FS','SS'].includes(p),p+' towel');assert.deepEqual(enforceGeneratedEquipmentCompatibility(tape.loadouts,tape.state,p),[]);assert.deepEqual(enforceGeneratedEquipmentCompatibility(towel.loadouts,towel.state,p),[]);
 }
});

test('every provider honors zero/full saved item chances, including sleeve, elbow and facepaint categories',()=>{
 for(const [origin,category]of [['vanilla','armSleeves'],['vanilla','elbowGear'],['vanilla','facepaint'],['unlocked','armSleeves'],['unlocked','facepaint'],['raw','armSleeves'],['raw','facepaint'],['raw','neckwear'],['eljax','armSleeves'],['eljax','visors']]){
  const items=defs[origin].find(c=>c.id===category).items.filter(i=>!i.replacedByRaw).slice(0,2).map(i=>i.itemName);assert.equal(items.length,2);
  const r=run(origin,category,items,'WR',{chance:0,rollGroups:[{chance:0,items:[items[0]]},{chance:100,items:[items[1]]}]});assert.ok(r.changes[origin].some(c=>c.newItem===items[1]),origin+' '+category);assert.ok(!r.changes[origin].some(c=>c.newItem===items[0]),origin+' '+category);
 }
});

test('sleeve/undershirt rules work in both directions and in every supported mod context',()=>{
 const wrist='GearWrist_wristTapedLite_White',elbow='ElbowGear_elbowSweatbandFull_Black';
 for(const [sleeve,wristOk,elbowOk]of [['GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_White',true,true],['GearArmSleeve_Undershirt_sleeveLongUnderarmor_normal_White',true,true],['GearArmSleeve_Undershirt_armTape_normal_OffWhite',true,true],['GearArmSleeve_Quarter_armTape_normal_OffWhite',true,true],['GearArmSleeve_Quarter_armTape_normal_Black',true,false],['GearArmSleeve_Half_sleeveLongUnderarmor_normal_White',false,false],['GearArmSleeve_Full_sleeveLongUnderarmor_normal_White',false,false],['GearArmSleeve_CompressionRolledUpShirt_White',false,false]]){
  for(const [slot,id,allowed]of [['LeftWristWear',wrist,wristOk],['LeftElbowWear',elbow,elbowOk]]){assert.equal(canGenerateEquipment(outfit(elem('LeftArmWear',sleeve)),equipmentItem(id),[slot],'WR'),allowed,sleeve+' '+slot);assert.equal(canGenerateEquipment(outfit(elem(slot,id)),equipmentItem(sleeve),['LeftArmWear'],'WR'),allowed,sleeve+' reversed');}
 }
 const long='G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD',quarter='GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_White';assert.equal(canGenerateEquipment(outfit(elem('InnerShirt',long)),equipmentItem(wrist),['LeftWristWear'],'WR'),false);assert.equal(canGenerateEquipment(outfit(elem('InnerShirt','G_CompressionT_Crew_ShortSleeve_Basic_WHI')),equipmentItem(quarter),['LeftArmWear'],'WR'),false);
 for(const raw of [true,false])assert.equal(canGenerateEquipment(outfit(elem('LeftArmWear','GearArmSleeve_Quarter_armTape_normal_Black')),equipmentItem(wrist),['LeftWristWear'],'WR',{usingRawAccessoriesMod:raw}),true);
});

test('new pool additions never remove donor mouthpieces or overlap elbow-slot wrist bands; compatibility repairs existing overlaps',()=>{
 const wrist=equipmentItem('GearWrist_wristTapedLite_White'),rubber=equipmentItem('ElbowGear_RubberBands1');assert.equal(canGenerateEquipment(outfit(elem('LeftElbowWear',rubber.itemName)),wrist,['LeftWristWear'],'WR'),false);assert.equal(canGenerateEquipment(outfit(elem('LeftWristWear',wrist.itemName)),rubber,['LeftElbowWear'],'WR'),false);
 const e=[elem('LeftWristWear',wrist.itemName),elem('LeftElbowWear',rubber.itemName)];const fixes=enforceEquipmentCompatibility(e);assert.ok(fixes.some(f=>f.kind==='wrist-overlap'));assert.equal(e[0].itemAssetName,wrist.itemName);
 assert.equal(canGenerateEquipment(outfit(elem('MouthWear','GearMouthpiece_PacifierDual_White')),equipmentItem('FaceGear_BalaclavaOverNose'),['FaceWear'],'WR'),false);assert.equal(canGenerateEquipment(outfit(elem('FaceWear','FaceGear_BalaclavaOverNose')),equipmentItem('GearMouthpiece_PacifierDual_White'),['MouthWear'],'WR'),false);
 assert.equal(canGenerateEquipment(outfit(elem('HeadWear','GearHelmet_VicisZero2Trench')),equipmentItem('GuardianCap_GuardianXT2',{usingUnlockedMod:false}),['GuardianCap'],'WR'),false);
});

test('Mapper and Patcher use confirmed mod context rather than mislabeling stock neck rolls or treating recolor as mod installation',()=>{
 assert.equal(normalizeEquipmentOptions({unlockedRecolorFix:true},false).usingUnlockedMod,false);assert.equal(normalizeEquipmentOptions({unlockedSocksFix:true},false).usingUnlockedMod,true);
 const mods={confirmed:true,unlocked:true},lib=mapperCatalog(mods),mask=lib.items.find(i=>i.asset==='GearNeckpad_VintageNeckRoll'),player={row:1,team:'Test',player:'Test Player',position:'WR',branding:'nike',rawData:JSON.stringify({loadouts:outfit(elem('MouthWear','GearMouthpiece_PacifierDual_White'))})};const preview=buildMapperPreview([player],lib,[{action:'copy',scope:'all',replacementId:mask.id}]);assert.equal(preview.blocked.length,0);assert.equal(preview.compatibilityWarnings.length,1);
});
