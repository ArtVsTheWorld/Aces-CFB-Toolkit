import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { CUSTOM_MODEL_FIELDS, normalizeCustomModel } from "../src/main/tools/forceWin/core/customModel.js";
import { customModelPresets } from "../src/main/tools/forceWin/core/modelProfiles.js";
import { SettingsStore } from "../src/main/services/settings.js";
import { saveCustomMatchupModel } from "../src/main/services/customMatchupModel.js";
import { RAW_ACCESSORIES_POOLS, UNLOCKED_POOLS, equipmentItem, recolorEquipmentItem } from "../src/main/tools/equipment/catalog.js";

test("every model field has concise two-direction help and valid presets are unchanged", () => {
  assert.equal(CUSTOM_MODEL_FIELDS.length, 71);
  for (const field of CUSTOM_MODEL_FIELDS) {
    assert.match(field.description, /[Ii]ncrease/); assert.match(field.description, /decrease/);
    assert.ok(field.description.split(/\s+/).length <= 65, field.path);
  }
  for (const preset of Object.values(customModelPresets())) assert.deepEqual(normalizeCustomModel(preset), preset);
  const description = name => CUSTOM_MODEL_FIELDS.find(field => field.path === name).description;
  assert.match(description("bettingLines.moneylineSpreadScale"), /Increase.*closer to 50\/50/);
  assert.match(description("coaching.continuity.neutralSeasons"), /Increase to delay/);
  assert.match(description("probabilityCurve.0.probability"), /Does not set moneyline/);
  assert.match(description("disparityLevels.2.min"), /category labels, not the score/);
});

test("custom model is personal, survives restart and leaves unrelated preferences intact", t => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),"cfb-custom-model-"));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const file=path.join(directory,"settings.json"),store=new SettingsStore(file),model=customModelPresets().balanced;
  store.update({accentColor:"#123456",teamArtwork:{example:{logo:"personal.png"}},toolPresets:[{name:"Keep"}]});
  model.maxForceWinsPerWeek=4;model.values["homeField.home"]=2;
  const saved=saveCustomMatchupModel(store,model);model.values["homeField.home"]=3;
  const reopened=new SettingsStore(file);reopened.load();
  assert.equal(reopened.get().customMatchupModel.values["homeField.home"],2);
  assert.equal(reopened.get().customMatchupModel.maxForceWinsPerWeek,4);
  assert.deepEqual(reopened.get(),saved);assert.equal(saved.accentColor,"#123456");
  assert.deepEqual(saved.teamArtwork,{example:{logo:"personal.png"}});assert.deepEqual(saved.toolPresets,[{name:"Keep"}]);
});

test("invalid model and failed persistence do not change saved/in-memory preferences", t => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),"cfb-model-invalid-"));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const file=path.join(directory,"settings.json"),store=new SettingsStore(file),model=customModelPresets().balanced;
  saveCustomMatchupModel(store,model);const before=fs.readFileSync(file,"utf8");
  assert.throws(()=>saveCustomMatchupModel(store,null),/Choose and save/);
  model.values["homeField.home"]=99;assert.throws(()=>saveCustomMatchupModel(store,model),/Home-Field/);
  assert.equal(fs.readFileSync(file,"utf8"),before);
  const blocked=new SettingsStore(path.join(directory,"blocked"));fs.mkdirSync(blocked.filePath);
  assert.throws(()=>saveCustomMatchupModel(blocked,customModelPresets().balanced));
  assert.equal(blocked.get().customMatchupModel,null);
});

test("facemask display removes only the selected family prefix without dropping style details", () => {
  const ui={};vm.createContext(ui);vm.runInContext(fs.readFileSync("src/renderer/helmets.js","utf8"),ui);
  assert.equal(ui.facemaskChoiceLabel("SpeedFlex Robot Jagged 808 HD","Riddell SpeedFlex"),"Robot Jagged 808 HD");
  assert.equal(ui.facemaskChoiceLabel("Axiom 2 Bar Double Straight","Riddell Axiom"),"2 Bar Double Straight");
  assert.equal(ui.facemaskChoiceLabel("F7 Pro Robot","Schutt F7 Pro"),"Robot");
  assert.equal(ui.facemaskChoiceLabel("Robot Spyder","Riddell SpeedFlex"),"Robot Spyder");
  assert.equal(ui.facemaskChoiceLabel("SpeedFlex","Riddell SpeedFlex"),"SpeedFlex");
});

test("verified white and black Nike/Battle skullcaps are RAW-only GuardianCap items", () => {
  const names=["GuardianCap_RawBattleSkullCap","GuardianCap_RawNikeSkullCap","GuardianCap_RawBattleSkullCapWhiteV87","GuardianCap_RawNikeSkullCapWhiteV87"];
  for(const name of names){const item=equipmentItem(name);assert.equal(item.origin,"raw");assert.deepEqual(item.slots,["GuardianCap"]);assert.equal(item.semantic.poolEligible,true);assert.match(item.displayName,/^(White|Black) (Nike|Battle) Skullcap$/);assert.ok(RAW_ACCESSORIES_POOLS.skullcaps.some(item=>item.itemName===name));assert.ok(!Object.values(UNLOCKED_POOLS).flat().some(item=>item.itemName===name));}
  for(const brand of ["Nike","Battle"]){const black=`GuardianCap_Raw${brand}SkullCap`,white=`${black}WhiteV87`;assert.equal(recolorEquipmentItem(black,"white"),white);assert.equal(recolorEquipmentItem(white,"black"),black);assert.equal(recolorEquipmentItem(white,"primary"),white,"Do not invent absent primary variant");}
});
