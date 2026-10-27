import {EQUIPMENT_ITEMS,RAW_314,equipmentDisplayName} from '../catalog.js';
import {UNLOCKED_TATTOO_POOL} from './tattoos.js';

const allItems=[...EQUIPMENT_ITEMS,...RAW_314.jamoItems,...UNLOCKED_TATTOO_POOL.map(item=>({itemName:item.value,displayName:item.label,category:'Tattoo',slots:item.type==='leg'?['LeftLegTattoo','RightLegTattoo']:['LeftArmTattoo','RightArmTattoo']}))];
const isEmptyItem=item=>/(?:^|_)None$/i.test(item.itemName)||['FaceGear_BalaclavaNone','waistband_none_v36'].includes(item.itemName);
const blocked=new Set(['HeadWear','FaceMask','LeftShoe','RightShoe','LeftShoeOverride','RightShoeOverride']);
const noneSlots=new Set(EQUIPMENT_ITEMS.filter(isEmptyItem).flatMap(item=>item.slots).filter(slot=>!blocked.has(slot)));
// These native None entries are used by the game's appearance codec and by the
// existing undershirt/tattoo passes, although not listed as wearable catalog items.
for(const slot of ['InnerShirt','LeftArmTattoo','RightArmTattoo','LeftLegTattoo','RightLegTattoo'])noneSlots.add(slot);
const catalog=new Map(allItems.filter(item=>!isEmptyItem(item)&&item.slots?.length&&item.slots.every(slot=>noneSlots.has(slot)&&!blocked.has(slot))).map(item=>[item.itemName,item]));
export const removalCatalog=()=>[...catalog.values()].map(item=>({value:item.itemName,label:`${item.displayName||equipmentDisplayName(item.itemName)} · ${item.category||'Equipment'}`,group:item.category==='Tattoos'?'Tattoo':item.category||'Equipment'})).sort((a,b)=>a.group.localeCompare(b.group)||a.label.localeCompare(b.label)||a.value.localeCompare(b.value));
export function normalizeRemovalItems(items){
  if(!Array.isArray(items)||items.some(item=>typeof item!=='string'||!catalog.has(item)))throw Error('Choose removable items with a supported None option. Helmets, facemasks and cleats cannot be removed.');
  return [...new Set(items)];
}
export function removeSelectedEquipment(parsed,selected){
  const chosen=new Set(normalizeRemovalItems(selected)),changes=[];
  for(const [index,loadout]of (parsed.loadouts??[]).entries()){
    if(!Array.isArray(loadout?.loadoutElements))continue;
    const removed=loadout.loadoutElements.filter(element=>chosen.has(element?.itemAssetName)&&!blocked.has(element?.slotType));
    const dependent=new Set(removed.filter(element=>['WaistWear','LeftShoe','RightShoe'].includes(element.slotType)).map(element=>element.slotType+'Override'));
    loadout.loadoutElements=loadout.loadoutElements.filter(element=>{
      if(blocked.has(element?.slotType)||(!chosen.has(element?.itemAssetName)&&!dependent.has(element?.slotType)))return true;
      changes.push({loadout:index,slot:element.slotType,oldItem:element.itemAssetName,newItem:'Not Equipped'});return false;
    });
  }
  return changes;
}
