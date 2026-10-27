import {EQUIPMENT_ITEMS,RAW_314,equipmentDisplayName} from '../catalog.js';
import {UNLOCKED_TATTOO_POOL} from './tattoos.js';

const catalog=new Map([...EQUIPMENT_ITEMS,...RAW_314.jamoItems,...UNLOCKED_TATTOO_POOL.map(item=>({itemName:item.value,displayName:item.label,category:'Tattoo'}))].map(item=>[item.itemName,item]));
export const removalCatalog=()=>[...catalog.values()].map(item=>({value:item.itemName,label:`${item.displayName||equipmentDisplayName(item.itemName)} · ${item.category||'Equipment'}`})).sort((a,b)=>a.label.localeCompare(b.label)||a.value.localeCompare(b.value));
export function normalizeRemovalItems(items){
  if(!Array.isArray(items)||items.some(item=>typeof item!=='string'||!catalog.has(item)))throw Error('Choose equipment to remove from the catalog.');
  return [...new Set(items)];
}
export function removeSelectedEquipment(parsed,selected){
  const chosen=new Set(selected),changes=[];
  for(const [index,loadout]of (parsed.loadouts??[]).entries()){
    if(!Array.isArray(loadout?.loadoutElements))continue;
    const removed=loadout.loadoutElements.filter(element=>chosen.has(element?.itemAssetName));
    const dependent=new Set(removed.filter(element=>['WaistWear','LeftShoe','RightShoe'].includes(element.slotType)).map(element=>element.slotType+'Override'));
    loadout.loadoutElements=loadout.loadoutElements.filter(element=>{
      if(!chosen.has(element?.itemAssetName)&&!dependent.has(element?.slotType))return true;
      changes.push({loadout:index,slot:element.slotType,oldItem:element.itemAssetName,newItem:'Not Equipped'});return false;
    });
  }
  return changes;
}
