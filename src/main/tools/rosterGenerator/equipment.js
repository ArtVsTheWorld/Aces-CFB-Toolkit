import {coordinateHandedEquipment} from './handedEquipment.js';
import {sf} from '../equipment/openSave.js';
import {collectEquipmentDonors,patchFreshmanEquipment} from '../equipment/core/patcher.js';
import {buildRosterPlayerRows,buildFcsTeamIndexes,buildTeamNames,buildTeamApparel,buildRosterPlayerApparel} from '../equipment/shared.js';

export const ROSTER_EQUIPMENT_OPTIONS=Object.freeze({top:20,mixedChance:.30,crossMixedChance:.10,usingUnlockedMod:false,usingRawAccessoriesMod:false,noDripProfile:false,skipNilPlayers:false});

// Snapshot source donors before any generated roster is applied. Receiver
// records/visuals are plain, isolated objects: the active franchise is read-only.
export function makeRosterEquipmentGenerator(loaded){
  const rosterRows=buildRosterPlayerRows(loaded.players,loaded.teams,loaded.rosters),fcs=buildFcsTeamIndexes(loaded.teams.records),teamNames=buildTeamNames(loaded.teams.records),teamApparel=buildTeamApparel(loaded.teams.records),playerApparel=buildRosterPlayerApparel(loaded.players,loaded.teams,loaded.rosters);
  const preparedDonors=collectEquipmentDonors(loaded.players.records,loaded.visuals.records,loaded.visuals.header.tableId,{rosterRows,fcsTeamIndexes:fcs,teamNames,teamApparel,playerApparel});
  return (players,seed,team)=>{
    const receivers=players.map((player,index)=>({...player.fields,Position:player.position,TeamIndex:team.teamIndex,CharacterVisuals:(0x20000+index).toString(2).padStart(32,'0')}));
    const visuals=players.map(player=>({isEmpty:false,RawData:player.rawData}));
    const result=patchFreshmanEquipment(receivers,visuals,1,{...ROSTER_EQUIPMENT_OPTIONS,teamNames,teamApparel:new Map([[team.teamIndex,team.branding]]),donorPlayerRecords:loaded.players.records,donorVisualRecords:loaded.visuals.records,donorVisualsTableId:loaded.visuals.header.tableId,donorTeamNames:teamNames,donorTeamApparel:teamApparel,preparedDonors,eligiblePlayer:()=>true,seed:(seed^0x47454152)>>>0,apply:true});
    if(result.skipped.length||result.changes.length!==players.length)throw new Error(`Roster equipment could not be generated for every player: ${result.skipped.map(item=>`${item.position}: ${item.reason}`).join('; ')||'incomplete donor result'}. The save has not been written.`);
    const byRow=new Map(result.changes.map(change=>{const player=players[change.target.row],handed=coordinateHandedEquipment(change.newRawData,player,change.donorUses,row=>sf(loaded.players.records[row],'PLYR_HANDEDNESS'));return[player.row,{rawData:handed.rawData,audit:{handedness:handed.changes,handednessCompatibility:handed.compatibility??[],receiverHandedness:player.fields.PLYR_HANDEDNESS,source:'active-save',...ROSTER_EQUIPMENT_OPTIONS,donorUses:change.donorUses,mixed:change.mixed,crossPositionMixed:change.crossPositionMixed,brandAssignments:change.brandAssignments,brandCorrections:change.brandCorrections,generatedCorrections:change.generatedCorrections??[],facePaint:change.facePaint,fallbackNotes:change.fallbackNotes}}];}));
    return {byRow,summary:{source:'active-save',...ROSTER_EQUIPMENT_OPTIONS,players:players.length,donorPositions:result.donorPositions,compatibilityCorrections:result.sleeveCompatibilityCorrections}};
  };
}
