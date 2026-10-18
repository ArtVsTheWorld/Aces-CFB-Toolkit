// Full-save integration tests require private EXAMPLE SAVES fixtures. They are
// intentionally separate from npm run test:source and never modify originals.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {previewRosterGenerator} from '../src/main/tools/rosterGenerator/preview.js';
import {rosterGeneratorCsv} from '../src/main/tools/rosterGenerator/report.js';
import {writeCsv} from '../src/main/services/files.js';
import {parseCsv} from '../src/main/services/reportAudit.js';

const fixture=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schemaPath=path.resolve('resources/engine-data/C27_486_6.gz'),hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function cleanup(directory,prefix){if(path.dirname(path.resolve(directory))!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith(prefix))throw new Error('Unexpected test cleanup directory.');fs.rmSync(directory,{recursive:true,force:true});}
test('v20.5 copied-save roster preview is deterministic, complete and never writes or backs up', {timeout:60000,skip:!fs.existsSync(fixture)},async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-v205-preview-'));t.after(()=>cleanup(dir,'cfb-v205-preview-'));const savePath=path.join(dir,'DYNASTY-PREVIEW-TEST');fs.copyFileSync(fixture,savePath);const original=hash(savePath),fixtureHash=hash(fixture);
  const a=await previewRosterGenerator({savePath,schemaPath,team:'LSU',seed:2052026}),b=await previewRosterGenerator({savePath,schemaPath,team:'LSU',seed:2052026});
  assert.deepEqual(a,b);assert.equal(hash(savePath),original);assert.equal(hash(fixture),fixtureHash);assert.deepEqual(fs.readdirSync(dir),['DYNASTY-PREVIEW-TEST']);assert.equal(a.canApply,false);assert.equal(a.source.unchanged,true);assert.equal(a.players.length,a.summary.players);assert.ok(a.summary.targetAchieved);assert.ok(a.players.every(player=>player.position));
  for(const player of a.players){assert.equal(Object.hasOwn(player.fields,'Age'),false);assert.equal(Object.hasOwn(player.fields,'PLYR_BIRTHDATE'),false);assert.equal(Object.hasOwn(player.fields,'PresentationId'),false);assert.equal(Object.hasOwn(player.fields,'TeamIndex'),false);assert.equal(Object.hasOwn(player.fields,'CharacterVisuals'),false);}
  const csv=rosterGeneratorCsv(a),report=path.join(dir,'preview.csv');writeCsv(report,csv.headings,csv.rows);const[headings,...rows]=parseCsv(fs.readFileSync(report,'utf8'));assert.equal(rows.length,a.players.length);
  for(const row of rows){const item=Object.fromEntries(headings.map((key,i)=>[key,row[i]])),player=a.players.find(player=>player.row===Number(item.Row));assert.deepEqual(JSON.parse(item.AfterFieldsJSON),player.fields);assert.deepEqual(JSON.parse(item.ChangesJSON),player.changes);assert.equal(item.BeforeRawData,player.beforeRawData);assert.equal(item.AfterRawData,player.rawData);assert.equal(item.CatalogSHA256,a.catalog.sha256);}
});
test('v20.5 Apply, unsupported/missing teams and invalid seeds cannot modify a copied dynasty', {timeout:60000,skip:!fs.existsSync(fixture)},async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-v205-guards-'));t.after(()=>cleanup(dir,'cfb-v205-guards-'));const savePath=path.join(dir,'DYNASTY-PREVIEW-TEST');fs.copyFileSync(fixture,savePath);const original=hash(savePath);
  for(const options of [{mode:'apply',team:'LSU'},{team:''},{team:'Not a real team'},{team:'FCS East'},{team:'LSU',seed:-1}])await assert.rejects(()=>previewRosterGenerator({savePath,schemaPath,...options}));
  assert.equal(hash(savePath),original);assert.deepEqual(fs.readdirSync(dir),['DYNASTY-PREVIEW-TEST']);
});
