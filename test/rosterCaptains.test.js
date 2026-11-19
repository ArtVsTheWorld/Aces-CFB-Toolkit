import test from 'node:test';
import assert from 'node:assert/strict';
import {assignRosterCaptains,naturalCaptainStarters} from '../src/main/tools/rosterGenerator/playerState.js';
import {finalizeRosterCaptains,rosterCaptainStarterRows,planCaptainTeamCounts,applyCaptainTeamCounts,verifyCaptainTeamCounts} from '../src/main/tools/rosterGenerator/captainPlan.js';
import {OFFENSE,SPECIALISTS} from '../src/main/tools/jersey/shared.js';
const player=(row,position,overall,extra={})=>({row,position,fields:{OverallRating:overall,SchoolYear:'Junior',Personality:'TeamPlayer',PLYR_CONSECYEARSWITHTEAM:2,PLYR_ISCAPTAIN:true,CaptainsPatch:'FiveYearGold',...extra},before:{PLYR_ISCAPTAIN:true,CaptainsPatch:'FiveYearGold'},changes:[]});
const roster=()=>[
  player(1,'QB',90,{SchoolYear:'Sophomore'}),player(2,'QB',70,{SchoolYear:'Senior',Personality:'Leader'}),
  player(3,'HB',88),player(4,'WR',86),player(5,'WR',82),player(6,'WR',80),player(7,'WR',75,{SchoolYear:'Senior'}),
  player(8,'LT',89),player(9,'LG',87),player(10,'DT',88),player(11,'DT',80),
  player(12,'MLB',89),player(13,'MLB',72,{SchoolYear:'Senior',Personality:'Leader'}),
  player(14,'CB',87),player(15,'CB',84),player(16,'SS',85),player(17,'K',99),player(18,'P',99),
];
test('old counts of eight and stale flags never survive; exactly four balanced captains are starters',()=>{
  for(const captainCount of [undefined,0,6,8,100]){
    const players=roster(),audit=assignRosterCaptains(players,{captainCount});
    assert.equal(audit.requested,4);assert.equal(audit.selected.length,4);
    const chosen=players.filter(p=>p.fields.PLYR_ISCAPTAIN),starters=new Set(naturalCaptainStarters(players).map(p=>p.row));
    assert.equal(chosen.filter(p=>OFFENSE.has(p.position)).length,2);
    assert.equal(chosen.filter(p=>!OFFENSE.has(p.position)).length,2);
    assert.ok(chosen.every(p=>starters.has(p.row)&&!SPECIALISTS.has(p.position)));
    assert.ok(!chosen.some(p=>[2,7,13].includes(p.row)));
    assert.ok(players.every(p=>p.fields.CaptainsPatch===(p.fields.PLYR_ISCAPTAIN?'OneYear':'None')));
  }
});
test('class year and leadership help comparable starters but do not outrank clearly better starters',()=>{
  const players=[player(1,'QB',92,{SchoolYear:'Sophomore'}),player(2,'HB',89,{SchoolYear:'Senior',Personality:'Leader'}),
    player(3,'WR',60,{SchoolYear:'Senior',Personality:'Leader'}),player(4,'LT',75,{SchoolYear:'Senior'}),
    player(5,'MLB',90),player(6,'CB',88),player(7,'SS',60,{SchoolYear:'Senior',Personality:'Leader'})];
  const audit=assignRosterCaptains(players);assert.deepEqual(new Set(audit.selected.map(p=>p.row)),new Set([1,2,5,6]));
});
test('multiple actual starters are eligible, with one captain per unit preferred over two from one room',()=>{
  const players=roster();players.find(p=>p.row===5).fields.OverallRating=98;players.find(p=>p.row===4).fields.OverallRating=99;
  const audit=assignRosterCaptains(players),offense=audit.selected.filter(p=>OFFENSE.has(p.position));
  assert.equal(offense.filter(p=>p.position==='WR').length,1);assert.ok(naturalCaptainStarters(players).some(p=>p.row===6));
  assert.equal(naturalCaptainStarters(players,{offensiveScheme:'OPTION'}).filter(p=>p.position==='WR').length,2);
  assert.equal(naturalCaptainStarters(players,{defensiveScheme:'BASE_3_4'}).filter(p=>p.position==='DT').length,1);
});
test('selection is deterministic regardless of input order and handles small or one-sided rosters',()=>{
  const a=roster(),b=[...roster()].reverse();assert.deepEqual(assignRosterCaptains(a).selected,assignRosterCaptains(b).selected);
  for(const count of [0,1,3]){const players=roster().slice(0,count);assert.equal(assignRosterCaptains(players).selected.length,count);}
  assert.equal(assignRosterCaptains(roster().filter(p=>OFFENSE.has(p.position))).selected.length,4);
});
test('kept depth charts choose their actual starters even when a better-rated backup exists',()=>{
  const players=roster(),allowed=[2,3,4,5,6,8,9,10,11,13,14,15,16,17,18];
  const audit=assignRosterCaptains(players,{captainStarterRows:allowed});assert.ok(audit.selected.every(p=>allowed.includes(p.row)));
  assert.ok(!audit.selected.some(p=>p.row===1||p.row===12));
  assert.throws(()=>assignRosterCaptains(players,{captainStarterRows:[9999]}),/starter evidence/);
});
test('final captain flags and preview change records are rebuilt together without touching other fields',()=>{
  const players=roster(),before=structuredClone(players.map(p=>p.fields));
  players[0].changes=[{field:'SpeedRating',oldValue:80,newValue:90},{field:'PLYR_ISCAPTAIN',oldValue:true,newValue:false}];
  const preview={team:{name:'Team'},players,summary:{settings:{},finishing:{}}};finalizeRosterCaptains(preview,[2,3,4,5,6,8,9,10,11,13,14,15,16,17,18]);
  assert.equal(preview.summary.finishing.captains.selected.length,4);assert.ok(players[0].changes.some(c=>c.field==='SpeedRating'));
  for(const [i,p]of players.entries())for(const key of Object.keys(p.fields).filter(key=>!['PLYR_ISCAPTAIN','CaptainsPatch'].includes(key)))assert.equal(p.fields[key],before[i][key]);
  assert.equal(players[0].changes.filter(c=>c.field==='PLYR_ISCAPTAIN').length,1);
});
const ref=(tableId,row)=>tableId.toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
test('starter evidence follows reordered or preserved charts and ignores specialist substitute-only slots',async()=>{
  const players=roster(),preview={team:{teamIndex:1},players,summary:{settings:{}}};
  const lists={header:{tableId:3},records:[{arraySize:2,Player0:ref(1,2),Player1:ref(1,1)}],readRecords:async()=>{}};
  const charts={header:{tableId:2},records:[{QB:ref(3,0)}],readRecords:async()=>{}};
  const loaded={teams:{records:[{TeamIndex:1,DepthChart:ref(2,0)}]},players:{header:{tableId:1}},franchise:{tables:[lists,charts]}};
  const kept=await rosterCaptainStarterRows(loaded,preview,{status:'kept'});assert.ok(kept.includes(2)&&!kept.includes(1));
  const reordered=await rosterCaptainStarterRows(loaded,preview,{status:'reordered',slots:[{slot:'QB',players:[{row:1},{row:2}]},{slot:'KR',players:[{row:7}]}]});assert.ok(reordered.includes(1)&&!reordered.includes(2)&&!reordered.includes(7));
  assert.equal(await rosterCaptainStarterRows({...loaded,kind:'roster'},preview,{status:'kept'}),null);
});
function teamTable(){
  const records=[0,1,2].map((TeamIndex,row)=>{
    const bytes=Buffer.from([0xa8,0xf0]);
    const record={TeamIndex,isEmpty:false,hexData:bytes};
    Object.defineProperty(record,'DesiredTeamCaptains',{get:()=>bytes[0]&15,set:value=>{bytes[0]=(bytes[0]&240)|value;}});
    return record;
  });
  return {header:{tableId:10},records,offsetTable:[{name:'DesiredTeamCaptains',offset:4,length:4,isReference:false}]};
}
test('only selected team target counts change to four and every other bit/record is guarded',()=>{
  const loaded={teams:teamTable()},plans=planCaptainTeamCounts(loaded,[{team:{teamIndex:1}}]);
  assert.deepEqual(plans,[{row:1,oldValue:8,newValue:4}]);const guard=applyCaptainTeamCounts(loaded,plans);
  assert.deepEqual(loaded.teams.records.map(r=>r.DesiredTeamCaptains),[8,4,8]);
  verifyCaptainTeamCounts(loaded.teams,guard);loaded.teams.records[0].hexData[1]^=1;
  assert.throws(()=>verifyCaptainTeamCounts(loaded.teams,guard),/Unplanned change/);
  assert.deepEqual(planCaptainTeamCounts({kind:'roster'},[]),[]);
});
