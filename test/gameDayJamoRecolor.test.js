import test from 'node:test';
import assert from 'node:assert/strict';
import { equipmentDisplayName, recolorEquipmentItem } from '../src/main/tools/equipment/catalog.js';
import { recolorPlayerAccessories } from '../src/main/tools/equipment/core/recolor.js';
import { applyGlobalEquipmentFixes } from '../src/main/tools/equipment/core/globalFixes.js';
import { modPoolDefinitions, modPoolEditorCatalog, normalizeModPools } from '../src/main/tools/equipment/core/modPools.js';

const variants = { white: 'whi', black: 'bla', primary: 'pri', secondary: 'sec' };
const asset = suffix => `gear_undershirt_irishjamo_${suffix}`;
const inputs = [...Object.values(variants), 'jer'];

test('GDG Jamo sleeves recolor all five inputs within the GDG family and have readable labels', () => {
  for (const input of inputs) {
    assert.match(equipmentDisplayName(asset(input)), /^Irish Jamo Sleeves /);
    for (const [color, suffix] of Object.entries(variants)) {
      assert.equal(recolorEquipmentItem(asset(input), color), asset(suffix));
      assert.equal(recolorEquipmentItem(asset(suffix), color), asset(suffix));
    }
  }
  assert.equal(recolorEquipmentItem('gear_undershirt_irishjamo_unknown', 'white'), 'gear_undershirt_irishjamo_unknown');
});

test('accessory recoloring changes existing GDG undershirts without adding gear or touching unrelated slots', () => {
  for (const input of inputs) for (const [color, suffix] of Object.entries(variants)) {
    const unchanged = [{slotType:'HeadWear',itemAssetName:'GearHelmet_Axiom'}, {slotType:'MouthWear',itemAssetName:'GearMouthpiece_None'}];
    const loadouts = [{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'InnerShirt',itemAssetName:asset(input)}, ...structuredClone(unchanged)]}];
    const replacements = recolorPlayerAccessories(loadouts, color, 'black');
    assert.equal(loadouts[0].loadoutElements[0].itemAssetName, asset(suffix));
    assert.deepEqual(loadouts[0].loadoutElements.slice(1), unchanged);
    assert.equal(replacements.size, input === suffix ? 0 : 1);
  }
  const empty = [{loadoutType:'PlayerOnField',loadoutElements:[]}];
  recolorPlayerAccessories(empty, 'white', 'white');
  assert.deepEqual(empty[0].loadoutElements, []);
});

test('Patcher recolors GDG Jamo sleeves with readable change reporting and stable repeated runs', () => {
  for (const [color, suffix] of Object.entries(variants)) {
    const players = inputs.map((_, row) => ({isEmpty:false,FirstName:`Player${row}`,LastName:'Example',Position:'WR',SchoolYear:'Senior',RedshirtStatus:'Previous',TeamIndex:1,CharacterVisuals:(10).toString(2).padStart(15,'0') + row.toString(2).padStart(17,'0')}));
    const visuals = inputs.map(input => ({isEmpty:false,RawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'InnerShirt',itemAssetName:asset(input)}]}]})}));
    const options = {unlockedRecolorFix:true,unlockedColorTheme:color,teamNames:new Map([[1,'Example Team']])};
    const result = applyGlobalEquipmentFixes(players, visuals, 10, options);
    assert.equal(result.unlockedRecolorPlayersChanged, 4);
    for (const visual of visuals) assert.equal(JSON.parse(visual.RawData).loadouts[0].loadoutElements[0].itemAssetName, asset(suffix));
    assert.ok(result.unlockedRecolorChanges.every(change => change.newItem === equipmentDisplayName(asset(suffix))));
    const before = visuals.map(visual => visual.RawData);
    assert.equal(applyGlobalEquipmentFixes(players, visuals, 10, options).unlockedRecolorPlayersChanged, 0);
    assert.deepEqual(visuals.map(visual => visual.RawData), before);
  }
});

test('GDG Jamo IDs never enter Randomizer choices or normalized mod pool settings', () => {
  for (const definitions of [modPoolDefinitions(), modPoolEditorCatalog()]) {
    for (const categories of Object.values(definitions)) for (const category of categories) {
      assert.ok(category.items.every(item => !inputs.includes(String(item.itemName).replace('gear_undershirt_irishjamo_', ''))));
    }
  }
  assert.doesNotMatch(JSON.stringify(normalizeModPools()), /gear_undershirt_irishjamo_/);
});
