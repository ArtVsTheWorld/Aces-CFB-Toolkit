// Read-only field research; no record setters, Age reads or save writes.
import path from 'node:path';
import {loadEquipmentTables} from '../src/main/tools/equipment/shared.js';
import {sf} from '../src/main/tools/equipment/openSave.js';
const fields=['InjuryStatus','InjuryType','InjurySeverity','MinInjuryDuration','MaxInjuryDuration','TotalInjuryDuration','IsInjuredReserve','WasPreviouslyInjured','CurrentYearSeasonEndingInjuryWeek','LastYearSeasonEndingInjuryWeek','LatestInjuryStage','LatestInjuryWeek','LatestInjuryYear','SeasonHealthPool','SeasonHealthPoolMax','Fatigue','PLYR_HANDEDNESS','PLYR_ISCAPTAIN','CaptainsPatch','IdealRecruitingPitch','HomePipeline','PLYR_CONSECYEARSWITHTEAM'];
const tally=values=>Object.fromEntries([...values.reduce((map,value)=>map.set(String(value),(map.get(String(value))??0)+1),new Map())].sort((a,b)=>b[1]-a[1]));
for(const file of process.argv.slice(2)){
  const loaded=await loadEquipmentTables(file,path.resolve('resources/engine-data/C27_486_6.gz'),true,false),players=loaded.players.records.filter(p=>!p.isEmpty&&p.FirstName&&p.LastName&&Number(p.TeamIndex)!==255),fresh=players.filter(p=>p.SchoolYear==='Freshman'&&p.RedshirtStatus==='Eligible'),healthy=fresh.filter(p=>p.InjuryStatus==='Uninjured');
  const byClass={};for(const p of players){const key=p.SchoolYear+'|'+p.RedshirtStatus;byClass[key]??=[];byClass[key].push(p.PLYR_CONSECYEARSWITHTEAM);}
  const wear=loaded.players.offsetTable.filter(f=>f.name.startsWith('WearAndTear_')).map(f=>f.name),captains=new Map();for(const p of players)if(p.PLYR_ISCAPTAIN)captains.set(p.TeamIndex,(captains.get(p.TeamIndex)??0)+1);
  const geography={fields:loaded.players.offsetTable.filter(f=>/TOWN|STATE|Pipeline|City/.test(f.name)).map(f=>({name:f.name,type:f.type,isReference:f.isReference})),samples:players.slice(0,8).map(p=>({town:p.PLYR_HOME_TOWN,state:p.PLYR_HOME_STATE,pipeline:p.HomePipeline}))};
  console.log(JSON.stringify({file:path.basename(file),players:players.length,fresh:fresh.length,healthy:healthy.length,fields:Object.fromEntries(fields.map(f=>[f,{all:tally(players.map(p=>sf(p,f))),fresh:tally(fresh.map(p=>sf(p,f))),healthy:tally(healthy.map(p=>sf(p,f)))}])),wear:Object.fromEntries(wear.map(f=>[f,tally(fresh.map(p=>sf(p,f)))])),yearsByClass:Object.fromEntries(Object.entries(byClass).map(([k,v])=>[k,tally(v)])),captainCounts:tally([...captains.values()]),captainPatches:tally(players.filter(p=>p.PLYR_ISCAPTAIN).map(p=>p.CaptainsPatch)),geography},null,2));
}
