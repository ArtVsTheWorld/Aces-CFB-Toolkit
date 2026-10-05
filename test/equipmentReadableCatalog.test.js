import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildEntries, buildReviewGroups, renderHtml, renderMarkdown } from "../scripts/render-equipment-reference.mjs";

const catalog = JSON.parse(fs.readFileSync(new URL("../docs/catalogs/equipment-modded-2026-10-05.json", import.meta.url), "utf8"));

test("readable catalog preserves every observation and earlier mapping without duplicates or mutations", () => {
  const before = JSON.stringify(catalog), entries = buildEntries(catalog);
  const ids = new Set([...catalog.items, ...Object.values(catalog.knownModPools).flat()].map(item => item.itemName));
  assert.equal(entries.length, ids.size);
  assert.equal(entries.length, 329);
  assert.deepEqual(new Set(entries.map(entry => entry.itemName)), ids);
  assert.equal(entries.filter(entry => entry.live).length, 251);
  assert.equal(entries.filter(entry => !entry.live).length, 78);
  assert.equal(JSON.stringify(catalog), before);
});

test("separate facepaint and tattoo pools are not misreported as unsupported generic entries", () => {
  const entries = buildEntries(catalog);
  const facepaint = entries.find(entry => entry.itemName === "FaceMarks_RawNoseTape_dontblink");
  assert.equal(catalog.items.find(entry => entry.itemName === facepaint.itemName).generationEligible, false);
  assert.equal(facepaint.toolkit, "Established facepaint pool mapping");
  assert.match(entries.find(entry => entry.itemName === "CujoMatty_ArmTats_21").toolkit, /selected by default/);
  assert.match(entries.find(entry => entry.itemName === "ArmTattoo_Tattoos_Japanese_01_FullSleeveR").toolkit, /deselected by default/);
});

test("manual review flags distinguish blockers, optional freshness and intentional exclusions", () => {
  const entries = buildEntries(catalog), groups = buildReviewGroups(entries);
  assert.deepEqual(Object.fromEntries(groups.map(group => [group.kind, group.entries.length])), { slot: 7, caps: 4, combo: 30, refresh: 78, artwork: 26, unresolved: 3 });
  for (const entry of entries.filter(entry => /^FaceGear_BalaclavaUnderLip/.test(entry.itemName) || entry.itemName === "FaceGear_BalaclavaNone")) {
    assert.equal(entry.toolkit, "Intentionally excluded");
    assert.equal(entry.reviewKinds.length, 0);
  }
  assert.equal(entries.find(entry => entry.itemName === "G_CompressionT_Crew_LongSleeve_NikeHQ_B_NAV").location, "Not verified");
  assert.match(entries.find(entry => entry.itemName === "GuardianCap_RawNikeSkullCapWhiteV87").review, /save\/reopen/);
});

test("HTML and Markdown cover every entry, retain limitations and escape labels", () => {
  const entries = buildEntries(catalog), html = renderHtml(catalog, entries), markdown = renderMarkdown(catalog, entries);
  assert.equal((html.match(/<tr id="gear-/g) ?? []).length, entries.length);
  for (const entry of entries) assert.ok(markdown.includes(`\`${entry.itemName}\``), entry.itemName);
  assert.match(html, /supplied RAW mod file is 2\.0\.2/);
  assert.match(html, /not a complete menu inventory/);
  assert.match(html, /Facepaint and tattoos use separate pools/);
  assert.ok(!/<script[^>]*src=|<link[^>]*href=|<img\b/i.test(html));
  const malicious = { ...entries[0], name: '<img src=x onerror="alert(1)">' };
  const escaped = renderHtml(catalog, [malicious]);
  assert.ok(escaped.includes("&lt;img src=x"));
  assert.ok(!escaped.includes('<img src=x'));
});

test("readable projection rejects conflicting source labels rather than guessing provenance", () => {
  const conflicting = structuredClone(catalog);
  conflicting.items.find(entry => entry.itemName === "GuardianCap_RawNikeSkullCap").origin = "unlocked";
  assert.throws(() => buildEntries(conflicting), /Conflicting provenance/);
});
