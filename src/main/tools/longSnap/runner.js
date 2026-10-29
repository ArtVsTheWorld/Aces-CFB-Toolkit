import path from 'node:path';import{isDeepStrictEqual}from'node:util';
import{createBackup}from'../../services/files.js';
import{openCfb27Save,readTables,PLAYER_TABLE_UID,TEAM_TABLE_UID}from'../../services/save.js';
import{mulberry32,patchLongSnapRatings,summarizeDistribution}from'./core.js';
import{completePlan,saveFingerprint,storePlan,takePlan}from'../jersey/planStore.js';
import{planLongSnapDepthCharts}from'./depthCharts.js';import{saveLongSnapCandidate}from'./save.js';
const load=async(savePath,schemaPath)=>{const loaded=await openCfb27Save(savePath,schemaPath);return{...loaded,...await readTables(loaded.franchise,{players:PLAYER_TABLE_UID,teams:TEAM_TABLE_UID,rosters:461505069})};};
const depthLabel=depth=>depth?`LS #${depth}`:'Not on LS chart';
function previewRows(loaded,changes,charts){
 const names=new Map(loaded.teams.records.filter(r=>r&&!r.isEmpty).map(r=>[Number(r.TeamIndex),String(r.DisplayName||r.LongName||r.ShortName)])),rows=new Map();
 const get=(row,teamIndex)=>{
  const key=teamIndex+':'+row;if(!rows.has(key)){const record=loaded.players.records[row];rows.set(key,{row,team:names.get(teamIndex)??`Team ${teamIndex}`,player:`${record.FirstName??''} ${record.LastName??''}`.trim(),position:record.Position,classYear:record.SchoolYear,overall:Number(record.OverallRating??0),oldRating:Number(record.LongSnapRating),newRating:Number(record.LongSnapRating),reason:'',changeType:'depth-chart',oldDepth:null,newDepth:null});}return rows.get(key);
 };
 for(const c of changes)Object.assign(get(c.row,c.teamIndex),{oldRating:c.oldRating,newRating:c.newRating,reason:c.reason,changeType:c.kind});
 for(const chart of charts.filter(chart=>chart.status==='reordered'))for(const row of new Set([...chart.before,...chart.after].map(p=>p.row).filter(row=>row!==null))){
  const oldDepth=chart.before.find(p=>p.row===row)?.depth??null,newDepth=chart.after.find(p=>p.row===row)?.depth??null;if(oldDepth===newDepth)continue;
  const item=get(row,chart.teamIndex);item.oldDepth=oldDepth;item.newDepth=newDepth;item.depthChanged=true;item.currentValue=depthLabel(oldDepth);item.proposedValue=depthLabel(newDepth);item.reason+=(item.reason?' · ':'')+'LS chart: '+item.currentValue+' → '+item.proposedValue+'; TEs, centers and guards only.';
 }
 return [...rows.values()].sort((a,b)=>a.team.localeCompare(b.team)||a.player.localeCompare(b.player)||a.row-b.row);
}
export async function runLongSnap({savePath,mode,options={},schemaPath,reports}){
 if(!['preview','apply'].includes(mode))throw Error('Run mode must be preview or apply.');
 if(mode==='apply'){
  const plan=takePlan(options.planId);
  if(plan.toolId!=='long-snap'||path.resolve(plan.savePath)!==path.resolve(savePath))throw Error('The preview does not belong to Long Snap Rating Fixer and this Active Save.');
  if(saveFingerprint(savePath)!==plan.saveFingerprint)throw Error('The save changed after Preview. Run Preview again before Apply.');
  const loaded=await load(savePath,schemaPath);
  for(const c of plan.assignments){const r=loaded.players.records[c.row];if(!r||r.isEmpty||Number(r.LongSnapRating)!==Number(c.oldRating))throw Error(`Player row ${c.row} changed after Preview. Run Preview again.`);}
  const charts=await planLongSnapDepthCharts(loaded,new Map(plan.assignments.map(c=>[c.row,c.newRating])));
  if(!isDeepStrictEqual(charts,plan.depthCharts))throw Error('Long-snapper depth charts changed after Preview. Run Preview again.');
  const reportPath=reports.create(plan.report),changed=plan.assignments.length+plan.depthAssignments.length;let backupPath=null;
  if(changed){
   backupPath=createBackup(savePath);
   for(const c of plan.assignments)loaded.players.records[c.row].LongSnapRating=c.newRating;
   for(const c of plan.depthAssignments){const table=loaded.franchise.tables.find(t=>t.header.tableId===c.tableId),record=table?.records[c.row],field=table?.offsetTable.find(f=>f.name===c.field);if(!record||record.isEmpty||record[c.field]!==c.oldValue||!field?.isReference||field.length!==32||!/^Player\d+$/.test(c.field))throw Error('The long-snapper depth-chart preview is stale or unsupported.');record[c.field]=c.newValue;}
   await saveLongSnapCandidate(loaded,schemaPath,plan.saveFingerprint);
  }
  completePlan(options.planId);return{...plan.result,status:changed?'completed':'no-changes',mode,backupPath,reportPath};
 }
 const fingerprint=saveFingerprint(savePath),loaded=await load(savePath,schemaPath),sample=loaded.players.records.find(r=>r&&!r.isEmpty);
 if(!sample||sample.LongSnapRating===undefined||sample.Position===undefined||sample.TeamIndex===undefined)throw Error('The player data does not expose the fields required by Long Snap Rating Fixer.');
 const seed=Math.floor(Math.random()*0x100000000),changes=patchLongSnapRatings(loaded.players.records,{random:mulberry32(seed)}),distribution=summarizeDistribution(changes),charts=await planLongSnapDepthCharts(loaded,new Map(changes.map(c=>[c.row,c.newRating]))),rows=previewRows(loaded,changes,charts),depthAssignments=charts.flatMap(chart=>chart.assignments),reordered=charts.filter(chart=>chart.status==='reordered').length,skipped=charts.filter(chart=>chart.status==='skipped');
 const report={toolId:'long-snap',toolName:'Long Snap Rating Fixer',prefix:'long-snap-ratings-report',headings:['Row','Team','Player','Position','Overall','OldRating','NewRating','Reason','PreviousLSDepth','NewLSDepth','DepthChartsJSON'],rows:rows.map((r,i)=>[r.row,r.team,r.player,r.position,r.overall,r.oldRating,r.newRating,r.reason,r.oldDepth??'',r.newDepth??'',i===0?JSON.stringify(charts):''])};
 const result={status:'preview',mode,savePath:loaded.savePath,backupPath:null,reportPath:reports.create(report),summary:[{label:'Players affected',value:rows.length},{label:'LS charts reordered',value:reordered},{label:'Ratings changed',value:distribution.count},{label:'Tight ends normalized',value:distribution.tightEnds},{label:'Interior linemen normalized',value:distribution.offensiveLinemen}],historySummary:[{label:'Players normalized',value:distribution.count},{label:'LS charts reordered',value:reordered}],resultKind:'long-snap',details:{seed,distribution,depthCharts:charts,depthChartsReordered:reordered,depthChartsSkipped:skipped.length,warnings:skipped.length?[`${skipped.length} teams kept their LS order because roster data, shared storage or manual locks could not safely be changed.`]:[],totalCorrectionActions:changes.length+depthAssignments.length,totalPreviewRows:rows.length,changes:rows.slice(0,1000),canApply:changes.length+depthAssignments.length>0}};
 if(saveFingerprint(savePath)!==fingerprint)throw Error('The save changed during Preview. Run Preview again.');
 const assignments=changes.map(c=>({row:c.row,oldRating:c.oldRating,newRating:c.newRating}));
 return{...result,planId:storePlan({toolId:'long-snap',savePath,saveFingerprint:fingerprint,assignments,depthAssignments,depthCharts:charts,previewRows:rows,report,result})};
}
