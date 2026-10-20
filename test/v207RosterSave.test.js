// Private EXAMPLE SAVES tests. Production writer touches temporary copies only.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {runRosterGenerator} from '../src/main/tools/rosterGenerator/runner.js';
import {saveFingerprint} from '../src/main/tools/jersey/planStore.js';
import {writeCsv} from '../src/main/services/files.js';
const fixture=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN');
test('two-team generation applies independent caliber, age, potential, tone and depth-chart settings',{skip:!fs.existsSync(fixture),timeout:120000},async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-v207-teams-')),savePath=path.join(directory,'DYNASTY-V207');fs.copyFileSync(fixture,savePath);t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const original=saveFingerprint(savePath),source=saveFingerprint(fixture);let reports=0;
 const context={savePath,schemaPath:path.resolve('resources/engine-data/C27_486_6.gz'),defaultMapPath:path.resolve('resources/commentary-data/PlayerCommentaryidMap.txt'),reports:{create:r=>writeCsv(path.join(directory,'report-'+(++reports)+'.csv'),r.headings,r.rows)}},options={teams:['LSU','Navy'],preset:'contender',teamConfigurations:{Navy:{preset:'startup',rosterAge:'seniors',rosterPotential:'dead-end',skinTonePreset:'hbcu',reorderDepthChart:false}}};
 const preview=await runRosterGenerator({...context,mode:'preview',options});assert.equal(preview.details.canApply,true,JSON.stringify(preview.details.blocking));assert.equal(saveFingerprint(savePath),original);
 const lsu=preview.details.teams.find(t=>t.team==='LSU'),navy=preview.details.teams.find(t=>t.team==='Navy');assert.ok(Math.abs(lsu.newAverage-75)<1);assert.ok(Math.abs(navy.newAverage-60)<1);assert.equal(lsu.settings.rosterAge,'standard');assert.equal(navy.settings.rosterAge,'seniors');assert.equal(navy.depthChart.status,'kept');assert.equal(navy.depthChart.changes.length,0);assert.ok(Object.keys(navy.classRedshirtCounts).every(key=>key==='Senior|Previous'));assert.equal(navy.developmentCounts.Normal,85);
 const applied=await runRosterGenerator({...context,mode:'apply',options:{planId:preview.planId,confirmRegeneration:true}});assert.equal(applied.status,'completed');assert.equal(saveFingerprint(applied.backupPath),original);assert.equal(saveFingerprint(fixture),source);assert.ok(fs.readFileSync(applied.reportPath,'utf8').includes('DepthChartJSON'));
});
