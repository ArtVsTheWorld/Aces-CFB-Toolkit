import test from 'node:test';import assert from 'node:assert/strict';
import {homeContextFromFranchise} from '../src/main/services/homeContext.js';
import {readTables} from '../src/main/services/save.js';
import {FRANCHISE_USER_TABLE_UID} from '../src/main/tools/jersey/shared.js';
test('read-only Home loads only needed fields and retains both controlled-team ownership methods',async()=>{
  const calls=new Map(),table=(uniqueId,tableId,records)=>({header:{uniqueId,tableId},records,readRecords:async fields=>calls.set(uniqueId,fields)}),ref=row=>(7).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
  const teams=table(3359508968,8,[{TeamIndex:1,DisplayName:'One',NickName:'Owls',UserCharacter:'0'.repeat(32)},{TeamIndex:2,DisplayName:'Two',NickName:'Two',UserCharacter:ref(1)}]),players=table(1612938518,7,[{TeamIndex:1},{isEmpty:true,TeamIndex:2}]),users=table(FRANCHISE_USER_TABLE_UID,9,[{UserEntity:ref(0)}]),season=table(3123991521,10,[{CurrentSeasonYear:2026,CurrentWeek:0,CurrentWeekType:'PreSeason'}]),dynasty=table(2226370608,11,[{LeagueID:12345}]);
  const result=await homeContextFromFranchise({tables:[teams,players,users,season,dynasty]});assert.equal(result.dynastyId,12345);assert.deepEqual(result.controlledTeams.map(team=>team.name),['One','Two']);assert.equal(result.teams[0].nickname,'Owls');assert.equal(result.teams[1].nickname,null);assert.equal(result.season.weekType,'PreSeason');
  assert.deepEqual(calls.get(1612938518),['TeamIndex']);assert.deepEqual(calls.get(FRANCHISE_USER_TABLE_UID),['UserEntity']);assert.ok(!calls.get(3359508968).includes('Roster'));
});
test('ordinary mutable tool table reads still load all fields by default',async()=>{
  let selected='not called';const table={header:{uniqueId:1},readRecords:async fields=>selected=fields};
  const result=await readTables({tables:[table]},{players:1});assert.equal(result.players,table);assert.equal(selected,undefined);
});
