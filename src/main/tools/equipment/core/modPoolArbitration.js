import {equipmentItem} from '../catalog.js';
import {enforceGeneratedEquipmentCompatibility,recordGeneratedEquipment} from './generatedCompatibility.js';

// Each provider has already rolled on its own copy of the same donor outfit.
// Randomize provider priority, never their settings/chances. Earlier accepted
// choices cannot be overwritten or made incompatible by a later provider.
export function resolveModPoolRolls(loadouts,candidates,rng,state,position){
  const order=[...candidates],claimed=new Map(),accepted=new Map();
  for(let index=order.length-1;index>0;index--){const other=Math.floor(rng()*(index+1));[order[index],order[other]]=[order[other],order[index]];}
  for(const candidate of order){
    const groups=new Map();
    for(const [slot,asset]of candidate.state.added[0]??[]){
      if(!candidate.loadouts.every(loadout=>loadout.loadoutElements.some(element=>element.slotType===slot&&element.itemAssetName===asset)))continue;
      const key=asset+'|'+slot.replace(/^(Left|Right)/,'');
      if(!groups.has(key))groups.set(key,{asset,slots:[]});groups.get(key).slots.push(slot);
    }
    for(const {asset,slots}of groups.values()){
      if(slots.some(slot=>claimed.has(slot)))continue;
      if(!equipmentItem(asset,state.options))continue;
      const tentative=loadouts.map((loadout,index)=>{
        const elements=[...loadout.loadoutElements];
        for(const slot of slots){const proposed=candidate.loadouts[index].loadoutElements.find(element=>element.slotType===slot),at=elements.findIndex(element=>element.slotType===slot);if(at<0)elements.push(structuredClone(proposed));else elements[at]=structuredClone(proposed);}
        return {...loadout,loadoutElements:elements};
      });
      const next={...state,added:state.added.map(added=>new Map(added))};recordGeneratedEquipment(next,slots,asset);
      if(enforceGeneratedEquipmentCompatibility(tentative,next,position).length)continue;
      loadouts.forEach((loadout,index)=>loadout.loadoutElements=tentative[index].loadoutElements);state.added=next.added;
      slots.forEach(slot=>claimed.set(slot,candidate.origin));
    }
    accepted.set(candidate.origin,candidate.changes.filter(change=>change.slots.every(slot=>claimed.get(slot)===candidate.origin)));
  }
  return Object.fromEntries(candidates.map(candidate=>[candidate.origin,accepted.get(candidate.origin)??[]]));
}
