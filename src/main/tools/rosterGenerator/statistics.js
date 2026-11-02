import {createHash} from 'node:crypto';
import {parseRef,sf} from '../equipment/openSave.js';

const families=new Set(['','Offensive','OffensiveKPReturn','Defensive','DefensiveKPReturn','Kicking','OLine']);
const metadata=new Set(['SEAS_YEAR','YEARBYYEARTEAMINDEX']);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const key=ref=>`${ref.tableId}:${ref.row}`;
const scopeOf=name=>{const match=/^(Career|Season)(.*)Stats$/.exec(name);return match&&families.has(match[2])?match[1].toLowerCase():null;};
const cleared=(bytes,fields)=>{const after=Buffer.from(bytes);for(const field of fields)for(let bit=field.offset;bit<field.offset+field.length;bit++)after[bit>>3]&=~(1<<(7-bit%8));return after;};

// Keep native references, year/team metadata, flags, record sizes and historical
// team/game records. Only numeric season/career counters owned by replaced
// players are reset. Read numeric rows as raw bits rather than expanding every
// stat field into another dynasty-sized graph of JS field objects.
export async function planRosterStatisticsReset(loaded,selectedRows){
  const selected=new Set(selectedRows),tables=new Map(loaded.franchise.tables.map(table=>[table.header.tableId,table])),reads=new Map(),owners=new Map();
  const read=async table=>{if(!reads.has(table))reads.set(table,table.readRecords(table.name==='SeasonStats[]'?undefined:[]));await reads.get(table);};
  const resolve=async(value,owner,scope,array=false)=>{
    if(value==null||value==='0'.repeat(32))return null;
    const ref=parseRef(value),table=ref&&tables.get(ref.tableId);
    if(!ref||String(value)[0]==='1'||!table||(array?table.name!=='SeasonStats[]':scopeOf(table.name)!==scope)){
      if(selected.has(owner))throw new Error(`Player row ${owner} has unsupported ${scope} statistics. No save was written.`);return null;
    }
    await read(table);const record=table.records[ref.row];
    if(!record||record.isEmpty){if(selected.has(owner))throw new Error(`Player row ${owner} has an invalid ${scope} statistics reference. No save was written.`);return null;}
    if(!array){const id=key(ref),entry=owners.get(id)??{table,record,scope,owners:new Set()};entry.owners.add(owner);owners.set(id,entry);}
    return {table,record};
  };
  for(const [row,player]of loaded.players.records.entries()){
    if(!player||player.isEmpty)continue;
    await resolve(sf(player,'CareerStats'),row,'career');
    const seasons=await resolve(sf(player,'SeasonStats'),row,'season',true);if(!seasons)continue;
    const size=Number(seasons.record.arraySize),columns=seasons.table.offsetTable.filter(field=>field.isReference);
    if(!Number.isInteger(size)||size<0||size>columns.length){if(selected.has(row))throw new Error(`Player row ${row} has an invalid season statistics list. No save was written.`);continue;}
    for(const field of columns.slice(0,size))await resolve(sf(seasons.record,field.name),row,'season');
  }
  const changes=[],changedPlayers=new Set();let careerRows=0,seasonRows=0;
  for(const entry of owners.values()){
    const affected=[...entry.owners].filter(row=>selected.has(row));if(!affected.length)continue;
    const {table,record,scope}=entry,fields=table.offsetTable.filter(field=>field.type==='int'&&!field.isReference&&!field.enum&&!metadata.has(field.name));
    if(!fields.length||fields.some(field=>!Number.isInteger(field.offset)||!Number.isInteger(field.length)||field.offset<0||field.length<1||field.offset+field.length>record.hexData.length*8))throw new Error(`Unsupported ${table.name} statistics layout. No save was written.`);
    if(scope==='career')careerRows++;else seasonRows++;
    const before=Buffer.from(record.hexData),after=cleared(before,fields);if(before.equals(after))continue;
    if(affected.length!==entry.owners.size)throw new Error(`Player row ${affected[0]} shares nonzero ${scope} statistics with a player outside this run. No save was written.`);
    affected.forEach(row=>changedPlayers.add(row));
    changes.push({tableId:table.header.tableId,table:table.name,row:record.index,scope,players:affected.sort((a,b)=>a-b),before:before.toString('hex'),after:after.toString('hex')});
  }
  changes.sort((a,b)=>a.tableId-b.tableId||a.row-b.row);
  return {version:1,mode:'season-and-career',summary:{players:selected.size,playersWithStats:changedPlayers.size,careerRows,seasonRows,rowsCleared:changes.length},changes};
}

export function applyRosterStatisticsReset(loaded,plan){
  const guards=new Map();
  for(const change of plan.changes){
    const table=loaded.franchise.tables.find(table=>table.header.tableId===change.tableId),record=table?.records[change.row];
    if(!record||record.isEmpty||table.name!==change.table||record.hexData.toString('hex')!==change.before)throw new Error('Player statistics changed after Preview. No save was written.');
    if(!guards.has(change.tableId))guards.set(change.tableId,{table,expected:Buffer.from(table.data)});
    const before=Buffer.from(change.before,'hex'),after=Buffer.from(change.after,'hex'),offset=table.header.table1StartIndex+change.row*table.header.record1Size;
    if(before.length!==after.length||!guards.get(change.tableId).expected.subarray(offset,offset+before.length).equals(before))throw new Error('Unsupported player statistics storage. No save was written.');
    after.copy(guards.get(change.tableId).expected,offset);after.copy(record.hexData);table.isChanged=true;
  }
  for(const [id,guard]of guards){guard.table.updateBuffer?.();if(!guard.table.data.equals(guard.expected))throw new Error('Unexpected change while resetting player statistics. No save was written.');guards.set(id,hash(guard.expected));}
  return guards;
}

export function verifyRosterStatisticsReset(loaded,guards){
  for(const [id,expected]of guards){const table=loaded.franchise.tables.find(table=>table.header.tableId===id);if(!table||hash(table.data)!==expected)throw new Error('Player statistics did not survive save/reload. The original save was kept unchanged.');}
}
