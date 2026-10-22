import {readTables} from '../../services/save.js';
import {SEASON_INFO_TABLE_UID} from '../equipment/shared.js';
import {sf} from '../equipment/openSave.js';

export function validateRosterGeneratorSeason(record) {
  const type=String(sf(record,'CurrentWeekType')??''),week=Number(sf(record,'CurrentWeek'));
  if(!Number.isInteger(week)||week!==0||!['PreSeason','RegularSeason'].includes(type))throw new Error(`Roster Generator is available only in Preseason or Week 0. This save is ${type||'an unknown stage'}, week ${Number.isFinite(week)?week:'unknown'}.`);
  return {currentWeekType:type,currentWeek:week};
}
export async function rosterGeneratorSeason(loaded){
  if(loaded.kind==='roster')return {fileKind:'roster',currentWeekType:null,currentWeek:null};
  const {seasonInfo}=await readTables(loaded.franchise,{seasonInfo:SEASON_INFO_TABLE_UID});
  return validateRosterGeneratorSeason(seasonInfo.records.find(record=>record&&!record.isEmpty));
}
