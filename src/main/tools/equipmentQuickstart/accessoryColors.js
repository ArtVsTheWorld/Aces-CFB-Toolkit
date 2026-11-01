import {createAccessoryColorCoordinator} from '../equipment/core/accessoryColors.js';
import {parseRef,sf} from '../equipment/openSave.js';
import {isOriginalEaPlayer} from '../../services/originalEaPlayers.js';

// Quickstart and generated rosters finish after all correction passes. Explicit
// recolor settings (including tape rules and Quickstart accents) take priority.
export function finishAccessoryColors({players,visuals,visualsTableId,settings,changes,donorRows=new Set(),processedRows=new Set(changes.map(c=>c.target.row))}){
  if(settings.patcher.unlockedRecolorFix)return;
  const coordinate=createAccessoryColorCoordinator(settings.randomizer),owners=new Map();
  for(const record of players){if(!record||record.isEmpty)continue;const ref=parseRef(sf(record,'CharacterVisuals'));if(ref?.tableId===visualsTableId)owners.set(ref.row,(owners.get(ref.row)??0)+1);}
  for(const change of changes){
    const row=change.target.row,record=players[row],ref=parseRef(sf(record,'CharacterVisuals'));
    if(!record||record.isEmpty||donorRows.has(row)||!processedRows.has(row)||(settings.mods.protectOriginalEaPlayers&&isOriginalEaPlayer(record)))continue;
    if(ref?.tableId!==visualsTableId||ref.row!==change.visualsRow||owners.get(ref.row)!==1)continue;
    const visual=visuals[ref.row];if(!visual||visual.isEmpty)continue;
    let parsed;try{parsed=JSON.parse(sf(visual,'RawData'));}catch{continue;}
    const result=coordinate(parsed.loadouts,change);
    change.accessoryColors=result;
    if(result.changes.length){visual.RawData=JSON.stringify(parsed);change.newRawData=visual.RawData;}
  }
}
