// Deliberately separate from handlers.js: preview research cannot Apply through
// the application IPC, create backups or serialize a dynasty.
import path from 'node:path';
import {openCfb27Save,readTables,PLAYER_TABLE_UID,TEAM_TABLE_UID,isDirectionalFcsTeam} from '../../services/save.js';
import {saveFingerprint} from '../jersey/planStore.js';
import {ROSTER_TABLE_UID,VISUALS_TABLE_UID,SEASON_INFO_TABLE_UID,VALID_POSITIONS} from '../equipment/shared.js';
import {sf,parseRef} from '../equipment/openSave.js';
import {WRITE_FIELDS} from './contract.js';
import {loadObservedCatalog} from './catalog.js';
import {generateRosterPreview} from './core.js';
import {loadCommentaryMap} from '../commentary/map.js';
import {createCommentaryMatcher} from '../commentary/matcher.js';

export async function previewRosterGenerator({savePath,schemaPath,team:requestedTeam,seed=1,mode='preview',commentaryMapPath}) {
  if(mode!=='preview')throw new Error('Roster Generator is preview-only. Apply is not implemented.');
  if(typeof requestedTeam!=='string'||!requestedTeam.trim())throw new Error('Select exactly one team by its name.');
  const before=saveFingerprint(savePath),opened=await openCfb27Save(savePath,schemaPath);
  const {players,teams,rosters,visuals,season}=await readTables(opened.franchise,{players:PLAYER_TABLE_UID,teams:TEAM_TABLE_UID,rosters:ROSTER_TABLE_UID,visuals:VISUALS_TABLE_UID,season:SEASON_INFO_TABLE_UID});
  const matches=teams.records.filter(record=>record&&!record.isEmpty&&String(sf(record,'DisplayName')??'').trim().toLowerCase()===requestedTeam.trim().toLowerCase());
  if(matches.length!==1)throw new Error(matches.length?'Team name is ambiguous.':'That team is not in this save. Use its exact displayed name.');
  const selected=matches[0];if(isDirectionalFcsTeam(selected))throw new Error('The first prototype supports FBS/custom-team rosters, not built-in directional FCS rosters.');
  const rosterRef=parseRef(sf(selected,'Roster'));if(rosterRef?.tableId!==rosters.header.tableId)throw new Error('Selected team has an invalid roster reference.');
  const roster=rosters.records[rosterRef.row];if(!roster||roster.isEmpty||!Number.isInteger(Number(roster.arraySize)))throw new Error('Selected roster is missing or malformed.');
  const owners=new Map();for(const [row,player]of players.records.entries()){if(!player||player.isEmpty)continue;const ref=parseRef(sf(player,'CharacterVisuals'));if(ref?.tableId===visuals.header.tableId){if(!owners.has(ref.row))owners.set(ref.row,[]);owners.get(ref.row).push(row);}}
  const targets=[];
  for(let i=0;i<Number(roster.arraySize);i++){
    const ref=parseRef(sf(roster,`Player${i}`));if(!ref)continue;if(ref.tableId!==players.header.tableId||!players.records[ref.row]||players.records[ref.row].isEmpty)throw new Error('Selected team contains an invalid player reference.');
    const record=players.records[ref.row],position=String(sf(record,'Position')??''),vr=parseRef(sf(record,'CharacterVisuals'));
    if(!VALID_POSITIONS.includes(position))throw new Error(`Position ${position} is not supported by the observed profile bank.`);
    if(Number(sf(record,'TeamIndex'))!==Number(sf(selected,'TeamIndex')))throw new Error('Roster ownership disagrees with the Player table. No players were silently reassigned.');
    if(vr?.tableId!==visuals.header.tableId||!visuals.records[vr.row]||visuals.records[vr.row].isEmpty)throw new Error('Selected player has no valid appearance row.');
    const original=Object.fromEntries(WRITE_FIELDS.map(field=>[field,sf(record,field)]));if(Object.values(original).some(value=>value===undefined))throw new Error('Selected player lacks a field required by this prototype.');
    targets.push({row:ref.row,position,original,visualRow:vr.row,visualOwners:owners.get(vr.row),rawData:sf(visuals.records[vr.row],'RawData')});
  }
  const team={name:String(sf(selected,'DisplayName')),teamIndex:Number(sf(selected,'TeamIndex')),branding:String(sf(selected,'TeamApparel')??'').trim().toLowerCase()};
  const unavailableNames=players.records.filter(record=>record&&!record.isEmpty).map(record=>`${sf(record,'FirstName')??''} ${sf(record,'LastName')??''}`);
  const mapFile=commentaryMapPath??path.resolve(path.dirname(schemaPath),'../commentary-data/PlayerCommentaryidMap.txt');
  const preview=generateRosterPreview({team,targets,model:loadObservedCatalog(),seed,unavailableNames,matchCommentary:createCommentaryMatcher(loadCommentaryMap(mapFile),{allowPhonetic:false,allowFirstName:true})});
  if(saveFingerprint(savePath)!==before)throw new Error('The source save changed while Preview was running. Discard this preview and retry.');
  const seasonRecord=season.records.find(record=>record&&!record.isEmpty);
  return {...preview,source:{file:path.basename(savePath),sha256:before,unchanged:true,season:{year:sf(seasonRecord,'CurrentSeasonYear'),week:sf(seasonRecord,'CurrentWeek'),stage:sf(seasonRecord,'CurrentWeekType')}}};
}
