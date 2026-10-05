import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ReportService } from "../src/main/services/reports.js";
import { openCfb27Save, readTables, PLAYER_TABLE_UID } from "../src/main/services/save.js";
import { prepareEquipmentTool, runFreshmanEquipment, runEquipmentPatcher } from "../src/main/tools/equipment/runner.js";
import { parseRef, sf } from "../src/main/tools/equipment/openSave.js";
import { VISUALS_TABLE_UID } from "../src/main/tools/equipment/shared.js";
import { isWristTape, isArmTape, recolorTapeItem, teamTapeColor } from "../src/main/tools/equipment/core/recolor.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(here, "../../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN");
const schemaPath = path.resolve(here, "../resources/engine-data/C27_486_6.gz");
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function readCsv(file) {
  const text = fs.readFileSync(file, "utf8"), rows = []; let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') { if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted; }
    else if (character === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((character === "\r" || character === "\n") && !quoted) { if (character === "\r" && text[index + 1] === "\n") index += 1; row.push(cell); if (row.some(value => value !== "")) rows.push(row); row = []; cell = ""; }
    else cell += character;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [headings, ...data] = rows;
  return data.map(values => Object.fromEntries(headings.map((heading, index) => [heading, values[index]])));
}

async function visualValues(savePath) {
  const opened = await openCfb27Save(savePath, schemaPath), tables = await readTables(opened.franchise, { visuals: VISUALS_TABLE_UID });
  const table = tables.visuals, rows = table.records.map(record => record && !record.isEmpty ? sf(record, "RawData") : undefined);
  const overflowRefs = table.records.map(record => record && !record.isEmpty ? parseRef(sf(record, "Overflow")) : null);
  const incoming = new Set(overflowRefs.filter(ref => ref?.tableId === table.header.tableId).map(ref => ref.row));
  // RawData is a compressed blob with a 375-byte inline limit. The save
  // library can allocate linked overflow rows for larger equipment loadouts.
  // These are storage, not other players; the owner's decoded RawData includes
  // their contents. Validate their ownership instead of requiring fake CSV players.
  const owners = new Map();
  overflowRefs.forEach((ref, row) => {
    if (incoming.has(row)) return;
    const seen = new Set([row]);
    while (ref?.tableId === table.header.tableId) {
      assert.ok(!seen.has(ref.row), "overflow storage must not form a cycle");
      assert.ok(table.records[ref.row] && !table.records[ref.row].isEmpty, "overflow reference must point to allocated storage");
      seen.add(ref.row); owners.set(ref.row, row); ref = overflowRefs[ref.row];
    }
  });
  rows.overflowOwners = owners;
  return rows;
}

for (const item of [
  { name: "Equipment Randomizer", run: runFreshmanEquipment, options: { seed: 707, top: 125 }, expected: preview => preview.details.totalPreviewRows },
  { name: "Equipment Randomizer unlocked catalog mode", run: runFreshmanEquipment, options: { seed: 707, top: 125, usingUnlockedMod: true }, expected: preview => preview.details.totalPreviewRows },
  { name: "Equipment Randomizer new Unlocked accessory additions", run: runFreshmanEquipment, options: { seed: 707, top: 50, usingUnlockedMod: true, expandedEquipmentPercent: 100 }, expected: preview => preview.details.totalPreviewRows },
  { name: "Equipment Randomizer Raw neckwear additions", run: runFreshmanEquipment, options: { top: 50, usingRawAccessoriesMod: true, expandedEquipmentPercent: 100 }, expected: preview => preview.details.totalPreviewRows, validate: preview => { assert.ok(preview.details.rawPlayersChanged > 0); assert.equal(preview.details.usingUnlockedMod, false); } },
  { name: "Equipment Randomizer combined mod pools without equipped custom styles", run: runFreshmanEquipment, options: { top: 50, usingUnlockedMod: true, usingRawAccessoriesMod: true, expandedEquipmentPercent: 0 }, expected: preview => preview.details.totalPreviewRows, validate: preview => { assert.equal(preview.details.usingRawAccessoriesMod, true); assert.equal(preview.details.facePaintPools.raw.enabled, true); assert.equal(preview.details.facePaintPools.unlocked.enabled, true); assert.equal(preview.details.facePaintPools.raw.available, 17); assert.equal(preview.details.facePaintPools.unlocked.available, 13); } },
  { name: "Equipment Randomizer selected donors and exact-position mixing", run: runFreshmanEquipment, options: async savePath => { const prepared = await prepareEquipmentTool({ savePath, schemaPath }); return { donorMode: "selected", donorRows: prepared.donorPlayers.filter(item => / · WR · /.test(item.label)).slice(0, 4).map(item => item.value), disableCrossPosition: true, top: 1, positions: ["WR"] }; }, expected: preview => preview.details.totalPreviewRows, validate: preview => { assert.equal(preview.details.donorMode, "selected"); assert.equal(preview.details.donorRows.length, 4); assert.equal(preview.details.top, null); assert.ok(preview.details.changes.every(change => change.position === "WR")); assert.ok(preview.details.changes.every(change => !/Cross-position/.test(change.currentValue))); } },
  { name: "Equipment Patcher", run: runEquipmentPatcher, options: { seed: 707, pantsFix: true, helmetFix: true, rolledJerseyFix: true, sockFix: true, sleeveCompatibilityFix: true, nikeThighPads: true, undershirtColor: "weighted" }, expected: preview => preview.details.visualsChanged },
  { name: "Equipment Patcher existing Oakley visor conversion", run: runEquipmentPatcher, options: { oakleyVisorFix: true }, expected: preview => preview.details.visualsChanged, validate: preview => { assert.ok(preview.details.oakleyVisorPlayersChanged > 0); assert.ok(preview.details.changes.every(row => row.changes.every(change => change.type === "Oakley visor replacement"))); } },
  { name: "Equipment Patcher unlocked catalog passes", run: runEquipmentPatcher, options: { seed: 707, unlockedMouthpieceFix: true, unlockedRecolorFix: true, tapeColorMode: "distribution", unlockedColorTheme: "random" }, expected: preview => preview.details.visualsChanged },
  { name: "Equipment Patcher mouthpieces only", run: runEquipmentPatcher, options: { unlockedMouthpieceFix: true }, expected: preview => preview.details.visualsChanged },
  { name: "Equipment Patcher mouthpieces and existing colors", run: runEquipmentPatcher, options: { unlockedMouthpieceFix: true, allowRandomMouthpieceColors: true, randomizeExistingMouthpieceColors: true }, expected: preview => preview.details.visualsChanged, validate: preview => { assert.ok(preview.details.existingMouthpieceColorsChanged > 0); assert.equal(preview.details.randomizeExistingMouthpieceColors, true); } },
  { name: "Equipment Patcher team tape and weighted accessory colors", run: runEquipmentPatcher, options: { unlockedRecolorFix: true, tapeColorMode: "distribution", unlockedColorTheme: "weighted", accessoryColorWeights: { white: 65, black: 20, primary: 10, secondary: 5 }, teamTapeColors: { lsu: "black", georgia: "white" } }, expected: preview => preview.details.visualsChanged, validate: preview => { assert.deepEqual(preview.details.recolorSettings.teamTapeColors.lsu, { white: 0, black: 100, primary: 0, secondary: 0 }); assert.equal(preview.details.recolorSettings.colorTheme, "weighted"); } },
  { name: "Equipment Patcher mixed team tape percentages", run: runEquipmentPatcher, options: { unlockedRecolorFix: true, tapeColorMode: "distribution", skipNilPlayers: false, includedTeams: ["LSU"], teamTapeColors: { lsu: { white: 25, black: 25, primary: 25, secondary: 25 } } }, expected: preview => preview.details.visualsChanged, validate: preview => { assert.deepEqual(preview.details.recolorSettings.teamTapeColors.lsu, { white: 25, black: 25, primary: 25, secondary: 25 }); } },
  { name: "Equipment Patcher capped Unlocked tattoos", run: runEquipmentPatcher, options: { seed: 707, unlockedTattooFix: true, unlockedTattooCap: 15 }, expected: preview => preview.details.visualsChanged, validate: preview => { assert.ok(preview.details.unlockedTattooPlayersChanged > 0); assert.ok(preview.details.unlockedTattooPopulation.fbs.projectedPrevalence <= 0.15); } }
  ,{ name: "Equipment Patcher selected tattoo pool", run: runEquipmentPatcher, options: { unlockedTattooFix: true, unlockedTattooSelection: ["CujoMatty_ArmTats_35"] }, expected: preview => preview.details.visualsChanged, validate: preview => { assert.ok(preview.details.unlockedTattooPlayersChanged > 0); assert.deepEqual(preview.details.tattooSelection, ["CujoMatty_ArmTats_35"]); } }
  ,{ name: "Equipment Patcher optional tattoo styles", run: runEquipmentPatcher, options: { seed: 707, unlockedTattooFix: true, unlockedTattooSelection: ["ArmTattoo_Tattoos_Japanese_03_ForearmHalfSleeve2", "ArmTattoo_Tattoos_Polynesian_Maori_Arm_A"] }, expected: preview => preview.details.visualsChanged, validate: preview => { assert.ok(preview.details.unlockedTattooPlayersChanged > 0); assert.deepEqual(preview.details.tattooSelection, ["ArmTattoo_Tattoos_Japanese_03_ForearmHalfSleeve2", "ArmTattoo_Tattoos_Polynesian_Maori_Arm_A"]); } }
]) test(`${item.name} handles the latest-patch preseason save and applies its complete bounded preview plan`, { timeout: 30000 }, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "equipment-latest-workflow-")), savePath = path.join(directory, "DYNASTY-LSUTESTSAVEPRESZN"), reports = new ReportService(path.join(directory, "reports"));
  fs.copyFileSync(fixture, savePath); const originalHash = hash(savePath);
  try {
    const options = typeof item.options === "function" ? await item.options(savePath) : item.options;
    const preview = await item.run({ savePath, schemaPath, reports, mode: "preview", options });
    assert.equal(hash(savePath), originalHash); assert.equal(preview.backupPath, null); assert.ok(preview.details.changes.length <= 1000); assert.ok(preview.details.totalPreviewRows >= preview.details.changes.length); assert.ok(preview.details.totalPreviewRows > 0);
    item.validate?.(preview);
    if (item.name.startsWith("Equipment Randomizer")) assert.equal(preview.details.skippedReasons["missing or invalid CharacterVisuals reference"] ?? 0, 0, "inactive non-roster rows must not be reported as eligible players");
    const applied = await item.run({ savePath, schemaPath, reports, mode: "apply", options: { planId: preview.planId } });
    assert.deepEqual(applied.details.changes, preview.details.changes, "Apply must use exactly the cached Preview");
    assert.equal(applied.status, "completed"); assert.ok(fs.existsSync(applied.backupPath)); assert.equal(hash(applied.backupPath), originalHash); assert.notEqual(hash(savePath), originalHash); assert.ok(fs.existsSync(applied.reportPath));
    const before = await visualValues(applied.backupPath), after = await visualValues(savePath); let changed = 0;
    if (preview.details.donorMode === "selected") {
      const opened = await openCfb27Save(applied.backupPath, schemaPath), tables = await readTables(opened.franchise, { players: PLAYER_TABLE_UID });
      for (const row of preview.details.donorRows) { const ref = parseRef(sf(tables.players.records[row], "CharacterVisuals")); assert.equal(after[ref.row], before[ref.row], "manually selected donors keep their original equipment"); }
    }
    const storageRows = new Set([...before.overflowOwners.keys(), ...after.overflowOwners.keys()]);
    for (let row = 0; row < before.length; row += 1) if (!storageRows.has(row) && typeof before[row] === "string" && before[row] !== after[row]) changed += 1;
    assert.equal(changed, item.expected(preview));
    const reportRows = readCsv(applied.reportPath), byVisualRow = new Map(reportRows.map(row => [Number(row.CharacterVisualsRow), row]));
    if (item.name === "Equipment Patcher selected tattoo pool") for (const row of reportRows) {
      const tattoos = value => JSON.parse(value).loadouts.flatMap(loadout => loadout.loadoutElements ?? []).filter(element => /^(Left|Right)(Arm|Leg)Tattoo$/.test(element.slotType) && !/_None$/.test(element.itemAssetName));
      if (tattoos(row.BeforeRawData).length) continue;
      assert.ok(tattoos(row.AfterRawData).length > 0 && tattoos(row.AfterRawData).every(element => element.itemAssetName === "CujoMatty_ArmTats_35"));
    }
    assert.ok(reportRows.length > 0);
    if (item.name.startsWith("Equipment Patcher mouthpieces")) {
      const stripMouthpieces = raw => { const data = JSON.parse(raw); for (const loadout of data.loadouts) if (Array.isArray(loadout.loadoutElements)) loadout.loadoutElements = loadout.loadoutElements.filter(element => element.slotType !== "MouthWear"); return data; };
      for (const row of reportRows) assert.deepEqual(stripMouthpieces(row.BeforeRawData), stripMouthpieces(row.AfterRawData), `${row.Player}: mouthpiece-only Apply must not alter any other equipment or metadata`);
      if (item.options.randomizeExistingMouthpieceColors) assert.ok(reportRows.some(row => row.ChangeType.includes("mouthpiece reroll")), "existing mouthpiece rerolls must be in the full audit");
      else for (const row of reportRows) for (const loadout of JSON.parse(row.BeforeRawData).loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField")) assert.ok(loadout.loadoutElements.filter(element => element.slotType === "MouthWear").every(element => /None$/.test(element.itemAssetName)), "equipped mouthpieces remain untouched by default");
    }
    if (item.name === "Equipment Randomizer Raw neckwear additions") {
      const names = new Set();
      for (const row of reportRows) {
        const additions = JSON.parse(row.AfterRawData).loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField").flatMap(loadout => loadout.loadoutElements).filter(element => /^NeckWear_Raw_|^GearNeckpad_Raw_|^GuardianCap_Raw/.test(element.itemAssetName));
        assert.ok(additions.length > 0);
        for (const element of additions) { names.add(element.itemAssetName); assert.equal(element.slotType, element.itemAssetName.startsWith("NeckWear_") ? "NeckWear" : element.itemAssetName.startsWith("GuardianCap_") ? "GuardianCap" : "Neckpad"); }
        assert.ok(Object.values(row).some(value => value.includes("RAW Accessories Equipment Pool")));
      }
      assert.equal(names.size, 10, "all supported RAW neckwear and white/black skullcap variants are persisted and audited");
      for (const brand of ["Nike","Battle"]) for (const suffix of ["","WhiteV87"]) assert.ok(names.has(`GuardianCap_Raw${brand}SkullCap${suffix}`), "Both skullcap colors actually persist in the saved file");
    }
    if (item.name === "Equipment Randomizer new Unlocked accessory additions") {
      const names = new Set(reportRows.flatMap(row => JSON.parse(row.AfterRawData).loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField").flatMap(loadout => loadout.loadoutElements).map(element => element.itemAssetName)));
      for (const color of ["White", "Black", "Primary", "Secondary"]) assert.ok(names.has(`GearLegBase_Socks_Under_Both_${color}`), "new layers are persisted, not merely previewed");
      // NFL undersocks may be donor-copied, but must not be newly generated.
      assert.ok(reportRows.every(row => !row.NewOrDonorPlayerAndEquipmentGroups.includes("NFL Style Undersock")));
      for (const color of ["White", "Black", "Primary", "Secondary"]) assert.ok(names.has(`GearLegBase_Socks_Under_Both_${color}2`));
      for (const base of ["NeckWear_Turtleneck_Tight", "NeckWear_Turtleneck_Scrunched"]) for (const suffix of ["", "_White", "_Black", "_Secondary"]) assert.ok(names.has(base + suffix));
      assert.ok(![...names].some(name => /^NeckWear_Raw_|^GuardianCap_Raw/.test(name)), "Raw items must not be generated by the Unlocked flag");
      assert.ok(reportRows.some(row => Object.values(row).some(value => value.includes("Double Sleeve"))));
      assert.ok(reportRows.some(row => Object.values(row).some(value => value.includes("Elbow Sleeve"))));
    }
    if (item.name === "Equipment Randomizer combined mod pools without equipped custom styles") {
      const assets = new Set([...preview.details.facePaintPools.raw.assets, ...preview.details.facePaintPools.unlocked.assets]);
      const generated = reportRows.flatMap(row => JSON.parse(row.AfterRawData).loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField").flatMap(loadout => loadout.loadoutElements ?? []).filter(element => element.slotType === "FacePaint" && assets.has(element.itemAssetName)));
      assert.ok(generated.length > 0, "custom styles must be persisted without equipped donors");
      assert.ok(reportRows.some(row => Object.values(row).some(value => value.includes("RAW Accessories Equipment Pool"))));
      assert.ok(reportRows.some(row => Object.values(row).some(value => value.includes("Unlocked Equipment Pool"))));
    }
    if (item.name === "Equipment Patcher optional tattoo styles") {
      const addedAssets = new Set();
      for (const row of reportRows) {
        const oldVisual = JSON.parse(row.BeforeRawData), newVisual = JSON.parse(row.AfterRawData);
        const tattoos = visual => visual.loadouts.flatMap(loadout => loadout.loadoutElements ?? []).filter(element => /^(Left|Right)(Arm|Leg)Tattoo$/.test(element.slotType) && !/_None$/.test(element.itemAssetName));
        const existing = new Set(tattoos(oldVisual).map(element => element.itemAssetName));
        for (const tattoo of tattoos(newVisual)) if (!existing.has(tattoo.itemAssetName)) { assert.ok(item.options.unlockedTattooSelection.includes(tattoo.itemAssetName)); addedAssets.add(tattoo.itemAssetName); }
        const gear = visual => visual.loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField").map(loadout => loadout.loadoutElements);
        assert.deepEqual(gear(newVisual), gear(oldVisual), "optional arm styles must not change existing equipment");
      }
      assert.deepEqual([...addedAssets].sort(), [...item.options.unlockedTattooSelection].sort(), "both opted-in styles are recorded and persisted");
    }
    if (item.name === "Equipment Patcher mixed team tape percentages") {
      const tokens = new Set();
      let armTapeEntries = 0;
      for (const row of reportRows) {
        assert.equal(row.Team, "LSU");
        // Some legacy glove-tape styles have only black/white variants. Their
        // existing missing-variant fallback stays unchanged; check shared rolls
        // for families that actually support all four configured colors.
        const tape = JSON.parse(row.AfterRawData).loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField").flatMap(loadout => loadout.loadoutElements).filter(element => /^GearSpats_spatThin_/i.test(element.itemAssetName) || isWristTape(element.itemAssetName, element.slotType) || isArmTape(element.itemAssetName, element.slotType))
          .filter(element => Object.entries({ white: "White", black: "Black", primary: "TeamColor", secondary: "SecondaryColor" }).every(([theme, token]) => recolorTapeItem(element.itemAssetName, theme, element.slotType).split("_").at(-1).replace("OffWhite", "White") === token));
        const colors = new Set(tape.map(element => element.itemAssetName.split("_").at(-1).replace("OffWhite", "White")));
        armTapeEntries += tape.filter(element => isArmTape(element.itemAssetName, element.slotType)).length;
        assert.ok(colors.size <= 1, `${row.Player}: each player's tape must use one consistent rolled color (${tape.map(item => item.itemAssetName).join(", ")})`);
        for (const color of colors) { assert.ok(["White", "Black", "TeamColor", "SecondaryColor"].includes(color)); tokens.add(color); }
      }
      assert.ok(tokens.size > 1, "team mix must yield different player colors");
      assert.ok(armTapeEntries > 0, "real save arm tape is persisted and included in the CSV audit");
    }
    if (item.name === "Equipment Patcher team tape and weighted accessory colors") for (const row of reportRows) {
      const oldLoadouts = JSON.parse(row.BeforeRawData).loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField"), newLoadouts = JSON.parse(row.AfterRawData).loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField");
      assert.deepEqual(newLoadouts.map(loadout => loadout.loadoutElements.filter(element => element.slotType === "MouthWear")), oldLoadouts.map(loadout => loadout.loadoutElements.filter(element => element.slotType === "MouthWear")), "recolor must preserve mouthpiece color choices");
      if (!Object.hasOwn(item.options.teamTapeColors, row.Team.toLowerCase())) continue;
      const color = teamTapeColor(row.Team, item.options.teamTapeColors) === "black" ? "Black" : "White";
      for (const loadout of newLoadouts) for (const element of loadout.loadoutElements) if (/^GearSpats_spatThin_/i.test(element.itemAssetName) || isWristTape(element.itemAssetName, element.slotType) || isArmTape(element.itemAssetName, element.slotType)) assert.ok(element.itemAssetName.endsWith(`_${color === "White" && isArmTape(element.itemAssetName, element.slotType) ? "OffWhite" : color}`), `${row.Team}: ${element.itemAssetName}`);
    }
    for (let row = 0; row < before.length; row += 1) {
      if (before[row] === after[row]) continue;
      if (storageRows.has(row)) {
        const owner = after.overflowOwners.get(row) ?? before.overflowOwners.get(row);
        assert.ok(byVisualRow.has(owner), `changed storage row ${row} must belong to a fully audited player visuals row`);
        continue;
      }
      const audit = byVisualRow.get(row);
      assert.ok(audit, `${item.name}: changed visual row ${row} is missing from the CSV (before ${typeof before[row]}/${before[row]?.length}, after ${typeof after[row]}/${after[row]?.length})`);
      assert.equal(audit.BeforeRawData, before[row]);
      assert.equal(audit.AfterRawData, after[row]);
      assert.ok(audit.ChangedSlotsAndMetadata, `${item.name}: changed visual row ${row} has no readable audit`);
    }
    if (item.name.startsWith("Equipment Patcher")) {
      assert.equal(preview.details.totalPreviewRows, reportRows.length);
      assert.ok(preview.details.changes.every(row => Array.isArray(row.changes) && row.changes.length > 0));
      if (item.name === "Equipment Patcher") assert.ok(preview.details.changes.some(row => row.changes.length > 1), "multiple passes should appear under one player");
    }
    if (item.name === "Equipment Patcher capped Unlocked tattoos") {
      const unchangedGearSlots = elements => elements.filter(element => !["InnerSocks", "InnerPants"].includes(element.slotType));
      for (let row = 0; row < before.length; row += 1) {
        if (before[row] === after[row] || storageRows.has(row)) continue;
        const oldVisual = JSON.parse(before[row]), newVisual = JSON.parse(after[row]);
        const base = newVisual.loadouts.find(loadout => loadout.loadoutCategory === "Base" && Array.isArray(loadout.loadoutElements)
          && loadout.loadoutElements.some(element => /^(Left|Right)(Arm|Leg)Tattoo$/.test(element.slotType)));
        assert.ok(base, `visual row ${row} must have a game-recognized tattoo layer`);
        assert.notEqual(base.loadoutType, "loadoutElements");
        assert.ok(base.loadoutElements.some(element => /^(Left|Right)(Arm|Leg)Tattoo$/.test(element.slotType) && !/_None$/.test(element.itemAssetName)));
        assert.ok(base.loadoutElements.every(element => !/Japanese/i.test(element.itemAssetName)));
        const oldGear = oldVisual.loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField").flatMap(loadout => loadout.loadoutElements);
        const newGear = newVisual.loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField").flatMap(loadout => loadout.loadoutElements);
        assert.ok(newVisual.loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField").every(loadout => loadout.loadoutCategory === undefined), `visual row ${row} retained conflicting outfit metadata`);
        assert.deepEqual(unchangedGearSlots(newGear), unchangedGearSlots(oldGear), `visual row ${row} lost unrelated gear`);
      }
    }
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
