import {isDeepStrictEqual} from 'node:util';
import {equipmentColorVariant,equipmentItem,equipmentDisplayName,isRawJamoItem} from '../catalog.js';
import {enforceEquipmentCompatibility} from './compatibility.js';
import {isArmTape,isWristTape} from './recolor.js';
import {modPoolDefinitions} from './modPools.js';

const colors=['white','black','primary','secondary'];
const slots=new Set(['InnerShirt','InnerPants','LeftArmWear','RightArmWear','LeftWristWear','RightWristWear','LeftElbowWear','RightElbowWear','LeftBicepWear','RightBicepWear','LeftHandWear','RightHandWear','LeftSpat','RightSpat','NeckWear','Neckpad','FaceWear','WaistWear','GuardianCap']);
const poolLists={vanilla:'vanillaChanges',unlocked:'unlockedChanges',raw:'rawChanges',eljax:'equipmentTruckChanges'};
const slotOf=e=>e.slotType??e.slot;

// A coordinator belongs to one run. Cache catalog lookups, never player outfits
// or random rolls. Fixed/custom colors, shoes, mouthpieces and facepaint stay put.
export function createAccessoryColorCoordinator(options={}){
  const context={usingUnlockedMod:options.usingUnlockedMod===true,usingRawAccessoriesMod:options.usingRawAccessoriesMod===true},cache=new Map();
  const selected=new Map(),defaults=options.modPools?modPoolDefinitions():{};
  for(const [origin,categories]of Object.entries(options.modPools??{})){
    if(origin==='_version')continue;
    for(const [id,choice]of Object.entries(categories)){
      const definition=defaults[origin]?.find(c=>c.id===id),usual=definition?.defaultItems??definition?.items.map(i=>i.itemName)??[],items=new Set(choice.items??[]);
      // Default pool selections choose styles. Their verified color variants
      // may match the rest of the outfit. Preserve deliberate custom selections.
      if(items.size===usual.length&&usual.every(asset=>items.has(asset)))continue;
      for(const asset of items)selected.set(origin+'\0'+asset,items);
    }
  }
  const allowed=item=>item&&(item.origin==='vanilla'||({unlocked:context.usingUnlockedMod,raw:context.usingRawAccessoriesMod,eljax:options.usingEquipmentTruckMod===true})[item.origin]===true);
  function variants(asset){
    if(cache.has(asset))return cache.get(asset);
    const item=equipmentItem(asset,context),choices=new Map();
    if(allowed(item))for(const color of colors){const value=equipmentColorVariant(asset,color,context),target=equipmentItem(value,context);if(value&&allowed(target)&&!target.displayOnly)choices.set(color,value);}
    cache.set(asset,choices);return choices;
  }
  return (loadouts,change={})=>{
    const onField=(Array.isArray(loadouts)?loadouts:[]).filter(l=>l?.loadoutType==='PlayerOnField'&&Array.isArray(l.loadoutElements)),pieces=[],provenance=new Map();
    for(const [origin,list]of Object.entries(poolLists))for(const addition of change[list]??[])for(const slot of addition.slots??[])for(const asset of addition.newItem.split(' + '))provenance.set(slot+'\0'+asset,origin);
    for(const [index,l]of onField.entries())for(const element of l.loadoutElements){
      const slot=slotOf(element),asset=element.itemAssetName;if(!slots.has(slot)||!asset)continue;
      const family=variants(asset);if(family.size<2)continue;
      const origin=provenance.get(slot+'\0'+asset),selection=selected.get(origin+'\0'+asset),choices=new Map([...family].filter(([,value])=>value===asset||!selection||selection.has(value)));
      pieces.push({index,element,slot,asset,choices,tape:['LeftSpat','RightSpat'].includes(slot)||(!context.usingRawAccessoriesMod||!isRawJamoItem(asset))&&isArmTape(asset,slot)||isWristTape(asset,slot)});
    }
    if(!pieces.length)return {color:null,changes:[]};
    // Prefer a color that can cover the most pieces. Within that, keep the
    // player's dominant accessory color; tape is only the tie-breaker/fallback.
    const unique=[...new Map(pieces.map(p=>[p.slot+'\0'+p.asset,p])).values()],voters=unique.some(p=>!p.tape)?unique.filter(p=>!p.tape):unique;
    const ranked=colors.map((color,index)=>({color,index,coverage:unique.filter(p=>p.choices.has(color)).length,votes:voters.filter(p=>p.choices.get(color)===p.asset).length,tapeVotes:unique.filter(p=>p.tape&&p.choices.get(color)===p.asset).length})).sort((a,b)=>b.coverage-a.coverage||b.votes-a.votes||b.tapeVotes-a.tapeVotes||a.index-b.index);
    let baseline;
    for(const {color}of ranked){
      const edits=pieces.filter(p=>p.choices.has(color)&&p.choices.get(color)!==p.asset);
      if(!edits.length)return {color,changes:[]};
      baseline??=onField.map(l=>enforceEquipmentCompatibility(structuredClone(l.loadoutElements),context));
      const proposed=onField.map(l=>structuredClone(l.loadoutElements));
      for(const p of edits)proposed[p.index][onField[p.index].loadoutElements.indexOf(p.element)].itemAssetName=p.choices.get(color);
      if(!proposed.every((elements,index)=>enforceEquipmentCompatibility(elements,context).every(issue=>baseline[index].some(old=>isDeepStrictEqual(old,issue)))))continue;
      const changes=edits.map(p=>({loadout:p.index,slot:p.slot,oldItem:p.asset,newItem:p.choices.get(color)}));
      for(const p of edits)p.element.itemAssetName=p.choices.get(color);
      updateAccessoryColorAudit(change,changes,context);
      return {color,changes};
    }
    return {color:null,changes:[]};
  };
}

// Keep pool provenance attached when its color changes. Reports must describe
// the surviving item, rather than dropping an addition as though it was removed.
export function updateAccessoryColorAudit(change,corrections,context={}){
  for(const list of Object.values(poolLists))if(change[list])change[list]=change[list].map(addition=>{
    const names=[...new Set(addition.newItem.split(' + ').map(asset=>corrections.find(c=>c.oldItem===asset&&addition.slots.includes(c.slot))?.newItem??asset))];
    return names.join(' + ')===addition.newItem?addition:{...addition,newItem:names.join(' + '),displayName:names.map(asset=>equipmentItem(asset,context)?.displayName??equipmentDisplayName(asset,context)).join(' + ')};
  });
}
