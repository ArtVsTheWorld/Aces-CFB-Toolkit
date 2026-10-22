// Private official roster fixture. Only disposable copies are modified.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import zlib from 'node:zlib';
import {prepareRosterGenerator,runRosterGenerator} from '../src/main/tools/rosterGenerator/runner.js';
import {unpackRosterContainer} from '../src/main/tools/equipment/rosterCodec.js';
import {rosterChecksum} from '../src/main/tools/equipment/rosterChecksum.js';
import {decodeRosterTdf} from '../src/main/tools/equipment/rosterTdf.js';
import {takePlan,saveFingerprint} from '../src/main/tools/jersey/planStore.js';
import {writeCsv} from '../src/main/services/files.js';
const fixture='C:/Users/Art/Documents/EA SPORTS College Football 27/saves/ROSTER-Official',schemaPath=path.resolve('resources/engine-data/C27_486_6.gz');
// EXAMPLE SAVES: this fixture is private and not distributed with source tests.

const editedFixture='C:/Users/Art/Documents/EA SPORTS College Football 27/saves/ROSTER-ONEEDIT';
test('independent game-written original and edited rosters verify their unpacked size and BZIP2 checksum',{skip:!fs.existsSync(fixture)||!fs.existsSync(editedFixture)},()=>{
 const originals=[fixture,editedFixture].map(file=>({file,bytes:fs.readFileSync(file),fingerprint:saveFingerprint(file)}));
 for(const entry of originals){const container=unpackRosterContainer(entry.bytes);assert.equal(entry.bytes.readUInt32LE(0x12),container.unpacked.length);assert.equal(entry.bytes.readUInt32LE(0x1a),rosterChecksum(container.unpacked));assert.equal(saveFingerprint(entry.file),entry.fingerprint);}
 assert.notEqual(originals[0].bytes.readUInt32LE(0x1a),originals[1].bytes.readUInt32LE(0x1a));
});
test('official Play Now roster regenerates safely through Preview/Apply/reopen and preserves other teams',{skip:!fs.existsSync(fixture),timeout:240000},async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-roster-file-'));t.after(()=>{if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('cfb-roster-file-'))throw Error('Unsafe cleanup');fs.rmSync(directory,{recursive:true,force:true});});
 const savePath=path.join(directory,'ROSTER-TEST');fs.copyFileSync(fixture,savePath);const fingerprint=saveFingerprint(savePath),original=fs.readFileSync(fixture),before=unpackRosterContainer(original).document.value;let index=0;const context={savePath,schemaPath,reports:{create:report=>writeCsv(path.join(directory,'report-'+index+++'.csv'),report.headings,report.rows)}};
 const prepared=await prepareRosterGenerator(context);assert.equal(prepared.fileKind,'roster');assert.ok(prepared.teams.some(t=>t.name==='LSU'));
 const preview=await runRosterGenerator({...context,mode:'preview',options:{teams:['LSU'],preset:'building-blocks'}});assert.equal(preview.details.canApply,true,JSON.stringify(preview.details.blocking));assert.equal(preview.details.fileKind,'roster');assert.equal(saveFingerprint(savePath),fingerprint);const plan=takePlan(preview.planId);assert.equal(plan.rosters[0].players.length,85);
 const applied=await runRosterGenerator({...context,mode:'apply',options:{planId:preview.planId,confirmRegeneration:true}});assert.equal(applied.status,'completed');assert.equal(saveFingerprint(applied.backupPath),fingerprint);
 const bytes=fs.readFileSync(savePath),reopened=unpackRosterContainer(bytes),after=reopened.document.value;assert.equal(bytes.length,original.length);for(const [start,end]of [[0,0x12],[0x16,0x1a],[0x1e,74]])assert.deepEqual(bytes.subarray(start,end),original.subarray(start,end));assert.equal(bytes.readUInt32LE(0x12),reopened.unpacked.length);assert.equal(bytes.readUInt32LE(0x1a),rosterChecksum(reopened.unpacked));assert.notEqual(bytes.readUInt32LE(0x1a),original.readUInt32LE(0x1a));for(const field of ['TEAM','TCPS','DCHT'])assert.deepEqual(after[field],before[field]);
 const team=before.TEAM.find(t=>t.TDNA==='LSU').TGID,ids=new Set(before.PLAY.filter(p=>p.TGID===team).map(p=>p.PGID));assert.equal(ids.size,85);for(let i=0;i<before.PLAY.length;i++){const a=before.PLAY[i],b=after.PLAY[i];assert.equal(a.PGID,b.PGID);assert.equal(a.TGID,b.TGID);assert.equal(a.PAGE,b.PAGE);if(!ids.has(a.PGID))assert.deepEqual(b,a);}
 const oldBlobs=new Map(before.BLOB.BLOB[0].BLBM),newBlobs=new Map(after.BLOB.BLOB[0].BLBM);for(const [id,blob]of oldBlobs)if(!ids.has(id))assert.deepEqual(newBlobs.get(id),blob);assert.deepEqual(after.BLOB.BLOB[1],before.BLOB.BLOB[1]);
 for(const player of plan.rosters[0].players){const p=after.PLAY.find(p=>p.PGID===player.rosterPlayerId),v=decodeRosterTdf(zlib.gunzipSync(newBlobs.get(p.PGID))).CHVI;assert.equal(p.PFNA,player.fields.FirstName);assert.equal(p.PLNA,player.fields.LastName);assert.equal(p.POVR,player.fields.OverallRating);assert.equal(p.POID,player.fields.PresentationId);assert.equal(p.PEPS,player.fields.PLYR_ASSETNAME);assert.equal(v.GENR,player.fields.GenericHeadAssetName);assert.equal(v.CNID,p.PGID);assert.equal(v.CFNM,p.PFNA);assert.equal(v.CLNM,p.PLNA);assert.equal(v.WLBS,p.PWGT+160);assert.equal(v.BTYP,p.PCBT);}
 assert.equal(saveFingerprint(fixture),fingerprint);
});
