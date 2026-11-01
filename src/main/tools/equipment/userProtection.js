import {parseRef,sf} from './openSave.js';

export const EQUIPMENT_USER_TABLE_UID=3429237668;
export const EQUIPMENT_FRANCHISE_TABLE_UID=2226370608;
const reference=value=>typeof value==='string'&&/^[01]{32}$/.test(value)?parseRef(value):null;

// Identify the human player by saved references, never by a filename, name,
// roster position, or the editable original-EA-player protection setting.
export function buildEquipmentUserProtection({players,visuals,franchiseUsers,franchiseInfo}){
  const playerRows=new Set(),visualRows=new Set(),blockedPlayerRows=new Set();
  const playerTableId=players.header.tableId,visualTableId=visuals?.header.tableId;
  const protect=value=>{
    const ref=reference(value);
    if(ref?.tableId!==playerTableId)return; // Dynasty users normally reference coaches.
    const record=players.records[ref.row];
    if(!record||record.isEmpty)throw Error('The save references an unavailable RTG player. Equipment tools cannot safely protect that player.');
    playerRows.add(ref.row);
    const visual=reference(sf(record,'CharacterVisuals'));
    if(visuals&&(!visual||visual.tableId!==visualTableId||!visuals.records[visual.row]||visuals.records[visual.row].isEmpty))throw Error('Your RTG player’s equipment could not be identified safely. No equipment changes were made.');
    if(visual&&(!visuals||visual.tableId===visualTableId))visualRows.add(visual.row);
  };
  for(const user of franchiseUsers?.records??[])if(user&&!user.isEmpty)protect(sf(user,'UserEntity'));
  // The owner also identifies the player if the user registration is absent.
  for(const info of franchiseInfo?.records??[])if(info&&!info.isEmpty)protect(sf(info,'LeagueOwner'));
  players.records.forEach((record,row)=>{
    if(!record||record.isEmpty)return;
    const ref=reference(sf(record,'CharacterVisuals'));
    if(playerRows.has(row)||ref&&(!visuals||ref.tableId===visualTableId)&&visualRows.has(ref.row))blockedPlayerRows.add(row);
  });
  return {playerRows,visualRows,blockedPlayerRows};
}

export function assertEquipmentUserProtection(loaded,assignments){
  const protection=loaded.userProtection;
  if(!protection)return;
  for(const change of assignments)if(change.table==='players'&&protection.blockedPlayerRows.has(change.row)||change.table==='visuals'&&protection.visualRows.has(change.row))throw Error('This preview would change your protected RTG player. Run Preview again. Your save has not been written.');
}

export function equipmentUserProtectionAudit(loaded){
  const rows=loaded.userProtection?.playerRows??new Set();
  return {players:rows.size,sharedPlayersProtected:(loaded.userProtection?.blockedPlayerRows.size??0)-rows.size};
}
