import test from 'node:test';
import assert from 'node:assert/strict';
import { applyGlobalEquipmentFixes } from '../src/main/tools/equipment/core/globalFixes.js';
import { normalizeEquipmentOptions } from '../src/main/tools/equipment/runner.js';
import { quickstartSettings } from '../src/main/tools/equipmentQuickstart/runner.js';
import { DEFAULT_CUTOFF_PANTS_CAPS } from '../src/main/tools/equipment/core/unlockedUniforms.js';
import { CUTOFF_JERSEYS, CUTOFF_PANTS, cutoffPantsConflict } from '../src/main/tools/equipment/core/uniformCompatibility.js';
import { enforceEquipmentCompatibility, RELAXED_TEE_REPLACEMENTS } from '../src/main/tools/equipment/core/compatibility.js';

const element = (slotType, itemAssetName) => ({ slotType, itemAssetName, keep: { metadata: true } });
const outfit = (jersey = 'Gear_JerseyStyle_SleeveTight', shirt = 'Undershirt_None', base = 'BottomBase_None', pants = 'GearPants_AboveKnee') => ({ loadoutType: 'PlayerOnField', loadoutCategory: 'Home', keep: true, loadoutElements: [element('OuterShirt', jersey), element('InnerShirt', shirt), element('InnerPants', base), element('OuterPants', pants), element('LeftArmWear', 'GearArmSleeve_Quarter_White')] });
const raw = (...outfits) => JSON.stringify({ keep: 'appearance', loadouts: [...outfits, { loadoutType: 'Base', loadoutElements: [element('RightArmTattoo', 'KeepTattoo')] }] });
const player = (row, team = 1) => ({ FirstName: 'Test', LastName: String(row), Position: 'WR', SchoolYear: 'Freshman', TeamIndex: team, IsNIL: false, CharacterBodyType: 'Standard', CharacterVisuals: (10).toString(2).padStart(15, '0') + row.toString(2).padStart(17, '0'), RedshirtStatus: 'Eligible', OverallRating: 70 });
const caps = value => Object.fromEntries(Object.keys(DEFAULT_CUTOFF_PANTS_CAPS).map(key => [key, value]));
const visual = (...outfits) => ({ isEmpty: false, RawData: raw(...outfits) });
const field = record => JSON.parse(record.RawData).loadouts.filter(loadout => loadout.loadoutType === 'PlayerOnField');
const item = (outfit, slot) => outfit.loadoutElements.find(element => element.slotType === slot)?.itemAssetName;
const options = extra => normalizeEquipmentOptions({ cutoffPantsFix: true, cutoffPantsCaps: caps(100), fillFrequencies: { cutoffPants: true }, ...extra }, false);
const run = (players, visuals, extra = {}) => applyGlobalEquipmentFixes(players, visuals, 10, { ...options(extra), ...extra, seed: 201 });

test('outfit adjustment defaults on in Patcher and Unlocked Quickstart, off in Randomizer/vanilla Quickstart, and honors false', () => {
  assert.equal(normalizeEquipmentOptions({}, false).adjustOutfitForCutoff, true);
  assert.equal(normalizeEquipmentOptions({ adjustOutfitForCutoff: false }, false).adjustOutfitForCutoff, false);
  assert.equal(normalizeEquipmentOptions({ adjustOutfitForCutoff: true }, true).adjustOutfitForCutoff, false);
  assert.equal(quickstartSettings({ unlocked: true }).patcher.adjustOutfitForCutoff, true);
  assert.equal(quickstartSettings({ unlocked: false }).patcher.adjustOutfitForCutoff, false);
});

test('selected outfits get a compatible pair, exact slot audit, and no unrelated or metadata changes', () => {
  const visuals = [visual(outfit()), visual(outfit())], before = structuredClone(visuals);
  const result = run([player(0), player(1)], visuals, { eligiblePlayer: p => p.LastName === '0' });
  const changed = field(visuals[0])[0];
  assert.equal(item(changed, 'OuterPants'), CUTOFF_PANTS);
  assert.equal(item(changed, 'OuterShirt'), 'Gear_JerseyStyle_RolledLowest_Untucked');
  assert.equal(item(changed, 'InnerShirt'), 'Gear_Undershirt_CompressionTCrewSleeveless');
  assert.equal(cutoffPantsConflict(changed.loadoutElements), null);
  assert.deepEqual(enforceEquipmentCompatibility(structuredClone(changed.loadoutElements)), []);
  const expected = JSON.parse(before[0].RawData);
  for (const slot of ['OuterPants', 'OuterShirt', 'InnerShirt']) expected.loadouts[0].loadoutElements.find(e => e.slotType === slot).itemAssetName = item(changed, slot);
  assert.deepEqual(JSON.parse(visuals[0].RawData), expected);
  assert.deepEqual(visuals[1], before[1]);
  assert.deepEqual(result.cutoffPantsChanges.map(change => change.slot).sort(), ['InnerShirt', 'OuterPants', 'OuterShirt']);
});

test('all four compatible jerseys and existing compression shirts stay unchanged', () => {
  const shirt = 'Gear_Undershirt_CompressionTCrewSleeveless_Black';
  for (const jersey of CUTOFF_JERSEYS) {
    const visuals = [visual(outfit(jersey, shirt))], result = run([player(0)], visuals), changed = field(visuals[0])[0];
    assert.equal(item(changed, 'OuterShirt'), jersey); assert.equal(item(changed, 'InnerShirt'), shirt);
    assert.equal(item(changed, 'OuterPants'), CUTOFF_PANTS); assert.equal(result.cutoffPantsChanges.length, 1);
    assert.deepEqual(enforceEquipmentCompatibility(structuredClone(changed.loadoutElements)), []);
  }
});

test('each known incompatible relaxed tee gets its verified matching compression shirt after a jersey adjustment', () => {
  for (const [tee, replacement] of Object.entries(RELAXED_TEE_REPLACEMENTS)) {
    for (const jersey of ['Gear_JerseyStyle_SleeveTight', ...CUTOFF_JERSEYS]) {
      const visuals = [visual(outfit(jersey, tee))]; run([player(0)], visuals);
      const changed = field(visuals[0])[0], expected = jersey === 'Gear_JerseyStyle_SleeveTight' ? 'Gear_JerseyStyle_RolledLowest_Untucked' : jersey;
      assert.equal(item(changed, 'OuterPants'), CUTOFF_PANTS); assert.equal(item(changed, 'OuterShirt'), expected);
      assert.equal(item(changed, 'InnerShirt'), jersey === 'Gear_JerseyStyle_SleeveTight_Untucked' ? tee : replacement);
      assert.deepEqual(enforceEquipmentCompatibility(structuredClone(changed.loadoutElements)), []);
    }
  }
});

test('active and unknown leg base layers still exclude the whole player without any outfit adjustment', () => {
  for (const base of ['GearLegsBase_LeftSleeve_White', 'UnknownTights']) {
    const visuals = [visual(outfit(undefined, undefined, base))], before = structuredClone(visuals);
    const result = run([player(0)], visuals); assert.deepEqual(visuals, before);
    assert.equal(result.cutoffPantsChanges.length, 0); assert.equal(result.uniformPopulation[0].incompatible, 1);
  }
});

test('turning adjustment off retains skip behavior; the sub-option alone cannot enable the pass', () => {
  for (const extra of [{ adjustOutfitForCutoff: false }, { cutoffPantsFix: false }]) {
    const visuals = [visual(outfit())], before = structuredClone(visuals);
    assert.equal(run([player(0)], visuals, extra).cutoffPantsChanges.length, 0); assert.deepEqual(visuals, before);
  }
});

test('only selected players change: team caps, protection, deterministic choice and repeat runs still hold', () => {
  const players = Array.from({ length: 40 }, (_, row) => player(row, row < 20 ? 1 : 2));
  const visuals = players.map(() => visual(outfit())), copy = structuredClone(visuals), before = structuredClone(visuals);
  const extra = { cutoffPantsCaps: caps(10), eligiblePlayer: p => !['0', '20'].includes(p.LastName) };
  run(players, visuals, extra); run(players, copy, extra); assert.deepEqual(visuals, copy);
  for (const start of [0, 20]) {
    const changed = visuals.slice(start, start + 20).filter((record, index) => record.RawData !== before[start + index].RawData);
    // 19 eligible players round the 10% cap down to one; excluded players stay untouched.
    assert.equal(changed.length, 1); assert.deepEqual(visuals[start], before[start]);
  }
  const after = structuredClone(visuals); assert.equal(run(players, visuals, extra).cutoffPantsChanges.length, 0); assert.deepEqual(visuals, after);
});

test('shared visuals and original EA protected players cannot be adjusted', () => {
  const shared = [player(0), { ...player(1), CharacterVisuals: player(0).CharacterVisuals }];
  const protectedPlayer = { ...player(2), IsNIL: true, PLYR_ASSETNAME: 'SmithJeremiah_8726' };
  const visuals = [visual(outfit()), visual(outfit()), visual(outfit())], before = structuredClone(visuals);
  run([...shared, protectedPlayer], visuals); assert.deepEqual(visuals, before);
});

test('original Standard Pants still need the explicit override; force fit does not bypass caps or leg-layer guards', () => {
  for (const replaceStandardWithCutoff of [false, true]) {
    const visuals = [visual(outfit(undefined, undefined, undefined, 'GearPants_Standard')), visual(outfit(undefined, undefined, 'Tights', 'GearPants_Standard'))];
    const result = run([player(0), player(1)], visuals, { pantsFix: true, replaceStandardWithCutoff, cutoffPantsCaps: caps(0) });
    assert.equal(item(field(visuals[0])[0], 'OuterPants'), replaceStandardWithCutoff ? CUTOFF_PANTS : 'GearPants_AboveKnee');
    assert.equal(item(field(visuals[1])[0], 'OuterPants'), 'GearPants_AboveKnee');
    assert.equal(item(field(visuals[1])[0], 'OuterShirt'), 'Gear_JerseyStyle_SleeveTight');
    assert.equal(result.uniformPopulation[0].standardReplacements, replaceStandardWithCutoff ? 1 : 0);
  }
});

test('multiple on-field outfits, absent slots and the lower-jersey pass finish with compatible final pairs', () => {
  const missing = outfit(); missing.loadoutElements = missing.loadoutElements.filter(e => !['OuterShirt', 'InnerShirt'].includes(e.slotType));
  const visuals = [visual(outfit('Gear_Low_TuckedUndershirt'), missing)];
  run([player(0)], visuals, { lowerRolledJerseyFix: true });
  for (const changed of field(visuals[0])) {
    assert.equal(item(changed, 'OuterPants'), CUTOFF_PANTS); assert.equal(cutoffPantsConflict(changed.loadoutElements), null);
    assert.deepEqual(enforceEquipmentCompatibility(structuredClone(changed.loadoutElements)), []);
  }
});
