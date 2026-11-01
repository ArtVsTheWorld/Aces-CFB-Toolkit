import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEquipmentUserProtection,assertEquipmentUserProtection,equipmentUserProtectionAudit} from '../src/main/tools/equipment/userProtection.js';
import {collectEquipmentDonors} from '../src/main/tools/equipment/core/patcher.js';
import {mapperPlayers,mapperSources} from '../src/main/tools/equipmentMapper/runner.js';
const ref=(table,row)=>table.toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
function fixture(){
  const loaded={players:{header:{tableId:1},records:[0,1,2].map(row=>({isEmpty:false,FirstName:'Example',LastName:String(row),Position:'WR',SchoolYear:'Junior',TeamIndex:1,OverallRating:85,CharacterBodyType:'Standard',CharacterVisuals:ref(3,row)}))},visuals:{header:{tableId:3},records:[0,1,2].map(index=>({index,isEmpty:false,RawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'HeadWear',itemAssetName:'GearHelmet_Axiom'},{slotType:'FaceMask',itemAssetName:'GearFaceMask_Axiom2BarRB'},{slotType:'OuterPants',itemAssetName:'GearPants_AboveKnee'}]}]})}))},franchiseUsers:{records:[{UserEntity:ref(1,0)}]},franchiseInfo:{records:[{LeagueOwner:ref(1,0)}]},teams:{header:{tableId:2},records:[{TeamIndex:1,DisplayName:'North Carolina',Roster:ref(4,0)}]},rosters:{header:{tableId:4},records:[{arraySize:3,Player0:ref(1,0),Player1:ref(1,1),Player2:ref(1,2)}]}};
  loaded.userProtection=buildEquipmentUserProtection(loaded);return loaded;
}
test('RTG user references identify the protected player without filename, position, or EA settings',()=>{
  const loaded=fixture();assert.deepEqual([...loaded.userProtection.playerRows],[0]);assert.deepEqual([...loaded.userProtection.visualRows],[0]);
  assert.deepEqual([...loaded.userProtection.blockedPlayerRows],[0]);assert.deepEqual(equipmentUserProtectionAudit(loaded),{players:1,sharedPlayersProtected:0});
});
test('all live user players and shared equipment owners are protected',()=>{
  const loaded=fixture();loaded.players.records[1].CharacterVisuals=ref(3,0);loaded.franchiseUsers.records.push({UserEntity:ref(1,2)},{UserEntity:ref(1,0)},{isEmpty:true,UserEntity:ref(1,1)});
  const p=buildEquipmentUserProtection(loaded);assert.deepEqual([...p.playerRows],[0,2]);assert.deepEqual([...p.blockedPlayerRows],[0,1,2]);
});
test('owner reference protects the RTG player when a registration is absent; dynasty coach refs do not protect roster players',()=>{
  const loaded=fixture();loaded.franchiseUsers.records=[];assert.deepEqual([...buildEquipmentUserProtection(loaded).playerRows],[0]);
  loaded.franchiseInfo.records[0].LeagueOwner=ref(5,0);loaded.franchiseUsers.records=[{UserEntity:ref(5,0)}];assert.equal(buildEquipmentUserProtection(loaded).playerRows.size,0);
});
test('invalid referenced players or equipment fail safely, and references to other tables are ignored',()=>{
  const loaded=fixture();loaded.franchiseUsers.records=[{UserEntity:ref(1,99)}];assert.throws(()=>buildEquipmentUserProtection(loaded),/unavailable RTG player/);
  loaded.franchiseUsers.records=[];loaded.players.records[0].CharacterVisuals=ref(9,0);assert.throws(()=>buildEquipmentUserProtection(loaded),/equipment could not be identified/);
  loaded.franchiseInfo.records=[];assert.equal(buildEquipmentUserProtection(loaded).playerRows.size,0);
});
test('limited settings reads protect the player without loading visual JSON',()=>{
  const loaded=fixture();delete loaded.visuals;const p=buildEquipmentUserProtection(loaded);assert.deepEqual([...p.playerRows],[0]);assert.deepEqual([...p.visualRows],[0]);
});
test('Preview and Apply protection rejects every field on protected players and visuals, including shared owners',()=>{
  const loaded=fixture();loaded.players.records[1].CharacterVisuals=ref(3,0);loaded.userProtection=buildEquipmentUserProtection(loaded);
  for(const change of [{table:'players',row:0,field:'CharacterBodyType'},{table:'players',row:1,field:'CharacterVisuals'},{table:'visuals',row:0,field:'RawData'}])assert.throws(()=>assertEquipmentUserProtection(loaded,[change]),/protected RTG player/);
  assert.doesNotThrow(()=>assertEquipmentUserProtection(loaded,[{table:'visuals',row:2,field:'RawData'},{table:'players',row:2,field:'CharacterBodyType'}]));
});
test('Mapper targets and fallback equipment sources exclude the user and shared equipment',()=>{
  const loaded=fixture();loaded.players.records[1].CharacterVisuals=ref(3,0);loaded.userProtection=buildEquipmentUserProtection(loaded);
  assert.deepEqual(mapperPlayers(loaded).map(p=>p.row),[2]);assert.ok(mapperSources(loaded).every(p=>p.visualRow!==0));
});
test('donor selection omits protected RTG players before applying the top-rated limit',()=>{
  const loaded=fixture(),options={teamNames:new Map([[1,'North Carolina']]),excludedPlayerRows:loaded.userProtection.blockedPlayerRows};
  const all=collectEquipmentDonors(loaded.players.records,loaded.visuals.records,3,{teamNames:options.teamNames});assert.equal(all.length,3);
  const donors=collectEquipmentDonors(loaded.players.records,loaded.visuals.records,3,{...options,topPerPosition:1});assert.deepEqual(donors.map(p=>p.row),[1]);
});
