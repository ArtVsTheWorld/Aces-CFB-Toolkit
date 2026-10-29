import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ReportService } from '../src/main/services/reports.js';
import { parseCsv } from '../src/main/services/reportAudit.js';
import { runEquipmentPatcher } from '../src/main/tools/equipment/runner.js';
import { loadEquipmentTables, buildRosterPlayerRows, snapshotVisualRawData } from '../src/main/tools/equipment/shared.js';
import { sf, parseRef } from '../src/main/tools/equipment/openSave.js';
import { CUTOFF_PANTS, cutoffPantsConflict } from '../src/main/tools/equipment/core/uniformCompatibility.js';
import { enforceEquipmentCompatibility } from '../src/main/tools/equipment/core/compatibility.js';
import { takePlan } from '../src/main/tools/jersey/planStore.js';

test('default Patcher cutoff frequency produces a small-roster Preview and applies exactly',{timeout:120000},async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-default-cutoff-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const source=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schemaPath=path.resolve('resources/engine-data/C27_486_6.gz'),savePath=path.join(directory,'DYNASTY-DEFAULT-CUTOFF'),hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 fs.copyFileSync(source,savePath);const original=hash(source),before=await loadEquipmentTables(savePath,schemaPath),old=snapshotVisualRawData(before.visuals.records),reports=new ReportService(path.join(directory,'reports'));
 const preview=await runEquipmentPatcher({savePath,schemaPath,reports,mode:'preview',options:{cutoffPantsFix:true,includedTeams:['LSU'],positions:['WR'],protectOriginalEaPlayers:false}}),plan=takePlan(preview.planId);
 assert.equal(hash(savePath),original);assert.ok(preview.details.totalPreviewRows>0);assert.ok(plan.assignments.length>0);const population=preview.details.uniformPopulation.find(p=>p.group==='WR');assert.ok(population.total<20);assert.equal(population.cutoffCap,10);assert.equal(population.cutoffTarget,Math.ceil(population.total*.1));assert.ok(population.cutoffAfter>0&&population.cutoffAfter<=population.cutoffTarget);
 const expected=new Map(plan.assignments.map(c=>[c.row,c.newValue])),applied=await runEquipmentPatcher({savePath,schemaPath,reports,mode:'apply',options:{planId:preview.planId}}),after=await loadEquipmentTables(savePath,schemaPath);assert.equal(hash(applied.backupPath),original);
 for(const[row,raw]of old)if(typeof raw==='string')assert.equal(sf(after.visuals.records[row],'RawData'),expected.get(row)??raw);
 for(const raw of expected.values())for(const outfit of JSON.parse(raw).loadouts.filter(l=>l.loadoutType==='PlayerOnField'))if(outfit.loadoutElements.some(e=>e.slotType==='OuterPants'&&e.itemAssetName===CUTOFF_PANTS))assert.equal(cutoffPantsConflict(outfit.loadoutElements),null);
 assert.equal(hash(source),original);assert.equal(fs.statSync(savePath).size,fs.statSync(source).size);
});

const fixture = path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'), schemaPath = path.resolve('resources/engine-data/C27_486_6.gz');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const set = (elements, slotType, itemAssetName) => { const element = elements.find(e => e.slotType === slotType); if (element) element.itemAssetName = itemAssetName; else elements.push({ slotType, itemAssetName }); };
test('cutoff outfit adjustments survive positive Preview/Apply/reopen with a byte-exact backup and complete gear audit', { timeout: 120000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfb-cutoff-outfit-')); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const savePath = path.join(directory, 'DYNASTY-CUTOFF-TEST'), reports = new ReportService(path.join(directory, 'reports')), fixtureHash = hash(fixture); fs.copyFileSync(fixture, savePath);
  const seed = await loadEquipmentTables(savePath, schemaPath), roster = buildRosterPlayerRows(seed.players, seed.teams, seed.rosters), references = new Map();
  for (const player of seed.players.records.filter(p => !p.isEmpty)) { const ref = parseRef(sf(player, 'CharacterVisuals')); if (ref?.tableId === seed.visuals.header.tableId) references.set(ref.row, (references.get(ref.row) ?? 0) + 1); }
  const targets = []; let teamIndex;
  for (const row of roster) {
    const player = seed.players.records[row], ref = parseRef(sf(player, 'CharacterVisuals'));
    if (sf(player, 'Position') !== 'WR' || ref?.tableId !== seed.visuals.header.tableId || references.get(ref.row) !== 1 || teamIndex !== undefined && sf(player, 'TeamIndex') !== teamIndex) continue;
    const visual = seed.visuals.records[ref.row]; let parsed; try { parsed = JSON.parse(sf(visual, 'RawData')); } catch { continue; }
    const fields = parsed.loadouts?.filter(l => l.loadoutType === 'PlayerOnField' && Array.isArray(l.loadoutElements)); if (!fields?.length) continue;
    teamIndex ??= sf(player, 'TeamIndex'); const index = targets.length;
    for (const field of fields) {
      set(field.loadoutElements, 'OuterShirt', index === 1 ? 'Gear_JerseyStyle_SleeveTight' : 'Gear_Low_TuckedUndershirt');
      set(field.loadoutElements, 'InnerShirt', index === 1 ? 'G_CompressionT_Crew_ShortSleeve_99Club_B_WHI' : 'Undershirt_None');
      set(field.loadoutElements, 'InnerPants', index === 2 ? 'GearLegsBase_LeftSleeve_White' : 'BottomBase_None');
      set(field.loadoutElements, 'OuterPants', 'GearPants_AboveKnee');
    }
    visual.RawData = JSON.stringify(parsed); targets.push({ row, visual: ref.row }); if (targets.length === 3) break;
  }
  assert.equal(targets.length, 3); await seed.franchise.save(); const original = hash(savePath), before = await loadEquipmentTables(savePath, schemaPath), oldRaw = snapshotVisualRawData(before.visuals.records);
  const team = seed.teams.records.find(team => !team.isEmpty && sf(team, 'TeamIndex') === teamIndex); assert.ok(team);
  const preview = await runEquipmentPatcher({ savePath, schemaPath, reports, mode: 'preview', options: { includedTeams: [sf(team, 'DisplayName')], positions: ['WR'], protectOriginalEaPlayers: false, cutoffPantsFix: true, fillFrequencies: { cutoffPants: true }, cutoffPantsCaps: { WR: 100 } } });
  assert.equal(hash(savePath), original); assert.equal(preview.details.adjustOutfitForCutoff, true); assert.ok(preview.details.totalPreviewRows > 0);
  assert.ok(preview.details.changes.some(row => row.row === targets[0].row && row.changes.some(change => change.proposedValue.includes('Sleeveless'))));
  const plan = takePlan(preview.planId); assert.ok(plan.assignments.some(change => change.row === targets[0].visual)); assert.ok(plan.assignments.some(change => change.row === targets[1].visual));
  const applied = await runEquipmentPatcher({ savePath, schemaPath, reports, mode: 'apply', options: { planId: preview.planId } });
  assert.equal(hash(applied.backupPath), original); const reopened = await loadEquipmentTables(savePath, schemaPath), expected = new Map(plan.assignments.map(change => [change.row, change.newValue]));
  for (const [row, raw] of oldRaw) if (typeof raw === 'string') assert.equal(sf(reopened.visuals.records[row], 'RawData'), expected.get(row) ?? raw);
  for (const [index, target] of targets.entries()) {
    const actual = sf(reopened.visuals.records[target.visual], 'RawData'); if (index === 2) { assert.equal(actual, oldRaw.get(target.visual)); continue; }
    for (const field of JSON.parse(actual).loadouts.filter(l => l.loadoutType === 'PlayerOnField')) {
      assert.equal(field.loadoutElements.find(e => e.slotType === 'OuterPants')?.itemAssetName, CUTOFF_PANTS);
      assert.equal(cutoffPantsConflict(field.loadoutElements), null); assert.deepEqual(enforceEquipmentCompatibility(structuredClone(field.loadoutElements)), []);
    }
    const strip = raw => { const parsed = JSON.parse(raw); for (const field of parsed.loadouts) if(Array.isArray(field.loadoutElements))field.loadoutElements = field.loadoutElements.filter(e => !/(?:^|_)None$/i.test(e.itemAssetName) && (field.loadoutType !== 'PlayerOnField' || !['OuterShirt', 'InnerShirt', 'OuterPants'].includes(e.slotType))); return parsed; };
    assert.deepEqual(strip(actual), strip(oldRaw.get(target.visual)));
  }
  const [headers, ...rows] = parseCsv(fs.readFileSync(applied.reportPath, 'utf8')), records = rows.map(row => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
  const resolved = JSON.parse(records[0].ResolvedOptionsJSON); assert.equal(resolved.adjustOutfitForCutoff, true);
  assert.ok(records.some(record => record.ChangeType.includes('Cutoff Pants') && record.NewGearItem.includes('Undershirt')));
  assert.equal(hash(fixture), fixtureHash);
});
