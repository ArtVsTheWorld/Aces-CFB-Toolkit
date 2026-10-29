import {isQbGlove as glove,limitQbGloves} from '../equipment/core/positionRestrictions.js';
import {parseRef,sf} from '../equipment/openSave.js';
import {isOriginalEaPlayer} from '../../services/originalEaPlayers.js';
import {mulberry32} from '../equipment/core/patcher.js';

// Run after all additions and recolors so a mod pool cannot restore the pair.
// Keep a single existing glove; when both hands have gloves, clear the throwing
// hand. Never add a glove, move another accessory, or touch unprocessed players.
export function applyQuickstartQbGloves({changes,players,visuals,visualsTableId,protectOriginalEaPlayers=true}){
  const references=new Map(),corrections=[];
  for(const record of players){if(!record||record.isEmpty)continue;const ref=parseRef(sf(record,'CharacterVisuals'));if(ref?.tableId===visualsTableId)references.set(ref.row,(references.get(ref.row)??0)+1);}
  for(const change of changes){
    const record=players[change.target.row],ref=parseRef(sf(record,'CharacterVisuals'));
    if(!record||record.isEmpty||String(sf(record,'Position')).toUpperCase()!=='QB'||(protectOriginalEaPlayers&&isOriginalEaPlayer(record)))continue;
    if(ref?.tableId!==visualsTableId||ref.row!==change.visualsRow||references.get(ref.row)!==1)continue;
    const visual=visuals[ref.row];if(!visual||visual.isEmpty)continue;
    let parsed;try{parsed=JSON.parse(sf(visual,'RawData'));}catch{continue;}
    const removed=limitQbGloves(parsed?.loadouts??[],sf(record,'PLYR_HANDEDNESS'));
    if(removed.length){visual.RawData=JSON.stringify(parsed);change.qbGloveCorrections=removed;corrections.push({row:change.target.row,visualsRow:ref.row,changes:removed});}
  }
  return corrections;
}

// A dynasty-wide cap avoids rounding one glove up for every small QB room.
// Existing protected/remembered players consume the allowance and are never
// edited here. Random selection only retains worn donor gloves; it adds none.
export function capQuickstartQbGloves({changes,players,visuals,visualsTableId,seed=1,activePlayerRows,protectOriginalEaPlayers=true}){
  const references=new Map(),processed=new Map(changes.map(change=>[change.target.row,change])),candidates=[];
  let population=0,existingGloved=0;
  for(const record of players){if(!record||record.isEmpty)continue;const ref=parseRef(sf(record,'CharacterVisuals'));if(ref?.tableId===visualsTableId)references.set(ref.row,(references.get(ref.row)??0)+1);}
  for(const [row,record] of players.entries()){
    if(!record||record.isEmpty||String(sf(record,'Position')).toUpperCase()!=='QB'||activePlayerRows&&!activePlayerRows.has(row))continue;
    const ref=parseRef(sf(record,'CharacterVisuals')),visual=ref?.tableId===visualsTableId?visuals[ref.row]:null;
    if(!visual||visual.isEmpty)continue;
    let parsed;try{parsed=JSON.parse(sf(visual,'RawData'));}catch{continue;}
    const outfits=Array.isArray(parsed?.loadouts)?parsed.loadouts.filter(loadout=>loadout?.loadoutType==='PlayerOnField'&&Array.isArray(loadout.loadoutElements)):[];
    if(!outfits.length)continue;
    population++;
    if(!outfits.some(loadout=>loadout.loadoutElements.some(element=>['LeftHandWear','RightHandWear'].includes(element?.slotType)&&glove(element))))continue;
    const change=processed.get(row);
    if(!change||ref.row!==change.visualsRow||references.get(ref.row)!==1||(protectOriginalEaPlayers&&isOriginalEaPlayer(record))){existingGloved++;continue;}
    candidates.push({row,visual,parsed,outfits,change});
  }
  const limit=Math.floor(population/100),allowance=Math.max(0,limit-existingGloved),random=mulberry32((seed^0x5142474c)>>>0);
  for(let index=candidates.length-1;index>0;index--){const other=Math.floor(random()*(index+1));[candidates[index],candidates[other]]=[candidates[other],candidates[index]];}
  let removed=0;
  for(const candidate of candidates.slice(allowance)){
    const edits=[];
    for(const loadout of candidate.outfits)for(const element of loadout.loadoutElements)if(['LeftHandWear','RightHandWear'].includes(element?.slotType)&&glove(element)){
      edits.push({slot:element.slotType,oldItem:element.itemAssetName,newItem:'GearHand_None',reason:'Quickstart QB glove cap'});element.itemAssetName='GearHand_None';
    }
    candidate.visual.RawData=JSON.stringify(candidate.parsed);candidate.change.qbGloveCorrections=[...(candidate.change.qbGloveCorrections??[]),...edits];removed++;
  }
  return {percent:1,population,limit,existingGloved,retained:Math.min(allowance,candidates.length),removed,totalGloved:existingGloved+Math.min(allowance,candidates.length)};
}
