import MapperEditor from '../../../shared/mapperEditor.cjs';
import path from 'node:path';
import {createMapperReviewSource,applyMapperReviewChoices,normalizeMapperReviewChoices} from './conflictReview.js';
import {PLAYER_PICKER_FIELDS} from '../../services/settingsFields.js';
import {mapperCatalog,normalizeMapperMods} from './catalog.js';
import {toolProgress} from '../../services/toolProgress.js';
import {loadEquipmentTables,buildTeamNames,buildRosterPlayerRows,buildTeamApparel,buildRosterPlayerApparel,buildRosterTeamNames,cacheEquipmentPlan,applyEquipmentPlan} from '../equipment/shared.js';
import {parseRef,sf} from '../equipment/openSave.js';
import {mapperLibrary,buildMapperPreview} from './core.js';
import {takePlan,saveFingerprint} from '../jersey/planStore.js';
import {displayPosition} from '../../../shared/localization.js';
import {mapperItemName} from './library.js';
import {isVisualOverflowStorage} from '../equipment/visualStorage.js';
import {createVisualDraft,finalizeVisualDraft} from '../equipment/visualDraft.js';
import {mapperTargetSession} from './targets.js';
import {removalCatalog} from '../equipment/core/removal.js';

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
export async function prepareEquipmentMapper({savePath,schemaPath,options={}}){
  const mods=normalizeMapperMods(options.mods),fingerprint=saveFingerprint(savePath),loaded=await loadEquipmentTables(savePath,schemaPath,true,false,{players:PLAYER_PICKER_FIELDS}),players=mapperPlayers(loaded),sources=players,library=mapperCatalog(mods);
  if(saveFingerprint(savePath)!==fingerprint)throw new Error('The save changed while reading equipment. Reload Equipment Mapper.');
  const describe=({rawData,branding,visualRow,teamIndex,...player})=>player;
  return {mods:library.mods,catalog:true,fingerprint,targetSessionId:mapperTargetSession(savePath,fingerprint,players,library),removableAssets:removalCatalog().map(item=>item.value),groups:library.groups,items:library.items.map(({element,context,locations,...item})=>({...item,implicitOccurrences:locations.filter(location=>location.implicitSlot).length,configuration:JSON.stringify({element,context})})),issues:library.issues,players:players.map(describe),libraryPlayers:sources.map(describe),teams:[...new Set(players.map(player=>player.team))].sort((a,b)=>a.localeCompare(b)),positions:[...new Set(players.map(player=>player.position))]};
}
export async function runEquipmentMapper(context){
  if(context.mode==='apply'){
    const plan=takePlan(context.options?.planId);
    if(plan.result.details.conflictReview?.pending)throw new Error('Review the equipment conflicts before Apply. Your save has not been written.');
    if(!plan.result.details.canApply)throw new Error('Resolve the incompatible mappings before Apply. No save was written.');
    if(plan.result.details.requiresCompatibilityConfirmation&&context.options?.confirmCompatibility!==true)throw new Error('Confirm the known equipment incompatibilities before Apply. Your save has not been written.');
    const applied=await applyEquipmentPlan({...context,toolId:TOOL_ID});
    return {...applied,details:{...applied.details,compatibilityAcknowledged:plan.result.details.requiresCompatibilityConfirmation===true}};
  }
  if(context.mode!=='preview')throw new Error('Run mode must be preview or apply.');
  const fingerprint=saveFingerprint(context.savePath);
  const parent=context.options?.reviewPlanId?takePlan(context.options.reviewPlanId):null;
  if(parent&&(parent.toolId!==TOOL_ID||path.resolve(parent.savePath)!==path.resolve(context.savePath)||!parent.mapperReviewSource))throw Error('This conflict review does not belong to this Mapper preview and Active Save.');
  if(parent&&parent.saveFingerprint!==fingerprint)throw Error('The save changed after Preview. Run Preview again before reviewing conflicts.');
  if(!parent&&context.options?.fingerprint!==fingerprint)throw new Error('The equipment library is out of date. Reload Equipment Mapper before Preview.');
  let reviewSource=parent?.mapperReviewSource??null;
  const mods=normalizeMapperMods(reviewSource?.mods??context.options?.mods),rules=reviewSource?.rules??context.options?.rules,loaded=await loadEquipmentTables(context.savePath,context.schemaPath,true),players=parent?null:mapperPlayers(loaded),library=mapperCatalog(mods);
  const reviewed=parent?applyMapperReviewChoices(reviewSource,context.options.reviewDecisions):null;
  const preview=reviewed?.preview??buildMapperPreview(players,library,rules);
  const draft=createVisualDraft(loaded.visuals);loaded.visuals=draft.table;
  const proposed=preview.changes.map(player=>({table:'visuals',row:player.visualRow,field:'RawData',oldValue:player.rawData,newValue:player.newRawData}));
  // Exercise the same encoding/overflow guards as the other equipment tools
  // during Preview, before any disk write or backup is attempted.
  let encodedCount=0;
  for(const assignment of proposed){loaded.visuals.records[assignment.row].RawData=assignment.newValue;toolProgress(30 + 40 * ++encodedCount / proposed.length,'Preparing equipment mappings…');}
  const storage=finalizeVisualDraft(draft),assignments=storage.assignments,skipped=preview.changes.filter(player=>storage.skippedRows.has(player.visualRow)).length;
  preview.changes=preview.changes.filter(player=>!storage.skippedRows.has(player.visualRow));
  const retainedRows=new Set(preview.changes.map(player=>player.row));
  const compatibilityWarnings=preview.compatibilityWarnings.filter(player=>retainedRows.has(player.row));
  for(const player of preview.changes)player.newRawData=sf(loaded.visuals.records[player.visualRow],'RawData');
  const warningReasons=new Map(compatibilityWarnings.map(player=>[player.row,player.reason]));
  const impact={...preview.impact,changing:preview.changes.length,unchanged:preview.impact.matching-preview.changes.length,unchangedReasons:[...preview.impact.unchangedReasons,...(skipped?[{reason:'Save equipment storage is full',players:skipped}]:[])]};
  preview.impact=impact;preview.compatibilityWarnings=compatibilityWarnings;
  if(!parent&&compatibilityWarnings.length){reviewSource=createMapperReviewSource(preview,library,(done,total)=>toolProgress(75+15*done/total,'Finding safe outfit fixes…'));Object.assign(reviewSource,{mods,rules:structuredClone(rules),storageSkipped:skipped});}
  const reviewSummary=reviewed?{...reviewed.summary,fixed:preview.changes.filter(p=>p.conflictDecision==='fix').length,anyway:compatibilityWarnings.length,storageSkipped:skipped}:null;
  const conflictReview=reviewSource?{pending:!parent,groups:reviewSource.groups,decisions:reviewed?.decisions??normalizeMapperReviewChoices(reviewSource),summary:reviewSummary}:null;
  const changedByRule=new Map();for(const p of preview.changes)for(const edit of p.edits)if(Number.isInteger(edit.rule))changedByRule.set(edit.rule,(changedByRule.get(edit.rule)??0)+1);
  preview.statistics=preview.statistics.map(s=>({...s,changed:changedByRule.get(s.rule)??0}));
  const rows=preview.changes.map(({rawData,newRawData,branding,requestedSlots,...player})=>{
    const slots=new Map();for(const edit of player.edits){const key=`${edit.loadout}|${edit.slot}`;slots.set(key,{...edit,before:slots.has(key)?slots.get(key).before:edit.before});}
    const changes=[...slots.values()].map(edit=>({type:(({HeadWear:'Helmet',FaceMask:'Facemask',InnerShirt:'Undershirt',OuterShirt:'Jersey',InnerSocks:'Socks',WaistWear:'Waist Gear'})[edit.slot]??edit.slot.replace(/([a-z])([A-Z])/g,'$1 $2'))+(edit.compatibilityFix?' (fit adjustment)':''),currentValue:edit.before?mapperItemName(edit.before.itemAssetName,{usingUnlockedMod:mods.unlocked,usingRawAccessoriesMod:mods.raw}):'Not Equipped',proposedValue:edit.after?mapperItemName(edit.after.itemAssetName,{usingUnlockedMod:mods.unlocked,usingRawAccessoriesMod:mods.raw})+(edit.before?.itemAssetName===edit.after.itemAssetName?' (configuration updated)':''):'Not Equipped'}));
    return {...player,position:displayPosition(player.position),changes,compatibilityReason:warningReasons.get(player.row)??''};
  });
  const skippedByReview=reviewed?reviewSource.preview.changes.filter(p=>reviewed.actions.get(p.row)==='skip'):[];
  const report={prefix:'equipment-mapper-report',headings:['Row','Team','Player','Position','Status','Reason','RulesJSON','EditsJSON','BeforeRawData','AfterRawData','SaveFingerprint','CapAllocationsJSON','ConflictChoice'],rows:[...preview.changes.map(player=>[player.row,player.team,player.player,displayPosition(player.position),warningReasons.has(player.row)?'Proposed (compatibility warning)':'Proposed',warningReasons.get(player.row)??'',JSON.stringify(rules),JSON.stringify(player.edits),player.rawData,player.newRawData,fingerprint,JSON.stringify(preview.allocations),player.conflictDecision??'']),...preview.blocked.map(player=>[player.row,player.team,player.player,'','Blocked',player.reason,JSON.stringify(rules),'','','',fingerprint,JSON.stringify(preview.allocations),'']),...skippedByReview.map(player=>[player.row,player.team,player.player,displayPosition(player.position),'Skipped during conflict review','Player kept unchanged',JSON.stringify(rules),'[]',player.rawData,player.rawData,fingerprint,JSON.stringify(preview.allocations),'skip'])]};
  const result={resultKind:TOOL_ID,mode:'preview',status:'preview',savePath:context.savePath,backupPath:null,reportPath:context.reports.create({...report,toolId:TOOL_ID,toolName:TOOL_NAME}),historySummary:[{label:'Players changed',value:rows.length},{label:'Mapping conflicts',value:preview.blocked.length},{label:'Compatibility warnings',value:compatibilityWarnings.length}],summary:[{label:'Players to change',value:rows.length},{label:'Queued mappings',value:rules.length},{label:'Conflicts to resolve',value:preview.blocked.length},{label:'Players with compatibility warnings',value:compatibilityWarnings.length}],details:{conflictReview,impact,ruleSummaries:rules.map(rule=>MapperEditor.describe(rule,library.items).sentence),storageSkipped:(parent?reviewSource.storageSkipped:0)+skipped,skipped:(parent?reviewSource.storageSkipped:0)+skipped,canApply:rows.length>0&&preview.blocked.length===0&&!conflictReview?.pending,blocked:preview.blocked,compatibilityWarnings,requiresCompatibilityConfirmation:compatibilityWarnings.length>0,statistics:preview.statistics,allocations:preview.allocations,totalPreviewRows:rows.length,totalCorrectionActions:rows.reduce((sum,row)=>sum+row.edits.length,0),changes:rows.slice(0,1000),warnings:[...(skipped?[`${skipped.toLocaleString()} players skipped.`]:[]),'Mappings match the original equipment. Conflicting assignments to the same item slot must be resolved before Apply. Related helmet/facemask and item override changes are included explicitly. Other equipment and player data stay unchanged.']}};
  if(saveFingerprint(context.savePath)!==fingerprint)throw new Error('The Active Save changed during Preview. Run Preview again.');
  return {...result,planId:cacheEquipmentPlan({toolId:TOOL_ID,toolName:TOOL_NAME,savePath:context.savePath,saveFingerprint:fingerprint,needsVisuals:true,assignments,previewRows:rows,report,result,mapperReviewSource:reviewSource})};
}
