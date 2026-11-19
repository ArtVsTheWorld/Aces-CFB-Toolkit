import {readTables} from '../../services/save.js';
import {SEASON_INFO_TABLE_UID} from '../equipment/shared.js';
import {sf} from '../equipment/openSave.js';

export function validateRosterGeneratorSeason(record) {
  // Roster generation keeps its own supported window. Equipment editing is
  // available year-round and must no longer define this separate tool's gate.
  const type=String(sf(record,'CurrentWeekType')??''),week=Number(sf(record,'CurrentWeek')),postWeeks=Number(sf(record,'PostSeasonNumWeeks'));
  const allowed=Number.isInteger(week)&&week>=0&&(type==='PreSeason'&&week===0||type==='RegularSeason'&&week<=15||['BowlSeason1','BowlSeason2','BowlSeason3','NationalChampionship'].includes(type)||type==='PostSeason'&&Number.isInteger(postWeeks)&&week<postWeeks);
  if(!allowed)throw Error(`Roster Generator is available from the preseason week immediately before Week 0 through National Championship week. This save is ${type||'an unknown season stage'}, week ${Number.isFinite(week)?week:'unknown'}. Advance to the supported season window and try again.`);
  return {currentWeekType:type,currentWeek:week,postSeasonWeeks:postWeeks};
}
export async function rosterGeneratorSeason(loaded){
  if(loaded.kind==='roster')return {fileKind:'roster',currentWeekType:null,currentWeek:null};
  const {seasonInfo}=await readTables(loaded.franchise,{seasonInfo:SEASON_INFO_TABLE_UID});
  return validateRosterGeneratorSeason(seasonInfo.records.find(record=>record&&!record.isEmpty));
}
