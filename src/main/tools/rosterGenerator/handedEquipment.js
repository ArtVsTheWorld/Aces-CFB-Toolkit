import {enforceEquipmentCompatibility} from '../equipment/core/compatibility.js';
// Preserve the donor's dominant/off-hand arrangement, not a guessed fixed side.
// Mirror only QB upper-body accessories or gloves, using each category's donor.
export function coordinateHandedEquipment(raw,player,donorUses,handednessOf){
  const parsed=JSON.parse(raw),changes=[];if(player.position!=='QB')return {rawData:raw,changes};
  const target=player.fields.PLYR_HANDEDNESS;
  for(const [group,pairs]of [['upper body + arms',['ArmWear','ElbowWear','WristWear']],['brand-compatible gloves',['HandWear']]]){
    const use=donorUses.find(use=>use.group===group)??donorUses.find(use=>use.group==='full kit');
    if(!use||use.donor.position!=='QB')continue;const source=handednessOf(use.donor.row);
    if(!['Left','Right'].includes(source)||source===target)continue;
    for(const outfit of parsed.loadouts.filter(l=>l.loadoutType==='PlayerOnField'))for(const pair of pairs){
      for(const item of outfit.loadoutElements){if(item.slotType==='Left'+pair){changes.push({oldSlot:item.slotType,newSlot:'Right'+pair,item:item.itemAssetName,donorRow:use.donor.row,donorHand:source,receiverHand:target});item.slotType='Right'+pair;}else if(item.slotType==='Right'+pair){changes.push({oldSlot:item.slotType,newSlot:'Left'+pair,item:item.itemAssetName,donorRow:use.donor.row,donorHand:source,receiverHand:target});item.slotType='Left'+pair;}}
    }
  }
  if(!changes.length)return {rawData:raw,changes};
  const compatibility=parsed.loadouts.filter(l=>l.loadoutType==='PlayerOnField').flatMap(l=>enforceEquipmentCompatibility(l.loadoutElements));
  return {rawData:JSON.stringify(parsed),changes,compatibility};
}
