// Private EXAMPLE SAVES integration; originals remain read-only.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {runRosterGenerator} from '../src/main/tools/rosterGenerator/runner.js';
import {saveFingerprint,takePlan} from '../src/main/tools/jersey/planStore.js';
import {writeCsv} from '../src/main/services/files.js';import {parseCsv} from '../src/main/services/reportAudit.js';
import {loadEquipmentTables} from '../src/main/tools/equipment/shared.js';import {sf} from '../src/main/tools/equipment/openSave.js';
const fixture=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN');
test('regional two-team hometown generation validates, backs up and survives exact Apply/reopen',{timeout:120000,skip:!fs.existsSync(fixture)},async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-v211-geography-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const savePath=path.join(directory,'DYNASTY-GEOGRAPHY');fs.copyFileSync(fixture,savePath);const before=saveFingerprint(savePath),source=saveFingerprint(fixture);let report=0;
  const context={savePath,schemaPath:path.resolve('resources/engine-data/C27_486_6.gz'),reports:{create:data=>writeCsv(path.join(directory,`report-${++report}.csv`),data.headings,data.rows)}};
  const preview=await runRosterGenerator({...context,mode:'preview',options:{teams:['Georgia',"Hawai'i"],preset:'building-blocks'}});
  assert.equal(preview.details.canApply,true,JSON.stringify(preview.details.blocking));assert.equal(saveFingerprint(savePath),before);
  const georgia=preview.details.teams.find(team=>team.team==='Georgia'),hawaii=preview.details.teams.find(team=>team.team==="Hawai'i");
  assert.equal(georgia.geography.localState,'Georgia');assert.equal(hawaii.geography.localState,'Hawaii');
  assert.ok(georgia.geography.states.Georgia>=34);assert.ok(hawaii.geography.states.Hawaii>=34);
  assert.ok(Object.keys(georgia.geography.states).length>2);assert.equal(georgia.geography.allocations.national,8);
  const plan=takePlan(preview.planId),player=plan.rosters[0].players[0],old=player.fields.PLYR_HOME_TOWN;player.fields.PLYR_HOME_TOWN='Invented Town';
  await assert.rejects(runRosterGenerator({...context,mode:'apply',options:{planId:preview.planId,confirmRegeneration:true}}),/finishing passes|hometown/i);
  assert.equal(saveFingerprint(savePath),before);assert.equal(fs.existsSync(path.join(directory,"Ace's CFB Toolkit Backups")),false);player.fields.PLYR_HOME_TOWN=old;
  const applied=await runRosterGenerator({...context,mode:'apply',options:{planId:preview.planId,confirmRegeneration:true}});
  assert.equal(applied.status,'completed');assert.equal(saveFingerprint(applied.backupPath),before);const reopened=await loadEquipmentTables(savePath,context.schemaPath);
  for(const roster of plan.rosters)for(const player of roster.players)for(const field of ['PLYR_HOME_TOWN','PLYR_HOME_STATE','HomePipeline'])assert.equal(sf(reopened.players.records[player.row],field),player.fields[field]);
  const [headings,...rows]=parseCsv(fs.readFileSync(applied.reportPath,'utf8'));assert.ok(headings.includes('GeographyJSON'));
  for(const row of rows){const audit=JSON.parse(row[headings.indexOf('GeographyJSON')]);assert.ok(audit.assignment.home.town);assert.ok(['local','pipeline','nearby','national'].includes(audit.assignment.source));}
  assert.equal(saveFingerprint(fixture),source);console.log('Regional results:',JSON.stringify(preview.details.teams.map(team=>({team:team.team,geography:team.geography}))));
});
