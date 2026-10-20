import test from "node:test";
import assert from "node:assert/strict";
import { createCommentaryMatcher } from "../src/main/tools/commentary/matcher.js";
import { patchPlayerCommentary } from "../src/main/tools/commentary/patcher.js";
import { applyUnlockedTattooPlan } from "../src/main/tools/equipment/core/tattoos.js";
import { tools } from "../src/shared/toolRegistry.js";

test("hyphenated surnames prefer complete matches, then the final exact component before first-name fallback", () => {
  const names = new Map([["Johnson", 1], ["Prince", 2], ["Josh-Johnson", 3]]);
  const exact = createCommentaryMatcher(names);
  assert.equal(exact("Prince", "Josh-Johnson").id, 3);
  assert.equal(exact("Prince", "Josh-Johnson IV").id, 3);
  names.delete("Josh-Johnson");
  const fallback = createCommentaryMatcher(names);
  for (const surname of ["Josh-Johnson", "Josh-Johnson Jr.", "Josh–Johnson IV", "Smith-Josh-Johnson"]) {
    assert.equal(fallback("Prince", surname).id, 1);
    assert.equal(fallback("Prince", surname).method, "hyphen");
    assert.equal(fallback("Prince", surname).source, "last");
  }
  assert.equal(fallback("Prince", "Josh-Unknown").id, 2);
  assert.equal(fallback("Other-Prince", "Unknown").id, 0, "first names are not split");
});

test("leg tattoos preserve every sock style and do not add a missing sock entry", () => {
  for (const socks of [undefined, "Gear_Socks_Low", "Gear_Socks_Mid", "Gear_Socks_High", "Socks_CrewCut", "Socks_High", "CustomSock"]) {
    const elements = socks === undefined ? [] : [{ slotType: "InnerSocks", itemAssetName: socks, metadata: "keep" }];
    const parsed = { loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: elements }] };
    const before = structuredClone(elements);
    const change = applyUnlockedTattooPlan(parsed, { kind: "leg", arms: {}, legs: { asset: "LegTattoo_Four", label: "Custom leg design 4" } });
    assert.deepEqual(elements.filter(item => item.slotType === "InnerSocks"), before);
    assert.ok(change);
    assert.ok(!change.newItem.includes("low socks"));
  }
});

test("hyphen matches apply the commentary ID and retain a finite audit counter", () => {
  const players = [{ TeamIndex: 1, FirstName: "Prince", LastName: "Josh-Johnson", IsNIL: false, PLYR_COMMENT: 0 }];
  const result = patchPlayerCommentary(players, new Map([["Johnson", 123]]), { apply: true, teamNames: new Map([[1, "Example"]]) });
  assert.equal(players[0].PLYR_COMMENT, 123);
  assert.equal(result.summary.hyphen, 1);
  assert.equal(result.changes[0].match.name, "Johnson");
  assert.equal(result.changes[0].match.method, "hyphen");
});

test("requested tool versions increment independently of the app version", () => {
  for (const [id, version] of [["freshman-equipment", "5.6"], ["equipment-patcher", "6.0"], ["commentary-id", "2.1"]]) assert.equal(tools.find(tool => tool.id === id).version, undefined);
});
