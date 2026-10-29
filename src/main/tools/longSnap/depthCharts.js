import {parseRef,sf} from '../equipment/openSave.js';

export const LONG_SNAP_POSITIONS=new Set(['TE','C','LG','RG']);
const key=ref=>ref&&`${ref.tableId}:${ref.row}`;
const reference=(tableId,row)=>tableId.toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
export function rankLongSnappers(records,rosterRows,teamIndex,ratings=new Map()){
  return [...new Set(rosterRows)].flatMap(row=>{
    const record=records[row],position=String(sf(record,'Position')??''),rating=Number(ratings.has(row)?ratings.get(row):sf(record,'LongSnapRating'));
    if(!record||record.isEmpty||Number(sf(record,'TeamIndex'))!==teamIndex||!LONG_SNAP_POSITIONS.has(position)||!Number.isFinite(rating))return [];
    return [{row,position,rating,overall:Number(sf(record,'OverallRating'))||0,player:`${sf(record,'FirstName')??''} ${sf(record,'LastName')??''}`.trim(),classYear:String(sf(record,'SchoolYear')??'')}];
  }).sort((a,b)=>b.rating-a.rating||b.overall-a.overall||a.row-b.row);
}

export async function planLongSnapDepthCharts(loaded,ratings=new Map()){
  const {franchise,players,teams,rosters}=loaded,read=new Set(),owners=new Map(),chartOwners=new Map();
  const own=ref=>{if(ref)owners.set(key(ref),(owners.get(key(ref))??0)+1);};
  const readTable=async table=>{if(table&&!read.has(table.header.tableId)){await table.readRecords();read.add(table.header.tableId);}return table;};
  const dereference=async value=>{const ref=parseRef(value),table=await readTable(ref&&franchise.tables.find(t=>t.header.tableId===ref.tableId)),record=table?.records[ref.row];return record&&!record.isEmpty?{ref,table,record}:null;};
  for(const table of franchise.tables.filter(t=>t.name==='DepthChart')){
    await readTable(table);for(const record of table.records.filter(r=>r&&!r.isEmpty))for(const field of table.offsetTable)if(field.isReference)own(parseRef(sf(record,field.name)));
  }
  for(const team of teams.records.filter(t=>t&&!t.isEmpty)){
    const chart=parseRef(sf(team,'DepthChart'));if(chart)chartOwners.set(key(chart),(chartOwners.get(key(chart))??0)+1);
    own(parseRef(sf(team,'Roster')));
  }
  const plans=[];
  for(const team of teams.records.filter(t=>t&&!t.isEmpty&&Number.isInteger(Number(sf(t,'TeamIndex')))&&Number(sf(t,'TeamIndex'))>=0&&Number(sf(t,'TeamIndex'))!==255)){
    const teamIndex=Number(sf(team,'TeamIndex')),plan={team:String(sf(team,'DisplayName')??`Team ${teamIndex}`),teamIndex,status:'skipped',reason:'',before:[],after:[],assignments:[]};plans.push(plan);
    const skip=reason=>{plan.reason=reason;};
    const chart=await dereference(sf(team,'DepthChart'));
    if(!chart||chart.table.name!=='DepthChart'||chartOwners.get(key(chart.ref))!==1){skip('Missing or shared depth chart; LS order kept unchanged.');continue;}
    const lsField=chart.table.offsetTable.find(field=>field.name==='LS');
    if(!lsField?.isReference||lsField.length!==32){skip('Unsupported long-snapper depth chart; LS order kept unchanged.');continue;}
    const list=await dereference(sf(chart.record,'LS')),size=Number(list?.record.arraySize);
    if(!list||list.table.name!=='Player[]'||!Number.isInteger(size)||size<1||size>100||owners.get(key(list.ref))!==1||Array.from({length:size},(_,i)=>list.table.offsetTable.find(f=>f.name==='Player'+i)).some(f=>!f?.isReference||f.length!==32)){
      skip('Shared or unsupported long-snapper list; LS order kept unchanged.');continue;
    }
    const lockValue=sf(chart.record,'LockedEntries');let locked=false;
    if(lockValue&&lockValue!=='0'.repeat(32)){
      const locks=await dereference(lockValue),count=Number(locks?.record.arraySize);
      if(!locks||locks.table.name!=='ForcedDepthChartEntry[]'||!Number.isInteger(count)||count<0||count>100)locked=true;
      else for(let i=0;i<count;i++){
        const entry=await dereference(sf(locks.record,'ForcedDepthChartEntry'+i)),position=String(sf(entry?.record,'Position')??'');
        if(!entry||entry.table.name!=='ForcedDepthChartEntry'||position==='LS'||!chart.table.offsetTable.some(field=>field.name===position&&field.name!=='LockedEntries')){locked=true;break;}
      }
    }
    if(locked){skip('Manual LS locks or unreadable lock data were preserved; LS order kept unchanged.');continue;}
    const rosterRef=parseRef(sf(team,'Roster')),roster=rosterRef?.tableId===rosters.header.tableId&&rosters.records[rosterRef.row],count=Number(roster?.arraySize),rosterRows=[];
    if(!roster||roster.isEmpty||!Number.isInteger(count)||count<1||count>200||owners.get(key(rosterRef))!==1){skip('Missing or shared team roster; LS order kept unchanged.');continue;}
    let invalid=false;
    for(let i=0;i<count;i++){
      const ref=parseRef(sf(roster,'Player'+i)),record=ref?.tableId===players.header.tableId&&players.records[ref.row];
      if(!record||record.isEmpty||Number(sf(record,'TeamIndex'))!==teamIndex){invalid=true;break;}rosterRows.push(ref.row);
    }
    if(invalid){skip('Invalid player references in the team roster; LS order kept unchanged.');continue;}
    const selected=rankLongSnappers(players.records,rosterRows,teamIndex,ratings).slice(0,size);
    if(selected.length<size){skip('Not enough rostered TEs, centers and guards to fill the LS list; order kept unchanged.');continue;}
    const active=new Set(rosterRows);
    for(let i=0;i<size;i++){
      const oldValue=sf(list.record,'Player'+i),ref=parseRef(oldValue);
      if(ref&&(ref.tableId!==players.header.tableId||!active.has(ref.row))){invalid=true;break;}
      const record=ref&&players.records[ref.row];
      plan.before.push({depth:i+1,row:ref?.row??null,player:record?`${sf(record,'FirstName')??''} ${sf(record,'LastName')??''}`.trim():'Not assigned',position:record?String(sf(record,'Position')):''});
      plan.after.push({...selected[i],depth:i+1});
      const newValue=reference(players.header.tableId,selected[i].row);
      if(oldValue!==newValue)plan.assignments.push({tableId:list.table.header.tableId,row:list.ref.row,field:'Player'+i,oldValue,newValue});
    }
    if(invalid){plan.assignments=[];plan.before=[];plan.after=[];skip('Invalid LS player references; order kept unchanged.');continue;}
    plan.status=plan.assignments.length?'reordered':'unchanged';plan.reason='Highest Long Snap rating first; only rostered TEs, centers and guards.';
  }
  return plans;
}
