import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {RAW_314} from '../src/main/tools/equipment/catalog.js';
import {recolorPlayerAccessories} from '../src/main/tools/equipment/core/recolor.js';
import {loadEquipmentTables, snapshotVisualRawData} from '../src/main/tools/equipment/shared.js';
import {snapshotVisualsForVerification, saveEquipmentCandidate, verifyVisualSnapshot} from '../src/main/tools/equipment/visualsSafety.js';

test('RAW 3.1.4 equipment and both Jamo arm slots survive fixed-save write, reopen and recoloring', {timeout: 120000}, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'raw314-save-'));
  t.after(() => fs.rmSync(directory, {recursive:true, force:true}));
  const source = path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN');
  const original = fs.readFileSync(source), savePath = path.join(directory, 'DYNASTY-RAW314-TEST');
  const schema = path.resolve('resources/engine-data/C27_486_6.gz');
  fs.writeFileSync(savePath, original);
  let loaded = await loadEquipmentTables(savePath, schema);
  const equipmentLoadouts = data => (data.loadouts ?? []).filter(loadout => Array.isArray(loadout.loadoutElements));
  const rows = loaded.visuals.records.filter(record => !record.isEmpty && typeof record.RawData === 'string' && equipmentLoadouts(JSON.parse(record.RawData)).length).slice(0, 4).map(record => record.index);
  assert.equal(rows.length, 4);
  const put = (elements, slotType, itemAssetName) => {
    const element = elements.find(element => (element.slotType ?? element.slot) === slotType);
    if (element) element.itemAssetName = itemAssetName;
    else elements.push({slotType, itemAssetName});
  };
  for (const phase of ['equip', 'recolor']) {
    const before = snapshotVisualsForVerification(loaded.visuals, snapshotVisualRawData(loaded.visuals.records));
    const assignments = rows.map((row, index) => {
      const data = JSON.parse(before.get(row));
      if (phase === 'equip') for (const loadout of equipmentLoadouts(data)) {
        const elements = loadout.loadoutElements;
        for (const side of ['Left', 'Right']) put(elements, side+'ArmWear', Object.values(RAW_314.jamoColors)[index]);
        put(elements, 'Neckpad', 'GearNeckpad_Raw_DiamondNecklace');
        put(elements, 'GuardianCap', index % 2 ? 'GuardianCap_RawBattleSkullCapTeamColorV190' : 'GuardianCap_RawNikeSkullCapTeamColorV190');
      }
      else recolorPlayerAccessories(equipmentLoadouts(data), 'primary', 'white');
      const newValue = JSON.stringify(data);
      loaded.visuals.records[row].RawData = newValue;
      return {table:'visuals', row, newValue};
    });
    await saveEquipmentCandidate(loaded, schema, before, assignments);
    loaded = await loadEquipmentTables(savePath, schema);
    verifyVisualSnapshot(before, loaded.visuals, assignments);
    assert.equal(fs.statSync(savePath).size, original.length);
  }
  for (const row of rows) for (const loadout of equipmentLoadouts(JSON.parse(loaded.visuals.records[row].RawData))) {
    for (const side of ['Left', 'Right']) assert.equal(loadout.loadoutElements.find(element => element.slotType === side+'ArmWear').itemAssetName, RAW_314.jamoColors.primary);
    assert.equal(loadout.loadoutElements.find(element => element.slotType === 'Neckpad').itemAssetName, 'GearNeckpad_Raw_DiamondNecklace');
  }
  assert.deepEqual(fs.readFileSync(source), original);
});
