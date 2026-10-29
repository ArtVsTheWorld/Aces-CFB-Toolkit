import {ACCESSORY_RECOLOR_CONTEXT} from './recolor.js';
import {equipmentItem} from '../catalog.js';

export const isWaistPlaycallBand = asset => typeof asset === 'string' && (
  equipmentItem(asset)?.category === 'Waist Playcall Band' || /^(?:Waist_PlaycallSheet_|gear_y27_waistworncallsheet_)/i.test(asset)
);

// Pool rolls already target QBs. Check the final randomized outfit too because
// full and mixed donors can carry these items from an existing appearance.
export const isQbGlove = element => {
  const asset=element?.itemAssetName;
  return typeof asset==='string'&&!/(?:^|_)None$/i.test(asset)&&!/^GearHand_tapedHand/i.test(asset)&&(equipmentItem(asset,ACCESSORY_RECOLOR_CONTEXT)?.category==='Gloves'||/^GearHand_glove_/i.test(asset));
};
export function limitQbGloves(loadouts,handedness='Right'){
  const slot=String(handedness).toLowerCase()==='left'?'LeftHandWear':'RightHandWear',changes=[];
  for(const [index,loadout] of loadouts.entries()){
    if(loadout?.loadoutType!=='PlayerOnField'||!Array.isArray(loadout.loadoutElements))continue;
    if(!['LeftHandWear','RightHandWear'].every(side=>loadout.loadoutElements.some(e=>e.slotType===side&&isQbGlove(e))))continue;
    for(const element of loadout.loadoutElements)if(element.slotType===slot&&isQbGlove(element)){
      changes.push({loadout:index,slot,oldItem:element.itemAssetName,newItem:'GearHand_None',reason:'QBs wear at most one glove'});element.itemAssetName='GearHand_None';
    }
  }
  return changes;
}
export function enforceRandomizerPositionRestrictions(loadouts, position, handedness='Right') {
  if (String(position).toUpperCase() === 'QB') return limitQbGloves(loadouts,handedness);
  const changes = [];
  for (const [index, loadout] of loadouts.entries()) {
    loadout.loadoutElements = loadout.loadoutElements.filter(element => {
      if (!isWaistPlaycallBand(element?.itemAssetName)) return true;
      changes.push({loadout:index,slot:element.slotType,oldItem:element.itemAssetName,newItem:'Removed',reason:'Waist playcall bands are QB-only'});
      return false;
    });
  }
  return changes;
}
