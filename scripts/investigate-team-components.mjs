// Read-only evidence collection and hypothesis tests; never calls save().
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {openCfb27Save,readTables,PLAYER_TABLE_UID,TEAM_TABLE_UID,isDirectionalFcsTeam} from '../src/main/services/save.js';
import {ROSTER_TABLE_UID} from '../src/main/tools/equipment/shared.js';
import {parseRef} from '../src/main/tools/equipment/openSave.js';
import {inspectTeamSchemes} from '../src/main/tools/rosterGenerator/schemes.js';
const directory=path.resolve('outputs/team-component-investigation');fs.mkdirSync(directory,{recursive:true});
const schema=path.resolve('resources/engine-data/C27_486_6.gz'),hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const snapshots=[];
for(const input of process.argv.slice(2)){
 const file=path.resolve(input),before=hash(file),{franchise}=await openCfb27Save(file,schema),{players,teams,rosters}=await readTables(franchise,{players:PLAYER_TABLE_UID,teams:TEAM_TABLE_UID,rosters:ROSTER_TABLE_UID});
 const referenced=async value=>{const ref=parseRef(value),table=ref&&franchise.tables.find(t=>t.header.tableId===ref.tableId);if(!table)return null;await table.readRecords();const record=table.records[ref.row];return record&&!record.isEmpty?{record,table}:null;};
 const list=async value=>{const found=await referenced(value);if(!found||found.table.name!=='Player[]')return [];return Array.from({length:found.record.arraySize},(_,i)=>parseRef(found.record['Player'+i])).filter(ref=>ref?.tableId===players.header.tableId).map(ref=>ref.row);};
 const snapshot={file,sha256:before,teams:[]};
 for(const team of teams.records.filter(r=>!r.isEmpty&&r.DisplayName)){
  const rows=await list(team.Roster),chart=await referenced(team.DepthChart),depth={};
  if(chart?.table.name==='DepthChart')for(const field of chart.table.offsetTable)if(field.name!=='LockedEntries')depth[field.name]=await list(chart.record[field.name]);
  const all=new Set([...rows,...Object.values(depth).flat()]);
  const schemes=await inspectTeamSchemes({kind:'dynasty',franchise},{teamIndex:team.TeamIndex,record:team},schema);
  snapshot.teams.push({name:team.DisplayName,index:team.TeamIndex,directionalFcs:isDirectionalFcsTeam(team),offense:team.TEAM_RATINGOFF,defense:team.TEAM_RATINGDEF,overall:team.TEAM_RATINGOVR,specialTeams:team.TEAM_RATINGST,roster:rows,depth,schemes,players:Object.fromEntries([...all].map(row=>{const p=players.records[row];return [row,{position:p.Position,archetype:p.PlayerType,overall:p.OverallRating,injury:p.InjuryStatus,team:p.TeamIndex,ratings:Object.fromEntries(players.offsetTable.filter(f=>/Rating$/.test(f.name)).map(f=>[f.name,p[f.name]]))}];}))});
 }
 if(hash(file)!==before)throw Error('Input unexpectedly changed');snapshots.push(snapshot);console.log(path.basename(file),snapshot.teams.length,'teams; input SHA256 unchanged');
}
fs.writeFileSync(path.join(directory,'snapshots.json'),JSON.stringify(snapshots,null,2));
const slots={offense:{QB:1,HB:1,WR:3,TE:1,LT:1,LG:1,C:1,RG:1,RT:1},defense:{LE:1,RE:1,DT:2,LOLB:1,MLB:1,ROLB:1,CB:2,FS:1,SS:1}};
const summary=[];
for(const snapshot of snapshots)for(const side of ['offense','defense']){
 const rows=snapshot.teams.filter(t=>!t.directionalFcs),models={};
 for(const source of ['depth','best-at-position','whole-roster'])for(const rounding of ['floor','nearest'])for(const boost of [0,1,2,3,4,5]){
  const errors=[];for(const team of rows){const values=[];if(source==='whole-roster'){for(const row of team.roster){const p=team.players[row];if(slots[side][p.position])values.push(p.overall);}}else for(const [slot,n]of Object.entries(slots[side])){
   const candidates=source==='depth'?(team.depth[slot]??[]).map(r=>team.players[r]?.overall):team.roster.map(r=>team.players[r]).filter(p=>p.position===slot).map(p=>p.overall).sort((a,b)=>b-a);values.push(...candidates.slice(0,n));
  }
  if(!values.length)continue;const mean=values.reduce((a,b)=>a+b)/values.length,predicted=Math.min(99,(rounding==='floor'?Math.floor:Math.round)(mean)+boost);errors.push(predicted-team[side]);}
  models[[source,rounding,boost].join('/')]= {exact:errors.filter(e=>e===0).length,mae:errors.reduce((a,b)=>a+Math.abs(b),0)/errors.length,maxError:Math.max(...errors.map(Math.abs)),samples:errors.length};
 }
 summary.push({file:snapshot.file,side,bestCandidates:Object.entries(models).sort((a,b)=>a[1].mae-b[1].mae).slice(0,6),outerMismatches:rows.filter(t=>Math.trunc((t.offense*60+t.defense*40)/100)!==t.overall).map(t=>t.name)});
}
fs.writeFileSync(path.join(directory,'candidate-results.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
