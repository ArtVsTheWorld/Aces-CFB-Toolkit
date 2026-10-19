// Production handler on NEW workspace copies; never modifies the supplied save.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {runRosterGenerator} from '../src/main/tools/rosterGenerator/runner.js';
import {saveFingerprint} from '../src/main/tools/jersey/planStore.js';
import {writeCsv} from '../src/main/services/files.js';

const source=path.resolve(process.argv[2]??'../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN');
const directory=fs.mkdtempSync(path.resolve('outputs/v205-game-validation-')),original=saveFingerprint(source),results=[];
for(const [preset,teams,extra]of[['startup',['LSU'],{rosterPotential:'low',rosterAge:'youth'}],['all-time',['LSU'],{rosterPotential:'sky'}],['building-blocks',['LSU','Navy'],{rosterAge:'seniors',rosterPotential:'dead-end'}]]) {
  const savePath=path.join(directory,`DYNASTY-V205-${preset.toUpperCase()}`);fs.copyFileSync(source,savePath);
  const context={savePath,schemaPath:path.resolve('resources/engine-data/C27_486_6.gz'),defaultMapPath:path.resolve('resources/commentary-data/PlayerCommentaryidMap.txt'),reports:{create:report=>writeCsv(path.join(directory,`${preset}.csv`),report.headings,report.rows)}};
  const preview=await runRosterGenerator({...context,mode:'preview',options:{teams,preset,...extra}});
  assert.equal(preview.details.canApply,true,JSON.stringify(preview.details.blocking));
  const applied=await runRosterGenerator({...context,mode:'apply',options:{planId:preview.planId,confirmRegeneration:true}});
  assert.equal(saveFingerprint(applied.backupPath),original);assert.equal(fs.statSync(savePath).size,fs.statSync(source).size);assert.equal(saveFingerprint(source),original);
  const result={preset,teams,savePath,backupPath:applied.backupPath,sha256:saveFingerprint(savePath),teamSummaries:applied.details.teams};results.push(result);console.log(JSON.stringify(result));
}
fs.writeFileSync(path.join(directory,'validation.json'),JSON.stringify({version:JSON.parse(fs.readFileSync('package.json','utf8')).version,sourceFingerprint:original,originalUnchanged:saveFingerprint(source)===original,results},null,2));
console.log(`In-game validation copies: ${directory}`);
