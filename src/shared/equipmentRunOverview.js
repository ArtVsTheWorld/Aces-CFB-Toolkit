// Display metadata only. Call with the complete player preview, never a search
// page. No assignments, save records or equipment choices are changed here.
export function equipmentRunOverview(kind, rows) {
  if (!['freshman-equipment','equipment-patcher','equipment-quickstart','equipment-mapper'].includes(kind)) return null;
  const teams=new Map(),types=new Map();let changes=0,knownTeams=true;
  for(const row of rows){
    const team=String(row.team??'').trim();if(!team)knownTeams=false;
    teams.set(team||'Unknown team',(teams.get(team||'Unknown team')??0)+1);
    const seen=new Set();
    for(const change of row.changes??[]){
      const type=String(change.type??'Equipment'),entry=types.get(type)??{type,players:0,changes:0};
      entry.changes++;changes++;if(!seen.has(type)){entry.players++;seen.add(type);}types.set(type,entry);
    }
  }
  return {players:rows.length,teams:knownTeams?teams.size:null,changes,
    byTeam:[...teams].map(([team,players])=>({team,players})).sort((a,b)=>a.team.localeCompare(b.team)),
    byType:[...types.values()].sort((a,b)=>b.players-a.players||a.type.localeCompare(b.type))};
}
