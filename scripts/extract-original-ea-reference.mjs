// Read-only extraction from the owner's pristine year-one EA dynasty.
// IsNIL is evidence ONLY in this known-clean source, never in runtime matching.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {openCfb27Save,readTables,PLAYER_TABLE_UID,TEAM_TABLE_UID,isDirectionalFcsTeam} from '../src/main/services/save.js';
import {ROSTER_TABLE_UID} from '../src/main/tools/equipment/shared.js';
import {parseRef} from '../src/main/tools/equipment/openSave.js';
const file=process.argv[2];if(!file)throw Error('Supply the pristine EA year-one dynasty.');
const hash=()=>createHash('sha256').update(fs.readFileSync(file)).digest('hex'),before=hash(),{franchise}=await openCfb27Save(file,'resources/engine-data/C27_486_6.gz'),{players,teams,rosters}=await readTables(franchise,{players:PLAYER_TABLE_UID,teams:TEAM_TABLE_UID,rosters:ROSTER_TABLE_UID});
const real=[],fictional=[],seen=new Set();
for(const team of teams.records.filter(r=>!r.isEmpty&&r.DisplayName&&!isDirectionalFcsTeam(r))){
 const ref=parseRef(team.Roster);if(ref?.tableId!==rosters.header.tableId)throw Error('Unsupported source roster.');const list=rosters.records[ref.row];
 for(let i=0;i<list.arraySize;i++){
  const playerRef=parseRef(list['Player'+i]);if(playerRef?.tableId!==players.header.tableId)throw Error('Unsupported player reference.');const p=players.records[playerRef.row];
  if(p.isEmpty||typeof p.IsNIL!=='boolean'||!p.PLYR_ASSETNAME||!p.FirstName||!p.LastName||seen.has(p.PLYR_ASSETNAME))throw Error('Ambiguous or incomplete source identity.');
  seen.add(p.PLYR_ASSETNAME);(p.IsNIL?real:fictional).push([p.PLYR_ASSETNAME,p.FirstName,p.LastName]);
 }
}
real.sort((a,b)=>a[0].localeCompare(b[0],'en'));fictional.sort((a,b)=>a[0].localeCompare(b[0],'en'));
if(hash()!==before)throw Error('Source changed during extraction.');
const metadata={version:'ea-2026-reference-1',source:'Owner-provided pristine EA year-one dynasty',sourceSha256:before,selection:'Active FBS roster membership; IsNIL true in the pristine source only. False entries are fictional fillers, not protected real players.',realPlayers:real.length,fictionalFillers:fictional.length,identitiesSha256:createHash('sha256').update(JSON.stringify({real,fictional})).digest('hex')};
const lines=['{','"metadata":'+JSON.stringify(metadata)+',','"real":[',...real.map((row,i)=>JSON.stringify(row)+(i===real.length-1?'':',')),'],"fictional":[',...fictional.map((row,i)=>JSON.stringify(row)+(i===fictional.length-1?'':',')),']}'];
const part=Number(process.argv[3]??0),parts=Number(process.argv[4]??1),start=Math.floor(lines.length*part/parts),end=Math.floor(lines.length*(part+1)/parts);
process.stdout.write(lines.slice(start,end).join('\n'));
