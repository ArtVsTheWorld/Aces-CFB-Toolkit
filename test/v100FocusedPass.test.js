import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { tools } from "../src/shared/toolRegistry.js";
import { userControlledTeams } from "../src/main/tools/jersey/shared.js";
import { ARCHETYPE_WEIGHTS, PHYSICAL_RATING_FIELDS } from "../src/main/tools/teamBoost/ratingWeights.js";

const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../src/renderer/index.html", import.meta.url), "utf8");
const formula = JSON.parse(fs.readFileSync(new URL("../docs/reference/CFB27_OVR_Formulas.json", import.meta.url), "utf8"));

test("focused-pass navigation, copy, and removed controls are wired", () => {
  assert.equal(tools.some(tool => tool.id === "white-helmet-fix"), false);
  assert.equal(tools.find(tool => tool.id === "automatic-force-win").name, "Smart Force Win");
  assert.equal(tools.find(tool => tool.id === "commentary-id").version, "2.0");
  assert.match(index, /Help \/ Instructions/); assert.match(renderer, /function helpPage/); assert.match(renderer, /open source/);
  assert.doesNotMatch(renderer, /id="(?:equipment-seed|force-seed|db-seed|map-path)"/);
  assert.match(renderer, /collapseEquipmentScope/); assert.match(renderer, /window\.cfbToolkit\.chooseSave\(\)/);
  assert.match(renderer, /forceScheduleTable/); assert.match(renderer, /force-affected/); assert.match(renderer, /Teams to skip/);
});

test("Jersey user-team discovery follows valid FranchiseUser player references and rejects Team 255", () => {
  const tableId = 123, ref = row => tableId.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
  const teams = { records: [{ TeamIndex: 255, UserCharacter: "00000000000000000000000000000001" }, { TeamIndex: 7, UserCharacter: "00000000000000000000000000000000" }] };
  const players = { header: { tableId }, records: [{ TeamIndex: 255 }, { TeamIndex: 7 }] };
  const users = { records: [{ UserEntity: ref(0) }, { UserEntity: ref(1) }] };
  assert.deepEqual([...userControlledTeams(teams, users, players)], [7]);
});

test("every supplied OVR formula exactly matches its embedded Team Boost weights", () => {
  for (const item of formula.formulas) assert.deepEqual(ARCHETYPE_WEIGHTS[`${item.position}|${item.playerType}`], item.originalScale.weights);
  assert.equal(PHYSICAL_RATING_FIELDS.has("KickPowerRating"), true);
  assert.equal(formula.formulas.some(item => /LS_(?:Accurate|Power)/.test(item.playerType)), false);
});
