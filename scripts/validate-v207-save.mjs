// Production Preview/Apply on NEW copies only. Original user save is read-only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {runRosterGenerator} from '../src/main/tools/rosterGenerator/runner.js';
import {saveFingerprint} from '../src/main/tools/jersey/planStore.js';
import {writeCsv} from '../src/main/services/files.js';
const source=path.resolve(process.argv[2]),sourceHash=saveFingerprint(source),directory=fs.mkdtempSync(path.resolve('outputs/v207-save-validation-')),savePath=path.join(directory,'DYNASTY-V207-JACKSON-STATE');fs.copyFileSync(source,savePath);
let reportIndex=0;const context={savePath,schemaPath:path.resolve('resources/engine-data/C27_486_6.gz'),defaultMapPath:path.resolve('resources/commentary-data/PlayerCommentaryidMap.txt'),reports:{create:r=>writeCsv(path.join(directory,`report-${++reportIndex}.csv`),r.headings,r.rows)}};
const preview=await runRosterGenerator({...context,mode:'preview',options:{teams:['Jackson St'],preset:'building-blocks',skinTonePreset:'hbcu'}});
assert.equal(preview.details.canApply,true,JSON.stringify(preview.details.blocking));assert.equal(saveFingerprint(savePath),sourceHash);
const applied=await runRosterGenerator({...context,mode:'apply',options:{planId:preview.planId,confirmRegeneration:true}});assert.equal(applied.status,'completed');assert.equal(saveFingerprint(applied.backupPath),sourceHash);assert.equal(saveFingerprint(source),sourceHash);
console.log(JSON.stringify({savePath,backup:applied.backupPath,originalUnchanged:true,teams:applied.details.teams.map(t=>({team:t.team,players:t.players,average:t.newAverage,depthStatus:t.depthChart.status,depthReason:t.depthChart.reason,depthChanges:t.depthChart.changes.length}))},null,2));
