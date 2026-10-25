import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
const stateDefinition = source.match(/^const state = .*;$/m)?.[0];
const chooseActiveSaveDefinition = source.slice(source.indexOf("async function chooseActiveSave()"),source.indexOf("function saveLoadingPage()"));

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
  let rendered = false;const revoked=[];
  const context = vm.createContext({
    Map, Set,URL:{revokeObjectURL:value=>revoked.push(value)},
    window: { cfbToolkit: { chooseSave: async () => selected.path, setActiveSave: async () => selected } },
    captureToolSettings: () => {},
    discardReviewAllowed: () => true,
    saveSpecificSetting: () => false,
    updateActiveSave: () => {},
    refreshHistory: async () => {},
    refreshHomeContext: async () => {},
    render: () => { rendered = true; },
    toast: () => {},
    showError: error => { throw error; }
  });
  vm.runInContext(`${stateDefinition}\nlet historyOpenRequest=0,savePickerOpen=false;\n${source.match(/^function releaseSavedReviewArtwork\(\).*$/m)[0]}\n${chooseActiveSaveDefinition}`, context);
  vm.runInContext('state.equipmentPreviews.set("equipment-patcher", { planId: "old" }); state.prepared.set("old", {});state.savedReview={artworkUrls:new Set(["blob:old"])};', context);
  await vm.runInContext("chooseActiveSave()", context);
  const state = vm.runInContext("state", context);
  assert.equal(state.activeSave.path, selected.path);
  assert.equal(state.equipmentPreviews.size, 0);
  assert.equal(state.prepared.size, 0);
  assert.equal(rendered, true);assert.deepEqual(revoked,["blob:old"]);assert.equal(state.savedReview,null);
});

function selectionFixture(api){
  const frames=[],errors=[],context=vm.createContext({Map,Set,URL:{revokeObjectURL:()=>{}},window:{cfbToolkit:api},captureToolSettings:()=>{},discardReviewAllowed:()=>true,saveSpecificSetting:()=>false,updateActiveSave:()=>{},refreshHistory:async()=>{},refreshHomeContext:async()=>{},render:()=>{frames.push(vm.runInContext('state.saveLoading',context));},toast:()=>{},readableError:e=>e,showError:e=>errors.push(e.message)});
  vm.runInContext(`${stateDefinition}\nlet historyOpenRequest=0,savePickerOpen=false;\n${source.match(/^function releaseSavedReviewArtwork\(\).*$/m)[0]}\n${chooseActiveSaveDefinition}`,context);
  return {context,frames,errors,run:()=>vm.runInContext('chooseActiveSave()',context),state:()=>vm.runInContext('state',context)};
}

test('save selection presents loading before awaiting metadata and prevents duplicate selection',async()=>{
  let release,reads=0;const f=selectionFixture({chooseSave:async()=>'/new-save',setActiveSave:()=>{reads++;return new Promise(resolve=>release=resolve);}});
  const pending=f.run();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(f.frames,[true]);assert.equal(f.state().saveLoading,true);
  await f.run();assert.equal(reads,1);release({path:'/new-save'});await pending;assert.deepEqual(f.frames,[true,false]);assert.equal(f.state().saveLoading,false);
});

test('cancel leaves the current screen intact and failed loading removes the loading state',async()=>{
  const cancel=selectionFixture({chooseSave:async()=>null});await cancel.run();assert.deepEqual(cancel.frames,[]);assert.equal(cancel.state().saveLoading,false);
  const failure=selectionFixture({chooseSave:async()=>'/bad-save',setActiveSave:async()=>{throw Error('File unavailable');}});await failure.run();assert.deepEqual(failure.frames,[true,false]);assert.deepEqual(failure.errors,['File unavailable']);assert.equal(failure.state().saveLoading,false);
});
