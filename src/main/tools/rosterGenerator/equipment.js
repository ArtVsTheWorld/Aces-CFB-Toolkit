import {coordinateHandedEquipment} from './handedEquipment.js';
import {sf} from '../equipment/openSave.js';
import {collectEquipmentDonors,patchFreshmanEquipment} from '../equipment/core/patcher.js';
import {buildRosterPlayerRows,buildFcsTeamIndexes,buildTeamNames,buildTeamApparel,buildRosterPlayerApparel} from '../equipment/shared.js';
import {quickstartSettings,finishQuickstartEquipment} from '../equipmentQuickstart/runner.js';
import {finalGeneratedChanges} from '../equipment/core/generatedCompatibility.js';

const settings=quickstartSettings({protectOriginalEaPlayers:false});
export const ROSTER_EQUIPMENT_OPTIONS=Object.freeze({...Object.fromEntries(['top','usingVanillaPool','usingUnlockedMod','usingRawAccessoriesMod','usingEquipmentTruckMod','noDripProfile','protectOriginalEaPlayers','donorOnlyPositions','allowDonorOnlyNoDrip','donorOnlyGlovesPositions'].map(key=>[key,settings.randomizer[key]])),mixedChance:.30,crossMixedChance:.10});

// Source donors remain frozen. All recipients are NEW generated identities,
// so source-donor exclusions and completed-player memory do not apply to them.
export function makeRosterEquipmentGenerator(loaded){
  const rosterRows=buildRosterPlayerRows(loaded.players,loaded.teams,loaded.rosters),fcs=buildFcsTeamIndexes(loaded.teams.records),teamNames=buildTeamNames(loaded.teams.records),teamApparel=buildTeamApparel(loaded.teams.records),playerApparel=buildRosterPlayerApparel(loaded.players,loaded.teams,loaded.rosters);
  const preparedDonors=collectEquipmentDonors(loaded.players.records,loaded.visuals.records,loaded.visuals.header.tableId,{rosterRows,fcsTeamIndexes:fcs,teamNames,teamApparel,playerApparel});
  return (players,seed,team)=>{
    const gearSeed=(seed^0x47454152)>>>0,policy={...settings,patcher:{...settings.patcher,seed:gearSeed}};
    const receivers=players.map((player,index)=>({...player.fields,index,isEmpty:false,Position:player.position,TeamIndex:team.teamIndex,CharacterVisuals:(0x20000+index).toString(2).padStart(32,'0')}));
    const visuals=players.map(player=>({isEmpty:false,RawData:player.rawData}));
    const result=patchFreshmanEquipment(receivers,visuals,1,{...settings.randomizer,...ROSTER_EQUIPMENT_OPTIONS,deferAccessoryColors:true,teamNames,teamApparel:new Map([[team.teamIndex,team.branding]]),donorPlayerRecords:loaded.players.records,donorVisualRecords:loaded.visuals.records,donorVisualsTableId:loaded.visuals.header.tableId,donorTeamNames:teamNames,donorTeamApparel:teamApparel,preparedDonors,eligiblePlayer:()=>true,seed:gearSeed,apply:true});
    if(result.skipped.length||result.changes.length!==players.length)throw new Error(`Roster equipment could not be generated for every player: ${result.skipped.map(item=>`${item.position}: ${item.reason}`).join('; ')||'incomplete donor result'}. The save has not been written.`);
    const handedness=new Map();
    for(const change of result.changes){const player=players[change.target.row],handed=coordinateHandedEquipment(change.newRawData,player,change.donorUses,row=>sf(loaded.players.records[row],'PLYR_HANDEDNESS'));visuals[change.target.row].RawData=handed.rawData;handedness.set(change.target.row,handed);}
    const finished=finishQuickstartEquipment({players:receivers,visuals,visualsTableId:1,settings:policy,changes:result.changes,seed:gearSeed,rosterRows:new Set(receivers.map((_,row)=>row)),teamNames:new Map([[team.teamIndex,team.name]]),dynastyId:'generated-roster'});
    const byRow=new Map(result.changes.map(change=>{
      const player=players[change.target.row],handed=handedness.get(change.target.row),rawData=visuals[change.target.row].RawData,loadouts=JSON.parse(rawData).loadouts.filter(l=>l.loadoutType==='PlayerOnField');
      return[player.row,{rawData,audit:{handedness:handed.changes,handednessCompatibility:handed.compatibility??[],receiverHandedness:player.fields.PLYR_HANDEDNESS,source:'active-save',policy:'quickstart-no-mods',...ROSTER_EQUIPMENT_OPTIONS,donorUses:change.donorUses,mixed:change.mixed,crossPositionMixed:change.crossPositionMixed,brandAssignments:change.brandAssignments,brandCorrections:change.brandCorrections,accessoryColors:change.accessoryColors,generatedCorrections:change.generatedCorrections??[],facePaint:change.facePaint,vanillaChanges:finalGeneratedChanges(loadouts,change.vanillaChanges??[],{usingUnlockedMod:false,usingRawAccessoriesMod:false}),noDrip:change.noDrip??false,qbGloveCorrections:change.qbGloveCorrections??[],sleeveStyleCorrections:change.sleeveStyleCorrections??[],fallbackNotes:change.fallbackNotes}}];
    }));
    return {byRow,summary:{source:'active-save',policy:'quickstart-no-mods',...ROSTER_EQUIPMENT_OPTIONS,players:players.length,donorPositions:result.donorPositions,compatibilityCorrections:result.sleeveCompatibilityCorrections,quickstartCorrections:finished.fixes.visualsChanged,qbGloves:finished.qbGlovePopulation}};
  };
}
