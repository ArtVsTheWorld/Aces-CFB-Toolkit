import test from 'node:test';
import assert from 'node:assert/strict';
import {RAW_314,RAW_ACCESSORIES_POOLS,equipmentItem,equipmentDisplayName,recolorEquipmentItem} from '../src/main/tools/equipment/catalog.js';
import {normalizeModPools,modPoolDefinitions} from '../src/main/tools/equipment/core/modPools.js';
import {recolorPlayerAccessories} from '../src/main/tools/equipment/core/recolor.js';
import {applyRawRandomizerEquipment,mulberry32} from '../src/main/tools/equipment/core/patcher.js';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
const raw={usingRawAccessoriesMod:true},jamo=RAW_314.jamoColors;
const outfit=()=>[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'LeftArmWear',itemAssetName:'ArmSleeve_None'},{slotType:'RightArmWear',itemAssetName:'ArmSleeve_None'}]}];

test('RAW 3.1.4 necklace and primary skullcaps retain verified origin, slots and hair combinations',()=>{
  const necklace=equipmentItem('GearNeckpad_Raw_DiamondNecklace');assert.equal(necklace.origin,'raw');assert.deepEqual(necklace.slots,['Neckpad']);assert.ok(RAW_ACCESSORIES_POOLS.neckwear.includes(necklace));
  for(const brand of ['Nike','Battle'])for(const hair of [false,true]){
    const prefix=hair?'GuardianCap_RawLongDreadlocksCombo_Raw':'GuardianCap_Raw',base=prefix+brand+'SkullCap',primary=base+'TeamColorV190';
    assert.equal(equipmentItem(primary).origin,'raw');assert.deepEqual(equipmentItem(primary).slots,['GuardianCap']);
    assert.equal(recolorEquipmentItem(base+'WhiteV87','primary'),primary);assert.equal(recolorEquipmentItem(primary,'black'),base);assert.equal(recolorEquipmentItem(primary,'white'),base+'WhiteV87');assert.equal(recolorEquipmentItem(primary,'secondary'),primary);
    assert.equal(modPoolDefinitions().raw.find(c=>c.id==='skullcaps').items.some(i=>i.itemName===primary),!hair);
  }
});

test('actual RAW Jamo IDs form a mod-specific family while generic vanilla and displaced stock meanings stay intact',()=>{
  for(const source of Object.values(jamo))for(const [color,target]of Object.entries(jamo)){
    assert.equal(recolorEquipmentItem(source,color,raw),target);assert.match(equipmentDisplayName(source,raw),/^RAW Jamo Sleeves/);
  }
  assert.doesNotMatch(equipmentDisplayName(jamo.primary),/RAW Jamo/);
  assert.equal(recolorEquipmentItem('GearArmSleeve_RawJamo_White','black',raw),'GearArmSleeve_RawJamo_White');
  assert.equal(recolorEquipmentItem('GearArmSleeve_RawJamo_White','primary',raw),'GearArmSleeve_Full_sleeveLongUnderarmor_normal_TeamColor');
  assert.equal(recolorEquipmentItem('GearArmSleeve_Full_sleeveLongUnderarmor_normal_White','black',raw),'GearArmSleeve_RawJamo_White');
  assert.equal(recolorEquipmentItem('GearArmSleeve_RawJamo_Black','white',raw),'GearArmSleeve_RawJamo_Black');
  assert.equal(recolorEquipmentItem('GearArmSleeve_RawJamo_White','white'),'GearArmSleeve_RawJamo_White');
});

test('Jamo pool additions are off in Randomizer, old presets and Quickstart, including the direct fallback path',()=>{
  assert.deepEqual(normalizeModPools().raw.armSleeves,{chance:0,items:[]});assert.deepEqual(normalizeModPools({raw:{neckwear:{chance:10,items:[]}}}).raw.armSleeves,{chance:0,items:[]});
  const settings=quickstartSettings({raw:true,unlocked:true,gameday:true});assert.deepEqual(settings.randomizer.modPools.raw.armSleeves,{chance:0,items:[]});assert.equal(settings.patcher.usingRawAccessoriesMod,true);
  for(let seed=0;seed<30;seed++){const loadouts=outfit();applyRawRandomizerEquipment(loadouts,mulberry32(seed),1,undefined,'WR');assert.ok(loadouts[0].loadoutElements.filter(e=>e.slotType.endsWith('ArmWear')).every(e=>e.itemAssetName==='ArmSleeve_None'));}
});

test('explicitly selected RAW Jamo sleeves support left and right arm slots',()=>{
  const configuration=Object.fromEntries(modPoolDefinitions().raw.map(c=>[c.id,{chance:0,items:[]}]));configuration.armSleeves={chance:100,items:[jamo.white]};
  const loadouts=outfit(),changes=applyRawRandomizerEquipment(loadouts,mulberry32(42),0,undefined,'WR',configuration);
  assert.equal(changes.length,2);for(const slot of ['LeftArmWear','RightArmWear'])assert.equal(loadouts[0].loadoutElements.find(e=>e.slotType===slot).itemAssetName,jamo.white);
});

test('accessory recoloring keeps Jamo style on both arms and uses accessory color even for its arm-tape ID',()=>{
  for(const input of Object.values(jamo))for(const [color,target]of Object.entries(jamo)){
    const loadouts=outfit();for(const item of loadouts[0].loadoutElements)item.itemAssetName=input;loadouts[0].loadoutElements.push({slotType:'MouthWear',itemAssetName:'GearMouthpiece_None'});
    recolorPlayerAccessories(loadouts,color,color==='white'?'black':'white',raw);
    for(const item of loadouts[0].loadoutElements.filter(e=>e.slotType.endsWith('ArmWear')))assert.equal(item.itemAssetName,target);
    assert.equal(loadouts[0].loadoutElements.at(-1).itemAssetName,'GearMouthpiece_None');
  }
  const stock=[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'LeftArmWear',itemAssetName:'GearArmSleeve_RawJamo_TeamColor'}]}];
  recolorPlayerAccessories(stock,'primary','white',raw);assert.equal(stock[0].loadoutElements[0].itemAssetName,'GearArmSleeve_Quarter_armTape_normal_OffWhite');
});

test('Patcher recolors RAW Jamo with readable reporting and stable repeated runs',()=>{
  const ref=row=>(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0'),players=Object.values(jamo).map((_,row)=>({isEmpty:false,FirstName:'Player'+row,LastName:'Example',Position:'WR',SchoolYear:'Senior',RedshirtStatus:'Previous',TeamIndex:1,CharacterVisuals:ref(row)})),visuals=Object.values(jamo).map(asset=>({isEmpty:false,RawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'LeftArmWear',itemAssetName:asset}]}]})}));
  const options={...raw,unlockedRecolorFix:true,unlockedColorTheme:'black',teamNames:new Map([[1,'Example Team']])},result=applyGlobalEquipmentFixes(players,visuals,10,options);
  assert.equal(result.unlockedRecolorPlayersChanged,3);assert.ok(result.unlockedRecolorChanges.every(c=>c.newItem.includes('RAW Jamo Sleeves')));
  for(const v of visuals)assert.equal(JSON.parse(v.RawData).loadouts[0].loadoutElements[0].itemAssetName,jamo.black);
  assert.equal(applyGlobalEquipmentFixes(players,visuals,10,options).unlockedRecolorPlayersChanged,0);
});
