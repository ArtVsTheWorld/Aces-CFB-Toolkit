import {isDeepStrictEqual} from 'node:util';
import {equipmentItem,equipmentDisplayName,equipmentSemantics,normalBrand} from '../equipment/catalog.js';
import {enforceEquipmentCompatibility} from '../equipment/core/compatibility.js';
import {BRAND_SLOTS,isBrandCompatibleItem} from '../equipment/core/brandCompatibility.js';
import {generatedItemConflict} from '../equipment/core/generatedCompatibility.js';
import {facemaskFitsHelmet,helmetModel} from '../equipment/core/helmets.js';
import {mapperLibrary,mapperDigest as digest,resolveMapperSlot,mapperElements,mapperContext} from './library.js';
export {mapperLibrary} from './library.js';
import {expandMapperRules,mapperMatches,mapperRuleCaps} from './rules.js';
const clone=value=>structuredClone(value);
const active=asset=>asset&&!/(?:^|_)none$/i.test(asset)&&asset!=='FaceGear_BalaclavaNone';
const itemAt=(elements,slot)=>elements.find(item=>item?.slotType===slot);
const inScope=(player,rule)=>(!rule.teams?.length||rule.teams.includes(player.team))&&(!rule.positions?.length||rule.positions.includes(player.position))&&(!rule.playerRows?.length||rule.playerRows.map(Number).includes(player.row));

function compatible(elements,changedSlots,player,originalElements){
  const get=slot=>itemAt(elements,slot)?.itemAssetName;
  for(const slot of changedSlots){
    const element=itemAt(elements,slot);if(!element)continue;
    const item=equipmentItem(element.itemAssetName);
    if(item&&!item.slots.includes(slot.replace(/Override$/,'')))return `${equipmentDisplayName(element.itemAssetName)} does not fit ${slot}.`;
    if(BRAND_SLOTS.has(slot)&&!isBrandCompatibleItem(slot,element.itemAssetName,player.branding))return `The selected ${slot.includes('Shoe')?'cleats':'gloves'} are not verified for this team's ${normalBrand(player.branding)||'unknown'} brand.`;
    if(item){const conflict=generatedItemConflict(elements,item,[slot],player.position);if(conflict&&!conflict.startsWith('Item is not eligible'))return conflict;}
  }
  if(changedSlots.some(slot=>['HeadWear','FaceMask','Visor','HelmetAccessory','MouthWear'].includes(slot))){
    const helmet=get('HeadWear'),mask=get('FaceMask'),model=helmetModel(helmet);
    if(!model||!facemaskFitsHelmet(mask,helmet))return 'The helmet and facemask do not have a verified compatible pairing.';
    if(active(get('HelmetAccessory'))&&!model.guardianCap)return 'This helmet does not support the equipped helmet accessory.';
    if(active(get('MouthWear'))&&/PacifierDualHanging/i.test(get('MouthWear'))&&!model.hangingMouthpiece)return 'This helmet does not support the hanging mouthpiece.';
  }
  // Named balaclavas are always checked. Do not reinterpret vanilla vintage
  // neck rolls as old mod replacements when the save cannot prove mod usage.
  const repaired=clone(elements),corrections=enforceEquipmentCompatibility(repaired),existing=enforceEquipmentCompatibility(clone(originalElements));
  if(corrections.some(issue=>!existing.some(old=>isDeepStrictEqual(old,issue))))return 'This mapping conflicts with sleeves, wrist/elbow gear, neckwear, mouthpiece, or pants. Adjust the scope or queue compatible items in the same batch.';
  // Check both directions: adding a flak jacket can conflict with an unchanged
  // RAW backplate, just as copying the backplate can conflict with a jacket.
  for(const element of elements){
    const item=equipmentItem(element.itemAssetName);if(!item||!element.slotType)continue;
    const reason=generatedItemConflict(elements,item,[element.slotType],player.position);
    if(!reason||reason.startsWith('Item is not eligible'))continue;
    const previous=itemAt(originalElements,element.slotType),oldReason=previous?.itemAssetName===element.itemAssetName?generatedItemConflict(originalElements,item,[element.slotType],player.position):null;
    if(reason!==oldReason)return reason;
  }
  return null;
}

export function normalizeMapperRules(value){
  if(!Array.isArray(value)||!value.length||value.length>100)throw new Error('Queue between 1 and 100 equipment mappings.');
  return value.map((rule,index)=>{
    if(!rule||!['replace','copy'].includes(rule.action)||typeof rule.replacementId!=='string'||(rule.action==='replace'&&typeof rule.sourceId!=='string'))throw new Error(`Mapping ${index+1} needs a source and replacement item.`);
    if(!['exact','asset','item'].includes(rule.matchMode??'exact'))throw new Error('Choose Exact Configuration or Item Only matching.');
    if(rule.scope!==undefined&&!['all','selected'].includes(rule.scope))throw new Error('Choose All Matching Players or Selected Targets.');
    for(const key of ['teams','positions','playerRows'])if(rule[key]!==undefined&&(!Array.isArray(rule[key])||rule[key].length>30000||rule[key].some(value=>typeof value!=='string'&&!(key==='playerRows'&&Number.isInteger(value)))))throw new Error('Invalid equipment targeting filters.');
    if((rule.action==='copy'||rule.scope==='selected')&&rule.scope!=='all'&&!rule.playerRows?.length&&!rule.teams?.length&&!rule.positions?.length)throw new Error('Choose targets, or explicitly select All Players.');
    if(rule.pairSides!==undefined&&typeof rule.pairSides!=='boolean')throw new Error('Choose whether to copy one side or a pair.');
    return {...rule,matchMode:rule.matchMode??'exact',preserveColor:rule.preserveColor===true,preserveSide:true};
  });
}
export function buildMapperPreview(players,library,inputRules){
  const resolution=library.resolution??{},originalRules=normalizeMapperRules(inputRules),items=new Map(library.items.map(item=>[item.id,item])),rules=expandMapperRules(originalRules,items),changes=[],blocked=[],statistics=originalRules.map((_,index)=>({rule:index+1,matched:0,changed:0}));
  for(const rule of rules){
    if(!items.has(rule.replacementId)||rule.action==='replace'&&!items.has(rule.sourceId))throw new Error('An item in this mapping is no longer present in the save. Reload Equipment Mapper and select it again.');
    if(items.get(rule.replacementId).copyable===false||rule.action==='replace'&&items.get(rule.sourceId).copyable===false)throw new Error('This item is browse-only because its equipment slot or player layer cannot be verified.');
    if(rule.action==='replace'&&items.get(rule.sourceId).slot!==items.get(rule.replacementId).slot)throw new Error('Source and replacement must use the same exact equipment slot. Left and right slots cannot be interchanged.');
    for(const [key,field]of [['teams','team'],['positions','position'],['playerRows','row']])if(rule[key]?.some(value=>!players.some(player=>String(player[field])===String(value))))throw new Error('A selected team, position, or player is no longer available. Review the mapping targets.');
    if(rule.playerRows?.length&&(!Array.isArray(rule.playerIdentities)||rule.playerRows.some(row=>!rule.playerIdentities.some(identity=>Number(identity.row)===Number(row)&&players.some(player=>player.row===Number(row)&&player.player===identity.player&&player.team===identity.team)))))throw new Error('Selected player identities changed. Reselect players before using this mapping in another save.');
  }
  const {selections,allocations}=mapperRuleCaps(players,rules,items,resolution,inScope,sameColorFamily);
  const selected=(player,rule)=>inScope(player,rule)&&selections.get(rule.reportRule).has(player.row);
  for(const player of players){
    if(!rules.some(rule=>selected(player,rule)))continue;
    let raw;try{raw=JSON.parse(player.rawData);}catch{blocked.push({row:player.row,player:player.player,team:player.team,reason:'Target equipment cannot be read. Narrow the scope or repair the original data before mapping.'});continue;}
    if(!Array.isArray(raw?.loadouts)){blocked.push({row:player.row,player:player.player,team:player.team,reason:'Target equipment has no valid loadout array.'});continue;}
    const audits=[],touched=new Set(),failure=[];
    for(const [ruleIndex,rule]of rules.entries()){
      if(!selected(player,rule))continue;
      const source=items.get(rule.sourceId),replacement=items.get(rule.replacementId);
      for(const [loadoutIndex,loadout]of (raw.loadouts??[]).entries()){
        if(loadout?.loadoutType!=='PlayerOnField'||!Array.isArray(loadout.loadoutElements))continue;
        const elements=loadout.loadoutElements;
        if(elements.some(element=>!element||typeof element!=='object')){failure.push('Target equipment contains malformed slot entries.');continue;}
        const resolved=mapperElements(elements,resolution);
        const matches=rule.action==='copy'?[replacement.slot]:mapperMatches(resolved,source,rule,resolution,sameColorFamily);
        for(const matchedSlot of matches){
          statistics[rule.reportRule-1].matched++;
          const slot=matchedSlot;
          if(matchedSlot!==replacement.slot){failure.push(`Mapping ${ruleIndex+1}: source and target must use the same equipment slot.`);continue;}
          if(elements.filter(element=>resolveMapperSlot(element,resolution)===slot).length>1){failure.push(`Duplicate ${slot} entries cannot be safely mapped.`);continue;}
          let chosen=replacement;const before=elements.find(element=>resolveMapperSlot(element,resolution)===matchedSlot),currentColors=equipmentSemantics(before?.itemAssetName)?.colors??[];
          if(rule.preserveColor&&currentColors.length){
            chosen=library.items.find(item=>item.copyable!==false&&item.slot===replacement.slot&&item.asset===replacement.asset&&isDeepStrictEqual(item.colors,currentColors))??library.items.find(item=>item.copyable!==false&&item.slot===replacement.slot&&equipmentItem(item.asset)&&equipmentItem(replacement.asset)&&sameColorFamily(item.asset,replacement.asset)&&isDeepStrictEqual(item.colors,currentColors));
            if(!chosen){failure.push(`Mapping ${ruleIndex+1}: no matching color variant of the replacement exists in this save.`);continue;}
          }
          const proposals=[[slot,{...clone(chosen.element),slotType:slot}]];
          for(const [dependent,element]of Object.entries(chosen.context))proposals.push([dependent,element]);
          for(const [targetSlot,proposal]of proposals){
            const previous=elements.find(element=>resolveMapperSlot(element,resolution)===targetSlot);if(isDeepStrictEqual(previous??null,proposal))continue;
            if(previous)elements.splice(elements.indexOf(previous),1);if(proposal)elements.push(clone(proposal));
            audits.push({rule:rule.reportRule,loadout:loadoutIndex,slot:targetSlot,before:clone(previous??null),after:clone(proposal),sourceId:source?.id??null,replacementId:chosen.id});touched.add(`${loadoutIndex}|${targetSlot}`);statistics[rule.reportRule-1].changed++;
          }
        }
      }
    }
    if(!audits.length&&!failure.length)continue;
    if(player.shared)failure.push('This player shares CharacterVisuals with another player. No shared row will be changed.');
    for(const [index,loadout]of (raw.loadouts??[]).entries()){
      const slots=[...touched].filter(key=>key.startsWith(`${index}|`)).map(key=>key.split('|')[1]);
      if(slots.length){const reason=compatible(mapperElements(loadout.loadoutElements,resolution),slots,player,mapperElements(JSON.parse(player.rawData).loadouts[index].loadoutElements,resolution));if(reason)failure.push(reason);}
    }
    if(failure.length){blocked.push({row:player.row,player:player.player,team:player.team,reason:[...new Set(failure)].join(' ')});continue;}
    if(!isDeepStrictEqual(raw,JSON.parse(player.rawData)))changes.push({...player,newRawData:JSON.stringify(raw),edits:audits});
  }
  return {changes,blocked,statistics,allocations};
}

// The catalog's explicit mappings include repurposed mod colors. Never infer a
// color by rewriting asset strings, or manufacture an item not found in the save.
import {recolorEquipmentItem} from '../equipment/catalog.js';
function sameColorFamily(asset,other){return ['white','black','primary','secondary'].some(theme=>recolorEquipmentItem(asset,theme)===other||recolorEquipmentItem(other,theme)===asset);}
