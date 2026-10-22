import {parseRef} from '../equipment/openSave.js';
const GROUPS={QB:['QB'],HB:['HB','FB'],FB:['FB','TE','HB'],WR:['WR','TE','HB'],TE:['TE','FB'],LT:['LT','RT','LG','RG','C'],LG:['LG','RG','C','LT','RT'],C:['C','LG','RG','LT','RT'],RG:['RG','LG','C','RT','LT'],RT:['RT','LT','RG','LG','C'],LE:['LE','RE','DT'],RE:['RE','LE','DT'],DT:['DT','LE','RE'],NT:['DT','LE','RE'],LOLB:['LOLB','MLB','ROLB'],MLB:['MLB','LOLB','ROLB'],ROLB:['ROLB','MLB','LOLB'],CB:['CB','FS','SS'],FS:['FS','SS','CB'],SS:['SS','FS','CB'],K:['K','P'],P:['P','K'],KOS:['K','P'],'3DRB':['HB','FB'],PWHB:['HB','FB'],SLWR:['WR','HB','TE'],GAD:['WR','HB','QB','TE'],RDT:['DT','LE','RE'],RLE:['LE','RE','LOLB','ROLB'],RRE:['RE','LE','ROLB','LOLB'],SLCB:['CB','FS','SS'],SUBLB:['MLB','LOLB','ROLB','SS','FS'],KR:['HB','WR','CB','FS','SS'],PR:['HB','WR','CB','FS','SS'],LS:['C','LG','RG','LT','RT','TE']};
const refKey=ref=>ref&&`${ref.tableId}:${ref.row}`;
export function depthScore(player,slot){const f=player.fields,v=name=>Number(f[name]??0);if(slot==='LS')return v('LongSnapRating');if(['KR','PR'].includes(slot))return v('KickReturnRating')*.6+v('SpeedRating')*.25+v('AgilityRating')*.15;if(slot==='KOS')return v('KickPowerRating');if(['RLE','RRE','RDT'].includes(slot))return Math.max(v('PowerMovesRating'),v('FinesseMovesRating'))*.5+v('OverallRating')*.3+v('SpeedRating')*.2;if(slot==='3DRB')return v('OverallRating')*.5+v('CatchingRating')*.25+v('PassBlockRating')*.25;if(slot==='PWHB')return v('OverallRating')*.5+v('TruckingRating')*.3+v('StrengthRating')*.2;return v('OverallRating');}
export function rankDepthPlayers(players,slot){const positions=GROUPS[slot];if(!positions)return [];const specialized=['KR','PR','LS','KOS','RLE','RRE','RDT','3DRB','PWHB','SLWR','SLCB','SUBLB','GAD'].includes(slot);return players.filter(p=>positions.includes(p.position)).sort((a,b)=>(specialized?0:positions.indexOf(a.position)-positions.indexOf(b.position))||depthScore(b,slot)-depthScore(a,slot)||b.fields.OverallRating-a.fields.OverallRating||a.row-b.row);}
async function referenced(loaded,ref){const table=ref&&loaded.franchise.tables.find(t=>t.header.tableId===ref.tableId);if(!table)return null;await table.readRecords();const record=table.records[ref.row];return record&&!record.isEmpty?{table,record}:null;}
export async function planRosterDepthCharts(loaded,rosters){
  if(loaded.kind==='roster')return rosters.map(r=>({team:r.team.name,status:'kept',reason:'Play Now roster depth charts are retained. Reorder generated teams in-game.',changes:[],slots:[]}));
  if(rosters.every(r=>!r.summary.settings.reorderDepthChart))return rosters.map(r=>({team:r.team.name,status:'kept',reason:'Automatic reordering is off.',changes:[],slots:[]}));
  const owners=new Map();for(const table of loaded.franchise.tables.filter(t=>t.name==='DepthChart')){await table.readRecords();for(const record of table.records.filter(r=>!r.isEmpty))for(const column of table.offsetTable){const key=refKey(parseRef(record[column.name]));if(key)owners.set(key,(owners.get(key)??0)+1);}}
  const plans=[];
  for(const roster of rosters){
    const plan={team:roster.team.name,status:'kept',reason:'Automatic reordering is off.',changes:[],slots:[]};plans.push(plan);if(!roster.summary.settings.reorderDepthChart)continue;
    const team=loaded.teams.records.find(t=>!t.isEmpty&&t.TeamIndex===roster.team.teamIndex),chartRef=parseRef(team?.DepthChart),chart=await referenced(loaded,chartRef);
    if(!chart||chart.table.name!=='DepthChart'){plan.reason='No supported depth chart was found. Reorder in-game.';continue;}
    if(loaded.teams.records.filter(t=>!t.isEmpty&&t.DepthChart===team.DepthChart).length!==1){plan.reason='The depth chart is shared; it was kept unchanged. Reorder in-game.';continue;}
    const locks=await referenced(loaded,parseRef(chart.record.LockedEntries));if(locks&&Number(locks.record.arraySize)>0){plan.reason='Existing manual depth-chart locks were preserved. Reorder in-game if needed.';continue;}
    const pending=[],slots=[];let reason='';
    for(const column of chart.table.offsetTable){
      const slot=column.name;if(slot==='LockedEntries')continue;
      if(!GROUPS[slot]){reason=`Unsupported depth-chart slot ${slot}; chart kept unchanged.`;break;}
      const ref=parseRef(chart.record[slot]),list=await referenced(loaded,ref),size=Number(list?.record.arraySize);
      if(!list||list.table.name!=='Player[]'||!Number.isInteger(size)||size<0||size>100||owners.get(refKey(ref))!==1){reason='Shared or unsupported depth-chart storage was kept unchanged. Reorder in-game.';break;}
      const existing=[];for(let i=0;i<size;i++){const p=parseRef(list.record['Player'+i]);if(!p||p.tableId!==loaded.players.header.tableId||!roster.players.some(player=>player.row===p.row)){reason='A depth-chart entry is not on the generated roster. Chart kept unchanged.';break;}existing.push(p.row);}if(reason)break;
      const ranked=rankDepthPlayers(roster.players,slot),chosen=[...ranked];for(const row of existing)if(!chosen.some(p=>p.row===row))chosen.push(roster.players.find(p=>p.row===row));if(chosen.length<size){reason='Not enough valid players to fill this depth chart. Chart kept unchanged.';break;}
      const selected=chosen.slice(0,size);slots.push({slot,players:selected.map(p=>({row:p.row,name:`${p.fields.FirstName} ${p.fields.LastName}`,overall:p.fields.OverallRating,score:depthScore(p,slot)}))});
      for(let i=0;i<size;i++){const field='Player'+i,oldValue=list.record[field],newValue=loaded.players.header.tableId.toString(2).padStart(15,'0')+selected[i].row.toString(2).padStart(17,'0');if(oldValue!==newValue)pending.push({tableId:list.table.header.tableId,row:ref.row,field,oldValue,newValue,slot});}
    }
    if(reason){plan.reason=reason;continue;}plan.status='reordered';plan.reason='Ranked by natural position, overall and specialist skills; roster links, list sizes and locks unchanged.';plan.changes=pending;plan.slots=slots;
  }
  return plans;
}
export function applyRosterDepthCharts(loaded,plans){
  const changes=plans.flatMap(plan=>plan.changes),guards=new Map();
  for(const c of changes){const table=loaded.franchise.tables.find(t=>t.header.tableId===c.tableId);if(!guards.has(c.tableId))guards.set(c.tableId,table.records.map(record=>({empty:record.isEmpty,bytes:Buffer.from(record.hexData)})));const record=table.records[c.row],field=table.offsetTable.find(f=>f.name===c.field);if(record[c.field]!==c.oldValue||!field?.isReference||field.length!==32||!/^Player\d+$/.test(c.field))throw new Error('Depth-chart preview is stale or unsupported.');const expected=guards.get(c.tableId)[c.row].bytes;for(let bit=0;bit<32;bit++){const index=field.offset+bit,mask=1<<(7-index%8);expected[Math.floor(index/8)]=(expected[Math.floor(index/8)]&~mask)|(c.newValue[bit]==='1'?mask:0);}record[c.field]=c.newValue;}
  verifyRosterDepthCharts(loaded,guards);return guards;
}
export function verifyRosterDepthCharts(loaded,guards){for(const [id,rows]of guards){const table=loaded.franchise.tables.find(t=>t.header.tableId===id);if(!table||table.records.length!==rows.length||table.records.some((record,i)=>record.isEmpty!==rows[i].empty||!Buffer.from(record.hexData).equals(rows[i].bytes)))throw new Error('Unexpected depth-chart change. The original save was kept unchanged.');}}
