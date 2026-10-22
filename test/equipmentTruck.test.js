import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EQUIPMENT_TRUCK_POOLS, UNLOCKED_POOLS, RAW_ACCESSORIES_POOLS, equipmentItem, equipmentDisplayName, recolorEquipmentItem } from '../src/main/tools/equipment/catalog.js';
import { modPoolDefinitions, normalizeModPools, modPoolEditorCatalog } from '../src/main/tools/equipment/core/modPools.js';
import { applyEquipmentTruckRandomizerEquipment, applyNoDripEquipment, mulberry32 } from '../src/main/tools/equipment/core/patcher.js';
import { createGeneratedEquipmentState, enforceGeneratedEquipmentCompatibility, finalGeneratedChanges } from '../src/main/tools/equipment/core/generatedCompatibility.js';
import { enforceEquipmentCompatibility } from '../src/main/tools/equipment/core/compatibility.js';
import { recolorPlayerAccessories } from '../src/main/tools/equipment/core/recolor.js';
import { validatePresetConfiguration } from '../src/main/services/toolPresets.js';

const inventory = JSON.parse(fs.readFileSync(new URL('../src/main/tools/equipment/equipmentTruckInventory.json', import.meta.url)));
const gear = (slotType, itemAssetName) => ({ slotType, itemAssetName });
const outfit = () => [{ loadoutType: 'PlayerOnField', loadoutElements: [gear('HeadWear', 'GearHelmet_Speed_Flex'), gear('LeftArmWear', 'ArmSleeve_None'), gear('RightArmWear', 'ArmSleeve_None'), gear('Visor', 'GearVisor_None'), gear('LeftHandWear', 'GearHand_None')] }];
const get = (loadouts, slot) => loadouts[0].loadoutElements.find(element => element.slotType === slot)?.itemAssetName;
const settings = (category, items, chance = 100) => ({ armSleeves: { chance: 0, items: [] }, visors: { chance: 0, items: [] }, [category]: { chance, items } });

test('Equipment Truck contains exactly the 14 verified save IDs, readable labels and correct side slots', () => {
  assert.equal(inventory.items.length, 14);
  assert.equal(EQUIPMENT_TRUCK_POOLS.armSleeves.length, 12);
  assert.equal(EQUIPMENT_TRUCK_POOLS.visors.length, 2);
  for (const item of inventory.items) {
    const resolved = equipmentItem(item.itemName);
    assert.equal(resolved.origin, 'eljax');
    assert.equal(equipmentDisplayName(item.itemName), item.displayName);
    assert.equal(resolved.semantic.poolEligible, true);
    assert.deepEqual(resolved.slots, item.category === 'Arm Wear' ? ['LeftArmWear', 'RightArmWear'] : ['Visor']);
  }
  assert.equal(equipmentDisplayName('GearVisor_visorTeamOakley_clear'), 'Team Logo Visor');
  assert.equal(equipmentDisplayName('gearvisor_visorbrandvisors_clear'), 'Team Brand Visor');
});

test('every sleeve recolors to all four verified colors without changing style, side or unrelated equipment', () => {
  const colors = { white: 'white', black: 'black', primary: 'teamcolor', secondary: 'secondarycolor' };
  for (const item of EQUIPMENT_TRUCK_POOLS.armSleeves) for (const [theme, suffix] of Object.entries(colors)) {
    const expected = item.itemName.replace(/_(?:white|black|teamcolor|secondarycolor)$/, '_' + suffix);
    assert.equal(recolorEquipmentItem(item.itemName, theme), expected);
    const loadouts = outfit();
    loadouts[0].loadoutElements[1].itemAssetName = item.itemName;
    loadouts[0].loadoutElements[2].itemAssetName = item.itemName;
    loadouts[0].loadoutElements[3].itemAssetName = 'GearVisor_visorTeamOakley_clear';
    const other = structuredClone(loadouts[0].loadoutElements.filter(e => !e.slotType.endsWith('ArmWear')));
    recolorPlayerAccessories(loadouts, theme, 'black');
    assert.equal(get(loadouts, 'LeftArmWear'), expected);
    assert.equal(get(loadouts, 'RightArmWear'), expected);
    assert.deepEqual(loadouts[0].loadoutElements.filter(e => !e.slotType.endsWith('ArmWear')), other);
  }
});

test('Truck selection is isolated from Unlocked, RAW and facepaint, including old preset migrations', () => {
  const definitions = modPoolDefinitions();
  assert.deepEqual(definitions.eljax.map(category => category.id), ['armSleeves', 'visors']);
  const otherIds = new Set([...Object.values(UNLOCKED_POOLS).flat(), ...Object.values(RAW_ACCESSORIES_POOLS).flat()].map(item => item.itemName));
  for (const item of inventory.items) assert.equal(otherIds.has(item.itemName), false);
  assert.equal(modPoolEditorCatalog().eljax[0].items.length, 12);
  const defaults = normalizeModPools({ unlocked: {}, raw: {} });
  assert.equal(defaults.eljax.armSleeves.chance, 10);
  assert.equal(defaults.eljax.visors.chance, 10);
  assert.equal(defaults.eljax.armSleeves.items.length, 12);
  assert.deepEqual(normalizeModPools(JSON.parse(JSON.stringify(defaults))), defaults);
  assert.throws(() => normalizeModPools({ raw: { neckwear: { items: [inventory.items[0].itemName] } } }), /this mod/);
  assert.throws(() => normalizeModPools({ eljax: { armSleeves: { items: ['UnknownSleeve'] } } }), /this mod/);
  assert.throws(() => normalizeModPools({ eljax: { visors: { chance: 1.5 } } }), /whole/);
  const preset = { version: 1, values: { 'equipment-truck': true, 'equipment-mod-pools': JSON.stringify(defaults) } };
  assert.deepEqual(validatePresetConfiguration(preset), preset);
});

test('each selected Truck item can generate in the correct slots with exact game-written appearance structure', () => {
  for (const category of ['armSleeves', 'visors']) for (const item of EQUIPMENT_TRUCK_POOLS[category]) {
    const loadouts = outfit(), unrelated = structuredClone(loadouts[0].loadoutElements.filter(e => !item.slots.includes(e.slotType)));
    for (const element of loadouts[0].loadoutElements.filter(e => item.slots.includes(e.slotType))) {
      element.paletteMods = [{ bogusOldPalette: true }]; element.blends = [{ baseBlend: 0.2 }];
    }
    const changes = applyEquipmentTruckRandomizerEquipment(loadouts, mulberry32(37), 0, undefined, 'WR', settings(category, [item.itemName]));
    for (const slot of item.slots) assert.deepEqual(loadouts[0].loadoutElements.find(e => e.slotType === slot), gear(slot, item.itemName));
    assert.deepEqual(loadouts[0].loadoutElements.filter(e => !item.slots.includes(e.slotType)), unrelated);
    assert.equal(changes.length, 1); assert.equal(changes[0].displayName, item.displayName);
  }
});

test('zero chances and empty pools make no equipment changes', () => {
  for (const config of [settings('armSleeves', [], 100), settings('armSleeves', EQUIPMENT_TRUCK_POOLS.armSleeves.map(i => i.itemName), 0)]) {
    const loadouts = outfit(), before = structuredClone(loadouts);
    assert.deepEqual(applyEquipmentTruckRandomizerEquipment(loadouts, mulberry32(4), 1, undefined, 'WR', config), []);
    assert.deepEqual(loadouts, before);
  }
});

test('Truck rolls are deterministic and sleeve and visor categories roll independently', () => {
  const config = normalizeModPools({ eljax: { armSleeves: { chance: 35 }, visors: { chance: 70 } } }).eljax;
  const run = () => { const rng = mulberry32(123); return Array.from({ length: 100 }, () => { const loadouts = outfit(); const changes = applyEquipmentTruckRandomizerEquipment(loadouts, rng, 0, undefined, 'CB', config); return { loadouts, changes }; }); };
  const rolls = run(); assert.deepEqual(run(), rolls);
  assert.ok(rolls.some(result => result.changes.length === 2));
  assert.ok(rolls.some(result => get(result.loadouts, 'LeftArmWear') === 'ArmSleeve_None' && get(result.loadouts, 'Visor') !== 'GearVisor_None'));
});

test('Truck sleeves use normal sleeve compatibility; No Drip and final reports describe only surviving gear', () => {
  const loadouts = outfit(), sleeve = EQUIPMENT_TRUCK_POOLS.armSleeves[0];
  loadouts[0].loadoutElements.push(gear('LeftWristWear', 'GearWrist_wristBandCoach_Black'), gear('RightElbowWear', 'ElbowGear_elbowSweatbandThin_White'));
  const state = createGeneratedEquipmentState(loadouts);
  const changes = applyEquipmentTruckRandomizerEquipment(loadouts, mulberry32(9), 0, state, 'WR', settings('armSleeves', [sleeve.itemName]));
  enforceEquipmentCompatibility(loadouts[0].loadoutElements);
  assert.equal(get(loadouts, 'LeftWristWear'), 'GearWrist_None');
  assert.equal(get(loadouts, 'RightElbowWear'), 'ElbowGear_None');
  assert.deepEqual(enforceGeneratedEquipmentCompatibility(loadouts, state, 'WR'), []);
  assert.equal(finalGeneratedChanges(loadouts, changes).length, 1);
  applyNoDripEquipment(loadouts, 'WR');
  assert.equal(get(loadouts, 'LeftArmWear'), 'ArmSleeve_None');
  assert.deepEqual(finalGeneratedChanges(loadouts, changes), []);
});
