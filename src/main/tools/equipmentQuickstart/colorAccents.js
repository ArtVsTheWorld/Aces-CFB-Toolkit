import { equipmentColorVariant, equipmentItem, isRawJamoItem } from '../equipment/catalog.js';
import { ACCESSORY_RECOLOR_CONTEXT } from '../equipment/core/recolor.js';
import { mulberry32 } from '../equipment/core/patcher.js';
import { parseRef, sf } from '../equipment/openSave.js';
import { isOriginalEaPlayer } from '../../services/originalEaPlayers.js';
import {isDeepStrictEqual} from 'node:util';
import {enforceEquipmentCompatibility} from '../equipment/core/compatibility.js';

const GROUPS = [
  {name:'gloves',slots:['LeftHandWear','RightHandWear'],eligible:(_asset,item)=>item?.category==='Gloves'},
  {name:'sleeves',slots:['LeftArmWear','RightArmWear'],eligible:(asset,item)=>isRawJamoItem(asset)||(item?.category==='Arm Wear'&&/sleeve/i.test(item.displayName)&&!/tape|bands/i.test(item.displayName))},
  {name:'undershirt',slots:['InnerShirt'],eligible:(asset,item)=>item?.category==='Undershirt'||/^gear_undershirt_irishjamo_(?:whi|bla|pri|sec|jer)$/.test(asset)}
];

// Select one worn category. A pair and duplicate on-field loadouts share one
// color; every member must have a verified variant, with no new gear added.
export function recolorQuickstartAccent(loadouts, random, fitOptions={}) {
  if(!Array.isArray(loadouts))return null;
  const elements=loadouts.filter(loadout=>loadout?.loadoutType==='PlayerOnField'&&Array.isArray(loadout.loadoutElements)).flatMap(loadout=>loadout.loadoutElements),groups=[];
  for(const group of GROUPS){
    const worn=elements.filter(element=>group.slots.includes(element.slotType)),pieces=[];let unknown=false;
    for(const element of worn){
      const asset=element.itemAssetName,item=equipmentItem(asset,ACCESSORY_RECOLOR_CONTEXT);
      if(!asset||/(?:^|_)None$/i.test(asset))continue;
      if(group.eligible(asset,item))pieces.push(element);
      else if(!item&&asset&&!/(?:^|_)None$/i.test(asset))unknown=true;
    }
    if(!pieces.length||unknown)continue;
    const choices=[];
    for(const color of ['primary','secondary']){
      const replacements=pieces.map(element=>({element,asset:equipmentColorVariant(element.itemAssetName,color,ACCESSORY_RECOLOR_CONTEXT)}));
      if(!replacements.every(change=>change.asset)||!replacements.some(change=>change.asset!==change.element.itemAssetName))continue;
      // Some mod colors reuse different vanilla families. A color-only accent
      // must not undo compatibility or sacrifice an existing accessory.
      const safe=loadouts.filter(l=>l?.loadoutType==='PlayerOnField'&&Array.isArray(l.loadoutElements)).every(loadout=>{
        const original=loadout.loadoutElements,proposed=structuredClone(original);
        for(const change of replacements){const at=original.indexOf(change.element);if(at>=0)proposed[at].itemAssetName=change.asset;}
        const existing=enforceEquipmentCompatibility(structuredClone(original),fitOptions);
        return enforceEquipmentCompatibility(proposed,fitOptions).every(issue=>existing.some(old=>isDeepStrictEqual(old,issue)));
      });
      if(safe)choices.push({color,replacements});
    }
    if(choices.length)groups.push({name:group.name,choices});
  }
  if(!groups.length)return null;
  const group=groups[Math.floor(random()*groups.length)],choice=group.choices[Math.floor(random()*group.choices.length)],changes=[];
  for(const {element,asset} of choice.replacements){
    if(asset===element.itemAssetName)continue;
    changes.push({slot:element.slotType,oldItem:element.itemAssetName,newItem:asset});element.itemAssetName=asset;
  }
  return {group:group.name,color:choice.color,changes};
}

export function applyQuickstartColorAccents({unlocked,raw=false,changes,players,visuals,visualsTableId,seed,protectOriginalEaPlayers=true,random=mulberry32((seed^0xACCE5705)>>>0)}){
  if(!unlocked)return [];
  const references=new Map(),accents=[];
  for(const record of players){if(!record||record.isEmpty)continue;const ref=parseRef(sf(record,'CharacterVisuals'));if(ref?.tableId===visualsTableId)references.set(ref.row,(references.get(ref.row)??0)+1);}
  for(const change of changes){
    const record=players[change.target.row],ref=parseRef(sf(record,'CharacterVisuals'));
    if(!record||record.isEmpty||['K','P'].includes(String(sf(record,'Position')).toUpperCase())||(protectOriginalEaPlayers&&isOriginalEaPlayer(record)))continue;
    if(ref?.tableId!==visualsTableId||ref.row!==change.visualsRow||references.get(ref.row)!==1)continue;
    if(random()>=.05)continue;
    const visual=visuals[ref.row];if(!visual||visual.isEmpty)continue;
    let parsed;try{parsed=JSON.parse(sf(visual,'RawData'));}catch{continue;}
    const accent=recolorQuickstartAccent(parsed?.loadouts??[],random,{usingUnlockedMod:true,usingRawAccessoriesMod:raw});
    if(accent){visual.RawData=JSON.stringify(parsed);accents.push({row:change.target.row,visualsRow:ref.row,...accent});}
  }
  return accents;
}
