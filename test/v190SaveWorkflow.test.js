import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { ReportService } from "../src/main/services/reports.js";
import { parseCsv } from "../src/main/services/reportAudit.js";
import { runEquipmentPatcher } from "../src/main/tools/equipment/runner.js";
import { HELMET_MODELS, normalizeFacemaskPools } from "../src/main/tools/equipment/core/helmets.js";
import { loadEquipmentTables, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { takePlan } from "../src/main/tools/jersey/planStore.js";
import { runForceWin, TABLE_UIDS } from "../src/main/tools/forceWin/runner.js";
import { customModelPresets } from "../src/main/tools/forceWin/core/modelProfiles.js";
import { openCfb27Save, readTables } from "../src/main/services/save.js";
import { FORCE_WIN_SCHEMA } from "../src/main/tools/forceWin/core/schema.js";

const fixtureRoot = path.resolve("../EXAMPLE SAVES VANILLA GAME");
const schemaPath = path.resolve("resources/engine-data/C27_486_6.gz");
const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const mix = id => Object.fromEntries(HELMET_MODELS.map(model => [model.id, model.id === id ? 100 : 0]));
function copy(t, name) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),"cfb-v190-workflow-"));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const source=path.join(fixtureRoot,name),savePath=path.join(directory,"DYNASTY-TEST"),original=hash(source);
  fs.copyFileSync(source,savePath);
  return {source,savePath,original,reports:new ReportService(path.join(directory,"reports")),schemaPath};
}

test("grouped OL helmets, optional facemask, visor frequencies and custom shirts survive exact Preview/Apply/reopen", {timeout:120000}, async t=>{
  const context=copy(t,"DYNASTY-LSUTESTSAVEPRESZN"), pools=normalizeFacemaskPools({});
  pools.GearHelmet_Axiom=["GearFaceMask_Axiom2BarDoubleStraight"];
  const options={includedTeams:["LSU"],skipNilPlayers:false,helmetFix:true,helmetDistribution:{mode:"custom",global:mix("GearHelmet_Axiom"),positions:{OL:mix("GearHelmet_VicisZero2Trench")}},facemaskPools:pools,visorFix:true,visorFrequencies:{QB:100,TE:100,LB:100,OL:100},rolledJerseyFix:true,undershirtColor:"custom",undershirtWeights:{regular:{hoodie:0,secondary:0,primary:0,white:0,black:100,none:0},large:{hoodie:0,secondary:0,primary:0,white:100,black:0,none:0}}};
  const before=await loadEquipmentTables(context.savePath,schemaPath), originalRows=snapshotVisualRawData(before.visuals.records);
  const preview=await runEquipmentPatcher({...context,mode:"preview",options}),plan=takePlan(preview.planId);
  assert.ok(plan.assignments.length);assert.equal(hash(context.savePath),context.original);
  const applied=await runEquipmentPatcher({...context,mode:"apply",options:{planId:preview.planId}});
  assert.equal(hash(applied.backupPath),context.original);
  const reopened=await loadEquipmentTables(context.savePath,schemaPath),rows=snapshotVisualRawData(reopened.visuals.records),expected=new Map(plan.assignments.map(change=>[change.row,change.newValue]));
  for(const [row,raw]of originalRows)if(typeof raw==="string")assert.deepEqual(JSON.parse(rows.get(row)),JSON.parse(expected.get(row)??raw),"Exact row "+row);
  assert.ok([...expected.values()].some(raw=>raw.includes("GearHelmet_VicisZero2Trench")),"OL override was actually applied");
  assert.ok([...expected.values()].some(raw=>raw.includes("GearFaceMask_Axiom2BarDoubleStraight")),"Optional mask was actually applied");
  const [headers,first,...rest]=parseCsv(fs.readFileSync(applied.reportPath,"utf8"));
  assert.deepEqual(JSON.parse(first[headers.indexOf("ResolvedOptionsJSON")]).facemaskPools,pools);
  assert.ok(rest.every(row=>row[headers.indexOf("ResolvedOptionsJSON")]===""),"Run-wide config is not duplicated");
  assert.equal(hash(context.source),context.original);assert.equal(fs.statSync(context.savePath).size,fs.statSync(context.source).size);
});

test("custom matchup sliders and weekly cap survive cached Preview/Apply with only approved ForceWin changes", {timeout:120000}, async t=>{
  const context=copy(t,"DYNASTY-LSUTESTSAVEWEEK0"),model=customModelPresets().balanced;
  model.values["homeField.home"]=2;model.maxForceWinsPerWeek=1;
  const options={modelProfile:"custom",customModel:model,involvement:"maximum",scope:"regular",seed:190,skippedTeamIds:[]};
  const preview=await runForceWin({...context,mode:"preview",options}),plan=takePlan(preview.planId);
  const repeated=await runForceWin({...context,mode:"preview",options});
  assert.deepEqual(takePlan(repeated.planId).assignments,plan.assignments);assert.ok(plan.assignments.length);
  assert.equal(hash(context.savePath),context.original);
  const before=await openCfb27Save(context.savePath,schemaPath),tables=await readTables(before.franchise,{game:TABLE_UIDS.seasonGame}),field=FORCE_WIN_SCHEMA.game.forceWin;
  const records=tables.game.records.map(record=>record&&!record.isEmpty?Object.fromEntries(record.fieldsArray.map(f=>[f.name,record[f.name]])):null);
  const applied=await runForceWin({...context,mode:"apply",options:{planId:preview.planId}});
  assert.equal(hash(applied.backupPath),context.original);
  const reopened=await openCfb27Save(context.savePath,schemaPath),after=await readTables(reopened.franchise,{game:TABLE_UIDS.seasonGame}),expected=new Map(plan.assignments.map(change=>[change.row,change.newValue]));
  for(const [row,record]of records.entries())if(record)for(const [key,value]of Object.entries(record))assert.equal(after.game.records[row][key],key===field?expected.get(row)??value:value,"Only planned ForceWin fields");
  const byWeek=new Map();for(const change of plan.assignments){const week=after.game.records[change.row][FORCE_WIN_SCHEMA.game.week];byWeek.set(week,(byWeek.get(week)??0)+1);}
  assert.ok([...byWeek.values()].every(count=>count<=1));
  assert.ok(fs.readFileSync(applied.reportPath,"utf8").includes("WeeklyLimitSuppressed"));
  assert.equal(hash(context.source),context.original);
});
