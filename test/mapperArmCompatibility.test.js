import test from 'node:test';import assert from 'node:assert/strict';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
import {SHORT_BLACK_TAPE_JAMO,LONG_SLEEVE_UNDERSHIRTS} from '../src/main/tools/equipment/core/armFit.js';
const e=(slotType,itemAssetName)=>({slotType,itemAssetName});
const player=elements=>({row:0,visualRow:0,player:'Test Player',team:'Test',teamIndex:1,position:'WR',branding:'nike',rawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:elements}]})});
const copy=(catalog,slot,asset)=>{const item=catalog.items.find(i=>i.slot===slot&&i.asset===asset);assert.ok(item,slot+' / '+asset);return {action:'copy',replacementId:item.id,scope:'all',frequency:100,fillToFrequency:true};};
test('Mapper allows wrists but warns about elbow gear with ambiguous short black tape in both mod contexts',()=>{
 for(const raw of [false,true]){
  const catalog=mapperCatalog({confirmed:true,unlocked:true,raw}),p=player([e('LeftArmWear',SHORT_BLACK_TAPE_JAMO)]),before=structuredClone(p);
  const allowed=buildMapperPreview([p],catalog,[copy(catalog,'LeftWristWear','GearWrist_wristTapedNormal_White')]);assert.equal(allowed.blocked.length,0);assert.equal(allowed.changes.length,1);
  const blocked=buildMapperPreview([p],catalog,[copy(catalog,'LeftElbowWear','ElbowGear_elbowSweatbandFull_White')]);assert.equal(blocked.changes.length,1);assert.equal(blocked.blocked.length,0);assert.equal(blocked.compatibilityWarnings.length,1);assert.deepEqual(p,before);
 }
});
test('Mapper validates completed batch: longsleeve plus sleeve warns, coordinated sleeve removal permits shirt',()=>{
 const catalog=mapperCatalog({confirmed:true,unlocked:true,raw:true}),p=player([e('LeftArmWear','GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_White')]),shirt=copy(catalog,'InnerShirt',[...LONG_SLEEVE_UNDERSHIRTS][0]);
 const blocked=buildMapperPreview([p],catalog,[shirt]);assert.equal(blocked.changes.length,1);assert.equal(blocked.blocked.length,0);assert.equal(blocked.compatibilityWarnings.length,1);
 const valid=buildMapperPreview([p],catalog,[shirt,copy(catalog,'LeftArmWear','ArmSleeve_None')]);assert.equal(valid.blocked.length,0);assert.equal(valid.changes.length,1);assert.equal(valid.compatibilityWarnings.length,0);
});
