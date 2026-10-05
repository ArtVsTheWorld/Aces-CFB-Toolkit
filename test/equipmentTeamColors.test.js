import test from "node:test";
import assert from "node:assert/strict";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { defaultTeamTapeWeights, normalizeAccessoryColorWeights, normalizeTeamTapeColors, recolorPlayerAccessories, recolorTapeItem, rollAccessoryColorTheme, teamTapeWeights } from "../src/main/tools/equipment/core/recolor.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { buildRosterTeamNames, equipmentTeamColors } from "../src/main/tools/equipment/shared.js";

const ref = row => (10).toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const player = (row, team = 1) => ({ isEmpty: false, FirstName: `Player${row}`, LastName: "Example", Position: "WR", SchoolYear: "Senior", RedshirtStatus: "Previous", CharacterVisuals: ref(row), TeamIndex: team, IsNIL: false });
const elements = () => [
  { slotType: "LeftSpat", itemAssetName: "GearSpats_spatThin_TeamColor" },
  { slotType: "RightSpat", itemAssetName: "GearSpats_spatThin_SecondaryColor" },
  { slotType: "LeftWristWear", itemAssetName: "GearWrist_wristTapedLite_TeamColor" },
  { slotType: "RightWristWear", itemAssetName: "G_WristTaped_Max_TeamColor" },
  { slotType: "LeftArmWear", itemAssetName: "GearArmSleeve_Baggy_SecondaryColor" },
  { slotType: "LeftBicepWear", itemAssetName: "GearBicepBand_Black" },
  { slotType: "MouthWear", itemAssetName: "GearMouthpiece_PacifierDualHanging_Black" },
  { slotType: "Helmet", itemAssetName: "GearHelmet_Axiom" }
];
const visual = () => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: elements() }, { loadoutCategory: "Base", loadoutElements: [{ slotType: "LeftArmTattoo", itemAssetName: "existing-tattoo" }] }] }) });
const slots = raw => new Map(JSON.parse(raw).loadouts[0].loadoutElements.map(element => [element.slotType, element.itemAssetName]));

test("all requested team tape distributions, aliases, and unknown-team defaults are exact", () => {
  for (const team of ["Alabama", "Georgia", "Missouri", "Nebraska", "Northwestern", "Penn State", "Purdue", "USC", "Wake Forest", "Cincinnati", "Texas Tech", "UCF", "UGA", "Bama", "Southern California", "Army", "Army West Point", "Southern Miss", "Southern Mississippi", "Oregon State", "Oklahoma State", "NIU", "Northern Illinois", "App State", "Appalachian State", "Kennesaw State"]) assert.deepEqual(defaultTeamTapeWeights(team), { white: 0, black: 100, primary: 0, secondary: 0 }, team);
  for (const team of ["Vanderbilt", "Ohio State", "Colorado"]) assert.deepEqual(defaultTeamTapeWeights(team), { white: 100, black: 0, primary: 0, secondary: 0 }, team);
  assert.deepEqual(defaultTeamTapeWeights("Michigan"), { white: 0, black: 0, primary: 100, secondary: 0 });
  for (const team of ["Boston College", "Miami", "Pitt", "Pittsburgh", "Iowa State"]) assert.deepEqual(defaultTeamTapeWeights(team), { white: 70, black: 30, primary: 0, secondary: 0 }, team);
  for (const team of ["Florida State", "Syracuse"]) assert.deepEqual(defaultTeamTapeWeights(team), { white: 55, black: 25, primary: 20, secondary: 0 }, team);
  for (const team of ["App St.", "Kennesaw St.", "N. Illinois", "Oregon St.", "Oklahoma St."]) assert.equal(defaultTeamTapeWeights(team).black, 100, team);
  assert.deepEqual(defaultTeamTapeWeights("Houston"), { white: 70, black: 0, primary: 30, secondary: 0 });
  for (const team of ["South Carolina", "Miami (OH)", "Sam Houston", "Oregon", "Georgia Tech", "East Point", "Shanks U", "Unknown"]) assert.deepEqual(defaultTeamTapeWeights(team), { white: 95, black: 5, primary: 0, secondary: 0 }, team);
});

test("old single-color tape settings migrate to 100% distributions and invalid mixes fail before Preview", () => {
  const overrides = normalizeTeamTapeColors({ Georgia: "white", Oregon: "black" });
  assert.deepEqual(teamTapeWeights("GEORGIA", overrides), { white: 100, black: 0, primary: 0, secondary: 0 });
  assert.deepEqual(teamTapeWeights("Oregon", overrides), { white: 0, black: 100, primary: 0, secondary: 0 });
  for (const color of ["white", "black", "primary", "secondary"]) assert.equal(normalizeTeamTapeColors({ Oregon: color }).oregon[color], 100);
  for (const color of ["pink", null, undefined, [], {}, { white: 101, black: -1, primary: 0, secondary: 0 }, { white: 50, black: 20, primary: 10, secondary: 0 }, { white: 100, black: 0, primary: 0, secondary: null }]) assert.throws(() => normalizeTeamTapeColors({ Oregon: color }), /Tape color for Oregon/);
  assert.throws(() => normalizeEquipmentOptions({ unlockedRecolorFix: true, tapeColorMode: "distribution", teamTapeColors: { Oregon: { white: 90, black: 0, primary: 0, secondary: 0 } } }, false), /total 100/);
  assert.throws(() => normalizeTeamTapeColors({ Oregon: { white: 33.34, black: 33.33, primary: 33.33, secondary: 0 } }), /whole-number/);
  assert.doesNotThrow(() => normalizeEquipmentOptions({ unlockedRecolorFix: false, teamTapeColors: { Oregon: {} } }, false));
});

test("primary and secondary use the existing catalog variants for only the existing tape scope", () => {
  for (const [color, token] of [["white", "White"], ["black", "Black"], ["primary", "TeamColor"], ["secondary", "SecondaryColor"]]) {
    assert.equal(recolorTapeItem("GearSpats_spatThin_White", color, "LeftSpat"), `GearSpats_spatThin_${token}`);
    for (const type of ["Lite", "Normal", "Max"]) assert.equal(recolorTapeItem(`GearWrist_wristTaped${type}_White`, color, "LeftWristWear"), `GearWrist_wristTaped${type}_${token}`);
    assert.equal(recolorTapeItem("G_WristTaped_Max_TeamColor", color, "RightWristWear"), `GearWrist_wristTapedMax_${token}`);
    assert.equal(recolorTapeItem("GearSpats_override_prisec", color, "LeftSpat"), "GearSpats_override_prisec");
    assert.equal(recolorTapeItem("GearWrist_wristBandNormal_White", color, "LeftWristWear"), "GearWrist_wristBandNormal_White");
  }
});

test("save team colors combine RGB fields without swapping Michigan navy and Houston red", () => {
  const record = (name, primary, secondary) => Object.fromEntries([["DisplayName", name], ...["R", "G", "B"].flatMap((channel, index) => [[`TEAM_BACKGROUNDCOLOR${channel}`, primary[index]], [`TEAM_BACKGROUNDCOLOR${channel}2`, secondary[index]]])]);
  const colors = equipmentTeamColors([record("Michigan", [9, 31, 64], [240, 195, 25]), record("Houston", [200, 16, 46], [255, 255, 255]), { DisplayName: "Unknown" }]);
  assert.deepEqual(colors.michigan, { primary: "#091f40", secondary: "#f0c319" });
  assert.deepEqual(colors.houston, { primary: "#c8102e", secondary: "#ffffff" });
  assert.deepEqual(colors.unknown, { primary: null, secondary: null });
});

test("weighted colors respect each interval and validate a complete percentage mix", () => {
  assert.deepEqual(normalizeAccessoryColorWeights(), { white: 65, black: 20, primary: 10, secondary: 5 });
  for (const [roll, expected] of [[0, "white"], [0.6499, "white"], [0.65, "black"], [0.8499, "black"], [0.85, "primary"], [0.95, "secondary"]]) assert.equal(rollAccessoryColorTheme(() => roll), expected);
  assert.throws(() => normalizeAccessoryColorWeights({ white: 100, black: 10, primary: 0, secondary: 0 }), /total 100/);
  assert.throws(() => normalizeAccessoryColorWeights({ white: NaN, black: 20, primary: 10, secondary: 5 }), /numbers/);
  assert.throws(() => normalizeEquipmentOptions({ unlockedRecolorFix: true, tapeColorMode: "distribution", unlockedColorTheme: "weighted", accessoryColorWeights: { white: 70, black: 20, primary: 10, secondary: 5 } }, false), /total 100/);
  assert.equal(normalizeEquipmentOptions({}, false).unlockedRecolorFix, false);
  assert.equal(normalizeEquipmentOptions({}, false).unlockedColorTheme, "weighted");
  assert.doesNotThrow(() => normalizeEquipmentOptions({ unlockedRecolorFix: false, accessoryColorWeights: {} }, false));
});

test("tape uses team black/white while wristbands follow accessories and mouthpieces remain separate", () => {
  const loadouts = [{ loadoutElements: [
    ...elements(), { slotType: "RightBicepWear", itemAssetName: "GearSpats_override_prisec" },
    { slotType: "RightArmWear", itemAssetName: "GearWrist_wristBandNormal_Black" }
  ] }];
  recolorPlayerAccessories(loadouts, "primary", "white");
  const mapped = new Map(loadouts[0].loadoutElements.map(element => [element.slotType, element.itemAssetName]));
  assert.equal(mapped.get("LeftSpat"), "GearSpats_spatThin_White");
  assert.equal(mapped.get("RightSpat"), "GearSpats_spatThin_White");
  assert.equal(mapped.get("LeftWristWear"), "GearWrist_wristTapedLite_White");
  assert.equal(mapped.get("RightWristWear"), "GearWrist_wristTapedMax_White");
  assert.equal(mapped.get("RightArmWear"), "GearWrist_wristBandNormal_TeamColor");
  assert.equal(mapped.get("MouthWear"), "GearMouthpiece_PacifierDualHanging_Black");
  const bands = [{ loadoutElements: [{ slotType: "LeftWristWear", itemAssetName: "GearWrist_wristBandNormal_Black" }] }];
  recolorPlayerAccessories(bands, "secondary", "white");
  assert.equal(bands[0].loadoutElements[0].itemAssetName, "GearWrist_wristBandNormal_SecondaryColor");
  for (const asset of ["GearSpats_override_prisec", "GearSpats_override_whipri", "GearSpats_overrides_custom", "GearSpats_none", "Spats_None"]) {
    const loadout = [{ loadoutElements: [{ slotType: "LeftSpat", itemAssetName: asset }] }];
    recolorPlayerAccessories(loadout, "primary", "black");
    assert.equal(loadout[0].loadoutElements[0].itemAssetName, asset, "cleat overrides and no-spat choices are preserved");
  }
});

test("Recolor Accessories applies defaults and overrides across teams without changing tattoo layers", () => {
  const names = new Map([[1, "Georgia"], [2, "Alabama"], [3, "USC"], [4, "Penn State"], [5, "Oregon"]]);
  const players = [...names.keys()].map((team, row) => player(row, team)), visuals = players.map(visual);
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { unlockedRecolorFix: true, tapeColorMode: "distribution", unlockedColorTheme: "white", teamNames: names, teamTapeColors: { georgia: "white", oregon: "black" } });
  assert.equal(result.unlockedRecolorPlayersChanged, 5);
  for (let row = 0; row < players.length; row++) {
    const color = row === 0 ? "White" : "Black", actual = slots(visuals[row].RawData);
    assert.equal(actual.get("LeftSpat"), `GearSpats_spatThin_${color}`);
    assert.equal(actual.get("RightWristWear"), `GearWrist_wristTapedMax_${color}`);
    assert.equal(actual.get("LeftArmWear"), "GearArmSleeve_Baggy_White");
    assert.equal(JSON.parse(visuals[row].RawData).loadouts[1].loadoutElements[0].itemAssetName, "existing-tattoo");
  }
});

test("seeded weighted accessory themes are repeatable and match across each player's loadouts", () => {
  const players = Array.from({ length: 1500 }, (_, row) => player(row));
  const run = () => { const visuals = players.map(() => { const record = visual(), raw = JSON.parse(record.RawData); raw.loadouts.push(structuredClone(raw.loadouts[0])); record.RawData = JSON.stringify(raw); return record; }); applyGlobalEquipmentFixes(players, visuals, 10, { unlockedRecolorFix: true, tapeColorMode: "distribution", seed: 2026, teamNames: new Map([[1, "Oregon"]]) }); return visuals.map(record => record.RawData); };
  const first = run(); assert.deepEqual(first, run());
  const counts = { White: 0, Black: 0, TeamColor: 0, SecondaryColor: 0 };
  for (const raw of first) {
    const loadouts = JSON.parse(raw).loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField");
    assert.deepEqual(loadouts[0], loadouts[1]);
    counts[slots(raw).get("LeftArmWear").split("_").at(-1)]++;
  }
  for (const [color, expected] of [["White", .65], ["Black", .20], ["TeamColor", .10], ["SecondaryColor", .05]]) assert.ok(Math.abs(counts[color] / first.length - expected) < .04, `${color}: ${counts[color]}`);
});

test("team tape rolls are seeded, independent per player, shared within a loadout, and do not perturb accessory rolls", () => {
  const players = Array.from({ length: 2000 }, (_, row) => player(row));
  const run = (weights, seed = 1234) => {
    const visuals = players.map(() => { const record = visual(), raw = JSON.parse(record.RawData); raw.loadouts.push(structuredClone(raw.loadouts[0])); record.RawData = JSON.stringify(raw); return record; });
    applyGlobalEquipmentFixes(players, visuals, 10, { unlockedRecolorFix: true, tapeColorMode: "distribution", seed, teamNames: new Map([[1, "Texas"]]), teamTapeColors: { texas: weights } });
    return visuals.map(record => record.RawData);
  };
  const mix = { white: 25, black: 25, primary: 25, secondary: 25 }, first = run(mix), fixed = run("white");
  assert.deepEqual(first, run(mix)); assert.notDeepEqual(first, run(mix, 5678));
  const counts = { White: 0, Black: 0, TeamColor: 0, SecondaryColor: 0 };
  for (let row = 0; row < first.length; row++) {
    const actual = slots(first[row]), token = actual.get("LeftSpat").split("_").at(-1);
    counts[token]++;
    for (const slot of ["LeftSpat", "RightSpat", "LeftWristWear", "RightWristWear"]) assert.ok(actual.get(slot).endsWith(`_${token}`));
    const gear = JSON.parse(first[row]).loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField"); assert.deepEqual(gear[0], gear[1]);
    for (const slot of ["LeftArmWear", "LeftBicepWear", "MouthWear", "Helmet"]) assert.equal(actual.get(slot), slots(fixed[row]).get(slot), "tape settings must not change other accessory rolls");
  }
  for (const count of Object.values(counts)) assert.ok(Math.abs(count / first.length - .25) < .04);
});

test("recolor respects NIL, exclusions, active-roster scope, and shared-row team conflicts", () => {
  for (const options of [{}, { unlockedRecolorFix: true }, { unlockedRecolorFix: true, tapeColorMode: "distribution", excludedTeamIndexes: new Set([1]) }, { unlockedRecolorFix: true, tapeColorMode: "distribution", activePlayerRows: new Set() }]) {
    const p = player(0), v = visual(); if (options.unlockedRecolorFix && !options.excludedTeamIndexes && !options.activePlayerRows) p.IsNIL = true;
    const before = v.RawData; applyGlobalEquipmentFixes([p], [v], 10, options); assert.equal(v.RawData, before);
  }
  const p = [player(0, 1), { ...player(1, 2), CharacterVisuals: ref(0) }], v = [visual()], before = v[0].RawData;
  applyGlobalEquipmentFixes(p, v, 10, { unlockedRecolorFix: true, tapeColorMode: "distribution", teamNames: new Map([[1, "Georgia"], [2, "Oregon"]]) });
  assert.equal(v[0].RawData, before);
});

test("team tape settings follow actual roster membership even when team indexes are shared", () => {
  const reference = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
  const players = { header: { tableId: 1 }, records: [player(0, 255), player(1, 255)] };
  const teams = { records: [{ TeamIndex: 255, DisplayName: "FCS East", Roster: reference(2, 0) }, { TeamIndex: 255, DisplayName: "FCS West", Roster: reference(2, 1) }] };
  const rosters = { header: { tableId: 2 }, records: [{ arraySize: 1, Player0: reference(1, 0) }, { arraySize: 1, Player0: reference(1, 1) }] };
  const names = buildRosterTeamNames(players, teams, rosters);
  assert.equal(names.get(0), "FCS East"); assert.equal(names.get(1), "FCS West");
  const visuals = [visual(), visual()];
  applyGlobalEquipmentFixes(players.records, visuals, 10, { unlockedRecolorFix: true, tapeColorMode: "distribution", unlockedColorTheme: "white", recolorTeamNames: names, teamNames: new Map([[255, "FCS West"]]), fcsTeamIndexes: new Set([255]), teamTapeColors: { "fcs east": "black", "fcs west": "white" } });
  assert.equal(slots(visuals[0].RawData).get("LeftSpat"), "GearSpats_spatThin_Black");
  assert.equal(slots(visuals[1].RawData).get("LeftSpat"), "GearSpats_spatThin_White");
});
