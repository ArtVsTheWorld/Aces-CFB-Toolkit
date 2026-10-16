import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeCrossDonorGroups, configuredCrossPositions } from '../src/main/tools/equipment/core/donorGroups.js';
import { DEFAULT_MOUTHPIECE_POSITIONS, normalizeMouthpiecePositions } from '../src/main/tools/equipment/core/mouthpieceSettings.js';
import { patchFreshmanEquipment, mulberry32 } from '../src/main/tools/equipment/core/patcher.js';
import { rollUnlockedMouthpiece, isBrandedMouthpiece, applyGlobalEquipmentFixes } from '../src/main/tools/equipment/core/globalFixes.js';
import { enforceMouthpieceCompatibility } from '../src/main/tools/equipment/core/compatibility.js';
import { normalizeEquipmentOptions } from '../src/main/tools/equipment/runner.js';
import { decodeRosterTdf } from '../src/main/tools/equipment/rosterTdf.js';
import { decodeRosterEquipmentElement } from '../src/main/tools/equipment/donorSource.js';

test('roster conversion retains equipment blends and default palette bindings without guessing unknown metadata', () => {
  assert.deepEqual(decodeRosterEquipmentElement({ SLOT: 12, ITAN: 'Backplate_Standard', IBLD: [{ BARY: 0.5, BASE: 0.5 }] }), { slotType: 'BackPlate', itemAssetName: 'Backplate_Standard', blends: [{ barycentricBlend: 0.5, baseBlend: 0.5 }] });
  assert.deepEqual(decodeRosterEquipmentElement({ SLOT: 10, ITAN: 'GearFootwear_shoe_low_NikeEdgeSpeed3062', PALM: [{ PLAN: 'ItemPalette', PALV: 'SolidSecondary_ColorPreset', PLTY: 5 }] }), { slotType: 'LeftShoe', itemAssetName: 'GearFootwear_shoe_low_NikeEdgeSpeed3062', paletteMods: [{ paletteValue: 'SolidSecondary_ColorPreset', paletteType: 'Preset' }] });
  assert.throws(() => decodeRosterEquipmentElement({ SLOT: 12, ITAN: 'Backplate_Standard', IBLD: [{ BASE: NaN }] }), /blend metadata/);
  assert.throws(() => decodeRosterEquipmentElement({ SLOT: 10, ITAN: 'Shoe', PALM: [{ PLAN: 'UnknownBinding', PALV: 'Preset', PLTY: 5 }] }), /palette metadata/);
  assert.throws(() => decodeRosterEquipmentElement({ SLOT: 10, ITAN: 'Shoe', PALM: [{ PLAN: 'ItemPalette', PALV: 'Preset', PLTY: 254 }] }), /palette metadata/);
  assert.throws(() => decodeRosterEquipmentElement({ SLOT: 12, ITAN: 'Backplate_Standard', UNKNOWN: 1 }), /Unsupported equipment metadata/);
  assert.deepEqual(decodeRosterEquipmentElement({ SLOT: 12, ITAN: 'Backplate_Standard', FBIN: '', ITAE: '', ITAG: '', ZORD: 0, IBLD: [{ BASE: 0.5, BARY: 0.5, BSOV: '', BYOV: '' }] }).blends, [{ barycentricBlend: 0.5, baseBlend: 0.5 }]);
  assert.throws(() => decodeRosterEquipmentElement({ SLOT: 12, ITAN: 'Backplate_Standard', ITAE: 'EmbeddedAsset' }), /Unsupported equipment metadata/);
  assert.throws(() => decodeRosterEquipmentElement({ SLOT: 12, ITAN: 'Backplate_Standard', IBLD: [{ BASE: 1, BARY: 1, BSOV: 'CustomBinding' }] }), /blend metadata/);
});

const ref = row => '000000000001010' + row.toString(2).padStart(17, '0');
const player = (position, row, year = 'Senior') => ({ isEmpty: false, FirstName: `P${row}`, LastName: 'Test', Position: position, SchoolYear: year, RedshirtStatus: 'Eligible', CharacterBodyType: 'Thin', CharacterVisuals: ref(row), IsNIL: false, TeamIndex: 1, OverallRating: 80 });
const visual = (row, mouth = 'GearMouthpiece_None', mask) => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [{ loadoutType: 'PlayerOnField', loadoutElements: [{ slotType: 'HeadWear', itemAssetName: `Helmet_${row}` }, { slotType: 'MouthWear', itemAssetName: mouth }, ...(mask ? [{ slotType: 'FaceWear', itemAssetName: mask }] : [])] }] }) });
test('cross-position source groups expand exact game positions, permit empty pools, and reject self/unknown groups', () => {
  const config = normalizeCrossDonorGroups({ QB: ['OL', 'S'], TE: [] });
  assert.deepEqual(configuredCrossPositions('QB', config), ['LT', 'LG', 'C', 'RG', 'RT', 'FS', 'SS', 'SAFETY']);
  assert.deepEqual(configuredCrossPositions('TE', config), []);
  assert.deepEqual(configuredCrossPositions('MIKE', config), configuredCrossPositions('WILL', config));
  assert.throws(() => normalizeCrossDonorGroups({ QB: ['QB'] }), /other/);
  assert.throws(() => normalizeCrossDonorGroups({ QB: ['bogus'] }), /other/);
});
test('all three cross-donor blocks respect a custom source at 100%, are deterministic, and unavailable groups safely fall back', () => {
  const players = [player('QB', 0, 'Freshman'), player('QB', 1), player('TE', 2), player('WR', 3)];
  const config = normalizeCrossDonorGroups({ QB: ['TE'] });
  const run = options => patchFreshmanEquipment(players, players.map((_, row) => visual(row)), 10, { crossDonorGroups: config, forceCrossPosition: true, seed: 19, ...options });
  const first = run(); assert.equal(first.changes.length, 1); assert.ok(first.changes[0].donorUses.every(use => use.donor.position === 'TE')); assert.deepEqual(first, run());
  const unavailable = run({ crossDonorGroups: normalizeCrossDonorGroups({ QB: ['FB'] }) }); assert.equal(unavailable.changes[0].crossPositionMixed, false);
  const disabled = run({ forceCrossPosition: false, disableCrossPosition: true }); assert.ok(disabled.changes[0].donorUses.every(use => use.donor.position === 'QB'));
});
test('donor FCS exclusions use the donor source indexes, not receiver indexes', () => {
  const recipient = [player('WR', 0, 'Freshman')], donor = [player('WR', 0)]; donor[0].TeamIndex = 9;
  const options = { donorPlayerRecords: donor, donorVisualRecords: [visual(9)], donorVisualsTableId: 10, fcsTeamIndexes: new Set([9]), donorFcsTeamIndexes: new Set(), disableCrossPosition: true };
  assert.equal(patchFreshmanEquipment(recipient, [visual(0)], 10, options).changes.length, 1);
  assert.equal(patchFreshmanEquipment(recipient, [visual(0)], 10, { ...options, donorFcsTeamIndexes: new Set([9]) }).changes.length, 0);
});
test('mouthpiece profiles validate whole totals, preserve legacy mode, and independently disable QB/KP', () => {
  assert.equal(normalizeMouthpiecePositions(undefined), null);
  const defaults = normalizeMouthpiecePositions(DEFAULT_MOUTHPIECE_POSITIONS); assert.equal(defaults.QB.enabled, false); assert.equal(defaults['K/P'].enabled, false);
  assert.throws(() => normalizeMouthpiecePositions({ QB: { enabled: true, standard: 33.3, pacifier: 33.3, hanging: 33.4 } }), /whole/);
  assert.throws(() => normalizeMouthpiecePositions({ QB: { enabled: true, standard: 1, pacifier: 1, hanging: 1 } }), /100/);
  assert.equal(normalizeEquipmentOptions({ donorMode: 'selected', donorRows: [3], donorSave: 'Roster' }, true).donorSave, 'Roster');
});
test('custom styles are chosen before branding; 0/100 style and brand percentages cannot leak into another style', () => {
  for (const style of ['standard', 'pacifier', 'hanging']) for (const branded of [0, 100]) {
    const profile = { enabled: true, standard: 0, pacifier: 0, hanging: 0, [style]: 100 }, rng = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const rolled = rollUnlockedMouthpiece('skill', rng, true, branded, false, profile);
      assert.equal(rolled.type, style === 'standard' ? 'mouthguard' : style); assert.ok(rolled.item);
      assert.equal(isBrandedMouthpiece(rolled.item), style === 'hanging' && branded === 100);
    }
  }
});
test('masked mouthpiece generation and compatibility allow hanging only, but never mistake a turtleneck for a mask', () => {
  const profile = { enabled: true, standard: 100, pacifier: 0, hanging: 0 };
  assert.equal(rollUnlockedMouthpiece('skill', () => 0.5, false, 100, true, profile).item, null);
  for (const mask of ['FaceGear_BalaclavaBlack', 'GearNeckpad_VintageNeckRoll']) {
    const elements = [{ slotType: 'FaceWear', itemAssetName: mask }, { slotType: 'MouthWear', itemAssetName: 'GearMouthpiece_Pacifier_White' }];
    assert.equal(enforceMouthpieceCompatibility(elements, { usingUnlockedMod: true }).length, 1); assert.equal(elements[1].itemAssetName, 'GearMouthpiece_None');
    elements[1].itemAssetName = 'GearMouthpiece_PacifierDualHanging_White'; assert.equal(enforceMouthpieceCompatibility(elements, { usingUnlockedMod: true }).length, 0);
  }
  const elements = [{ slotType: 'NeckWear', itemAssetName: 'NeckWear_TurtleneckTight_White' }, { slotType: 'MouthWear', itemAssetName: 'GearMouthpiece_Pacifier_White' }];
  assert.equal(enforceMouthpieceCompatibility(elements, { usingUnlockedMod: true }).length, 0);
});
test('Patcher rerolls use the enabled position profile; disabled players keep original mouths, and mask cleanup does not require the arm pass', () => {
  const players = [player('QB', 0), player('K', 1), player('WR', 2)], visuals = [visual(0, 'GearMouthpiece_PacifierDualHanging_White'), visual(1, 'GearMouthpiece_PacifierDualHanging_White'), visual(2, 'GearMouthpiece_Pacifier_White', 'FaceGear_BalaclavaBlack')];
  const config = normalizeMouthpiecePositions({ QB: { enabled: true, standard: 100, pacifier: 0, hanging: 0 }, WR: { enabled: true, standard: 100, pacifier: 0, hanging: 0 } });
  const oldK = visuals[1].RawData;
  applyGlobalEquipmentFixes(players, visuals, 10, { unlockedMouthpieceFix: true, rerollExistingMouthpieces: true, mouthpiecePositions: config, brandedMouthpieceFrequency: 100, seed: 21, teamNames: new Map([[1, 'Test Team']]) });
  assert.equal(visuals[1].RawData, oldK);
  const mouth = row => JSON.parse(visuals[row].RawData).loadouts[0].loadoutElements.find(element => element.slotType === 'MouthWear').itemAssetName;
  assert.notEqual(mouth(0), 'GearMouthpiece_PacifierDualHanging_White'); assert.equal(mouth(2), 'GearMouthpiece_None');
});
test('bounded roster TDF parser handles signed/omitted-zero values and rejects malformed strings, unsupported types and duplicate tags', () => {
  assert.deepEqual(decodeRosterTdf(Buffer.from([0x8a, 0xcb, 0xe2, 0, 0x41])), { BLOB: -1 });
  assert.deepEqual(decodeRosterTdf(Buffer.from([0x8a, 0xcb, 0xe2, 0, 0x41, 0])), { BLOB: -1 });
  assert.throws(() => decodeRosterTdf(Buffer.from([0x8a, 0xcb, 0xe2, 0, 0x41, 0, 0])), /terminator/);
  assert.throws(() => decodeRosterTdf(Buffer.from([0x8a, 0xcb, 0xe2, 1, 40])), /truncated/);
  assert.throws(() => decodeRosterTdf(Buffer.from([0x8a, 0xcb, 0xe2, 15])), /Unsupported/);
  assert.throws(() => decodeRosterTdf(Buffer.from([0x8a, 0xcb, 0xe2, 0, 0, 0x8a, 0xcb, 0xe2, 0, 0])), /Duplicate/);
});
test('new window validation blocks stale donors and invalid disabled-position mixes; selected groups persist in hidden JSON', () => {
  const context = vm.createContext({}); vm.runInContext(fs.readFileSync(new URL('../src/renderer/donor-mouthpiece-settings.js', import.meta.url), 'utf8'), context);
  const controls = {}, root = { dataset: {}, querySelector: selector => controls[selector.match(/data-config-original="([^"]+)"/)?.[1] ?? selector.slice(1)] ?? null };
  context.configurationRead = (root, id) => controls[id] ?? null;
  controls['mouthpiece-positions-json'] = { value: JSON.stringify({ QB: { enabled: false, standard: 99, pacifier: 0, hanging: 0 } }) }; assert.match(context.validateDonorMouthpieceDraft(root), /QB/);
  controls['mouthpiece-positions-json'].value = 'null'; controls['equipment-donor'] = { value: 'Roster' }; controls['equipment-donor-fingerprint'] = { value: 'hash', dataset: { sourcePath: 'Other' } }; assert.match(context.validateDonorMouthpieceDraft(root), /Load/);
});
