import {equipmentItem} from '../catalog.js';

export const isWaistPlaycallBand = asset => typeof asset === 'string' && (
  equipmentItem(asset)?.category === 'Waist Playcall Band' || /^(?:Waist_PlaycallSheet_|gear_y27_waistworncallsheet_)/i.test(asset)
);

// Pool rolls already target QBs. Check the final randomized outfit too because
// full and mixed donors can carry these items from an existing appearance.
export function enforceRandomizerPositionRestrictions(loadouts, position) {
  if (String(position).toUpperCase() === 'QB') return [];
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
