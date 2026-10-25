import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import identity from '../src/shared/dynastyIdentity.cjs';
import {SettingsStore} from '../src/main/services/settings.js';
import {HistoryStore} from '../src/main/services/history.js';
import {DynastyProfiles} from '../src/main/services/dynastyProfiles.js';
import {recoverHistoryDynasties} from '../src/main/services/historyDynasties.js';
import {saveTeamArtwork,readTeamArtwork,teamArtworkPath} from '../src/main/services/teamArtwork.js';
const {validDynastyId,dynastyKey,historyForSave}=identity;
const fakeImage=text=>({createFromPath:()=>({isEmpty:()=>false,getSize:()=>({width:1024,height:1024}),toPNG:()=>Buffer.from(text)})});
function fixture(t,initial={}){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-dynasty-profile-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const settings=new SettingsStore(path.join(directory,'settings.json'));settings.load();settings.update(initial);
  const history=new HistoryStore(path.join(directory,'history.json'));history.load();
  const ids=new Map(),profiles=new DynastyProfiles({settings,history,dataDirectory:directory,reportsDirectory:path.join(directory,'reports'),resolveIdentity:async file=>ids.get(file)??null});
  return {directory,settings,history,ids,profiles};
}
test('native signed dynasty identifiers validate without filename-derived substitutes',()=>{
  for(const id of [1,-1,2147483647,-2147483648])assert.ok(validDynastyId(id));
  for(const id of [null,undefined,0,1.1,'42',false,2147483648,-2147483649]){assert.equal(validDynastyId(id),false);assert.throws(()=>dynastyKey(id),/identifier/);}
  assert.notEqual(dynastyKey(-1),dynastyKey(1));
});
test('renamed saves share activity while different dynasties reusing a filename stay separate',()=>{
  const entries=[{id:'A',dynastyId:12,inputPath:'old-name'},{id:'B',dynastyId:12,inputPath:'manual-save'},{id:'C',dynastyId:34,inputPath:'manual-save'},{id:'legacy',inputPath:'manual-save'}];
  assert.deepEqual(historyForSave(entries,{path:'renamed',dynastyId:12}).map(e=>e.id),['A','B']);
  assert.deepEqual(historyForSave(entries,{path:'manual-save',dynastyId:34}).map(e=>e.id),['C']);
  assert.deepEqual(historyForSave(entries,{path:'MANUAL-SAVE',schema:{kind:'roster'}}).map(e=>e.id),['legacy']);assert.deepEqual(historyForSave(entries,null),[]);assert.deepEqual(historyForSave(entries,{path:'manual-save'}),[],'Dynasties with unknown identity are never guessed from a filename');
});
test('history preserves IDs across reload, recovers legacy entries atomically and never overwrites known IDs',t=>{
  const {history}=fixture(t);history.add({id:'known',dynastyId:-7,inputPath:'same'});history.add({id:'old',inputPath:'same',summary:[{label:'Keep',value:9}]});
  const before=fs.readFileSync(history.filePath);history.assignDynasties(new Map([['known',99],['old',-7]]));
  const restored=new HistoryStore(history.filePath);restored.load();assert.equal(restored.get('old').dynastyId,-7);assert.equal(restored.get('known').dynastyId,-7);assert.equal(restored.get('old').summary[0].value,9);
  assert.deepEqual(fs.readFileSync(history.filePath+'.before-dynasty-ids.bak'),before);
  history.assignDynasties(new Map([['old',22]]));assert.equal(history.get('old').dynastyId,-7);
});
test('each dynasty keeps independent artwork for the same team and clearing one preserves the other',t=>{
  const {directory,profiles,settings}=fixture(t);
  for(const [id,text]of [[7,'red-logo'],[8,'blue-logo']]){const saved=saveTeamArtwork({dataDirectory:directory,teamName:'LSU',kind:'logo',sourcePath:'unused',nativeImage:fakeImage(text),dynastyId:id});profiles.setArtwork(id,'lsu','logo',saved.path);}
  assert.notEqual(profiles.readArtwork(7,['LSU']).lsu.logo,profiles.readArtwork(8,['LSU']).lsu.logo);
  assert.deepEqual(readTeamArtwork(directory,profiles.profile(7),['LSU'],8),{},'Cross-dynasty paths are rejected');
  const fresh=new DynastyProfiles({settings:new SettingsStore(settings.filePath),history:new HistoryStore(path.join(directory,'other.json')),dataDirectory:directory,resolveIdentity:async()=>null});fresh.settings.load();assert.equal(fresh.readArtwork(7,['LSU']).lsu.logo,profiles.readArtwork(7,['LSU']).lsu.logo);
  profiles.setArtwork(7,'lsu','logo',null);assert.deepEqual(profiles.readArtwork(7,['LSU']),{});assert.ok(profiles.readArtwork(8,['LSU']).lsu.logo);
  assert.throws(()=>saveTeamArtwork({dataDirectory:directory,teamName:'LSU',kind:'logo',nativeImage:fakeImage('bad')}),/identifier/);
});
test('legacy shared artwork migrates only to its previous dynasty, retaining the original and settings backup',async t=>{
  const {directory,settings,history,ids}=fixture(t),legacy=teamArtworkPath(directory,'LSU','logo');fs.mkdirSync(path.dirname(legacy),{recursive:true});fs.writeFileSync(legacy,'old-art');
  settings.update({teamArtwork:{lsu:{logo:legacy}},recentSaves:['old-filename']});ids.set('old-filename',12);
  const profiles=new DynastyProfiles({settings,history,dataDirectory:directory,reportsDirectory:directory,resolveIdentity:async file=>ids.get(file)});
  await profiles.prepare(99);assert.deepEqual(profiles.readArtwork(99,['LSU']),{});assert.equal(profiles.canImportLegacy(),false);
  await profiles.prepare(12);assert.ok(profiles.readArtwork(12,['LSU']).lsu.logo);assert.deepEqual(profiles.readArtwork(99,['LSU']),{});assert.equal(fs.readFileSync(legacy,'utf8'),'old-art');
  assert.ok(fs.existsSync(settings.filePath+'.before-dynasty-profiles.bak'));assert.equal(settings.get().legacyArtworkMigration.completed,true);
});
test('unidentifiable legacy artwork remains preserved until explicitly claimed by one dynasty',async t=>{
  const {directory,settings,history}=fixture(t),legacy=teamArtworkPath(directory,'LSU','header');fs.mkdirSync(path.dirname(legacy),{recursive:true});fs.writeFileSync(legacy,'old-header');settings.update({teamArtwork:{lsu:{header:legacy}},recentSaves:['missing-save']});
  const profiles=new DynastyProfiles({settings,history,dataDirectory:directory,reportsDirectory:directory,resolveIdentity:async()=>null});await profiles.prepare(44);assert.ok(profiles.canImportLegacy());assert.deepEqual(profiles.readArtwork(44,['LSU']),{});
  profiles.importLegacy(44);assert.ok(profiles.readArtwork(44,['LSU']).lsu.header);assert.deepEqual(profiles.readArtwork(55,['LSU']),{});assert.throws(()=>profiles.importLegacy(55),/assigned/);assert.ok(fs.existsSync(legacy));
});
test('legacy recovery uses backups and matching audit links, leaving replaced/missing saves unassigned',async t=>{
  const {directory}=fixture(t),reports=path.join(directory,'reports');fs.mkdirSync(reports);
  const report=path.join(reports,'applied.csv');fs.writeFileSync(report,'CSV');fs.writeFileSync(report+'.meta.json',JSON.stringify({audit:{runId:'apply',previewRunId:'preview'}}));
  const replaced=path.join(directory,'reused-name');fs.writeFileSync(replaced,'new dynasty');
  const entries=[{id:'preview',inputPath:'gone'},{id:'apply',inputPath:'gone',backupPath:'backup',reportPath:report},{id:'replaced',inputPath:replaced,timestamp:'2000-01-01'},{id:'missing',inputPath:'gone'}],reads=[];
  const found=await recoverHistoryDynasties(entries,async file=>{reads.push(file);return file==='backup'?72:99;},reports);
  assert.equal(found.get('apply'),72);assert.equal(found.get('preview'),72);assert.equal(found.has('replaced'),false);assert.equal(found.has('missing'),false);assert.deepEqual(reads,['backup']);
});
test('legacy audit conflicts cannot merge independent dynasty histories',async t=>{
  const {directory}=fixture(t),report=path.join(directory,'apply.csv');fs.writeFileSync(report+'.meta.json',JSON.stringify({audit:{runId:'apply',previewRunId:'preview'}}));
  const found=await recoverHistoryDynasties([{id:'apply',dynastyId:1,reportPath:report},{id:'preview',dynastyId:2}],async()=>null,directory);assert.equal(found.get('apply'),1);assert.equal(found.get('preview'),2);
});

test('known selection prepares scoped artwork without waiting for old history recovery',async t=>{
  const {directory,settings,history}=fixture(t),legacy=teamArtworkPath(directory,'LSU','logo');fs.mkdirSync(path.dirname(legacy),{recursive:true});fs.writeFileSync(legacy,'old-art');
  settings.update({teamArtwork:{lsu:{logo:legacy}},recentSaves:['current-save']});history.add({id:'old',inputPath:'missing',backupPath:'slow-backup'});
  let release;const profiles=new DynastyProfiles({settings,history,dataDirectory:directory,reportsDirectory:directory,resolveIdentity:()=>new Promise(resolve=>release=resolve)});
  const recovery=profiles.migrateHistory();await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof release,'function');
  profiles.prepareKnown(12,'current-save');assert.ok(profiles.readArtwork(12,['LSU']).lsu.logo);assert.equal(history.list().length,1);assert.equal(history.get('old').dynastyId,undefined);
  history.add({id:'new',dynastyId:99});release(12);await recovery;assert.equal(history.get('old').dynastyId,12);assert.equal(history.get('new').dynastyId,99);
});

test('explicit legacy claim during delayed owner recovery cannot be overwritten',async t=>{
  const {directory,settings,history}=fixture(t);settings.update({teamArtwork:{lsu:{}},recentSaves:['old-save']});
  let release;const profiles=new DynastyProfiles({settings,history,dataDirectory:directory,resolveIdentity:()=>new Promise(resolve=>release=resolve)});
  const pending=profiles.prepare(12);profiles.importLegacy(99);release(12);await pending;
  assert.equal(settings.get().legacyArtworkMigration.ownerDynastyId,99);assert.equal(settings.get().legacyArtworkMigration.completed,true);
});
