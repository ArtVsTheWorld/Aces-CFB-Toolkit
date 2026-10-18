import {WRITE_FIELDS} from './contract.js';
import {sf} from '../equipment/openSave.js';

// Compare raw protected bits rather than reading legacy age/birth-date fields.
// Player identity/reference/history fields outside the allowlist must survive.
function protectedBytes(table,record,selected) {
  const bytes=Buffer.from(record.hexData);
  if(selected)for(const field of table.offsetTable.filter(field=>WRITE_FIELDS.includes(field.name))) {
    for(let bit=field.offset;bit<field.offset+field.length;bit++)bytes[Math.floor(bit/8)]&=~(1<<(7-bit%8));
  }
  return bytes;
}
export function snapshotProtectedPlayers(table,selectedRows) {
  const stringFields=table.offsetTable.filter(field=>field.type==='string'&&!WRITE_FIELDS.includes(field.name)).map(field=>field.name);
  return {count:table.records.length,stringFields,rows:table.records.map((record,row)=>({empty:record.isEmpty,bytes:protectedBytes(table,record,selectedRows.has(row)),strings:stringFields.map(field=>sf(record,field))})),selectedRows:new Set(selectedRows)};
}
export function verifyProtectedPlayers(snapshot,table) {
  if(table.records.length!==snapshot.count)throw new Error('Player table capacity changed during regeneration. The original save was kept unchanged.');
  table.records.forEach((record,row)=>{
    const old=snapshot.rows[row];
    if(record.isEmpty!==old.empty||!protectedBytes(table,record,snapshot.selectedRows.has(row)).equals(old.bytes)||snapshot.stringFields.some((field,i)=>sf(record,field)!==old.strings[i]))throw new Error(`Unplanned change to protected player data at row ${row}. The original save was kept unchanged.`);
  });
}
