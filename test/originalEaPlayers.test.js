import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ORIGINAL_EA_REFERENCE,originalEaIdentity,isOriginalEaPlayer,originalEaProtectionEnabled,originalEaProtectionAudit} from '../src/main/services/originalEaPlayers.js';
import {patchPlayerCommentary} from '../src/main/tools/commentary/patcher.js';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';
import {makeEligible} from '../src/main/tools/equipment/shared.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
import {isProtectedPlayer} from '../src/main/tools/jersey/core/playerProtection.js';
const real={FirstName:'Jeremiah',LastName:'Smith',PLYR_ASSETNAME:'SmithJeremiah_8726',PresentationId:8726,IsNIL:false};
const filler={FirstName:'Sedrick',LastName:'Pittman-Jean',PLYR_ASSETNAME:'PittmanJeanSedrick_4963',PresentationId:4963,IsNIL:true};
const generated={FirstName:'New',LastName:'James',PLYR_ASSETNAME:'',PresentationId:8726,IsNIL:true};
test('clean EA reference separates 10,932 real players from 798 fictional fillers',()=>{
 assert.equal(ORIGINAL_EA_REFERENCE.realPlayers,10932);assert.equal(ORIGINAL_EA_REFERENCE.fictionalFillers,798);assert.equal(originalEaIdentity(real).status,'original');assert.equal(originalEaIdentity(filler).status,'fictional');assert.equal(isOriginalEaPlayer(real),true);assert.equal(isOriginalEaPlayer(filler),false);
 for(const nil of [false,true]){assert.equal(isOriginalEaPlayer({...real,IsNIL:nil}),true);assert.equal(isOriginalEaPlayer({...filler,IsNIL:nil}),false);}
});
test('transfers, edits to number/class/ratings and current NIL flags cannot change protection',()=>{
 for(const extra of [{TeamIndex:0,JerseyNum:99},{SchoolYear:'Senior',RedshirtStatus:'Previous',OverallRating:99},{FirstName:' JEREMIAH ',LastName:'SMITH'},{IsNIL:true}])assert.equal(originalEaIdentity({...real,...extra}).status,'original');
 const before=structuredClone(real);originalEaIdentity(real);assert.deepEqual(real,before);
});
test('names and recycled presentation IDs never produce a false real-player match',()=>{
 for(const p of [generated,{...generated,FirstName:'Jeremiah',LastName:'Smith'},{...real,PLYR_ASSETNAME:'AnotherAsset_8726'},{...real,PLYR_ASSETNAME:''}]){assert.equal(originalEaIdentity(p).status,'unknown');assert.equal(isOriginalEaPlayer(p),false);}
 const conflict=originalEaIdentity({...real,FirstName:'Replacement',LastName:'Person'});assert.equal(conflict.status,'conflict');assert.equal(conflict.protected,true);assert.match(conflict.reason,/Conservatively/);
});
test('normalizers migrate older protection intent while the explicit new option takes priority',()=>{
 for(const [options,expected]of [[{},true],[{skipNilPlayers:false},false],[{renumberNilPlayers:true},false],[{renumberNilPlayers:false},true],[{protectOriginalEaPlayers:false,skipNilPlayers:true},false]]){assert.equal(originalEaProtectionEnabled(options),expected);assert.equal(normalizeEquipmentOptions(options,false).protectOriginalEaPlayers,expected);}
 assert.throws(()=>originalEaProtectionEnabled({protectOriginalEaPlayers:'false'}),/on or off/);
 const audit=originalEaProtectionAudit([real,filler,generated]);assert.equal(audit.protectedPlayers,1);assert.deepEqual(audit.counts,{original:1,fictional:1,conflict:0,unknown:1});
});
test('Commentary protects original identities with false flags, but edits fictional/generated players with true flags',()=>{
 const rows=[real,filler,generated].map(p=>({...p,TeamIndex:1,Position:'WR',SchoolYear:'Freshman',RedshirtStatus:'Eligible',PLYR_COMMENT:0})),before=structuredClone(rows),result=patchPlayerCommentary(rows,new Map([['Smith',101],['Pittman-Jean',102],['James',103]]),{apply:true});
 assert.equal(result.summary.skippedOriginalEa,1);assert.deepEqual(result.changes.map(p=>p.row),[2,1]);assert.equal(rows[0].PLYR_COMMENT,0);assert.equal(rows[1].PLYR_COMMENT,102);assert.equal(rows[2].PLYR_COMMENT,103);assert.deepEqual(rows.map(p=>p.IsNIL),before.map(p=>p.IsNIL));
});
test('equipment filtering and all Patcher passes use reference protection independently of the flag',()=>{
 const ref=row=>(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0'),players=[real,filler,generated].map((p,row)=>({...p,TeamIndex:1,Position:'WR',SchoolYear:'Freshman',RedshirtStatus:'Eligible',CharacterVisuals:ref(row)})),raw=JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'OuterPants',itemAssetName:'GearPants_Standard'}]}]}),visuals=players.map(()=>({isEmpty:false,RawData:raw}));
 const opts=normalizeEquipmentOptions({pantsFix:true},false),eligible=makeEligible(opts,new Map([[1,'Test']]),new Set());assert.deepEqual(players.map(eligible),[false,true,true]);
 applyGlobalEquipmentFixes(players,visuals,10,{pantsFix:true,teamNames:new Map([[1,'Test']])});assert.equal(visuals[0].RawData,raw);assert.notEqual(visuals[1].RawData,raw);assert.notEqual(visuals[2].RawData,raw);assert.deepEqual(players.map(p=>p.IsNIL),[false,true,true]);
 const override=players.map(()=>({isEmpty:false,RawData:raw}));applyGlobalEquipmentFixes(players,override,10,{pantsFix:true,protectOriginalEaPlayers:false,teamNames:new Map([[1,'Test']])});assert.notEqual(override[0].RawData,raw);
});
test('Standard jersey protection uses the reference, and individual number locks remain unconditional',()=>{
 assert.equal(isProtectedPlayer(real),true);assert.equal(isProtectedPlayer(filler),false);assert.equal(isProtectedPlayer(generated),false);assert.equal(isProtectedPlayer({...real,eaRenumberAllowed:true}),false);assert.equal(isProtectedPlayer({...real,eaRenumberAllowed:true,userNumberLocked:true}),true);
});
test('session/preset migration preserves both checkbox polarities and leaves NIL Toggle values untouched',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync('src/renderer/presets.js','utf8'),context);
 for(const value of [true,false]){context.values={'equipment-skip-nil':value,'renumber-nil':value,'nil-target':'true'};const migrated=vm.runInContext('migrateOriginalEaProtectionSettings(values)',context);assert.equal(migrated['equipment-protect-ea'],value);assert.equal(migrated['jersey-protect-ea'],!value);assert.equal(migrated['nil-target'],'true');assert.ok(!('equipment-skip-nil'in migrated));}
});
test('runtime protection code never reads the actual NIL flag; NIL Toggle still writes only that field',()=>{
 for(const file of ['src/main/services/originalEaPlayers.js','src/main/tools/commentary/patcher.js','src/main/tools/jersey/core/playerProtection.js'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/record\.IsNIL|player\??\.IsNIL|sf\([^\n]*"IsNIL"/);
 const source=fs.readFileSync('src/main/tools/nilToggle/runner.js','utf8');assert.match(source,/field: "IsNIL"/);assert.match(source,/\.IsNIL = change.newValue/);assert.doesNotMatch(source,/protectOriginalEaPlayer/);
});
