import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { ReportService } from "../src/main/services/reports.js";
import { parseCsv } from "../src/main/services/reportAudit.js";
import { runEquipmentPatcher, runFreshmanEquipment } from "../src/main/tools/equipment/runner.js";
import { loadEquipmentTables, buildRosterPlayerRows, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { sf, parseRef } from "../src/main/tools/equipment/openSave.js";
import { cutoffPantsConflict, CUTOFF_PANTS } from "../src/main/tools/equipment/core/uniformCompatibility.js";
import { takePlan } from "../src/main/tools/jersey/planStore.js";
import { modPoolDefinitions } from "../src/main/tools/equipment/core/modPools.js";

const fixture = path.resolve("../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN"), schemaPath = path.resolve("resources/engine-data/C27_486_6.gz");
const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const slot = (elements, name, asset) => { const found = elements.find(element=>element.slotType===name); if(found)found.itemAssetName=asset;else elements.push({slotType:name,itemAssetName:asset}); };
test("v20.1 exact uniform Preview/Apply/reopen preserves unrelated equipment, backs up, and audits caps", {timeout:120000}, async t => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),"cfb-v201-uniforms-")); t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const savePath=path.join(directory,"DYNASTY-UNIFORM-TEST"), reports=new ReportService(path.join(directory,"reports"));fs.copyFileSync(fixture,savePath);const sourceHash=hash(fixture);
  const seed=await loadEquipmentTables(savePath,schemaPath), roster=buildRosterPlayerRows(seed.players,seed.teams,seed.rosters), references=new Map();
  for(const player of seed.players.records.filter(player=>!player.isEmpty)){const ref=parseRef(sf(player,"CharacterVisuals"));if(ref?.tableId===seed.visuals.header.tableId)references.set(ref.row,(references.get(ref.row)??0)+1);}
  const targets=[];
  for(const row of roster){const player=seed.players.records[row],ref=parseRef(sf(player,"CharacterVisuals"));if(sf(player,"Position")!=="WR"||ref?.tableId!==seed.visuals.header.tableId||references.get(ref.row)!==1)continue;
    const visual=seed.visuals.records[ref.row];let parsed;try{parsed=JSON.parse(sf(visual,"RawData"));}catch{continue;}const outfits=parsed.loadouts?.filter(outfit=>outfit.loadoutType==="PlayerOnField"&&Array.isArray(outfit.loadoutElements));if(!outfits?.length)continue;
    const index=targets.length;for(const outfit of outfits){slot(outfit.loadoutElements,"OuterShirt",index===0?"Gear_Low_TuckedUndershirt":"Gear_JerseyStyle_RolledLow");slot(outfit.loadoutElements,"OuterPants",index===2?"GearPants_Standard":"GearPants_AboveKnee");slot(outfit.loadoutElements,"InnerPants",index===3?"GearLegsBase_LeftSleeve_White":"BottomBase_None");slot(outfit.loadoutElements,"InnerShirt","Gear_Undershirt_CompressionTCrewSleeveless");}
    visual.RawData=JSON.stringify(parsed);targets.push({row,ref:ref.row});if(targets.length===4)break;
  }
  assert.equal(targets.length,4);await seed.franchise.save();
  const original=hash(savePath),before=await loadEquipmentTables(savePath,schemaPath),rawBefore=snapshotVisualRawData(before.visuals.records);
  const scope=new Set(targets.map(target=>String(sf(before.players.records[target.row],"TeamIndex"))));
  const teams=before.teams.records.filter(team=>!team.isEmpty&&scope.has(String(sf(team,"TeamIndex")))).map(team=>String(sf(team,"DisplayName")));
  const caps=Object.fromEntries(["QB","HB","FB","WR","TE","OL","EDGE","DT","LB","CB","FS","SS","K/P"].map(group=>[group,100]));
  const preview=await runEquipmentPatcher({savePath,schemaPath,reports,mode:"preview",options:{includedTeams:teams,positions:["WR"],skipNilPlayers:false,lowerRolledJerseyFix:true,cutoffPantsFix:true,adjustOutfitForCutoff:false,lowerJerseyCaps:caps,cutoffPantsCaps:caps,replaceStandardWithCutoff:true}});
  assert.equal(hash(savePath),original);const plan=takePlan(preview.planId);assert.ok(plan.assignments.length>=3);
  const applied=await runEquipmentPatcher({savePath,schemaPath,reports,mode:"apply",options:{planId:preview.planId}});
  assert.equal(hash(applied.backupPath),original);assert.deepEqual(applied.details.changes,preview.details.changes);
  const reopened=await loadEquipmentTables(savePath,schemaPath),expected=new Map(plan.assignments.map(change=>[change.row,change.newValue]));
  for(const [row,raw] of rawBefore)if(typeof raw==="string")assert.equal(sf(reopened.visuals.records[row],"RawData"),expected.get(row)??raw,"Every equipment row matches exactly");
  for(const [index,target] of targets.entries()){
    const after=JSON.parse(sf(reopened.visuals.records[target.ref],"RawData")),prior=JSON.parse(rawBefore.get(target.ref));
    // The shared storage fitter omits empty None placeholders before writing.
    const strip=parsed=>{for(const outfit of parsed.loadouts)if(Array.isArray(outfit.loadoutElements))outfit.loadoutElements=outfit.loadoutElements.filter(element=>!/(?:^|_)None$/i.test(element.itemAssetName)&&(outfit.loadoutType!=="PlayerOnField"||!["OuterShirt","OuterPants"].includes(element.slotType)));return parsed;};
    assert.deepEqual(strip(structuredClone(after)),strip(prior),"Uniform-only run keeps all other appearance data");
    for(const outfit of after.loadouts.filter(outfit=>outfit.loadoutType==="PlayerOnField")){const pants=outfit.loadoutElements.find(element=>element.slotType==="OuterPants")?.itemAssetName;if([1,2].includes(index)){assert.equal(pants,CUTOFF_PANTS);assert.equal(cutoffPantsConflict(outfit.loadoutElements),null);}else assert.notEqual(pants,CUTOFF_PANTS);}
  }
  const [headings,...rows]=parseCsv(fs.readFileSync(applied.reportPath,"utf8")),records=rows.map(row=>Object.fromEntries(headings.map((key,index)=>[key,row[index]])));
  assert.ok(records.some(record=>record.ChangeType.includes("Lower Rolled Jersey")));assert.ok(records.some(record=>record.ChangeType.includes("Cutoff Pants")));
  assert.ok(JSON.parse(records[0].UniformPopulationAuditJSON).length);assert.equal(JSON.parse(records[0].ResolvedOptionsJSON).replaceStandardWithCutoff,true);
  assert.equal(hash(fixture),sourceHash,"Original fixture is untouched");
});

test("v20.1 newly sourced Unlocked cleat uses exact reviewed shoe fields and receiver branding", {timeout:120000}, async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),"cfb-v201-cleats-"));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const savePath=path.join(directory,"DYNASTY-CLEAT-TEST"),reports=new ReportService(path.join(directory,"reports"));fs.copyFileSync(fixture,savePath);const original=hash(savePath);
  const definitions=modPoolDefinitions().unlocked,settings=Object.fromEntries(definitions.map(category=>[category.id,{chance:0,items:[]}])) ,id="GearFootwear_shoe_low_NikeKobeVenom";
  settings.cleats={chance:100,items:[id]};
  const preview=await runFreshmanEquipment({savePath,schemaPath,reports,mode:"preview",options:{includedTeams:["LSU"],skipNilPlayers:false,usingUnlockedMod:true,modPools:{unlocked:settings}}});
  assert.equal(hash(savePath),original);assert.ok(preview.details.unlockedPlayersChanged>0);
  const applied=await runFreshmanEquipment({savePath,schemaPath,reports,mode:"apply",options:{planId:preview.planId}}),reopened=await loadEquipmentTables(savePath,schemaPath);
  assert.equal(hash(applied.backupPath),original);const [headings,...rows]=parseCsv(fs.readFileSync(applied.reportPath,"utf8"));let verified=0;
  for(const row of rows){const record=Object.fromEntries(headings.map((key,index)=>[key,row[index]]));assert.equal(sf(reopened.visuals.records[Number(record.CharacterVisualsRow)],"RawData"),record.AfterRawData);for(const outfit of JSON.parse(record.AfterRawData).loadouts.filter(outfit=>outfit.loadoutType==="PlayerOnField")){if(outfit.loadoutElements.some(element=>element.slotType==="LeftShoe"&&element.itemAssetName===id)){assert.equal(outfit.loadoutElements.find(element=>element.slotType==="RightShoe")?.itemAssetName,id);verified++;}}}
  assert.ok(verified>0);
});

test("v20.1 team accessory colors and both tape modes survive exact Preview/Apply/reopen", {timeout:120000}, async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),"cfb-v201-team-colors-"));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const sourceHash=hash(fixture),oneColor=color=>Object.fromEntries(["white","black","primary","secondary"].map(name=>[name,name===color?100:0]));
  for(const tapeColorMode of ["accessory","distribution"]){
    const savePath=path.join(directory,`DYNASTY-TEAM-COLORS-${tapeColorMode}`),reports=new ReportService(path.join(directory,`reports-${tapeColorMode}`));fs.copyFileSync(fixture,savePath);
    const original=hash(savePath),before=await loadEquipmentTables(savePath,schemaPath),rawBefore=snapshotVisualRawData(before.visuals.records);
    const preview=await runEquipmentPatcher({savePath,schemaPath,reports,mode:"preview",options:{includedTeams:["LSU"],skipNilPlayers:false,unlockedRecolorFix:true,unlockedColorTheme:"team",teamAccessoryColors:{LSU:oneColor("primary")},tapeColorMode,teamTapeColors:{LSU:oneColor("black")}}});
    assert.equal(hash(savePath),original,"Preview cannot modify the copy");assert.ok(preview.details.unlockedRecolorPlayersChanged>0);
    assert.deepEqual(preview.details.recolorSettings.teamAccessoryColors.lsu,oneColor("primary"));assert.equal(preview.details.recolorSettings.tapeColorMode,tapeColorMode);
    const plan=takePlan(preview.planId),expected=new Map(plan.assignments.map(change=>[change.row,change.newValue]));
    const applied=await runEquipmentPatcher({savePath,schemaPath,reports,mode:"apply",options:{planId:preview.planId}}),reopened=await loadEquipmentTables(savePath,schemaPath);
    assert.equal(hash(applied.backupPath),original);assert.deepEqual(applied.details.changes,preview.details.changes);
    for(const [row,raw] of rawBefore)if(typeof raw==="string")assert.equal(sf(reopened.visuals.records[row],"RawData"),expected.get(row)??raw,"Changed and unchanged rows match the validated plan");
    const [headings,...rows]=parseCsv(fs.readFileSync(applied.reportPath,"utf8")),records=rows.map(row=>Object.fromEntries(headings.map((key,index)=>[key,row[index]])));
    assert.ok(records.length>0);const resolved=JSON.parse(records[0].ResolvedOptionsJSON);assert.equal(resolved.unlockedColorTheme,"team");assert.equal(resolved.tapeColorMode,tapeColorMode);assert.deepEqual(resolved.teamAccessoryColors.lsu,oneColor("primary"));
    for(const record of records){assert.equal(record.Team,"LSU");assert.equal(record.AfterRawData,sf(reopened.visuals.records[Number(record.CharacterVisualsRow)],"RawData"));assert.ok(record.BeforeRawData);}
  }
  assert.equal(hash(fixture),sourceHash,"The original source save remains untouched");
});
