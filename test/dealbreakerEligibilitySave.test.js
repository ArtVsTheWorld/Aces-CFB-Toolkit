// Private EXAMPLE SAVES regression. Original fixtures are never modified.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {loadEquipmentTables,snapshotVisualRawData} from '../src/main/tools/equipment/shared.js';
import {saveEquipmentCandidate,snapshotVisualsForVerification} from '../src/main/tools/equipment/visualsSafety.js';
import {saveFingerprint} from '../src/main/tools/jersey/planStore.js';
import {ReportService} from '../src/main/services/reports.js';
import {runDealbreaker} from '../src/main/tools/dealbreaker/runner.js';
import {ALLOWED_DEALBREAKERS,isRosteredPlayer} from '../src/main/tools/dealbreaker/core.js';
import {pitchMatches} from '../src/main/tools/dealbreaker/pitches.js';

const fixture=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schemaPath=path.resolve('resources/engine-data/C27_486_6.gz');
test('default all-position Playing Style and matching recruiting pitch survive safe Apply/reopen',{timeout:90000,skip:!fs.existsSync(fixture)},async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-db-eligibility-'));
 t.after(()=>{if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('cfb-db-eligibility-'))throw Error('Unsafe test cleanup');fs.rmSync(directory,{recursive:true,force:true});});
 const savePath=path.join(directory,'DYNASTY-TEST'),source=saveFingerprint(fixture);fs.copyFileSync(fixture,savePath);
 const loaded=await loadEquipmentTables(savePath,schemaPath),names=new Map(loaded.teams.records.filter(t=>t&&!t.isEmpty).map(t=>[Number(t.TeamIndex),String(t.DisplayName)]));
 const row=loaded.players.records.findIndex(player=>isRosteredPlayer(player,names)&&player.Position==='QB');assert.ok(row>=0);
 const record=loaded.players.records[row],assignment={table:'players',row,field:'RecruitingDealbreaker',oldValue:record.RecruitingDealbreaker,newValue:'Invalid'};
 const snapshot=snapshotVisualsForVerification(loaded.visuals,snapshotVisualRawData(loaded.visuals.records)),before=saveFingerprint(savePath);record.RecruitingDealbreaker='Invalid';
 await saveEquipmentCandidate(loaded,schemaPath,snapshot,[assignment],before);
 const context={savePath,schemaPath,reports:new ReportService(path.join(directory,'reports'))},baseline=saveFingerprint(savePath),distribution=Object.fromEntries(ALLOWED_DEALBREAKERS.map(value=>[value,value==='PlayingStyle'?100:0]));
 const preview=await runDealbreaker({...context,mode:'preview',options:{distribution,fixInvalidPlayingStyle:true}});
 assert.equal(preview.details.restrictPlayingStylePositions,false);assert.equal(preview.details.fixInvalidPlayingStyle,false);assert.equal(saveFingerprint(savePath),baseline);
 assert.ok(preview.details.changes.some(change=>change.row===row&&change.proposedStoredValue==='PlayingStyle'));
 const applied=await runDealbreaker({...context,mode:'apply',options:{planId:preview.planId}});assert.equal(saveFingerprint(applied.backupPath),baseline);
 const reopened=await loadEquipmentTables(savePath,schemaPath);assert.equal(reopened.players.records[row].RecruitingDealbreaker,'PlayingStyle');assert.ok(pitchMatches('PlayingStyle',reopened.players.records[row].IdealRecruitingPitch));
 assert.match(fs.readFileSync(applied.reportPath,'utf8'),/restrictPlayingStylePositions/);assert.equal(saveFingerprint(fixture),source);
});
