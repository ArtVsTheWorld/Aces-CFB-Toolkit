import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getCrossDonorPositions, patchFreshmanEquipment } from "../src/main/tools/equipment/core/patcher.js";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { tools } from "../src/shared/toolRegistry.js";

const ref=(table,row)=>table.toString(2).padStart(15,"0")+row.toString(2).padStart(17,"0");
const raw=marker=>JSON.stringify({loadouts:[{loadoutType:"PlayerOnField",loadoutElements:[{slotType:"HeadWear",itemAssetName:`Helmet_${marker}`},{slotType:"InnerSocks",itemAssetName:"Gear_Socks_Mid"},{slotType:"LeftSpat",itemAssetName:"Spat_None"},{slotType:"RightSpat",itemAssetName:"Spat_None"}]}]});
const player=(position,row,year="Freshman")=>({isEmpty:false,FirstName:`P${row}`,LastName:"Test",Position:position,SchoolYear:year,RedshirtStatus:"Eligible",CharacterBodyType:"Thin",CharacterVisuals:ref(10,row),IsNIL:false,TeamIndex:1,OverallRating:year==="Freshman"?70:90,JerseyNum:row});
const visual=marker=>({isEmpty:false,RawData:raw(marker)});

test("forced cross-position mixing uses cross donors for every defined recipient mapping",()=>{
  const mappings={WR:"CB",HB:"WR",TE:"MLB",LOLB:"TE",MLB:"FS",ROLB:"HB",LB:"SS",CB:"WR",FS:"LOLB",SS:"MLB",SAFETY:"LB"};
  assert.deepEqual(Object.keys(mappings),["WR","HB","TE","LOLB","MLB","ROLB","LB","CB","FS","SS","SAFETY"]);
  for(const [recipientPosition,donorPosition] of Object.entries(mappings)){
    assert.ok(getCrossDonorPositions(recipientPosition).includes(donorPosition));
    const players=[player(recipientPosition,0),player(donorPosition,1,"Senior")],visuals=[visual("TARGET"),visual("CROSS")];
    const result=patchFreshmanEquipment(players,visuals,10,{eligiblePlayer:r=>r===players[0],forceCrossPosition:true,top:1,seed:12,apply:true});
    assert.equal(result.changes.length,1,recipientPosition);assert.equal(result.changes[0].crossPositionMixed,true,recipientPosition);
    assert.ok(result.changes[0].donorUses.every(use=>getCrossDonorPositions(recipientPosition).includes(use.donor.position)),recipientPosition);
  }
});

test("forced cross-position mixing falls back normally when no valid cross donor exists",()=>{const players=[player("QB",0),player("QB",1,"Senior")],visuals=[visual("TARGET"),visual("QB")],result=patchFreshmanEquipment(players,visuals,10,{eligiblePlayer:r=>r===players[0],forceCrossPosition:true,top:1,mixedChance:0,crossMixedChance:0,seed:5,apply:true});assert.equal(result.changes.length,1);assert.equal(result.changes[0].crossPositionMixed,false);assert.equal(result.changes[0].donorUses[0].donor.position,"QB");});

test("mid-sock replacement preserves every stored OL position and retains non-OL behavior",()=>{for(const position of ["LT","LG","C","RG","RT"]){const players=[player(position,0,"Senior")],visuals=[visual(position)];applyGlobalEquipmentFixes(players,visuals,10,{sockFix:true,seed:1,teamNames:new Map([[1,"Test"]])});assert.match(visuals[0].RawData,/Gear_Socks_Mid/,position);}const players=[player("WR",0,"Senior")],visuals=[visual("WR")];applyGlobalEquipmentFixes(players,visuals,10,{sockFix:true,seed:1,teamNames:new Map([[1,"Test"]])});assert.doesNotMatch(visuals[0].RawData,/Gear_Socks_Mid/);});

test("session restoration is one-shot, run actions capture current settings, and multi-select counts expose semantics",()=>{const renderer=fs.readFileSync(new URL("../src/renderer/renderer.js",import.meta.url),"utf8");assert.match(renderer,/dataset\.sessionRestored===\"true\"/);assert.match(renderer,/equipment-preview.*commentary-apply/);assert.match(renderer,/captureToolSettings\(\)/);assert.match(renderer,/data-multi-label-for/);assert.match(renderer,/data-empty-meaning/);assert.match(renderer,/All selected/);assert.match(renderer,/0 selected — \$\{empty\}/);assert.match(renderer,/return checkboxPicker/);assert.match(renderer,/state\.toolSettings\.delete\(tool\.id\)/);});

test("Equipment Randomizer displays tool version 5.1",()=>{assert.equal(tools.find(tool=>tool.id==="freshman-equipment").version,"5.1");});
