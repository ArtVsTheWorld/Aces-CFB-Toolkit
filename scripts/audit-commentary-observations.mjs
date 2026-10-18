// Read-only evidence review. Private source saves are never included in builds.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {openCfb27Save,readTables,PLAYER_TABLE_UID,TEAM_TABLE_UID,isDirectionalFcsTeam} from '../src/main/services/save.js';
import {ROSTER_TABLE_UID} from '../src/main/tools/equipment/shared.js';
import {parseRef,sf} from '../src/main/tools/equipment/openSave.js';
import {loadCommentaryMap} from '../src/main/tools/commentary/map.js';
import {reviewCommentaryObservations} from './lib/commentary-observations.mjs';

const files=process.argv.slice(2),rows=[],sources=[];
if(!files.length)throw new Error('Supply one or more generated-player dynasty samples.');
for(const input of files){
  const file=path.resolve(input),hash=()=>createHash('sha256').update(fs.readFileSync(file)).digest('hex'),before=hash();
  if(sources.some(source=>source.sha256===before))throw new Error('Repeated source save is not independent evidence.');
  const opened=await openCfb27Save(file,path.resolve('resources/engine-data/C27_486_6.gz'));
  const {players,teams,rosters}=await readTables(opened.franchise,{players:PLAYER_TABLE_UID,teams:TEAM_TABLE_UID,rosters:ROSTER_TABLE_UID});
  const seen=new Set();
  for(const team of teams.records){
    if(!team||team.isEmpty||isDirectionalFcsTeam(team))continue;
    const ref=parseRef(sf(team,'Roster'));if(ref?.tableId!==rosters.header.tableId)continue;
    const roster=rosters.records[ref.row];if(!roster||roster.isEmpty)throw new Error('Missing roster.');
    for(let i=0;i<Number(roster.arraySize);i++){
      const r=parseRef(sf(roster,`Player${i}`));if(!r)continue;
      if(r.tableId!==players.header.tableId||!players.records[r.row]||players.records[r.row].isEmpty||seen.has(r.row))throw new Error('Unproven roster ownership.');seen.add(r.row);
      const p=players.records[r.row];
      if(sf(p,'IsNIL')!==false||sf(p,'PLYR_ASSETNAME')||!/^Generic_/.test(sf(p,'GenericHeadAssetName')??''))throw new Error('Source contains a non-generated player identity.');
      rows.push({last:String(sf(p,'LastName')??'').trim(),first:String(sf(p,'FirstName')??'').trim(),id:sf(p,'PLYR_COMMENT')});
    }
  }
  if(hash()!==before)throw new Error('Source changed during read-only audit.');
  sources.push({file:path.basename(file),sha256:before,players:seen.size});
}
console.log(JSON.stringify({sources,...reviewCommentaryObservations(rows,loadCommentaryMap(path.resolve('resources/commentary-data/PlayerCommentaryidMap.txt'))),inputUnchanged:true},null,2));
