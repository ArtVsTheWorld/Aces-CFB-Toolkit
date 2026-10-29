import {readTables} from '../../services/save.js';
import {SEASON_INFO_TABLE_UID,validateEquipmentSeason} from '../equipment/shared.js';

export function validateRosterGeneratorSeason(record) {
  return validateEquipmentSeason(record,'Roster Generator');
}
export async function rosterGeneratorSeason(loaded){
  if(loaded.kind==='roster')return {fileKind:'roster',currentWeekType:null,currentWeek:null};
  const {seasonInfo}=await readTables(loaded.franchise,{seasonInfo:SEASON_INFO_TABLE_UID});
  return validateRosterGeneratorSeason(seasonInfo.records.find(record=>record&&!record.isEmpty));
}
