import test from 'node:test';import assert from 'node:assert/strict';
import {planRosterStatisticsReset,applyRosterStatisticsReset,verifyRosterStatisticsReset} from '../src/main/tools/rosterGenerator/statistics.js';
const ref=(table,row)=>((table<<17)+row).toString(2).padStart(32,'0'),none='0'.repeat(32);
function fixture(){
  const make=(name,id,season=false)=>{const size=season?4:2,data=Buffer.alloc(size*2),fields=[{name:'GAMESPLAYED',type:'int',offset:0,length:8},{name:'PASSYARDS',type:'int',offset:8,length:8},...(season?[{name:'SEAS_YEAR',type:'int',offset:16,length:8},{name:'YEARBYYEARTEAMINDEX',type:'int',offset:24,length:8}]:[])];data[0]=4;data[1]=120;data[size]=8;data[size+1]=200;if(season){data[2]=31;data[3]=7;data[6]=30;data[7]=8;}return {name,header:{tableId:id,table1StartIndex:0,record1Size:size},data,offsetTable:fields,records:[0,1].map(index=>({index,isEmpty:false,hexData:data.subarray(index*size,(index+1)*size)})),async readRecords(){},updateBuffer(){}};};
  const career=make('CareerOffensiveStats',2),season=make('SeasonOffensiveStats',3,true),arrays={name:'SeasonStats[]',header:{tableId:4},offsetTable:[{name:'SeasonStats0',isReference:true}],records:[0,1].map(index=>({index,isEmpty:false,arraySize:1,SeasonStats0:ref(3,index)})),async readRecords(){}};
  return {players:{records:[0,1].map(index=>({isEmpty:false,CareerStats:ref(2,index),SeasonStats:ref(4,index)}))},franchise:{tables:[career,season,arrays]}};
}
test('reset affects only regenerated players, preserves year/team metadata and verifies exact candidate table bytes',async()=>{
 const loaded=fixture(),original=loaded.franchise.tables.slice(0,2).map(table=>Buffer.from(table.data)),plan=await planRosterStatisticsReset(loaded,[0]);
 assert.deepEqual(plan.summary,{players:1,playersWithStats:1,careerRows:1,seasonRows:1,rowsCleared:2});
 assert.equal(loaded.franchise.tables[0].data[0],4,'Preview is read-only');
 const guards=applyRosterStatisticsReset(loaded,plan);assert.equal(guards.size,2);
 assert.deepEqual([...loaded.franchise.tables[0].data],[0,0,8,200]);assert.deepEqual([...loaded.franchise.tables[1].data],[0,0,31,7,8,200,30,8]);
 verifyRosterStatisticsReset(loaded,guards);loaded.franchise.tables[1].data[3]=99;assert.throws(()=>verifyRosterStatisticsReset(loaded,guards),/did not survive/);
 assert.equal(original[0][0],4);
});
test('all selected owners can reset shared stats, but nonzero stats shared outside scope are rejected before mutations',async()=>{
 const loaded=fixture();loaded.players.records[1].CareerStats=ref(2,0);
 await assert.rejects(planRosterStatisticsReset(loaded,[0]),/shares nonzero career/);assert.equal(loaded.franchise.tables[0].data[0],4);
 const all=await planRosterStatisticsReset(loaded,[0,1]);assert.equal(all.summary.playersWithStats,2);assert.deepEqual(all.changes.find(change=>change.scope==='career').players,[0,1]);
 loaded.franchise.tables[0].data.fill(0,0,2);const zero=await planRosterStatisticsReset(loaded,[0]);assert.equal(zero.changes.some(change=>change.scope==='career'),false);
});
test('missing stats are harmless and malformed or unsupported selected references fail safely',async()=>{
 const loaded=fixture();loaded.players.records[0].CareerStats=none;loaded.players.records[0].SeasonStats=none;
 const empty=await planRosterStatisticsReset(loaded,[0]);assert.equal(empty.changes.length,0);
 loaded.players.records[0].CareerStats=ref(2,100);await assert.rejects(planRosterStatisticsReset(loaded,[0]),/invalid career/);
 loaded.players.records[0].CareerStats=ref(4,0);await assert.rejects(planRosterStatisticsReset(loaded,[0]),/unsupported career/);
});
test('Apply rejects stale stat rows and unrelated tables are never modified',async()=>{
 const loaded=fixture(),plan=await planRosterStatisticsReset(loaded,[0]);loaded.franchise.tables[0].data[1]++;
 assert.throws(()=>applyRosterStatisticsReset(loaded,plan),/changed after Preview/);assert.equal(loaded.franchise.tables[1].data[0],4);
});
test('every season in a replaced player’s history is reset without changing its year or team',async()=>{
 const loaded=fixture(),array=loaded.franchise.tables[2];loaded.players.records[1].SeasonStats=none;
 array.offsetTable.push({name:'SeasonStats1',isReference:true});array.records[0].arraySize=2;array.records[0].SeasonStats1=ref(3,1);
 const plan=await planRosterStatisticsReset(loaded,[0]);assert.equal(plan.summary.seasonRows,2);assert.equal(plan.changes.filter(row=>row.scope==='season').length,2);
 applyRosterStatisticsReset(loaded,plan);assert.deepEqual([...loaded.franchise.tables[1].data],[0,0,31,7,0,0,30,8]);assert.equal(array.records[0].arraySize,2);
});
