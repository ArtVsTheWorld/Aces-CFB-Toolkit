import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { normalizeTeamAccessoryColors, teamAccessoryWeights, defaultTeamTapeWeights, defaultTeamAccessoryWeights } from "../src/main/tools/equipment/core/recolor.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { validatePresetConfiguration } from "../src/main/services/toolPresets.js";
import { tools } from "../src/shared/toolRegistry.js";
import { quickstartSettings } from "../src/main/tools/equipmentQuickstart/runner.js";

const colors = color => Object.fromEntries(["white", "black", "primary", "secondary"].map(name=>[name,name===color?100:0]));
const ref = row => (10).toString(2).padStart(15,"0")+row.toString(2).padStart(17,"0");
const player = (row,team=1) => ({isEmpty:false,FirstName:"Player",LastName:String(row),Position:"WR",SchoolYear:"Junior",TeamIndex:team,IsNIL:false,CharacterVisuals:ref(row)});
const elements = () => [
  {slotType:"LeftArmWear",itemAssetName:"GearArmSleeve_Baggy_SecondaryColor"},
  {slotType:"RightArmWear",itemAssetName:"GearArmSleeve_Quarter_armTape_normal_TeamColor"},
  {slotType:"LeftSpat",itemAssetName:"GearSpats_spatThin_TeamColor"},
  {slotType:"LeftWristWear",itemAssetName:"GearWrist_wristTapedLite_TeamColor"},
  {slotType:"MouthWear",itemAssetName:"GearMouthpiece_PacifierDualHanging_Black"}
];
const visual=()=>({isEmpty:false,RawData:JSON.stringify({keep:true,loadouts:[{loadoutType:"PlayerOnField",loadoutElements:elements()},{loadoutType:"Base",loadoutElements:[{slotType:"LeftArmTattoo",itemAssetName:"Keep"}]}]})});
const gear=(visual,slot)=>JSON.parse(visual.RawData).loadouts[0].loadoutElements.find(element=>element.slotType===slot)?.itemAssetName;

test("team accessory defaults retain other schools' tape defaults and unknown-team fallback",()=>{
  for(const team of ["Missouri","Michigan","Boston College","Miami","Florida State","Syracuse","Houston","Ohio State","Army","Kennesaw State","N. Illinois","East Point","Unknown"])
    assert.deepEqual(teamAccessoryWeights(team),defaultTeamTapeWeights(team),team);
  assert.deepEqual(teamAccessoryWeights("East Point"),{white:95,black:5,primary:0,secondary:0});
  const accessory=normalizeTeamAccessoryColors({ALABAMA:colors("primary")});
  assert.deepEqual(teamAccessoryWeights("Alabama",accessory),colors("primary"));assert.deepEqual(defaultTeamTapeWeights("Alabama"),colors("black"),"accessory override never changes tape defaults");
});
test('Patcher and Quickstart default to each team’s accessory distribution with matching tape',()=>{
  const patcher=normalizeEquipmentOptions({unlockedRecolorFix:true},false),quickstart=quickstartSettings({unlocked:true}).patcher;
  for(const settings of [patcher,quickstart]){
    assert.equal(settings.unlockedColorTheme,'team');assert.equal(settings.tapeColorMode,'accessory');
    assert.deepEqual(teamAccessoryWeights('Alabama',settings.teamAccessoryColors),defaultTeamAccessoryWeights('Alabama'));
  }
  const visuals=[visual()],result=applyGlobalEquipmentFixes([player(0)],visuals,10,{unlockedRecolorFix:true,teamNames:new Map([[1,'Missouri']])});
  assert.ok(result.unlockedRecolorChanges.length);assert.equal(result.unlockedRecolorChanges[0].colorTheme,'black');assert.equal(result.unlockedRecolorChanges[0].tapeColor,'black');
  assert.equal(normalizeEquipmentOptions({unlockedRecolorFix:true,unlockedColorTheme:'weighted'},false).unlockedColorTheme,'weighted','explicit saved choices remain available');
});
test("team accessories validate whole percentages and normalize portable team keys",()=>{
  assert.deepEqual(normalizeTeamAccessoryColors({"  Michigan ":colors("primary")}).michigan,colors("primary"));
  for(const mix of [{white:40,black:20,primary:10,secondary:0},{white:99.5,black:.5,primary:0,secondary:0},{white:100,black:0,primary:0,secondary:null},null,[]])assert.throws(()=>normalizeTeamAccessoryColors({LSU:mix}),/Accessory color/);
  const options=normalizeEquipmentOptions({unlockedRecolorFix:true,unlockedColorTheme:"team",teamAccessoryColors:{Alabama:colors("white")}},false);
  assert.equal(options.unlockedColorTheme,"team");assert.deepEqual(options.teamAccessoryColors.alabama,colors("white"));
  assert.throws(()=>normalizeEquipmentOptions({unlockedRecolorFix:true,unlockedColorTheme:"team",teamAccessoryColors:{LSU:{}}},false),/Accessory color/);
  assert.doesNotThrow(()=>normalizeEquipmentOptions({unlockedRecolorFix:false,unlockedColorTheme:"team",teamAccessoryColors:{LSU:{}}},false),"disabled pass cannot block another pass with dormant color settings");
});
test("team accessory mode plus matching tape rolls once and applies the same theme to all tape categories",()=>{
  for(const theme of ["white","black","primary","secondary"]){
    const visuals=[visual()],before=JSON.parse(visuals[0].RawData);
    const result=applyGlobalEquipmentFixes([player(0)],visuals,10,{unlockedRecolorFix:true,unlockedColorTheme:"team",teamAccessoryColors:normalizeTeamAccessoryColors({"East Point":colors(theme)}),teamTapeColors:{"east point":colors(theme==="white"?"black":"white")},tapeColorMode:"accessory",teamNames:new Map([[1,"East Point"]]),seed:201});
    const correction=result.unlockedRecolorChanges[0];assert.ok(correction);assert.equal(correction.colorTheme,theme);assert.equal(correction.tapeColor,theme);
    const token={white:"OffWhite",black:"Black",primary:"TeamColor",secondary:"SecondaryColor"}[theme];
    assert.equal(gear(visuals[0],"LeftSpat"),`GearSpats_spatThin_${theme==="white"?"White":token}`);
    assert.equal(gear(visuals[0],"RightArmWear"),theme==="black"?"GearArmSleeve_RawJamo_TeamColor":`GearArmSleeve_Quarter_armTape_normal_${token}`);
    assert.equal(gear(visuals[0],"MouthWear"),gear({RawData:JSON.stringify(before)},"MouthWear"));
    assert.deepEqual(JSON.parse(visuals[0].RawData).loadouts[1],before.loadouts[1]);
  }
});
test("independent tape distribution remains independent, while roster-owned team names win",()=>{
  const visuals=[visual(),visual()],records=[player(0),player(1)];
  const result=applyGlobalEquipmentFixes(records,visuals,10,{unlockedRecolorFix:true,unlockedColorTheme:"team",teamAccessoryColors:{alabama:colors("white"),michigan:colors("primary")},teamTapeColors:{alabama:colors("black"),michigan:colors("secondary")},tapeColorMode:"distribution",teamNames:new Map([[1,"Alabama"]]),recolorTeamNames:new Map([[0,"Alabama"],[1,"Michigan"]]),seed:201});
  assert.deepEqual(result.unlockedRecolorChanges.map(change=>[change.colorTheme,change.tapeColor]),[["white","black"],["primary","secondary"]]);
});
test("team color rolls are seeded per player, and NIL/shared/excluded protections remain enforced",()=>{
  const records=Array.from({length:60},(_,row)=>player(row)),a=records.map(visual),b=structuredClone(a),opts={unlockedRecolorFix:true,unlockedColorTheme:"team",tapeColorMode:"accessory",teamNames:new Map([[1,"East Point"]]),seed:701};
  const first=applyGlobalEquipmentFixes(records,a,10,opts);applyGlobalEquipmentFixes(records,b,10,opts);assert.deepEqual(a,b);assert.ok(first.unlockedRecolorChanges.every(change=>change.colorTheme===change.tapeColor));
  const protectedRows=[player(0),player(1),player(2),player(3)];protectedRows[1].CharacterVisuals=ref(0);Object.assign(protectedRows[1],{IsNIL:true,PLYR_ASSETNAME:'SmithJeremiah_8726'});Object.assign(protectedRows[2],{IsNIL:true,PLYR_ASSETNAME:'SmithJeremiah_8726'});
  const protectedVisuals=protectedRows.map(visual),before=structuredClone(protectedVisuals);
  applyGlobalEquipmentFixes(protectedRows,protectedVisuals,10,{...opts,eligiblePlayer:record=>record.LastName!=="3"});assert.deepEqual(protectedVisuals,before);
});
test("new preset property round-trips by team name, old presets remain valid, invalid maps are rejected",()=>{
  const old={version:1,values:{"fix-unlocked-recolor":true,"unlocked-color-theme":"weighted"},tapeColors:{Alabama:"black"}};assert.deepEqual(validatePresetConfiguration(old),old);
  const current={...old,accessoryColors:{alabama:colors("white"),michigan:colors("primary")}};assert.deepEqual(validatePresetConfiguration(JSON.parse(JSON.stringify(current))),current);
  assert.throws(()=>validatePresetConfiguration({...current,accessoryColors:{LSU:{white:10,black:0,primary:0,secondary:0}}}),/100/);
});
test("fresh Patcher pass defaults are off without changing other tools' checkbox defaults",()=>{
  const source=fs.readFileSync(new URL("../src/renderer/renderer.js",import.meta.url),"utf8"),line=source.split("\n").find(line=>line.startsWith("const ruleToggle ="));
  const render=vm.runInNewContext(line+";ruleToggle");
  for(const id of ["fix-helmet","fix-pants","fix-rolled","fix-socks","fix-sleeves","fix-nike","fix-visors","fix-clear-tattoos","fix-handwarmers"])assert.doesNotMatch(render(id,"Title","Description"),/\bchecked\b/);
  assert.match(render("jersey-retired","Title","Description"),/checked/);assert.doesNotMatch(source,/Requires the mod named by each option/);
  assert.equal(tools.find(tool=>tool.id==="freshman-equipment").version, undefined);assert.equal(tools.find(tool=>tool.id==="equipment-patcher").version, undefined);
});
