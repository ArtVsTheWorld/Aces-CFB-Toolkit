import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { ReportService } from "../src/main/services/reports.js";
import { parseCsv } from "../src/main/services/reportAudit.js";
import { runEquipmentPatcher } from "../src/main/tools/equipment/runner.js";
import { loadEquipmentTables, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { sf } from "../src/main/tools/equipment/openSave.js";
import { takePlan } from "../src/main/tools/jersey/planStore.js";

const fixture = path.resolve("../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN");
const schemaPath = path.resolve("resources/engine-data/C27_486_6.gz");
const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
test("team-level population caps survive exact Preview/Apply/reopen and appear in the CSV audit", { timeout: 120000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-team-caps-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const savePath = path.join(directory, "DYNASTY-TEAM-CAPS"), sourceHash = hash(fixture);
  fs.copyFileSync(fixture, savePath);
  const reports = new ReportService(path.join(directory, "reports"));
  const before = await loadEquipmentTables(savePath, schemaPath), rawBefore = snapshotVisualRawData(before.visuals.records);
  const preview = await runEquipmentPatcher({ savePath, schemaPath, reports, mode: "preview", options: {
    includedTeams: ["LSU", "Alabama"], skipNilPlayers: false, seed: 21040,
    unlockedTattooFix: true, unlockedTattooCap: 40, visorFix: true, unlockedMouthpieceFix: true,
    lowerRolledJerseyFix: true, cutoffPantsFix: true,
    fillFrequencies:{visors:true,mouthpieces:false,tattoos:false},
    tattooChances:{arm:50,leg:25,both:25,doubleArm:70,differentArms:90,leftArm:30}
  } });
  assert.equal(hash(savePath), sourceHash, "Preview never changes the save copy");
  assert.equal(preview.details.unlockedTattooPopulation.teams.length, 2);
  for (const team of preview.details.unlockedTattooPopulation.teams) {
    assert.ok(team.projectedTattooPlayers <= Math.max(team.existingTattooPlayers, team.capCount));
    assert.equal(team.capCount, Math.floor(team.eligiblePlayers * .4));
  }
  for (const row of preview.details.uniformPopulation) assert.ok(["Alabama", "LSU"].includes(row.team));
  const plan = takePlan(preview.planId), expected = new Map(plan.assignments.map(change => [change.row, change.newValue]));
  assert.ok(expected.size > 0);
  const applied = await runEquipmentPatcher({ savePath, schemaPath, reports, mode: "apply", options: { planId: preview.planId } });
  assert.equal(hash(applied.backupPath), sourceHash);
  const reopened = await loadEquipmentTables(savePath, schemaPath);
  for (const [row, raw] of rawBefore) if (typeof raw === "string") assert.equal(sf(reopened.visuals.records[row], "RawData"), expected.get(row) ?? raw, "Changed and unchanged rows exactly match the preview");
  const [headings, first] = parseCsv(fs.readFileSync(applied.reportPath, "utf8"));
  assert.equal(first.length, headings.length);
  const audit = JSON.parse(first[headings.indexOf("PopulationCapsAuditJSON")]);
  assert.equal(audit.scope, "team");
  const resolved=JSON.parse(first[headings.indexOf("ResolvedOptionsJSON")]);
  assert.equal(resolved.fillFrequencies.visors,true);assert.equal(resolved.fillFrequencies.tattoos,false);
  assert.equal(resolved.tattooChances.doubleArm,70);assert.equal(resolved.tattooChances.both,25);
  assert.deepEqual(audit.tattoos, preview.details.unlockedTattooPopulation);
  assert.deepEqual(audit.equipment, preview.details.populationSafeguards);
  assert.equal(hash(fixture), sourceHash, "Original dynasty fixture is untouched");
});
