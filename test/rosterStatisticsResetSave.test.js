// Private EXAMPLE SAVES regression. Only the owned temporary copy is modified.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {runRosterGenerator} from '../src/main/tools/rosterGenerator/runner.js';
import {takePlan,saveFingerprint} from '../src/main/tools/jersey/planStore.js';
import {openCfb27Save} from '../src/main/services/save.js';
import {ReportService} from '../src/main/services/reports.js';
import {parseCsv} from '../src/main/services/reportAudit.js';
const source='D:/Downloads/DYNASTY-OFFICALDYNASTY-5YR',schemaPath=path.resolve('resources/engine-data/C27_486_6.gz');
test('regenerated dynasty players start with zero season/career counters while all other stat bytes survive',{skip:!fs.existsSync(source),timeout:180000},async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'roster-stats-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const savePath=path.join(root,'DYNASTY-TEST'),originalHash=saveFingerprint(source);fs.copyFileSync(source,savePath);
 const context={savePath,schemaPath,reports:new ReportService(path.join(root,'reports'))},preview=await runRosterGenerator({...context,mode:'preview',options:{teams:['Army','Boise State','Navy']}}),plan=takePlan(preview.planId),reset=plan.statisticsReset;
 assert.equal(preview.details.canApply,true);assert.ok(reset.summary.playersWithStats>0);assert.ok(reset.changes.some(row=>row.scope==='career'));assert.ok(reset.changes.some(row=>row.scope==='season'));assert.equal(saveFingerprint(savePath),originalHash);
 const {franchise}=await openCfb27Save(savePath,schemaPath),wanted=new Map(franchise.tables.filter(table=>/^(Season|Career).*Stats$/.test(table.name)).map(table=>[table.header.tableId,Buffer.from(table.data)]));
 for(const change of reset.changes){const table=franchise.tables.find(table=>table.header.tableId===change.tableId),offset=table.header.table1StartIndex+change.row*table.header.record1Size;assert.ok(wanted.get(change.tableId).subarray(offset,offset+change.before.length/2).equals(Buffer.from(change.before,'hex')));Buffer.from(change.after,'hex').copy(wanted.get(change.tableId),offset);}
 const first=reset.changes[0],after=first.after;first.after=first.before;await assert.rejects(runRosterGenerator({...context,mode:'apply',options:{planId:preview.planId,confirmRegeneration:true}}),/statistics changed after Preview/);assert.equal(saveFingerprint(savePath),originalHash);first.after=after;
 const applied=await runRosterGenerator({...context,mode:'apply',options:{planId:preview.planId,confirmRegeneration:true}});assert.equal(applied.status,'completed');assert.equal(saveFingerprint(applied.backupPath),originalHash);
 const reopened=await openCfb27Save(savePath,schemaPath);for(const table of reopened.franchise.tables)if(wanted.has(table.header.tableId))assert.ok(table.data.equals(wanted.get(table.header.tableId)),table.name+' exact counters, metadata and unselected rows');
 const [headings,firstRow,...rows]=parseCsv(fs.readFileSync(applied.reportPath,'utf8'));assert.equal(rows.length+1,255);assert.deepEqual(JSON.parse(firstRow[headings.indexOf('StatisticsResetJSON')]),reset);assert.equal(JSON.parse(firstRow[headings.indexOf('PlayerStateJSON')]).statisticsRetained,false);assert.equal(saveFingerprint(source),originalHash);
});
