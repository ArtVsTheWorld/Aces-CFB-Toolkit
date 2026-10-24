import {toolProgress} from '../../services/toolProgress.js';
import {loadEquipmentTables,buildTeamNames,buildRosterPlayerRows,buildTeamApparel,buildRosterPlayerApparel,buildRosterTeamNames,cacheEquipmentPlan,applyEquipmentPlan} from '../equipment/shared.js';
import {parseRef,sf} from '../equipment/openSave.js';
import {mapperLibrary,buildMapperPreview} from './core.js';
import {takePlan,saveFingerprint} from '../jersey/planStore.js';
import {displayPosition} from '../../../shared/localization.js';
import {mapperItemName} from './library.js';
import {isVisualOverflowStorage} from '../equipment/visualStorage.js';

const TOOL_ID='equipment-mapper',TOOL_NAME='Equipment Mapper';
export function mapperPlayers(loaded,{includeInactive=false}={}){
  const names=buildTeamNames(loaded.teams.records),rosterNames=buildRosterTeamNames(loaded.players,loaded.teams,loaded.rosters),brands=buildTeamApparel(loaded.teams.records),rosterBrands=buildRosterPlayerApparel(loaded.players,loaded.teams,loaded.rosters),active=buildRosterPlayerRows(loaded.players,loaded.teams,loaded.rosters),owners=new Map();
  loaded.players.records.forEach((record,row)=>{if(!record||record.isEmpty)return;const ref=parseRef(sf(record,'CharacterVisuals'));if(ref?.tableId===loaded.visuals.header.tableId){if(!owners.has(ref.row))owners.set(ref.row,[]);owners.get(ref.row).push(row);}});
  return loaded.players.records.flatMap((record,row)=>{
    if(!record||record.isEmpty||!includeInactive&&!active.has(row))return [];
    const ref=parseRef(sf(record,'CharacterVisuals'));if(ref?.tableId!==loaded.visuals.header.tableId)return [];
    const rawData=sf(loaded.visuals.records[ref.row],'RawData');if(typeof rawData!=='string')return [];
    const teamIndex=Number(sf(record,'TeamIndex'));
    return [{row,visualRow:ref.row,active:active.has(row),shared:owners.get(ref.row).length>1,team:rosterNames.get(row)??names.get(teamIndex)??'Not on an active roster',teamIndex,player:`${sf(record,'FirstName')} ${sf(record,'LastName')}`,position:String(sf(record,'Position')),classYear:String(sf(record,'SchoolYear')),overall:Number(sf(record,'OverallRating')),branding:rosterBrands.get(row)??brands.get(teamIndex)??'',rawData}];
  });
}
export function mapperSources(loaded){
  const sources=mapperPlayers(loaded,{includeInactive:true}),owned=new Set(sources.map(player=>player.visualRow));
  for(const record of loaded.visuals.records){
    if(!record||record.isEmpty||owned.has(record.index)||isVisualOverflowStorage(record))continue;
    const rawData=sf(record,'RawData');if(typeof rawData!=='string')continue;
    try{if(!JSON.parse(rawData)?.loadouts?.some(loadout=>loadout?.loadoutType==='PlayerOnField'))continue;}catch{continue;}
    sources.push({row:`visual:${record.index}`,visualRow:record.index,active:false,player:`Unassigned equipment row ${record.index}`,team:'Other saved equipment',position:'',classYear:'',rawData});
  }
  return sources;
}
export async function prepareEquipmentMapper({savePath,schemaPath}){
  const fingerprint=saveFingerprint(savePath),loaded=await loadEquipmentTables(savePath,schemaPath,true,false),sources=mapperSources(loaded),players=sources.filter(player=>player.active),library=mapperLibrary(sources);
  if(saveFingerprint(savePath)!==fingerprint)throw new Error('The save changed while reading equipment. Reload Equipment Mapper.');
  const describe=({rawData,branding,visualRow,teamIndex,...player})=>player;
  return {fingerprint,groups:library.groups,items:library.items.map(({element,context,locations,...item})=>({...item,implicitOccurrences:locations.filter(location=>location.implicitSlot).length,configuration:JSON.stringify({element,context})})),issues:library.issues,players:players.map(describe),libraryPlayers:sources.map(describe),teams:[...new Set(players.map(player=>player.team))].sort((a,b)=>a.localeCompare(b)),positions:[...new Set(players.map(player=>player.position))]};
}
export async function runEquipmentMapper(context){
  if(context.mode==='apply'){
    const plan=takePlan(context.options?.planId);
    if(!plan.result.details.canApply)throw new Error('Resolve the incompatible mappings before Apply. No save was written.');
    return applyEquipmentPlan({...context,toolId:TOOL_ID});
  }
  if(context.mode!=='preview')throw new Error('Run mode must be preview or apply.');
  const fingerprint=saveFingerprint(context.savePath);
  if(context.options?.fingerprint!==fingerprint)throw new Error('The equipment library is out of date. Reload Equipment Mapper before Preview.');
  const loaded=await loadEquipmentTables(context.savePath,context.schemaPath,true),players=mapperPlayers(loaded),library=mapperLibrary(mapperSources(loaded)),preview=buildMapperPreview(players,library,context.options?.rules);
  const assignments=preview.changes.map(player=>({table:'visuals',row:player.visualRow,field:'RawData',oldValue:player.rawData,newValue:player.newRawData}));
  // Exercise the same encoding/overflow guards as the other equipment tools
  // during Preview, before any disk write or backup is attempted.
  let encodedCount=0;
  for(const assignment of assignments){loaded.visuals.records[assignment.row].RawData=assignment.newValue;toolProgress(30 + 50 * ++encodedCount / assignments.length,'Encoding equipment mappings…');}
  const rows=preview.changes.map(({rawData,newRawData,branding,...player})=>{
    const slots=new Map();for(const edit of player.edits){const key=`${edit.loadout}|${edit.slot}`;slots.set(key,{...edit,before:slots.has(key)?slots.get(key).before:edit.before});}
    const changes=[...slots.values()].map(edit=>({type:({HeadWear:'Helmet',FaceMask:'Facemask',InnerShirt:'Undershirt',OuterShirt:'Jersey',InnerSocks:'Socks',WaistWear:'Waist Gear'})[edit.slot]??edit.slot.replace(/([a-z])([A-Z])/g,'$1 $2'),currentValue:edit.before?mapperItemName(edit.before.itemAssetName):'Not Equipped',proposedValue:edit.after?mapperItemName(edit.after.itemAssetName)+(edit.before?.itemAssetName===edit.after.itemAssetName?' (configuration updated)':''):'Not Equipped'}));
    return {...player,position:displayPosition(player.position),changes};
  });
  const report={prefix:'equipment-mapper-report',headings:['Row','Team','Player','Position','Status','Reason','RulesJSON','EditsJSON','BeforeRawData','AfterRawData','SaveFingerprint','CapAllocationsJSON'],rows:[...preview.changes.map(player=>[player.row,player.team,player.player,displayPosition(player.position),'Proposed','',JSON.stringify(context.options.rules),JSON.stringify(player.edits),player.rawData,player.newRawData,fingerprint,JSON.stringify(preview.allocations)]),...preview.blocked.map(player=>[player.row,player.team,player.player,'','Blocked',player.reason,JSON.stringify(context.options.rules),'','','',fingerprint,JSON.stringify(preview.allocations)])]};
  const result={resultKind:TOOL_ID,mode:'preview',status:'preview',savePath:context.savePath,backupPath:null,reportPath:context.reports.create({...report,toolId:TOOL_ID,toolName:TOOL_NAME}),historySummary:[{label:'Players changed',value:rows.length},{label:'Mapping conflicts',value:preview.blocked.length}],summary:[{label:'Players to change',value:rows.length},{label:'Queued mappings',value:context.options.rules.length},{label:'Conflicts to resolve',value:preview.blocked.length}],details:{canApply:preview.blocked.length===0,blocked:preview.blocked,statistics:preview.statistics,allocations:preview.allocations,totalPreviewRows:rows.length,totalCorrectionActions:rows.reduce((sum,row)=>sum+row.edits.length,0),changes:rows.slice(0,1000),warnings:['Mappings run in queue order. Related helmet/facemask and item override changes are included explicitly. Other equipment and player data stay unchanged.']}};
  if(saveFingerprint(context.savePath)!==fingerprint)throw new Error('The Active Save changed during Preview. Run Preview again.');
  return {...result,planId:cacheEquipmentPlan({toolId:TOOL_ID,toolName:TOOL_NAME,savePath:context.savePath,saveFingerprint:fingerprint,needsVisuals:true,assignments,previewRows:rows,report,result})};
}
