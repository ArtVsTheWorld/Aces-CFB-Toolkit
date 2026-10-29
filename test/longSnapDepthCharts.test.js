import test from'node:test';import assert from'node:assert/strict';
import{rankLongSnappers,planLongSnapDepthCharts}from'../src/main/tools/longSnap/depthCharts.js';
const ref=(table,row)=>table.toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
const player=(position,rating,overall=70,team=1)=>({Position:position,LongSnapRating:rating,OverallRating:overall,TeamIndex:team,FirstName:position,LastName:'Test',isEmpty:false});
function fixture(){
 const table=(id,name,records,fields)=>({name,header:{tableId:id},records,offsetTable:fields.map(name=>({name,isReference:true,length:32})),readRecords:async()=>{}});
 const players=table(100,'Player',[player('LT',99),player('TE',85),player('C',70),player('LG',75),player('RG',71),player('WR',99),player('TE',99,99,2)],[]);
 const rosters=table(200,'Player[]',[{arraySize:6,...Object.fromEntries(Array.from({length:6},(_,i)=>['Player'+i,ref(100,i)]))}],[]);
 const charts=table(300,'DepthChart',[{LS:ref(400,0),TE:ref(400,1),LockedEntries:'0'.repeat(32)}],['LS','TE','LockedEntries']);
 const lists=table(400,'Player[]',[{arraySize:3,Player0:ref(100,0),Player1:ref(100,5),Player2:ref(100,2),Player3:'0'.repeat(32)},{arraySize:1,Player0:ref(100,1)}],['Player0','Player1','Player2','Player3']);
 const teams=table(500,'Team',[{TeamIndex:1,DisplayName:'Test Team',DepthChart:ref(300,0),Roster:ref(200,0)}],[]);
 return{players,teams,rosters,charts,lists,franchise:{tables:[players,rosters,charts,lists,teams]}};
}
test('LS ranks only rostered TE/C/LG/RG by final LS rating, then overall and stable row',()=>{
 const records=[player('TE',70,80),player('C',75),player('LG',75,90),player('RG',75,90),player('LT',99),player('RT',99),player('WR',99),player('TE',99,99,2),player('TE',98)];
 assert.deepEqual(rankLongSnappers(records,[0,1,2,3,4,5,6,7,0],1).map(p=>p.row),[2,3,1,0]);
 assert.deepEqual(rankLongSnappers(records,[0,1,2],1,new Map([[0,99]])).map(p=>p.row),[0,2,1]);
});
test('only LS list references are planned; no roster, other depth chart or list size mutation',async()=>{
 const loaded=fixture(),before=structuredClone({players:loaded.players.records,rosters:loaded.rosters.records,lists:loaded.lists.records,charts:loaded.charts.records});
 const [plan]=await planLongSnapDepthCharts(loaded);assert.equal(plan.status,'reordered');assert.deepEqual(plan.after.map(p=>p.position),['TE','LG','RG']);assert.equal(plan.assignments.length,3);assert.ok(plan.assignments.every(c=>c.tableId===400&&c.row===0&&/^Player[012]$/.test(c.field)));
 assert.deepEqual({players:loaded.players.records,rosters:loaded.rosters.records,lists:loaded.lists.records,charts:loaded.charts.records},before);
});
test('shared LS storage and shared charts are skipped, never repurposed',async()=>{
 for(const kind of ['slot','team']){const loaded=fixture();if(kind==='slot')loaded.charts.records[0].TE=ref(400,0);else loaded.teams.records.push({...loaded.teams.records[0],TeamIndex:2,DisplayName:'Other Team'});const plans=await planLongSnapDepthCharts(loaded);assert.ok(plans.every(p=>p.status==='skipped'&&!p.assignments.length));}
});
test('insufficient eligible players, foreign roster and invalid LS references skip safely',async()=>{
 for(const mutate of [x=>x.players.records.forEach(p=>p.Position='LT'),x=>x.rosters.records[0].Player0=ref(100,6),x=>x.lists.records[0].Player0=ref(999,1)]){const loaded=fixture();mutate(loaded);const [plan]=await planLongSnapDepthCharts(loaded);assert.equal(plan.status,'skipped');assert.equal(plan.assignments.length,0);}
});
test('unrelated manual locks are preserved, while LS or unreadable locks prevent reordering',async()=>{
 for(const position of ['TE','LS','Unknown']){
  const loaded=fixture(),entry={name:'ForcedDepthChartEntry',header:{tableId:600},records:[{Position:position}],readRecords:async()=>{}},locks={name:'ForcedDepthChartEntry[]',header:{tableId:700},records:[{arraySize:1,ForcedDepthChartEntry0:ref(600,0)}],readRecords:async()=>{}};loaded.franchise.tables.push(entry,locks);loaded.charts.records[0].LockedEntries=ref(700,0);
  const [plan]=await planLongSnapDepthCharts(loaded);assert.equal(plan.status,position==='TE'?'reordered':'skipped');assert.equal(entry.records[0].Position,position);assert.equal(locks.records[0].arraySize,1);
 }
});
