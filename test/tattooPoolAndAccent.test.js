import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { UNLOCKED_TATTOO_POOL, DEFAULT_UNLOCKED_TATTOO_SELECTION, normalizeTattooSelection, rollUnlockedTattoo, buildUnlockedTattooPopulationPlan } from "../src/main/tools/equipment/core/tattoos.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { normalizeAccentColor } from "../src/main/services/settings.js";

const rng = () => { let seed = 123456; return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; };
const visual = covered => ({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: [{ slotType: "LeftArmWear", itemAssetName: covered ? "GearArmSleeve_Baggy_Black" : "LeftArm_None" }, { slotType: "RightArmWear", itemAssetName: covered ? "GearArmSleeve_Baggy_Black" : "RightArm_None" }] }] });
test("tattoo selection keeps the existing default pool while optional styles validate only when enabled", () => {
  assert.equal(UNLOCKED_TATTOO_POOL.length, 61); assert.equal(DEFAULT_UNLOCKED_TATTOO_SELECTION.length, 26);
  assert.ok(DEFAULT_UNLOCKED_TATTOO_SELECTION.every(value => !/Japanese|Polynesian/.test(value)));
  assert.deepEqual(normalizeTattooSelection(), [...DEFAULT_UNLOCKED_TATTOO_SELECTION]);
  assert.deepEqual(normalizeTattooSelection([]), []);
  assert.throws(() => normalizeEquipmentOptions({ unlockedTattooFix: true, unlockedTattooSelection: ["Japanese_Arm"] }, false), /available tattoo pool/);
  assert.doesNotThrow(() => normalizeEquipmentOptions({ unlockedTattooFix: false, unlockedTattooSelection: ["Japanese_Arm"] }, false));
});
test("arm-only, leg-only, and mixed selected tattoo pools never introduce deselected assets", () => {
  for (const selection of [["CujoMatty_ArmTats_35"], ["LegTattoo_Four"], ["CujoMatty_ArmTats_35", "LegTattoo_Four"]]) {
    const random = rng();
    for (let index = 0; index < 100; index++) {
      const plan = rollUnlockedTattoo(random, visual(false), selection);
      const assets = [...Object.values(plan.arms).map(item => item.asset), ...(plan.legs ? [plan.legs.asset] : [])];
      assert.ok(assets.length > 0 && assets.every(asset => selection.includes(asset)));
    }
  }
  assert.equal(rollUnlockedTattoo(rng(), visual(false), []), null);
  assert.ok(rollUnlockedTattoo(rng(), visual(true), ["CujoMatty_ArmTats_35"]));
});
test("default-selected tattoos reproduce the original seeded plan and selected pools respect the population cap", () => {
  const entries = Array.from({ length: 100 }, (_, visualsRow) => ({ visualsRow, rawData: JSON.stringify(visual(visualsRow % 2 === 0)) }));
  assert.deepEqual(buildUnlockedTattooPopulationPlan(entries, 33, rng()), buildUnlockedTattooPopulationPlan(entries, 33, rng(), normalizeTattooSelection()));
  const selected = buildUnlockedTattooPopulationPlan(entries, 33, rng(), ["CujoMatty_ArmTats_35"]);
  assert.equal(selected.plans.size, 33); assert.ok([...selected.plans.keys()].some(row => row % 2 === 0), 'Covered arms remain eligible');
  const empty = buildUnlockedTattooPopulationPlan(entries, 33, rng(), []); assert.equal(empty.plans.size, 0); assert.equal(empty.stats.eligiblePlayers, 100);
});
test("custom accent colors validate safely and produce readable light/dark palettes", () => {
  const context = vm.createContext({}); vm.runInContext(fs.readFileSync(new URL("../src/renderer/accent.js", import.meta.url), "utf8"), context);
  assert.equal(normalizeAccentColor("#Aa22FF"), "#aa22ff"); assert.equal(normalizeAccentColor(null), null);
  for (const value of [undefined, "red", "#fff", "#ffffff;bad", 123]) assert.throws(() => normalizeAccentColor(value), /valid app color/);
  for (const color of ["#ffffff", "#000000", "#ffff00", "#ff0000", "#002244", "#aa22ff"]) for (const dark of [false, true]) {
    const palette = context.accentPalette(color, dark), rgb = palette["--action"].match(/\d+/g).map(Number);
    assert.ok(context.accentContrast(rgb, dark ? [17, 24, 22] : [255, 255, 255]) >= 4.45);
    const ink = palette["--action-ink"] === "#ffffff" ? [255, 255, 255] : [16, 23, 29]; assert.ok(context.accentContrast(rgb, ink) >= 4.45);assert.ok(context.accentContrast(palette['--action-2'].match(/\d+/g).map(Number),ink)>=4.45);
  }
  assert.equal(context.accentPalette(null), null);
});

test('independent main colors tint all main surfaces while preserving readable text and accents',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../src/renderer/accent.js',import.meta.url),'utf8'),context);
 for(const dark of [false,true])for(const base of [null,'#ffffff','#000000','#ff0000','#00ff00','#0000ff','#aa22ff']){
  const main=context.mainPalette(base,dark),rgb=value=>value.match(/\d+/g).map(Number),ink=dark?[244,244,247]:[23,23,29],muted=dark?[197,197,207]:[73,73,84];
  for(const key of ['--surface','--surface-2','--surface-3']){assert.ok(context.accentContrast(ink,rgb(main[key]))>=7);assert.ok(context.accentContrast(muted,rgb(main[key]))>=4.5,base+' '+dark+' '+key);}
  const accent=context.accentPalette('#ff00ff',dark,base);assert.ok(context.accentContrast(rgb(accent['--action']),rgb(main['--surface-3']))>=4.45);
  if(base)assert.notEqual(main['--sidebar'],context.mainPalette(null,dark)['--sidebar']);
 }
});

test('light mode keeps every light surface neutral while main color tints only dark chrome',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../src/renderer/accent.js',import.meta.url),'utf8'),context);
 for(const color of ['#ff0000','#0000ff','#ffffff','#000000','#00ff00']){
  const plain=context.mainPalette(null,false),tinted=context.mainPalette(color,false);
  for(const key of ['--surface','--surface-2','--surface-3','--line','--ink','--subtle-ink'])assert.equal(tinted[key],plain[key]);
  assert.notEqual(tinted['--sidebar'],plain['--sidebar']);assert.notEqual(tinted['--sidebar-2'],plain['--sidebar-2']);
  assert.notEqual(context.mainPalette(color,true)['--surface'],context.mainPalette(null,true)['--surface']);
 }
});
