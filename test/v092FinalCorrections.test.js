import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { prepareDealbreaker } from "../src/main/tools/dealbreaker/runner.js";
import { patchFreshmanEquipment } from "../src/main/tools/equipment/core/patcher.js";
import { equipmentPopulationState } from "../src/main/tools/equipment/core/globalFixes.js";

const ref = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const visual = asset => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: [{ slotType: "Visor", itemAssetName: asset }, { slotType: "MouthWear", itemAssetName: `Mouth_${asset}` }] }] }) });
const player = (row, overall, teamIndex = 1) => ({ isEmpty: false, FirstName: `Player${row}`, LastName: "Donor", Position: "WR", SchoolYear: "Senior", RedshirtStatus: "Previous", CharacterBodyType: "Thin", CharacterVisuals: ref(10, row), IsNIL: false, TeamIndex: teamIndex, OverallRating: overall, JerseyNum: row });

test("the rendered and prepared Playing Style field title includes its position restriction", async () => {
  const prepared = await prepareDealbreaker();
  assert.equal(prepared.values.find(item => item.value === "PlayingStyle").label, "Playing Style (RB, WR, TE only)");
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.match(renderer, /dealbreakerLabels\[item\.value\] \?\? item\.label/);
  assert.match(renderer, /PlayingStyle: "Playing Style \(RB, WR, TE only\)"/);
});

test("same-save top-N donors are protected from Equipment Randomizer recipient changes", () => {
  const players = [player(0, 99), player(1, 90), player(2, 80)], visuals = [visual("TopDonor"), visual("Second"), visual("Third")];
  const originalTopDonor = visuals[0].RawData;
  const result = patchFreshmanEquipment(players, visuals, 10, { teamNames: new Map([[1, "Test"]]), teamApparel: new Map([[1, "nike"]]), eligiblePlayer: () => true, top: 1, mixedChance: 0, crossMixedChance: 0, seed: 22, apply: true });
  assert.equal(visuals[0].RawData, originalTopDonor);
  assert.equal(result.changes.some(change => change.target.row === 0), false);
  assert.equal(result.skipped.find(item => item.row === 0).reason, "top-1 donor pool; original equipment preserved");
  assert.ok(result.changes.some(change => change.target.row !== 0));
});

test("external-save donor records do not suppress unrelated recipient records", () => {
  const recipients = [player(0, 80)], recipientVisuals = [visual("Recipient")];
  const donors = [player(0, 99, 2)], donorVisuals = [visual("ExternalDonor")];
  const result = patchFreshmanEquipment(recipients, recipientVisuals, 10, { teamNames: new Map([[1, "Target"]]), teamApparel: new Map([[1, "nike"]]), donorPlayerRecords: donors, donorVisualRecords: donorVisuals, donorVisualsTableId: 10, donorTeamNames: new Map([[2, "Donor"]]), donorTeamApparel: new Map([[2, "nike"]]), eligiblePlayer: () => true, top: 1, mixedChance: 0, crossMixedChance: 0, seed: 22, apply: true });
  assert.equal(result.changes.length, 1);
});

test("directional FCS players have prevalence populations separate from FBS", () => {
  const players = [], visuals = [];
  for (let row = 0; row < 10; row++) { players.push({ ...player(row, 80, 1), Position: "QB" }); visuals.push(visual(row < 2 ? "GearVisor_visorDarkLight" : "GearVisor_None")); }
  for (let row = 10; row < 20; row++) { players.push({ ...player(row, 80, 200), Position: "QB" }); visuals.push(visual("GearVisor_None")); }
  const state = equipmentPopulationState(players, visuals, 10, new Map([[1, "FBS"], [200, "FCS Southeast"]]), new Set([200]));
  assert.equal(state.visorGroups.get("QB").total, 10);
  assert.equal(state.visorGroups.get("QB").equipped, 2);
  assert.equal(state.visorGroups.get("QB").equipped / state.visorGroups.get("QB").total, 0.20);
  assert.equal(state.populations.fcs.visorGroups.get("QB").total, 10);
  assert.equal(state.populations.fcs.visorGroups.get("QB").equipped, 0);
  assert.equal(state.undershirts.total, 0);
});

test("the uploaded wrench artwork is wired to the in-app brand and Windows packaging", () => {
  const index = fs.readFileSync(new URL("../src/renderer/index.html", import.meta.url), "utf8");
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(index, /class="brand-mark brand-image" src="assets\/app-icon\.png"/);
  assert.equal(pkg.build.win.icon, "build/icon.ico");
  assert.equal(pkg.build.nsis.installerIcon, "build/icon.ico");
  assert.ok(fs.existsSync(new URL("../src/renderer/assets/app-icon.png", import.meta.url)));
  assert.ok(fs.existsSync(new URL("../build/icon.ico", import.meta.url)));
});
