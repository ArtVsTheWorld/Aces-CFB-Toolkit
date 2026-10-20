import path from 'node:path';
import {planRosterDepthCharts,applyRosterDepthCharts,verifyRosterDepthCharts} from './depthCharts.js';
import {makeRosterEquipmentGenerator} from './equipment.js';
import {randomBytes} from 'node:crypto';
import {rosterGeneratorSeason} from './season.js';
import {normalizeGenerationSettings,positionTalentTargets,OFFENSIVE_SCHEMES,DEFENSIVE_SCHEMES,TONE_PRESETS,ROSTER_AGES,ROSTER_POTENTIALS} from './settings.js';
import {POSITION_GROUPS,positionGroup} from '../../../shared/positionGroups.js';
import {isDeepStrictEqual} from 'node:util';
import {loadEquipmentTables,snapshotVisualRawData,VALID_POSITIONS} from '../equipment/shared.js';
import {sf,parseRef} from '../equipment/openSave.js';
import {isDirectionalFcsTeam,readTables,PLAYER_TABLE_UID} from '../../services/save.js';
import {snapshotVisualsForVerification,saveEquipmentCandidate} from '../equipment/visualsSafety.js';
import {createBackup} from '../../services/files.js';
import {storePlan,takePlan,completePlan,saveFingerprint} from '../jersey/planStore.js';
import {loadObservedCatalog} from './catalog.js';
import {WRITE_FIELDS} from './contract.js';
import {generateRosterPreview,validateRosterPreview} from './core.js';
import {ROSTER_PRESETS,rosterPreset,modelForPreset} from './presets.js';
import {rosterGeneratorCsv} from './report.js';
import {loadCommentaryMap} from '../commentary/map.js';
import {createCommentaryMatcher} from '../commentary/matcher.js';
import {displayPosition} from '../../../shared/localization.js';
import {equipmentDisplayName,equipmentItem} from '../equipment/catalog.js';
import {snapshotProtectedPlayers,verifyProtectedPlayers} from './safety.js';
import {playerMeasurements} from '../../../shared/playerMeasurements.js';

const allPresentationIds=loaded=>new Set(loaded.players.records.filter(record=>record&&!record.isEmpty).map(record=>sf(record,'PresentationId')));
const TOOL_ID='roster-generator',TOOL_NAME='Roster Generator';
export function teamGenerationConfigurations(options,teams){
  const overrides=options.teamConfigurations??{};
  if(!overrides||typeof overrides!=='object'||Array.isArray(overrides)||Object.keys(overrides).some(name=>!teams.includes(name)))throw new Error('Team overrides must belong to selected teams.');
  const allowed=new Set(['preset','positionStrength','talentShares','rosterAge','rosterPotential','offensiveScheme','defensiveScheme','skinTonePreset','reorderDepthChart']);
  return Object.fromEntries(teams.map(name=>{const override=overrides[name]??{};if(!override||typeof override!=='object'||Array.isArray(override)||Object.keys(override).some(key=>!allowed.has(key)))throw new Error('Invalid team generation settings.');const merged={...options,...override};return[name,{preset:rosterPreset(merged.preset).id,settings:normalizeGenerationSettings(merged)}];}));
}
function teamModelFactory(base,preset,settings){
  let previousKey,previousModel;
  return targets=>{const budget=positionTalentTargets(targets,preset,settings),key=JSON.stringify(Object.entries(budget).sort(([a],[b])=>a.localeCompare(b)));if(key!==previousKey){previousModel=modelForPreset(base,preset,settings,budget);previousKey=key;}return previousModel;};
}
function teamsWithRosters(loaded) {
  return loaded.teams.records.filter(team=>team&&!team.isEmpty&&!isDirectionalFcsTeam(team)&&parseRef(sf(team,'Roster'))?.tableId===loaded.rosters.header.tableId)
    .map(team=>({record:team,name:String(sf(team,'DisplayName')??''),teamIndex:Number(sf(team,'TeamIndex')),branding:String(sf(team,'TeamApparel')??'').trim().toLowerCase(),captainCount:Number(sf(team,'DesiredTeamCaptains')??6)}))
    .filter(team=>team.name&&Number.isSafeInteger(team.teamIndex)).sort((a,b)=>a.name.localeCompare(b.name));
}
function extractTargets(loaded,team,owners) {
  const missing=WRITE_FIELDS.filter(field=>!loaded.players.offsetTable.some(column=>column.name===field));
  if(missing.length)throw new Error(`Player schema is missing generation fields: ${missing.join(', ')}. No save was written.`);
  const ref=parseRef(sf(team.record,'Roster')),roster=loaded.rosters.records[ref.row],targets=[];
  if(!roster||roster.isEmpty||!Number.isInteger(Number(roster.arraySize)))throw new Error(`${team.name} has no valid roster.`);
  for(let i=0;i<Number(roster.arraySize);i++) {
    const ref=parseRef(sf(roster,`Player${i}`));if(!ref)continue;
    const record=loaded.players.records[ref.row];
    if(ref.tableId!==loaded.players.header.tableId||!record||record.isEmpty||Number(sf(record,'TeamIndex'))!==team.teamIndex)throw new Error(`${team.name} has an invalid or mismatched player reference.`);
    const position=String(sf(record,'Position')),visual=parseRef(sf(record,'CharacterVisuals'));
    if(!VALID_POSITIONS.includes(position)||visual?.tableId!==loaded.visuals.header.tableId||!loaded.visuals.records[visual.row]||loaded.visuals.records[visual.row].isEmpty)throw new Error(`${team.name} has an unsupported position or appearance reference.`);
    const original=Object.fromEntries(WRITE_FIELDS.map(field=>[field,sf(record,field)]));
    if(Object.values(original).some(value=>value===undefined))throw new Error(`Player row ${ref.row} is missing a required generation field.`);
    targets.push({row:ref.row,position,visualRow:visual.row,visualOwners:owners.get(visual.row)??[],rawData:sf(loaded.visuals.records[visual.row],'RawData'),original});
  }
  if(!targets.length)throw new Error(`${team.name} has no rostered players.`);
  return targets;
}
function rosterPositionCounts(loaded,team){
  const ref=parseRef(sf(team.record,'Roster')),roster=loaded.rosters.records[ref.row],counts={};
  if(roster&&!roster.isEmpty)for(let i=0;i<Number(roster.arraySize);i++){const playerRef=parseRef(sf(roster,`Player${i}`)),player=playerRef?.tableId===loaded.players.header.tableId?loaded.players.records[playerRef.row]:null;if(player&&!player.isEmpty){const position=positionGroup(sf(player,'Position'));counts[position]=(counts[position]??0)+1;}}
  return counts;
}
function visualOwners(loaded) {
  const owners=new Map();loaded.players.records.forEach((record,row)=>{if(!record||record.isEmpty)return;const ref=parseRef(sf(record,'CharacterVisuals'));if(ref?.tableId===loaded.visuals.header.tableId){if(!owners.has(ref.row))owners.set(ref.row,[]);owners.get(ref.row).push(row);}});return owners;
}
export async function prepareRosterGenerator({savePath,schemaPath}) {
  const loaded=await loadEquipmentTables(savePath,schemaPath,true,false);
  const season=await rosterGeneratorSeason(loaded);
  return {season,agePresets:ROSTER_AGES,potentialPresets:ROSTER_POTENTIALS,positionGroups:POSITION_GROUPS,offensiveSchemes:OFFENSIVE_SCHEMES,defensiveSchemes:DEFENSIVE_SCHEMES,tonePresets:TONE_PRESETS,teams:teamsWithRosters(loaded).map(team=>({name:team.name,teamIndex:team.teamIndex,positionCounts:rosterPositionCounts(loaded,team)})),presets:ROSTER_PRESETS,catalogVersion:loadObservedCatalog().catalog.version};
}
function previewRow(player,preview) {
  const fields=player.fields;
  const equipment=JSON.parse(player.rawData).loadouts.filter(loadout=>loadout.loadoutType==='PlayerOnField').flatMap(loadout=>loadout.loadoutElements).map(element=>({slot:element.slotType??equipmentItem(element.itemAssetName)?.slots?.[0]??'Default slot',name:equipmentDisplayName(element.itemAssetName)}));
  return {...player,measurements:{before:playerMeasurements(player.before),after:playerMeasurements(fields)},team:preview.team.name,player:`${fields.FirstName} ${fields.LastName}`,oldPlayer:`${player.before.FirstName} ${player.before.LastName}`,position:displayPosition(player.position),classYear:fields.SchoolYear,overall:fields.OverallRating,equipment};
}
function reportFor(rosters) {
  const parts=rosters.map(roster=>rosterGeneratorCsv(roster));
  return {prefix:'roster-generator-report',headings:[...parts[0].headings,'CalibrationJSON'],rows:parts.flatMap((part,i)=>part.rows.map((row,j)=>[...row,JSON.stringify(rosters[i].players[j].provenance.calibration)]))};
}

export async function runRosterGenerator(context) {
  if(context.mode==='apply')return applyRosterGenerator(context);
  if(context.mode!=='preview')throw new Error('Run mode must be preview or apply.');
  const seed=randomBytes(4).readUInt32LE(),preset=rosterPreset(context.options?.preset),selected=context.options?.teams,settings=normalizeGenerationSettings(context.options);
  if(!Array.isArray(selected)||!selected.length||selected.some(value=>typeof value!=='string')||new Set(selected).size!==selected.length)throw new Error('Select one or more teams. An empty selection never means the entire dynasty.');
  const configurations=teamGenerationConfigurations(context.options??{},selected);
  const fingerprint=saveFingerprint(context.savePath),loaded=await loadEquipmentTables(context.savePath,context.schemaPath,true,false),available=teamsWithRosters(loaded);
  const teams=selected.map(name=>{const matches=available.filter(team=>team.name===name);if(matches.length!==1)throw new Error(`Team selection is unavailable or ambiguous: ${name}.`);return matches[0];}).sort((a,b)=>a.teamIndex-b.teamIndex);
  await rosterGeneratorSeason(loaded);
  const equipmentGenerator=makeRosterEquipmentGenerator(loaded),baseModel=loadObservedCatalog(),modelForTeam=teamModelFactory(baseModel,preset,settings),owners=visualOwners(loaded),rosters=[],used=new Set(),reservedPresentationIds=allPresentationIds(loaded);
  const names=loaded.players.records.filter(record=>record&&!record.isEmpty).map(record=>`${sf(record,'FirstName')??''} ${sf(record,'LastName')??''}`);
  const mapFile=context.defaultMapPath??path.resolve(path.dirname(context.schemaPath),'../commentary-data/PlayerCommentaryidMap.txt');
  const matchCommentary=createCommentaryMatcher(loadCommentaryMap(mapFile),{allowPhonetic:false,allowFirstName:true});
  for(const team of teams) {
    const targets=extractTargets(loaded,team,owners);for(const target of targets){if(used.has(target.row))throw new Error('Two selected teams share a roster player. No write is permitted.');used.add(target.row);}
    const teamSeed=(seed^Math.imul(team.teamIndex+1,2654435761))>>>0;
    const configuration=configurations[team.name],teamPreset=rosterPreset(configuration.preset),model=teamModelFactory(baseModel,teamPreset,configuration.settings)(targets);
    const roster=generateRosterPreview({team:{name:team.name,teamIndex:team.teamIndex,branding:team.branding,captainCount:team.captainCount},targets,model,seed:teamSeed,preset:teamPreset,unavailableNames:names,matchCommentary,equipmentGenerator,reservedPresentationIds});
    for(const player of roster.players)reservedPresentationIds.add(player.fields.PresentationId);
    roster.summary.caliber=teamPreset.name;
    roster.source={file:path.basename(context.savePath),sha256:fingerprint,unchanged:true};
    roster.applicationCanApply=!roster.blocking.length;
        roster.warnings.push('Long-snap and dealbreaker fixes run before final jersey numbering. Team traditions and retired-number protection are off.');
    names.push(...roster.players.map(player=>`${player.fields.FirstName} ${player.fields.LastName}`));rosters.push(roster);
    await new Promise(resolve=>setImmediate(resolve));
  }
  if(saveFingerprint(context.savePath)!==fingerprint)throw new Error('The Active Save changed during Preview. Run Preview again.');
  const depthCharts=await planRosterDepthCharts(loaded,rosters);
  for(const roster of rosters){const chart=depthCharts.find(chart=>chart.team===roster.team.name);roster.summary.depthChart=chart;roster.warnings.push(`${roster.team.name}: ${chart.reason}`);}
  const rows=rosters.flatMap(roster=>roster.players.map(player=>previewRow(player,roster))),blocking=rosters.flatMap(roster=>roster.blocking.map(item=>({...item,team:roster.team.name}))),report=reportFor(rosters);
  const result={resultKind:TOOL_ID,mode:'preview',status:'preview',savePath:loaded.savePath,backupPath:null,reportPath:context.reports.create({...report,toolId:TOOL_ID,toolName:TOOL_NAME}),summary:[{label:'Teams to regenerate',value:rosters.length},{label:'Players to replace',value:rows.length},{label:'Original NIL identities',value:rosters.reduce((sum,roster)=>sum+roster.summary.nilReplacements,0)},{label:'Apply blockers',value:blocking.length}],historySummary:[{label:'Players regenerated',value:rows.length}],details:{canApply:!blocking.length,preset,seed,blocking,warnings:[...new Set(rosters.flatMap(roster=>roster.warnings))],teams:rosters.map(roster=>({team:roster.team.name,...roster.summary})),totalPreviewRows:rows.length,changes:rows.slice(0,1000)}};
  const planId=storePlan({toolId:TOOL_ID,toolName:TOOL_NAME,savePath:loaded.savePath,saveFingerprint:fingerprint,previewRows:rows,report,result,rosters,presetId:preset.id,settings,configurations,depthCharts});
  return {...result,planId};
}

async function applyRosterGenerator(context) {
  const plan=takePlan(context.options?.planId);
  if(plan.toolId!==TOOL_ID||path.resolve(plan.savePath)!==path.resolve(context.savePath))throw new Error('This preview does not belong to Roster Generator and the Active Save.');
  if(context.options?.confirmRegeneration!==true)throw new Error('Confirm that the selected rosters and NIL identities will be replaced before Apply.');
  if(!plan.result.details.canApply)throw new Error('Resolve the appearance/roster blockers before Apply. No save was written.');
  if(saveFingerprint(context.savePath)!==plan.saveFingerprint)throw new Error('The save changed after Preview. Run Preview again.');
  const loaded=await loadEquipmentTables(context.savePath,context.schemaPath,true,false),baseModel=loadObservedCatalog(),preset=rosterPreset(plan.presetId),owners=visualOwners(loaded),available=teamsWithRosters(loaded),assignments=[],reservedPresentationIds=allPresentationIds(loaded);
  await rosterGeneratorSeason(loaded);
  const modelForTeam=teamModelFactory(baseModel,preset,plan.settings),equipmentGenerator=makeRosterEquipmentGenerator(loaded);
  for(const roster of plan.rosters) {
    const team=available.find(team=>team.teamIndex===roster.team.teamIndex&&team.name===roster.team.name);if(!team)throw new Error('A selected team changed after Preview.');
    const configuration=plan.configurations[team.name],teamPreset=rosterPreset(configuration.preset),targets=extractTargets(loaded,team,owners),model=teamModelFactory(baseModel,teamPreset,configuration.settings)(targets);if(!isDeepStrictEqual(roster.preset,teamPreset)||!isDeepStrictEqual(roster.summary.settings,configuration.settings))throw new Error('Team settings changed after Preview.');validateRosterPreview(roster,targets,model,equipmentGenerator,reservedPresentationIds);
    for(const player of roster.players)reservedPresentationIds.add(player.fields.PresentationId);
    for(const player of roster.players) {
      for(const [field,newValue]of Object.entries(player.fields))assignments.push({table:'players',row:player.row,field,oldValue:player.before[field],newValue});
      assignments.push({table:'visuals',row:player.visualRow,field:'RawData',oldValue:player.beforeRawData,newValue:player.rawData});
    }
  }
  const depthCharts=await planRosterDepthCharts(loaded,plan.rosters);if(!isDeepStrictEqual(depthCharts,plan.depthCharts))throw new Error('Depth-chart proposal changed after Preview. No save was written.');
  const before=snapshotVisualsForVerification(loaded.visuals,snapshotVisualRawData(loaded.visuals.records));
  const protectedPlayers=snapshotProtectedPlayers(loaded.players,new Set(plan.rosters.flatMap(roster=>roster.players.map(player=>player.row))));
  const reportPath=context.reports.create({...plan.report,toolId:TOOL_ID,toolName:TOOL_NAME});
  const backupPath=createBackup(loaded.savePath);
  for(const change of assignments)(change.table==='players'?loaded.players:loaded.visuals).records[change.row][change.field]=change.newValue;
  verifyProtectedPlayers(protectedPlayers,loaded.players);
  const depthGuards=applyRosterDepthCharts(loaded,depthCharts);
  await saveEquipmentCandidate(loaded,context.schemaPath,before,assignments,plan.saveFingerprint,async opened=>{
    const {players}=await readTables(opened.franchise,{players:PLAYER_TABLE_UID});
    for(const table of opened.franchise.tables.filter(t=>depthGuards.has(t.header.tableId)))await table.readRecords();verifyRosterDepthCharts(opened,depthGuards);
    verifyProtectedPlayers(protectedPlayers,players);
    for(const change of assignments.filter(change=>change.table==='players'))if(!isDeepStrictEqual(sf(players.records[change.row],change.field),change.newValue))throw new Error(`Generated player row ${change.row}, ${change.field} did not survive save/reload. The original save was kept unchanged.`);
  });
  completePlan(context.options.planId);
  return {...plan.result,mode:'apply',status:'completed',backupPath,reportPath,planId:context.options.planId};
}
