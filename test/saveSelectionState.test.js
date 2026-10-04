import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
const stateDefinition = source.match(/^const state = .*;$/m)?.[0];
const chooseActiveSaveDefinition = source.match(/^async function chooseActiveSave\(\) \{.*\}$/m)?.[0];

test("every renderer state collection used by a collection method is initialized", () => {
  assert.ok(stateDefinition);
  const context = vm.createContext({ Map, Set });
  vm.runInContext(stateDefinition, context);
  const state = vm.runInContext("state", context);
  for (const [, name, method] of source.matchAll(/state\.([A-Za-z]+)\.(clear|delete|get|set|has|add)\(/g)) {
    assert.equal(typeof state[name]?.[method], "function", `${name}.${method} must be initialized`);
  }
});

test("choosing an Active Save clears preview caches and completes without an undefined state error", async () => {
  assert.ok(chooseActiveSaveDefinition);
  const selected = { path: "C:/test/DYNASTY-SAVE", name: "DYNASTY-SAVE", exists: true, schema: { supported: true } };
  let rendered = false;
  const context = vm.createContext({
    Map, Set,
    window: { cfbToolkit: { chooseSave: async () => selected.path, setActiveSave: async () => selected } },
    discardReviewAllowed: () => true,
    saveSpecificSetting: () => false,
    updateActiveSave: () => {},
    refreshHistory: async () => {},
    refreshHomeContext: async () => {},
    render: () => { rendered = true; },
    toast: () => {},
    showError: error => { throw error; }
  });
  vm.runInContext(`${stateDefinition}\n${chooseActiveSaveDefinition}`, context);
  vm.runInContext('state.equipmentPreviews.set("equipment-patcher", { planId: "old" }); state.prepared.set("old", {});', context);
  await vm.runInContext("chooseActiveSave()", context);
  const state = vm.runInContext("state", context);
  assert.equal(state.activeSave.path, selected.path);
  assert.equal(state.equipmentPreviews.size, 0);
  assert.equal(state.prepared.size, 0);
  assert.equal(rendered, true);
});
