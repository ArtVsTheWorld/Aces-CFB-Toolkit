import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { equipmentDisplayName, equipmentDisplayValue, equipmentItem, EQUIPMENT_TRUCK_POOLS, UNLOCKED_POOLS, recolorEquipmentItem, isInvalidMouthpieceAsset } from '../src/main/tools/equipment/catalog.js';
import { normalizeModPools, modPoolDefinitions, modPoolEditorCatalog } from '../src/main/tools/equipment/core/modPools.js';
import { applyEquipmentTruckRandomizerEquipment, mulberry32 } from '../src/main/tools/equipment/core/patcher.js';
import { buildFacePaintPool, facePaintOptionsForPosition, MOD_FACE_PAINT_ITEMS, VANILLA_FACE_PAINT_OPTIONS, rollFacePaint } from '../src/main/tools/equipment/core/facepaint.js';
import { UNLOCKED_TATTOO_POOL, DEFAULT_UNLOCKED_TATTOO_SELECTION, rollUnlockedTattoo, applyUnlockedTattooPlan } from '../src/main/tools/equipment/core/tattoos.js';
import { recolorPlayerAccessories } from '../src/main/tools/equipment/core/recolor.js';
import { decodeRosterEquipmentElement } from '../src/main/tools/equipment/donorSource.js';
import { mapperItemName, mapperCategoryLabel } from '../src/main/tools/equipmentMapper/library.js';
import { removeHandwarmers } from '../src/main/tools/equipment/core/targetedCorrections.js';
import { generatedItemConflict } from '../src/main/tools/equipment/core/generatedCompatibility.js';

const inventory=JSON.parse(fs.readFileSync(new URL('../src/main/tools/equipment/equipmentOfflineInventory.json',import.meta.url)));
const disabled=()=>Object.fromEntries(modPoolDefinitions().eljax.map(category=>[category.id,{chance:0,items:[]}]));
const only=(category,id)=>({...disabled(),[category]:{chance:100,items:[id]}});
const outfit=()=>[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'HeadWear',itemAssetName:'GearHelmet_Speed_Flex'},{slotType:'MouthWear',itemAssetName:'GearMouthpiece_None'},{slotType:'WaistWear',itemAssetName:'Handwarmer_Standard'},{slotType:'Visor',itemAssetName:'GearVisor_None'}]}];
const get=(loadouts,slot)=>loadouts[0].loadoutElements.find(element=>element.slotType===slot)?.itemAssetName;

test('offline labels resolve in previews, mapper and mixed descriptions without exposing internal combo markers',()=>{
  for(const id of Object.keys(inventory.displayNames)) {
    assert.notEqual(equipmentDisplayName(id),id,id);
    assert.doesNotMatch(equipmentDisplayName(id),/^RAW_(?:CAPS_PAIR|EARRINGS_COMBO|LONG_DREADS_COMBO):/);
  }
  const combo='FaceMarks_RawEarringsCombo_NoseTape_imfnopen';
  assert.match(equipmentDisplayName(combo),/Diamond Stud Earrings.*Open/i);
  assert.equal(mapperItemName(combo),equipmentDisplayName(combo));
  assert.match(equipmentDisplayValue(`Facepaint: ${combo}`),/Diamond Stud Earrings/);
  assert.equal(equipmentDisplayName('CujoMatty_ArmTats_35'),'CujoMatty custom arm design 35');
  assert.equal(equipmentDisplayName('LegTattoo_Four'),'Custom leg design 4');
  assert.equal(equipmentDisplayName('FaceMarks_NoseTape_G'),'Nose Tape GABOS');
});

test('new Truck pool identities and slots match decoded definitions and never enter other mod pools',()=>{
  assert.equal(EQUIPMENT_TRUCK_POOLS.chinCovers.length,4);
  assert.equal(EQUIPMENT_TRUCK_POOLS.waistPlaycalls.length,9);
  assert.equal(EQUIPMENT_TRUCK_POOLS.handwarmers.length,1);
  assert.equal(EQUIPMENT_TRUCK_POOLS.thighPads.length,1);
  for(const item of EQUIPMENT_TRUCK_POOLS.chinCovers){assert.deepEqual(item.slots,['Reserved']);assert.equal(isInvalidMouthpieceAsset(item.itemName),true);}
  for(const item of EQUIPMENT_TRUCK_POOLS.waistPlaycalls){assert.deepEqual(item.slots,['HeadBand']);assert.deepEqual(item.allowedPositions,['QB']);}
  assert.equal(mapperCategoryLabel('HeadBand'),'Waist Playcall Band');assert.equal(mapperCategoryLabel('Reserved'),'Chin Cover');
  const other=new Set(Object.values(UNLOCKED_POOLS).flat().map(item=>item.itemName));
  for(const item of Object.values(EQUIPMENT_TRUCK_POOLS).flat())assert.equal(other.has(item.itemName),false);
});

test('every new category generates complete items only in its declared slots and preserves unrelated gear',()=>{
  for(const category of ['chinCovers','waistPlaycalls','handwarmers','thighPads'])for(const item of EQUIPMENT_TRUCK_POOLS[category]){
    const loadouts=outfit(),before=structuredClone(loadouts[0].loadoutElements.filter(element=>!item.slots.includes(element.slotType)));
    const changes=applyEquipmentTruckRandomizerEquipment(loadouts,mulberry32(17),0,undefined,'QB',only(category,item.itemName));
    assert.equal(changes.length,1,item.itemName);
    for(const slot of item.slots)assert.equal(get(loadouts,slot),item.itemName);
    assert.deepEqual(loadouts[0].loadoutElements.filter(element=>!item.slots.includes(element.slotType)),before);
    assert.equal(changes[0].displayName,item.displayName);
  }
});

test('waist playcall generation is QB-only and coexists with handwarmers',()=>{
  const item=EQUIPMENT_TRUCK_POOLS.waistPlaycalls[0];
  for(const position of ['HB','WR','TE','LT','DT','CB','K','P','']){
    const loadouts=outfit(),before=structuredClone(loadouts);
    assert.deepEqual(applyEquipmentTruckRandomizerEquipment(loadouts,mulberry32(18),1,undefined,position,only('waistPlaycalls',item.itemName)),[]);
    assert.deepEqual(loadouts,before);
  }
  const loadouts=outfit();applyEquipmentTruckRandomizerEquipment(loadouts,mulberry32(18),1,undefined,'QB',only('waistPlaycalls',item.itemName));
  assert.equal(get(loadouts,'HeadBand'),item.itemName);assert.equal(get(loadouts,'WaistWear'),'Handwarmer_Standard');
  assert.equal(generatedItemConflict(loadouts[0].loadoutElements,item,['HeadBand'],'WR'),null,'pool-only QB targeting must not block a deliberate Mapper edit');
});

test('handwarmer starts deselected and disabled; old presets normalize and selections round-trip',()=>{
  const defaults=normalizeModPools({eljax:{armSleeves:{chance:20,items:[]}}});
  assert.deepEqual(defaults.eljax.handwarmers,{chance:0,items:[]});
  assert.deepEqual(normalizeModPools(JSON.parse(JSON.stringify(defaults))),defaults);
  assert.ok(modPoolEditorCatalog().eljax.find(category=>category.id==='handwarmers').items.length);
  for(let seed=0;seed<30;seed++){
    const loadouts=outfit();applyEquipmentTruckRandomizerEquipment(loadouts,mulberry32(seed),1,undefined,'QB');
    assert.equal(get(loadouts,'WaistWear'),'Handwarmer_Standard');
  }
});

test('chin covers support all four colors; playcall bands retain their own family and never invent secondary variants',()=>{
  for(const item of EQUIPMENT_TRUCK_POOLS.chinCovers)for(const color of ['white','black','primary','secondary']){
    const changed=recolorEquipmentItem(item.itemName,color);
    const suffix={white:'white',black:'black',primary:'teamcolor',secondary:'secondarycolor'}[color];
    assert.equal(changed,`gearmouthpiece_brandlogochincover_${suffix}`);
    assert.deepEqual(equipmentItem(changed).slots,['Reserved']);
    const loadouts=outfit();loadouts[0].loadoutElements.push({slotType:'Reserved',itemAssetName:item.itemName});
    recolorPlayerAccessories(loadouts,color,'white');assert.equal(get(loadouts,'Reserved'),changed);assert.equal(get(loadouts,'MouthWear'),'GearMouthpiece_None');
  }
  for(const item of EQUIPMENT_TRUCK_POOLS.waistPlaycalls){
    assert.equal(recolorEquipmentItem(item.itemName,'secondary'),item.itemName);
    for(const color of ['white','black','primary'])assert.ok(EQUIPMENT_TRUCK_POOLS.waistPlaycalls.some(candidate=>candidate.itemName===recolorEquipmentItem(item.itemName,color)));
  }
});

test('all thirty RAW earring combinations are selectable only with RAW and inherit receiving/hitter position restrictions',()=>{
  assert.equal(inventory.rawFacepaintItems.length,30);
  const raw=buildFacePaintPool([],{usingRawAccessoriesMod:true}),vanilla=buildFacePaintPool([]);
  assert.deepEqual(vanilla.options,VANILLA_FACE_PAINT_OPTIONS);
  for(const id of inventory.rawFacepaintItems){assert.ok(MOD_FACE_PAINT_ITEMS.raw.includes(id));assert.ok(raw.options.includes(id));assert.ok(!vanilla.options.includes(id));}
  const receiving='FaceMarks_RawEarringsCombo_NoseTape_imfnopen',hitter='FaceMarks_RawEarringsCombo_NoseTape_1hitta';
  assert.ok(facePaintOptionsForPosition(raw.options,'WR').includes(receiving));assert.ok(facePaintOptionsForPosition(raw.options,'TE').includes(receiving));assert.ok(!facePaintOptionsForPosition(raw.options,'QB').includes(receiving));
  assert.ok(!facePaintOptionsForPosition(raw.options,'WR').includes(hitter));assert.ok(facePaintOptionsForPosition(raw.options,'MIKE').includes(hitter));
  const empty=normalizeModPools({raw:{facepaint:{chance:0,items:[]}}});assert.deepEqual(buildFacePaintPool([],{usingRawAccessoriesMod:true,modPools:empty}).options,VANILLA_FACE_PAINT_OPTIONS);
  const rng1=mulberry32(17),rng2=mulberry32(17);assert.deepEqual(Array.from({length:100},()=>rollFacePaint(rng1,raw.options,'WR',raw.diagnostics)),Array.from({length:100},()=>rollFacePaint(rng2,raw.options,'WR',raw.diagnostics)));
});

test('ten missing tattoos are opt-in; declared right-arm-only designs never land on the left arm',()=>{
  assert.equal(inventory.tattoos.length,10);
  for(const item of inventory.tattoos){assert.ok(UNLOCKED_TATTOO_POOL.some(choice=>choice.value===item.asset));assert.ok(!DEFAULT_UNLOCKED_TATTOO_SELECTION.includes(item.asset));}
  for(let seed=0;seed<100;seed++){
    const parsed={loadouts:outfit()},plan=rollUnlockedTattoo(mulberry32(seed),parsed,['ArmTattoo_Tattoos_Japanese_12_Arm_v02']);
    assert.deepEqual(Object.keys(plan.arms),['right']);applyUnlockedTattooPlan(parsed,plan);
    assert.equal(parsed.loadouts.find(layer=>layer.loadoutCategory==='Base').loadoutElements.find(element=>element.slotType==='LeftArmTattoo').itemAssetName,'ArmTattoo_None');
  }
});

test('repurposed legacy slot corrections are metadata-only and excluded from automatic pools/recoloring',()=>{
  const corrected=inventory.items.filter(item=>item.displayOnly&&item.origin==='unlocked');
  assert.equal(corrected.length,9);
  for(const item of corrected){assert.deepEqual(equipmentItem(item.itemName).slots,item.slots);assert.equal(recolorEquipmentItem(item.itemName,'white'),item.itemName);assert.ok(!Object.values(UNLOCKED_POOLS).flat().some(entry=>entry.itemName===item.itemName));}
});

test('roster donors accept verified chin covers in Reserved, while unknown Reserved items still fail safely',()=>{
  const id=EQUIPMENT_TRUCK_POOLS.chinCovers[0].itemName;
  assert.deepEqual(decodeRosterEquipmentElement({SLOT:18,ITAN:id}),{slotType:'Reserved',itemAssetName:id});
  assert.throws(()=>decodeRosterEquipmentElement({SLOT:18,ITAN:'UnknownUnsafeReservedItem'}),/Unrecognized/);
});

test('Remove Handwarmers clears the GDG logo handwarmer using its correct None item, without touching the playcall band',()=>{
  const loadouts=outfit();loadouts[0].loadoutElements.find(element=>element.slotType==='WaistWear').itemAssetName='handwarmer_standard_logo';
  loadouts[0].loadoutElements.push({slotType:'HeadBand',itemAssetName:'Waist_PlaycallSheet_White'});
  assert.equal(removeHandwarmers(loadouts).length,1);
  assert.equal(get(loadouts,'WaistWear'),'waistband_none_v36');assert.equal(get(loadouts,'HeadBand'),'Waist_PlaycallSheet_White');
});
