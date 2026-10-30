import {EQUIPMENT_ITEMS,RAW_314,equipmentDisplayName} from '../catalog.js';
import {UNLOCKED_TATTOO_POOL} from './tattoos.js';
import {REMOVAL_NAMED_ITEMS,REMOVAL_DISPLAY_ALIASES} from './removalInventory.js';
import MapperEditor from '../../../../shared/mapperEditor.cjs';

const allItems=[...EQUIPMENT_ITEMS,...REMOVAL_NAMED_ITEMS,...RAW_314.jamoItems,...UNLOCKED_TATTOO_POOL.map(item=>({itemName:item.value,displayName:item.label,category:'Tattoo',slots:item.type==='leg'?['LeftLegTattoo','RightLegTattoo']:['LeftArmTattoo','RightArmTattoo']}))];
const isEmptyItem=item=>/(?:^|_)None$/i.test(item.itemName)||['FaceGear_BalaclavaNone','waistband_none_v36','LegTattoo_TEST'].includes(item.itemName);
const blocked=new Set(MapperEditor.protectedRemovalSlots);
const noneSlots=new Set(EQUIPMENT_ITEMS.filter(isEmptyItem).flatMap(item=>item.slots).filter(slot=>!blocked.has(slot)));
// These native None entries are used by the game's appearance codec and by the
// existing undershirt/tattoo passes, although not listed as wearable catalog items.
for(const slot of ['InnerShirt','InnerPants','NeckWear','LeftArmTattoo','RightArmTattoo','LeftLegTattoo','RightLegTattoo'])noneSlots.add(slot);
const catalog=new Map(allItems.filter(item=>!isEmptyItem(item)&&item.slots?.length&&item.slots.every(slot=>noneSlots.has(slot)&&!blocked.has(slot))).map(item=>[item.itemName,item]));
const labels=new Map();
for(const item of allItems){const names=labels.get(item.itemName)??new Set();names.add(item.displayName||equipmentDisplayName(item.itemName));names.add(equipmentDisplayName(item.itemName,{usingUnlockedMod:false}));labels.set(item.itemName,names);}
export const removalCatalog=()=>[...catalog.values()].map(item=>({value:item.itemName,label:`${[item.displayName||equipmentDisplayName(item.itemName),...[...labels.get(item.itemName)].filter(name=>name!==item.displayName)].join(' / ')} · ${item.category||'Equipment'}`,searchAliases:REMOVAL_DISPLAY_ALIASES[item.itemName]??[],group:item.category==='Tattoos'?'Tattoo':item.category||'Equipment'})).sort((a,b)=>a.group.localeCompare(b.group)||a.label.localeCompare(b.label)||a.value.localeCompare(b.value));
export function normalizeRemovalItems(items){
  if(!Array.isArray(items)||items.some(item=>typeof item!=='string'||!catalog.has(item)))throw Error('Choose removable items with a supported None option. '+MapperEditor.removalRestriction);
  return [...new Set(items)];
}
const eligibleSlot=element=>element?.slotType?noneSlots.has(element.slotType)&&!blocked.has(element.slotType):!catalog.get(element?.itemAssetName)?.requiresExplicitSlot;
// Keep object identity rather than array indices: tattoos may insert a Base
// layer or move an existing tattoo entry before the final removal pass.
export function captureRemovalItems(parsed,selected){
  const chosen=new Set(normalizeRemovalItems(selected)),originalItems=new WeakMap();
  for(const loadout of parsed.loadouts??[])for(const element of Array.isArray(loadout?.loadoutElements)?loadout.loadoutElements:[]){
    if(element&&chosen.has(element.itemAssetName)&&eligibleSlot(element))originalItems.set(element,element.itemAssetName);
  }
  return originalItems;
}
export function removeSelectedEquipment(parsed,selected,{originalItems}={}){
  const chosen=new Set(normalizeRemovalItems(selected)),changes=[];
  // A known label can describe a backing clothing asset. Removal is allowed
  // only when its actual saved slot supports None; never clear required gear
  // merely because the same asset name appears in another layer or slot.
  const removable=element=>(chosen.has(element?.itemAssetName)||originalItems?.has(element))&&eligibleSlot(element)&&!blocked.has(element?.slotType);
  for(const [index,loadout]of (parsed.loadouts??[]).entries()){
    if(!Array.isArray(loadout?.loadoutElements))continue;
    const removed=loadout.loadoutElements.filter(removable);
    const dependent=new Set(removed.filter(element=>['WaistWear','LeftShoe','RightShoe'].includes(element.slotType)).map(element=>element.slotType+'Override'));
    loadout.loadoutElements=loadout.loadoutElements.filter(element=>{
      if(blocked.has(element?.slotType)||(!removable(element)&&!dependent.has(element?.slotType)))return true;
      const originalItem=originalItems?.get(element);
      changes.push({loadout:index,slot:element.slotType,oldItem:element.itemAssetName,newItem:'Not Equipped',...(originalItem&&originalItem!==element.itemAssetName?{originalItem}:{})});return false;
    });
  }
  return changes;
}
