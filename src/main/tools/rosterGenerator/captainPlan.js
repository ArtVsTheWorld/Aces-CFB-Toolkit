import {sf,parseRef} from '../equipment/openSave.js';
import {assignRosterCaptains,naturalCaptainStarters,ROSTER_CAPTAIN_COUNT,CAPTAIN_FIELDS} from './playerState.js';
import {starterSlots} from './depthDistribution.js';

// Use the chart that will actually remain in the save. Manual locks and the
// reordering toggle are respected; old depth-chart roles never become guesses
// about who starts after a newly reordered roster.
export async function rosterCaptainStarterRows(loaded,roster,chart){
  const settings=roster.summary.settings,natural=naturalCaptainStarters(roster.players,settings);
  if(loaded.kind==='roster')return null; // Play Now depth charts are not decoded.
  let slots=chart.status==='reordered'?chart.slots:null;
  if(!slots){
    const team=loaded.teams.records.find(team=>!team.isEmpty&&Number(sf(team,'TeamIndex'))===roster.team.teamIndex);
    async function record(ref){const table=ref&&loaded.franchise.tables.find(table=>table.header.tableId===ref.tableId);if(!table)return null;await table.readRecords();return table.records[ref.row];}
    const depth=await record(parseRef(sf(team,'DepthChart')));slots=[];
    if(depth&&!depth.isEmpty)for(const position of new Set(roster.players.map(player=>player.position))){
      const list=await record(parseRef(sf(depth,position))),size=Number(list?.arraySize);
      if(!list||list.isEmpty||!Number.isInteger(size)||size<0||size>100)continue;
      const players=[];
      for(let i=0;i<Math.min(size,starterSlots(position,size,settings));i++){
        const ref=parseRef(sf(list,'Player'+i));
        if(ref?.tableId===loaded.players.header.tableId&&roster.players.some(player=>player.row===ref.row))players.push({row:ref.row});
      }
      if(players.length)slots.push({slot:position,players});
    }
  }
  const rows=new Set(),bySlot=new Map(slots.map(slot=>[slot.slot,slot]));
  for(const position of new Set(roster.players.map(player=>player.position))){
    const slot=bySlot.get(position);
    if(slot)for(const player of slot.players.slice(0,starterSlots(position,slot.players.length,settings)))rows.add(player.row);
    else for(const player of natural.filter(player=>player.position===position))rows.add(player.row);
  }
  return [...rows].sort((a,b)=>a-b);
}
export function finalizeRosterCaptains(roster,starterRows){
  // Standard jersey allocation has captain/team traditions disabled, and the
  // generated backstories do not depend on captain flags. Reconcile only the
  // captain fields here; do not reroll those passes or the generated players.
  roster.team.captainStarterRows=starterRows;
  roster.summary.finishing.captains=assignRosterCaptains(roster.players,roster.team,roster.summary.settings);
  for(const player of roster.players){
    player.changes=player.changes.filter(change=>!CAPTAIN_FIELDS.includes(change.field));
    for(const field of CAPTAIN_FIELDS)if((!player.persistedFields||player.persistedFields.includes(field))&&player.fields[field]!==player.before[field])player.changes.push({field,oldValue:player.before[field],newValue:player.fields[field]});
  }
}
export function planCaptainTeamCounts(loaded,rosters){
  if(loaded.kind==='roster')return [];
  const field=loaded.teams.offsetTable.find(field=>field.name==='DesiredTeamCaptains');
  if(!field||field.isReference||!Number.isInteger(field.offset)||!Number.isInteger(field.length)||field.length<3||field.length>32)throw Error('Unsupported team captain-count field. No save was written.');
  return rosters.map(roster=>{
    const row=loaded.teams.records.findIndex(team=>!team.isEmpty&&Number(sf(team,'TeamIndex'))===roster.team.teamIndex);
    if(row<0)throw Error('The captain team is missing.');
    const oldValue=Number(sf(loaded.teams.records[row],'DesiredTeamCaptains'));
    if(!Number.isSafeInteger(oldValue)||oldValue<0)throw Error('Invalid stored team captain count.');
    return {row,oldValue,newValue:ROSTER_CAPTAIN_COUNT};
  });
}
export function applyCaptainTeamCounts(loaded,plans){
  if(!plans.length)return null;
  const table=loaded.teams,field=table.offsetTable.find(field=>field.name==='DesiredTeamCaptains');
  const guard={tableId:table.header.tableId,rows:table.records.map(record=>({empty:record.isEmpty,bytes:Buffer.from(record.hexData)}))};
  for(const plan of plans){
    if(sf(table.records[plan.row],'DesiredTeamCaptains')!==plan.oldValue||plan.newValue!==ROSTER_CAPTAIN_COUNT)throw Error('Team captain settings changed after Preview.');
    const bits=plan.newValue.toString(2).padStart(field.length,'0'),expected=guard.rows[plan.row].bytes;
    for(let bit=0;bit<field.length;bit++){const index=field.offset+bit,mask=1<<(7-index%8);expected[Math.floor(index/8)]=(expected[Math.floor(index/8)]&~mask)|(bits[bit]==='1'?mask:0);}
    table.records[plan.row].DesiredTeamCaptains=plan.newValue;
  }
  verifyCaptainTeamCounts(table,guard);return guard;
}
export function verifyCaptainTeamCounts(table,guard){
  if(!guard)return;
  if(table.header.tableId!==guard.tableId||table.records.length!==guard.rows.length||table.records.some((record,row)=>record.isEmpty!==guard.rows[row].empty||!Buffer.from(record.hexData).equals(guard.rows[row].bytes)))throw Error('Unplanned change to team captain settings. The original save was kept unchanged.');
}
