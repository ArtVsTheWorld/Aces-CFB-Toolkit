import {finalGeneratedChanges} from '../equipment/core/generatedCompatibility.js';
import {progressRange} from '../../services/toolProgress.js';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {isOriginalEaPlayer,originalEaProtectionAudit} from '../../services/originalEaPlayers.js';
import {quickstartPlayerKey,equipmentDynastyId} from '../../services/quickstartMemory.js';
import {saveFingerprint,takePlan} from '../jersey/planStore.js';
import {normalizeEquipmentOptions} from '../equipment/runner.js';
import {collectEquipmentDonors,patchFreshmanEquipment} from '../equipment/core/patcher.js';
import {applyGlobalEquipmentFixes} from '../equipment/core/globalFixes.js';
import {applyEquipmentPlan,buildRosterPlayerRows,buildTeamNames,buildTeamApparel,buildRosterPlayerApparel,buildRosterTeamNames,buildFcsTeamIndexes,loadEquipmentTables,snapshotVisualRawData,cacheEquipmentPlan} from '../equipment/shared.js';
import {equipmentPreviewChanges,summarizeVisualChanges,limitEquipmentPreview} from '../equipment/preview.js';
import {sf} from '../equipment/openSave.js';
import {displayPosition} from '../../../shared/localization.js';
import {equipmentDisplayValue} from '../equipment/catalog.js';
import {applyQuickstartSpecialistCutoff} from './specialistCutoff.js';
import {applyQuickstartColorAccents} from './colorAccents.js';
import {applyQuickstartQbGloves,capQuickstartQbGloves} from './qbGloves.js';
import {createVisualDraft,finalizeVisualDraft,sortVisualAssignments,retainRandomizerResults,retainPatcherResults} from '../equipment/visualDraft.js';
import {loadEquipmentSettingsTables} from '../equipment/shared.js';

export const QUICKSTART_ID='equipment-quickstart',QUICKSTART_NAME='Equipment Quickstart';
function memoryFor(context){if(!context.quickstartMemory)throw Error('Quickstart player tracking is unavailable. Your save has not been changed.');return context.quickstartMemory;}
export function quickstartOptions(input={}){
  for(const key of ['unlocked','raw','gameday','protectOriginalEaPlayers'])if(input[key]!==undefined&&typeof input[key]!=='boolean')throw Error('Choose options using the Quickstart checkboxes.');
  return {unlocked:input.unlocked===true,raw:input.raw===true,gameday:input.gameday===true,protectOriginalEaPlayers:input.protectOriginalEaPlayers!==false};
}
export function quickstartSettings(input){
  const mods=quickstartOptions(input);
  const randomizer={...normalizeEquipmentOptions({top:30,classes:[],redshirtGroup:'all',protectOriginalEaPlayers:mods.protectOriginalEaPlayers,noDripProfile:true,usingUnlockedMod:mods.unlocked,usingRawAccessoriesMod:mods.raw,usingEquipmentTruckMod:mods.gameday},true),donorOnlyPositions:['K','P'],allowDonorOnlyNoDrip:true,donorOnlyGlovesPositions:['QB']};
  const patcher=normalizeEquipmentOptions({protectOriginalEaPlayers:mods.protectOriginalEaPlayers,helmetFix:true,usingRawAccessoriesMod:mods.raw,visorFix:true,oakleyVisorFix:true,usingEquipmentTruckMod:mods.gameday,pantsFix:true,rolledJerseyFix:true,sleeveCompatibilityFix:true,unlockedTattooFix:mods.unlocked,unlockedTattooCap:30,fillFrequencies:{tattoos:true,cutoffPants:mods.unlocked},unlockedMouthpieceFix:mods.unlocked,unlockedRecolorFix:mods.unlocked,unlockedColorTheme:'team',tapeColorMode:'accessory',lowerRolledJerseyFix:mods.unlocked,cutoffPantsFix:mods.unlocked,adjustOutfitForCutoff:mods.unlocked,unlockedSocksFix:mods.unlocked},false);
  return {mods,randomizer,patcher};
}
async function scope(loaded,memory,savePath,protectOriginalEaPlayers=true,settingsOnly=false){
  const roster=buildRosterPlayerRows(loaded.players,loaded.teams,loaded.rosters),snapshot=memory.snapshot(await equipmentDynastyId(loaded.franchise),{savePath,players:loaded.players}),keys=new Map(),pending=new Set();let protectedPlayers=0,remembered=0,donorPlayersProtected=0;
  const teamNames=buildTeamNames(loaded.teams.records),teamApparel=buildTeamApparel(loaded.teams.records),playerApparel=buildRosterPlayerApparel(loaded.players,loaded.teams,loaded.rosters),fcs=buildFcsTeamIndexes(loaded.teams.records),preparedDonors=collectEquipmentDonors(loaded.players.records,loaded.visuals.records,loaded.visuals.header.tableId,{rosterRows:roster,fcsTeamIndexes:fcs,teamNames,teamApparel,playerApparel,...(settingsOnly?{topPerPosition:30}:{})}),groups=new Map();
  for(const donor of preparedDonors){const group=groups.get(donor.position)??[];group.push(donor);groups.set(donor.position,group);}const donorRows=new Set([...groups.values()].flatMap(group=>group.sort((a,b)=>b.overall-a.overall||a.row-b.row).slice(0,30).map(donor=>donor.row)));
  for(const row of roster){const record=loaded.players.records[row];if(!record||record.isEmpty)continue;if(protectOriginalEaPlayers&&isOriginalEaPlayer(record)){protectedPlayers++;continue;}if(donorRows.has(row)){donorPlayersProtected++;continue;}const key=quickstartPlayerKey(record,row);keys.set(row,key);if(snapshot.keys.has(key))remembered++;else pending.add(row);}
  return {roster,snapshot,keys,pending,protectedPlayers,remembered,donorPlayersProtected,donorRows,teamNames,teamApparel,playerApparel,fcs,preparedDonors};
}
export async function prepareEquipmentQuickstart(context){
  const loaded=await loadEquipmentSettingsTables(context.savePath,context.schemaPath),s=await scope(loaded,memoryFor(context),context.savePath,quickstartOptions(context.options).protectOriginalEaPlayers,true);
  return {newPlayers:s.pending.size,remembered:s.remembered,rememberedTotal:s.snapshot.keys.size,protectedPlayers:s.protectedPlayers,donorPlayersProtected:s.donorPlayersProtected,memoryScope:'dynasty'};
}
async function preview(context){
  const memory=memoryFor(context),fingerprint=saveFingerprint(context.savePath),loaded=await loadEquipmentTables(context.savePath,context.schemaPath),settings=quickstartSettings(context.options),s=await scope(loaded,memory,context.savePath,settings.mods.protectOriginalEaPlayers),seed=randomBytes(4).readUInt32LE();
  settings.randomizer.seed=seed;settings.patcher.seed=seed;
  const draft=createVisualDraft(loaded.visuals);loaded.visuals=draft.table;
  const {teamNames,teamApparel,playerApparel,fcs,preparedDonors}=s,before=snapshotVisualRawData(loaded.visuals.records);
  // Donor outfits stay frozen and selected donors never become recipients.
  const recordRows=new Map(loaded.players.records.map((record,row)=>[record,row]));
  const randomized=progressRange(25, 55, () => patchFreshmanEquipment(loaded.players.records,loaded.visuals.records,loaded.visuals.header.tableId,{...settings.randomizer,seed,teamNames,teamApparel,playerApparel,donorPlayerRecords:loaded.players.records,preparedDonors,recipientRosterRows:null,eligiblePlayer:record=>s.pending.has(recordRows.get(record)),fcsTeamIndexes:fcs,top:settings.randomizer.top,mixedChance:.30,crossMixedChance:.10,unlockedItemChance:.10,apply:true}));
  const processed=new Set(randomized.changes.map(change=>change.target.row));
  const fixes=progressRange(55, 82, () => applyGlobalEquipmentFixes(loaded.players.records,loaded.visuals.records,loaded.visuals.header.tableId,{...settings.patcher,quickstartTapeDefaults:true,teamNames,recolorTeamNames:buildRosterTeamNames(loaded.players,loaded.teams,loaded.rosters),fcsTeamIndexes:fcs,activePlayerRows:s.roster,eligiblePlayer:record=>processed.has(recordRows.get(record))&&!['K','P'].includes(String(sf(record,'Position')).toUpperCase())}));
  applyQuickstartSpecialistCutoff({players:loaded.players.records,visuals:loaded.visuals.records,visualsTableId:loaded.visuals.header.tableId,settings,rosterRows:s.roster,processedRows:processed,teamNames,fcsTeamIndexes:fcs},fixes);
  applyQuickstartColorAccents({unlocked:settings.mods.unlocked,raw:settings.mods.raw,changes:randomized.changes,players:loaded.players.records,visuals:loaded.visuals.records,visualsTableId:loaded.visuals.header.tableId,seed,protectOriginalEaPlayers:settings.mods.protectOriginalEaPlayers});
  applyQuickstartQbGloves({changes:randomized.changes,players:loaded.players.records,visuals:loaded.visuals.records,visualsTableId:loaded.visuals.header.tableId,protectOriginalEaPlayers:settings.mods.protectOriginalEaPlayers});
  let qbGlovePopulation=capQuickstartQbGloves({changes:randomized.changes,players:loaded.players.records,visuals:loaded.visuals.records,visualsTableId:loaded.visuals.header.tableId,seed,activePlayerRows:s.roster,protectOriginalEaPlayers:settings.mods.protectOriginalEaPlayers});
  const storage=progressRange(82,94,()=>finalizeVisualDraft(draft));
  retainRandomizerResults(randomized,storage.skippedRows);
  if(storage.skippedRows.size){
    // Skipped QBs retain their original gloves and consume the existing-player
    // allowance. Recheck the accepted population before freezing Apply.
    qbGlovePopulation=capQuickstartQbGloves({changes:randomized.changes,players:loaded.players.records,visuals:loaded.visuals.records,visualsTableId:loaded.visuals.header.tableId,seed,activePlayerRows:s.roster,protectOriginalEaPlayers:settings.mods.protectOriginalEaPlayers});
    const recapped=progressRange(90,94,()=>finalizeVisualDraft(draft));
    if(recapped.skippedRows.size)throw Error('The final QB glove safeguard could not be stored safely. Your save has not been written.');
    for(const assignment of storage.assignments)assignment.newValue=sf(loaded.visuals.records[assignment.row],'RawData');
  }
  retainPatcherResults(fixes,loaded.players.records,loaded.visuals.header.tableId,storage.skippedRows,storage.assignments);
  const acceptedPlayers=new Set(randomized.changes.map(change=>change.target.row));
  for(const row of [...processed])if(!acceptedPlayers.has(row))processed.delete(row);
  const assignments=[],rows=[],donorAudits=new Map();
  for(const change of randomized.changes){
    const newRaw=sf(loaded.visuals.records[change.visualsRow],'RawData'),oldRaw=before.get(change.visualsRow);
    const finalLoadouts=JSON.parse(newRaw).loadouts.filter(l=>l.loadoutType==='PlayerOnField'),context={usingUnlockedMod:settings.mods.unlocked,usingRawAccessoriesMod:settings.mods.raw};
    for(const key of ['vanillaChanges','unlockedChanges','rawChanges','equipmentTruckChanges'])change[key]=finalGeneratedChanges(finalLoadouts,change[key]??[],context);
    const {newRawData,noDrip,noDripChanges,...audit}=change;donorAudits.set(change.target.row,audit);
    if(newRaw!==oldRaw)assignments.push({table:'visuals',row:change.visualsRow,field:'RawData',oldValue:oldRaw,newValue:newRaw});
    const displayBrands=items=>(items??[]).map(item=>({...item,oldItem:equipmentDisplayValue(item.oldItem,{usingUnlockedMod:settings.mods.unlocked,usingRawAccessoriesMod:settings.mods.raw}),newItem:equipmentDisplayValue(item.newItem,{usingUnlockedMod:settings.mods.unlocked,usingRawAccessoriesMod:settings.mods.raw})}));
    rows.push({row:change.target.row,team:change.target.team,player:change.target.firstName+' '+change.target.lastName,position:displayPosition(change.target.position),classYear:change.target.classYear,redshirtStatus:change.target.redshirtStatus,overall:change.target.overall,currentValue:change.crossPositionMixed?'Cross-position mix':change.mixed?'Multiple donors':'Single donor',proposedValue:'Quickstart equipment',donor:change.donorUses.map(use=>`${use.donor.firstName} ${use.donor.lastName} (${use.donor.team}) — ${use.group}`).join('; '),donorUses:change.donorUses,facePaint:(change.facePaint??[]).map(item=>({...item,displayName:equipmentDisplayValue(item.asset,{usingUnlockedMod:settings.mods.unlocked,usingRawAccessoriesMod:settings.mods.raw})})),brandAssignments:displayBrands(change.brandAssignments),brandCorrections:displayBrands(change.brandCorrections),modPoolAdditions:{vanilla:change.vanillaChanges??[],unlocked:change.unlockedChanges??[],raw:change.rawChanges??[],eljax:change.equipmentTruckChanges??[]},changes:equipmentPreviewChanges(oldRaw,newRaw,{usingUnlockedMod:settings.mods.unlocked,usingRawAccessoriesMod:settings.mods.raw}),visualRow:change.visualsRow,oldRaw,newRaw,fallbackNotes:change.fallbackNotes??[]});
  }
  rows.sort((a,b)=>a.team.localeCompare(b.team)||a.player.localeCompare(b.player)||a.row-b.row);
  sortVisualAssignments(assignments,storage.assignments);
  const keys=[...processed].map(row=>s.keys.get(row));
  if(keys.some(key=>!key))throw Error('Quickstart player tracking did not match the generated preview. No save was written.');
  if(saveFingerprint(context.savePath)!==fingerprint)throw Error('The save changed while building Quickstart. Generate a new preview.');
  const skippedCount=randomized.skipped.length+randomized.storageSkipped;
  const warnings=skippedCount?[`${skippedCount.toLocaleString()} players skipped.`]:[];
  const previewRows=rows.map(({oldRaw,newRaw,...row})=>row);
  const details={seed,mods:settings.mods,top:settings.randomizer.top,totalPreviewRows:rows.length,changes:limitEquipmentPreview(previewRows),newPlayers:s.pending.size,remembered:s.remembered,protectedPlayers:s.protectedPlayers,donorPlayersProtected:s.donorPlayersProtected,skipped:skippedCount,storageSkipped:randomized.storageSkipped,warnings,protection:originalEaProtectionAudit([...s.roster].map(row=>loaded.players.records[row]),settings.mods.protectOriginalEaPlayers),qbGlovePopulation,populationSafeguards:fixes.populationSafeguards,unlockedTattooPopulation:fixes.unlockedTattooPopulation,canApply:processed.size>0};
  const {noDripProfile,noDripPercentages,allowDonorOnlyNoDrip,...reportedRandomizerSettings}=settings.randomizer;
  const report={prefix:'equipment-quickstart-report',headings:['Team','Player','Position','ClassYear','RedshirtStatus','Overall','PlayerRow','CharacterVisualsRow','ChangedSlotsAndMetadata','BeforeRawData','AfterRawData','DonorAuditJSON','Seed','QuickstartOptionsJSON','RandomizerOptionsJSON','PatcherOptionsJSON','PopulationCapsAuditJSON','TrackingAuditJSON','SkippedPlayers'],rows:rows.map((row,i)=>[row.team,row.player,row.position,row.classYear,row.redshirtStatus,row.overall,row.row,row.visualRow,summarizeVisualChanges(row.oldRaw,row.newRaw),row.oldRaw,row.newRaw,JSON.stringify(donorAudits.get(row.row)),seed,i===0?JSON.stringify(settings.mods):'',i===0?JSON.stringify(reportedRandomizerSettings):'',i===0?JSON.stringify(settings.patcher):'',i===0?JSON.stringify({equipment:fixes.populationSafeguards,tattoos:fixes.unlockedTattooPopulation,qbGloves:qbGlovePopulation}):'',i===0?JSON.stringify({scope:'dynasty',leagueId:s.snapshot.dynastyId,playerIdentityVersion:2,alreadyRemembered:s.remembered,newPlayers:s.pending.size,playersToRemember:keys.length}):'',i===0?skippedCount:''])};
  const result={status:'preview',mode:'preview',resultKind:QUICKSTART_ID,savePath:loaded.savePath,backupPath:null,reportPath:context.reports.create({...report,toolId:QUICKSTART_ID,toolName:QUICKSTART_NAME}),summary:[{label:'Players ready',value:rows.length},{label:'Already equipped',value:s.remembered},{label:'Original EA players protected',value:s.protectedPlayers},{label:'Players skipped',value:skippedCount}],historySummary:[{label:'Players equipped',value:rows.length}],details};
  const planId=cacheEquipmentPlan({toolId:QUICKSTART_ID,toolName:QUICKSTART_NAME,savePath:loaded.savePath,assignments,previewRows,report,result,needsVisuals:true,quickstartTracking:{...s.snapshot,keys}});
  return {...result,planId};
}
export async function runEquipmentQuickstart(context){
  if(context.mode==='preview')return preview(context);
  if(context.mode!=='apply')throw Error('Run mode must be preview or apply.');
  const memory=memoryFor(context);
  return memory.exclusive(async()=>{
    const plan=takePlan(context.options?.planId);if(plan.toolId!==QUICKSTART_ID||!plan.quickstartTracking)throw Error('This preview does not belong to Equipment Quickstart.');
    if(path.resolve(plan.savePath)!==path.resolve(context.savePath))throw Error('This preview does not belong to the Active Save.');
    if(!plan.result.details.canApply)throw Error('There are no new players to equip.');
    const staged=memory.stage(plan.quickstartTracking.dynastyId,plan.quickstartTracking.keys,plan.quickstartTracking.revision,plan.quickstartTracking);
    try{
      const result=await applyEquipmentPlan({...context,toolId:QUICKSTART_ID});
      try{const count=staged.commit();return {...result,details:{...result.details,trackingSaved:true,rememberedAfter:count}};}
      catch(error){staged.cancel();return {...result,details:{...result.details,trackingSaved:false,trackingError:String(error.message),warnings:[...result.details.warnings,'Equipment was applied, but player memory could not be saved. Do not rerun Quickstart until the tracking-file problem is resolved.']}};}
    }catch(error){staged.cancel();throw error;}
  });
}
