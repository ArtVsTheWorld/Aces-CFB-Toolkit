import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { homeSeason, readHomeContext } from "../src/main/services/homeContext.js";
import { readTeamArtwork, saveTeamArtwork, teamArtworkKey } from "../src/main/services/teamArtwork.js";
import { UNLOCKED_POOLS } from "../src/main/tools/equipment/catalog.js";
import { rollUnlockedMouthpiece } from "../src/main/tools/equipment/core/globalFixes.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { runEquipmentPatcher } from "../src/main/tools/equipment/runner.js";
import { mulberry32 } from "../src/main/tools/equipment/core/patcher.js";
import { ReportService } from "../src/main/services/reports.js";
import { tools } from "../src/shared/toolRegistry.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(here, "../../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN");
const schemaPath = path.resolve(here, "../resources/engine-data/C27_486_6.gz");
const sequence = values => { let index = 0; return () => values[Math.min(index++, values.length - 1)]; };

test("Home reads real season, week, nickname, and controlled team from current save tables", async () => {
  const before = fs.statSync(fixture).mtimeMs;
  const context = await readHomeContext(fixture, schemaPath);
  assert.deepEqual(context.season, { season: 2026, week: 0, weekType: "PreSeason" });
  assert.ok(context.teams.length > 100);
  assert.deepEqual(context.controlledTeams.map(team => [team.name, team.nickname]), [["LSU", "Tigers"]]);
  assert.equal(fs.statSync(fixture).mtimeMs, before);
});

test("Home omits unknown season and week rather than inventing zero", () => {
  assert.deepEqual(homeSeason({ CurrentSeasonYear: null, CurrentWeek: null, CurrentWeekType: "" }), { season: null, week: null, weekType: "" });
});

test("team artwork validates 1024-square logos and loads only an exact managed file", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-team-artwork-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const fakeImage = (width, height) => ({ createFromPath: () => ({ isEmpty: () => false, getSize: () => ({ width, height }), toPNG: () => Buffer.from("verified-image") }) });
  assert.throws(() => saveTeamArtwork({ dataDirectory: directory, teamName: "LSU", kind: "logo", sourcePath: "unused", nativeImage: fakeImage(1023, 1024) }), /1024 × 1024/);
  const saved = saveTeamArtwork({ dataDirectory: directory, teamName: "LSU", kind: "logo", sourcePath: "unused", nativeImage: fakeImage(1024, 1024) });
  const key = teamArtworkKey(" LSU ");
  assert.equal(key, "lsu");
  assert.equal(readTeamArtwork(directory, { [key]: { logo: saved.path } }, ["LSU"])[key].logo, saved.dataUrl);
  assert.deepEqual(readTeamArtwork(directory, { [key]: { logo: path.join(directory, "elsewhere.png") } }, ["LSU"]), {});
});

test("Patcher color option preserves the safe default and adds Battle and NXTRND variants of nine bright colors", () => {
  assert.equal(normalizeEquipmentOptions({}, false).allowRandomMouthpieceColors, false);
  assert.equal(normalizeEquipmentOptions({ allowRandomMouthpieceColors: true }, false).allowRandomMouthpieceColors, true);
  const extra = UNLOCKED_POOLS.colorfulHangingMouthpieces.map(item => item.itemName);
  assert.equal(extra.length, 37);
  assert.ok(extra.includes("GearMouthpiece_PacifierDualHanging_Black4"), "misnamed Black artwork is blue/pink and random-color-only");
  for (const color of ["Yellow", "Red", "Orange", "Green", "Pink", "Neon", "Blue", "LightBlue", "Purple"]) {
    for (const suffix of ["", "2", "3"]) assert.ok(extra.includes(`GearMouthpiece_PacifierDualHanging_${color}${suffix}`));
  }
  const safe = rollUnlockedMouthpiece("skill", sequence([0, 0.99]));
  const colorful = rollUnlockedMouthpiece("skill", sequence([0, 0.99]), true);
  assert.ok(UNLOCKED_POOLS.hangingMouthpieces.some(item => item.itemName === safe.item.itemName));
  assert.ok(extra.includes(colorful.item.itemName));
  const rng = mulberry32(15551), colors = new Map(), brands = new Map();
  for (let index = 0; index < 40000; index++) {
    const item = rollUnlockedMouthpiece("skill", rng, true).item;
    const color = item.itemName.match(/_(Pink|Blue)(?:2|3)?$/)?.[1];
    if (color) colors.set(color, (colors.get(color) ?? 0) + 1);
    if (item.tags.includes("HangingMouthpiece")) {
      const kind = /^(?:Battle|NXTRND|Nike)\b/.test(item.displayName) ? "branded" : "generic";
      brands.set(kind, (brands.get(kind) ?? 0) + 1);
    }
  }
  assert.ok((colors.get("Blue") ?? 0) > (colors.get("Pink") ?? 0) * 4);
  assert.ok((brands.get("branded") ?? 0) > (brands.get("generic") ?? 0) * 2);
  assert.equal(tools.find(tool => tool.id === "equipment-patcher").version, "5.0");
});

test("colorful Patcher preview proposes branded colors while the default does not write or use them", { timeout: 30000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-mouthpiece-preview-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const savePath = path.join(directory, "DYNASTY-LSUTESTSAVEPRESZN");
  fs.copyFileSync(fixture, savePath);
  const before = fs.readFileSync(savePath);
  const reports = new ReportService(path.join(directory, "reports"));
  const options = { seed: 707, unlockedMouthpieceFix: true };
  const safe = await runEquipmentPatcher({ savePath, schemaPath, reports, mode: "preview", options });
  const safeReport = fs.readFileSync(safe.reportPath, "utf8");
  assert.doesNotMatch(safeReport, /(?:Battle|NXTRND) Hanging Mouthpiece Pacifier (?:Blue|Green|Light Blue|Orange|Pink|Purple|Red|Yellow|Neon)/);
  const colorful = await runEquipmentPatcher({ savePath, schemaPath, reports, mode: "preview", options: { ...options, allowRandomMouthpieceColors: true } });
  const colorfulReport = fs.readFileSync(colorful.reportPath, "utf8");
  assert.match(colorfulReport, /Battle Hanging Mouthpiece Pacifier (?:Blue|Green|Light Blue|Orange|Pink|Purple|Red|Yellow|Neon)/);
  assert.match(colorfulReport, /NXTRND Hanging Mouthpiece Pacifier (?:Blue|Green|Light Blue|Orange|Pink|Purple|Red|Yellow|Neon)/);
  assert.deepEqual(fs.readFileSync(savePath), before);
});

test("bundled team headers cover save teams and retain a generic fallback", async () => {
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  const aliases = JSON.parse(renderer.match(/const forceLogoAliases = (\{[^;]+\});/)?.[1] ?? "{}");
  const folder = path.join(here, "../src/renderer/assets/team-headers");
  assert.ok(fs.statSync(path.join(folder, "tbak_Default.webp")).size > 1000);
  const context = await readHomeContext(fixture, schemaPath);
  for (const team of context.teams) {
    const normalized = team.name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
    const key = aliases[normalized] ?? team.name.replace(/&/g, "And").replace(/[^A-Za-z0-9]/g, "");
    assert.ok(fs.existsSync(path.join(folder, `tbak_${key}.webp`)), `Missing header for ${team.name}`);
  }
  assert.match(renderer, /data-team-header/);
  assert.match(renderer, /image\.src = teamHeaderFallback/);
  assert.match(renderer, /id="home-team-select"/);
});

test("Home shows only saved context and recorded history, with existing tool navigation and persistent artwork controls", () => {
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  const main = fs.readFileSync(new URL("../src/main/main.js", import.meta.url), "utf8");
  assert.match(renderer, /Recommended Preseason Workflow/);
  assert.match(renderer, /Quick Tools/);
  assert.match(renderer, /Recent Activity/);
  assert.match(renderer, /homeHistory\(\)/);
  assert.match(renderer, /data-open-tool/);
  assert.match(renderer, /data-history-id/);
  assert.match(renderer, /forceLogoUrl\(team\.name\)/);
  assert.match(renderer, /Allow Randomly Colored Mouthpieces/);
  assert.match(renderer, /Upload Logo/);
  assert.match(renderer, /Upload Header/);
  assert.match(renderer, /URL\.createObjectURL/);
  assert.match(fs.readFileSync(new URL("../src/renderer/index.html", import.meta.url), "utf8"), /img-src 'self' data: blob:/);
  assert.match(main, /readHomeContext\(sessionActiveSave/);
  assert.doesNotMatch(renderer, /Continue Where You Left Off|active tool\$\{/);
});
