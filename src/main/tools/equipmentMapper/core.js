import {isDeepStrictEqual} from 'node:util';
import MapperEditor from '../../../shared/mapperEditor.cjs';
import {equipmentItem,equipmentDisplayName,equipmentSemantics,normalBrand} from '../equipment/catalog.js';
import {enforceEquipmentCompatibility} from '../equipment/core/compatibility.js';
import {cutoffPantsConflict} from '../equipment/core/uniformCompatibility.js';
import {BRAND_SLOTS,isBrandCompatibleItem} from '../equipment/core/brandCompatibility.js';
import {generatedItemConflict} from '../equipment/core/generatedCompatibility.js';
import {facemaskFitsHelmet,helmetModel} from '../equipment/core/helmets.js';
import {mapperLibrary,mapperDigest as digest,resolveMapperSlot,mapperElements,mapperContext,mapperRuleLoadouts,mapperTattooItem} from './library.js';
export {mapperLibrary} from './library.js';
import {expandMapperRules,mapperMatches,mapperRuleCaps,mapperWearingMatches,mapperCategoryAssignments} from './rules.js';
const clone=value=>structuredClone(value);
const active=asset=>asset&&!/(?:^|_)none$/i.test(asset)&&asset!=='FaceGear_BalaclavaNone';
const itemAt=(elements,slot)=>elements.find(item=>item?.slotType===slot);
const scopeIndexes=new WeakMap();
const inScope=(player,rule)=>{if(!scopeIndexes.has(rule))scopeIndexes.set(rule,{teams:new Set(rule.teams??[]),positions:new Set(rule.positions??[]),rows:new Set((rule.playerRows??[]).map(Number))});const s=scopeIndexes.get(rule);return(!s.teams.size||s.teams.has(player.team))&&(!s.positions.size||s.positions.has(player.position))&&(!s.rows.size||s.rows.has(player.row));};

function correctionReason(issue){
  if(issue.reason)return issue.reason;
  return ({
    'jersey-undershirt':'Relaxed tees cannot be worn with this jersey style',
    'relaxed-tee-neckwear':'Relaxed tees cannot be worn with turtlenecks, ski masks or balaclavas',
    'arm':`${issue.side} sleeve or undershirt overlaps wrist/elbow gear`,
    'wrist-overlap':`${issue.side} wrist accessories overlap`,
    'mask-mouthpiece':'Masks and balaclavas require a hanging mouthpiece or no mouthpiece'
  })[issue.kind]??'These equipment items overlap';
}
const specificGeneratedReason=(reason,elements)=>['Outfit conflicts with cutoff pants','Leg base layers cannot be added with cutoff pants'].includes(reason)?cutoffPantsConflict(elements)??reason:reason;

function compatible(elements,changedSlots,player,originalElements,options={}){
  const get=slot=>itemAt(elements,slot)?.itemAssetName;
  for(const slot of changedSlots){
    if(!slot.endsWith('Override')&&!MapperEditor.removalAllowed(slot)&&!active(get(slot)))return {blocking:true,reason:MapperEditor.removalRestriction};
    const element=itemAt(elements,slot);if(!element)continue;
    const item=equipmentItem(element.itemAssetName,options);
    if(item&&!item.slots.includes(slot.replace(/Override$/,'')))return {blocking:true,reason:`${equipmentDisplayName(element.itemAssetName,options)} does not fit ${slot}.`};
  }
  for(const slot of changedSlots){
    const element=itemAt(elements,slot);if(!element)continue;
    if(!active(element.itemAssetName))continue;
    const item=equipmentItem(element.itemAssetName,options);
    if(BRAND_SLOTS.has(slot)&&!isBrandCompatibleItem(slot,element.itemAssetName,player.branding))return `The selected ${slot.includes('Shoe')?'cleats':'gloves'} are not verified for this team's ${normalBrand(player.branding)||'unknown'} brand.`;
    if(item){const conflict=generatedItemConflict(elements,item,[slot],player.position,options);if(conflict&&!conflict.startsWith('Item is not eligible'))return specificGeneratedReason(conflict,elements);}
  }
  if(changedSlots.some(slot=>['HeadWear','FaceMask'].includes(slot)||['Visor','HelmetAccessory','GuardianCap','MouthWear'].includes(slot)&&active(get(slot)))){
    const helmet=get('HeadWear'),mask=get('FaceMask'),model=helmetModel(helmet);
    if(!model||!facemaskFitsHelmet(mask,helmet))return 'The helmet and facemask do not have a verified compatible pairing.';
    if((active(get('HelmetAccessory'))||/^GuardianCap_GuardianXT/.test(get('GuardianCap')??''))&&!model.guardianCap)return 'This helmet does not support the equipped helmet accessory.';
    if(active(get('MouthWear'))&&/PacifierDualHanging/i.test(get('MouthWear'))&&!model.hangingMouthpiece)return 'This helmet does not support the hanging mouthpiece.';
  }
  // Named balaclavas are always checked. Do not reinterpret vanilla vintage
  // neck rolls as old mod replacements when the save cannot prove mod usage.
  const repaired=clone(elements),corrections=enforceEquipmentCompatibility(repaired,options),existing=enforceEquipmentCompatibility(clone(originalElements),options);
  const newIssues=corrections.filter(issue=>!existing.some(old=>isDeepStrictEqual(old,issue)));
  if(newIssues.length)return [...new Set(newIssues.map(correctionReason))].join('. ');
  // Check both directions: adding a flak jacket can conflict with an unchanged
  // RAW backplate, just as copying the backplate can conflict with a jacket.
  for(const element of elements){
    if(!active(element.itemAssetName))continue;
    const item=equipmentItem(element.itemAssetName,options);if(!item||!element.slotType)continue;
    const reason=generatedItemConflict(elements,item,[element.slotType],player.position,options);
    if(!reason||reason.startsWith('Item is not eligible'))continue;
    const previous=itemAt(originalElements,element.slotType),oldReason=previous?.itemAssetName===element.itemAssetName?generatedItemConflict(originalElements,item,[element.slotType],player.position,options):null;
    if(reason!==oldReason)return specificGeneratedReason(reason,elements);
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
    if((rule.action==='copy'||rule.scope==='selected')&&rule.scope!=='all'&&!rule.playerRows?.length&&!rule.teams?.length&&!rule.positions?.length&&!rule.wearingItemId)throw new Error('Choose targets, or explicitly select All Players.');
    if(rule.pairSides!==undefined&&typeof rule.pairSides!=='boolean')throw new Error('Choose whether to copy one side or a pair.');
    if(rule.wearingItemId!==undefined&&(typeof rule.wearingItemId!=='string'||!rule.wearingItemId))throw new Error('Choose a Wearing Item from the equipment catalog.');
    if(rule.wearingMatchMode!==undefined&&!['asset','item'].includes(rule.wearingMatchMode))throw new Error('Choose selected color or all colors for Wearing Item.');
    return {...rule,matchMode:rule.matchMode??'exact',preserveColor:rule.preserveColor===true,preserveSide:true};
  });
}
export function buildMapperPreview(players,library,inputRules){
  const resolution=library.resolution??{},originalRules=normalizeMapperRules(inputRules),items=new Map(MapperEditor.withCategories(library.items).map(item=>[item.id,item])),rules=expandMapperRules(originalRules,items),changes=[],blocked=[],compatibilityWarnings=[],statistics=originalRules.map((_,index)=>({rule:index+1,matched:0,changed:0}));
  for(const rule of rules){
    if(rule.wearingItemId&&(!items.has(rule.wearingItemId)||items.get(rule.wearingItemId).copyable===false))throw new Error('The Wearing Item filter is unavailable in the selected equipment catalog. Check your mods and reselect the item.');
    if(!items.has(rule.replacementId)||rule.action==='replace'&&!items.has(rule.sourceId))throw new Error('An item in this mapping is unavailable in the selected equipment catalog. Check your mods and reselect items from older saved rules.');
    if(items.get(rule.replacementId).copyable===false||rule.action==='replace'&&items.get(rule.sourceId).copyable===false)throw new Error('This item is browse-only because its equipment slot or player layer cannot be verified.');
    if(rule.action==='replace'&&items.get(rule.sourceId).slot!==items.get(rule.replacementId).slot)throw new Error('Source and replacement must use the same exact equipment slot. Left and right slots cannot be interchanged.');
    for(const [key,field]of [['teams','team'],['positions','position'],['playerRows','row']])if(rule[key]?.some(value=>!players.some(player=>String(player[field])===String(value))))throw new Error('A selected team, position, or player is no longer available. Review the mapping targets.');
    if(rule.playerRows?.length&&(!Array.isArray(rule.playerIdentities)||rule.playerRows.some(row=>!rule.playerIdentities.some(identity=>Number(identity.row)===Number(row)&&players.some(player=>player.row===Number(row)&&player.player===identity.player&&player.team===identity.team)))))throw new Error('Selected player identities changed. Reselect players before using this mapping in another save.');
  }
  const {selections,matches,allocations}=mapperRuleCaps(players,rules,items,resolution,inScope,sameColorFamily);
  const categoryAssignments=mapperCategoryAssignments(players,rules,items,selections,resolution,sameColorFamily);
  const selected=(player,rule)=>inScope(player,rule)&&selections.get(rule.reportRule).has(player.row);
  for(const player of players){
    if(!rules.some(rule=>selected(player,rule)))continue;
    let raw;try{raw=JSON.parse(player.rawData);}catch{blocked.push({row:player.row,player:player.player,team:player.team,reason:'Target equipment cannot be read. Narrow the scope or repair the original data before mapping.'});continue;}
    if(!Array.isArray(raw?.loadouts)){blocked.push({row:player.row,player:player.player,team:player.team,reason:'Target equipment has no valid loadout array.'});continue;}
    const originalRaw=clone(raw),audits=[],touched=new Set(),failure=[],outfitWarnings=[],claims=new Map(),playerCounts=originalRules.map(()=>({matched:0,changed:0}));
    for(const [ruleIndex,rule]of rules.entries()){
      if(!selected(player,rule))continue;
      if(categoryAssignments.has(rule)&&!categoryAssignments.get(rule).has(player.row))continue;
      const source=items.get(rule.sourceId),selection=items.get(rule.replacementId),replacement=selection.categorySelection?categoryAssignments.get(rule)?.get(player.row):selection;
      if(!replacement){failure.push(`Mapping ${rule.reportRule}: this category has no supported item for the player's team brand and current colors. Choose another category or turn off Keep Current Colors.`);continue;}
      const applicable=mapperRuleLoadouts(raw,replacement,true);
      if(mapperTattooItem(replacement)&&applicable.length>1){failure.push('Multiple tattoo layers cannot be safely mapped.');continue;}
      for(const loadout of applicable){
        const loadoutIndex=raw.loadouts.indexOf(loadout);
        if(!mapperWearingMatches(originalRaw,originalRaw.loadouts[loadoutIndex]??loadout,rule,items,resolution,sameColorFamily))continue;
        const elements=loadout.loadoutElements;
        if(elements.some(element=>!element||typeof element!=='object')){failure.push('Target equipment contains malformed slot entries.');continue;}
        // Every source matches the original outfit, just like frequency
        // allocation. One mapping must not manufacture another rule's source.
        const resolved=mapperElements(originalRaw.loadouts[loadoutIndex]?.loadoutElements??[],resolution);
        const matches=rule.action==='copy'?[replacement.slot]:mapperMatches(resolved,source,rule,resolution,sameColorFamily);
        for(const matchedSlot of matches){
          playerCounts[rule.reportRule-1].matched++;
          const slot=matchedSlot;
          if(matchedSlot!==replacement.slot){failure.push(`Mapping ${ruleIndex+1}: source and target must use the same equipment slot.`);continue;}
          if(elements.filter(element=>resolveMapperSlot(element,resolution)===slot).length>1){failure.push(`Duplicate ${slot} entries cannot be safely mapped.`);continue;}
          let chosen=replacement;const before=elements.find(element=>resolveMapperSlot(element,resolution)===matchedSlot),originalBefore=resolved.find(element=>element.slotType===matchedSlot),currentColors=equipmentSemantics(originalBefore?.itemAssetName)?.colors??[];
          if(rule.preserveColor&&currentColors.length){
            const candidates=selection.categorySelection?selection.memberIds.map(id=>items.get(id)):library.items;
            chosen=candidates.find(item=>item.copyable!==false&&item.slot===replacement.slot&&item.asset===replacement.asset&&isDeepStrictEqual(item.colors,currentColors))??candidates.find(item=>item.copyable!==false&&item.slot===replacement.slot&&equipmentItem(item.asset)&&equipmentItem(replacement.asset)&&sameColorFamily(item.asset,replacement.asset)&&isDeepStrictEqual(item.colors,currentColors));
            if(!chosen){failure.push(`Mapping ${ruleIndex+1}: no matching color variant of the replacement is available in the selected catalog.`);continue;}
          }
          const proposals=[[slot,{...(chosen.catalog?clone(before??{}):{}),...clone(chosen.element),slotType:slot}]];
          for(const [dependent,element]of Object.entries(chosen.context))proposals.push([dependent,element]);
          for(const [targetSlot,proposal]of proposals){
            const claimKey=`${loadoutIndex}|${targetSlot}`,claim=claims.get(claimKey);
            if(claim&&!isDeepStrictEqual(claim.proposal,proposal)){
              failure.push(`Mappings ${claim.rule} and ${rule.reportRule} assign different equipment to ${targetSlot.replace(/([a-z])([A-Z])/g,'$1 $2')}. Choose one assignment or separate their player filters.`);
              continue;
            }
            claims.set(claimKey,{rule:rule.reportRule,proposal:clone(proposal)});
            const previous=elements.find(element=>resolveMapperSlot(element,resolution)===targetSlot);if(isDeepStrictEqual(previous??null,proposal))continue;
            if(previous)elements.splice(elements.indexOf(previous),1);if(proposal)elements.push(clone(proposal));
            audits.push({rule:rule.reportRule,loadout:loadoutIndex,slot:targetSlot,before:clone(previous??null),after:clone(proposal),sourceId:source?.id??null,replacementId:chosen.id});touched.add(`${loadoutIndex}|${targetSlot}`);playerCounts[rule.reportRule-1].changed++;
          }
        }
      }
    }
    for(const [index,counts]of playerCounts.entries())statistics[index].matched+=counts.matched;
    if(!audits.length&&!failure.length)continue;
    if(player.shared)failure.push('This player shares CharacterVisuals with another player. No shared row will be changed.');
    for(const [index,loadout]of (raw.loadouts??[]).entries()){
      const slots=[...touched].filter(key=>key.startsWith(`${index}|`)).map(key=>key.split('|')[1]);
      if(slots.length){const issue=compatible(mapperElements(loadout.loadoutElements,resolution),slots,player,mapperElements(originalRaw.loadouts[index]?.loadoutElements??[],resolution),{usingRawAccessoriesMod:library.mods?.raw===true,usingUnlockedMod:library.mods?.unlocked===true});if(issue){if(issue.blocking)failure.push(issue.reason);else outfitWarnings.push(issue);}}
    }
    if(failure.length){blocked.push({row:player.row,player:player.player,team:player.team,reason:[...new Set(failure)].join(' ')});continue;}
    for(const [index,counts]of playerCounts.entries())statistics[index].changed+=counts.changed;
    if(!isDeepStrictEqual(raw,originalRaw)){
      changes.push({...player,newRawData:JSON.stringify(raw),edits:audits,requestedSlots:[...claims].map(([key,claim])=>({loadout:Number(key.split('|')[0]),slot:key.split('|')[1],element:clone(claim.proposal)}))});
      if(outfitWarnings.length)compatibilityWarnings.push({row:player.row,player:player.player,team:player.team,reason:[...new Set(outfitWarnings)].join(' ')});
    }
  }
  const matchingRows=new Set([...matches.values()].flatMap(rows=>[...rows])),selectedRows=new Set([...selections].flatMap(([number,rows])=>[...rows].filter(row=>matches.get(number).has(row)))),changedRows=new Set(changes.map(p=>p.row)),blockedRows=new Set(blocked.map(p=>p.row));
  const reasonCounts=new Map();
  for(const row of matchingRows)if(!changedRows.has(row)){
    const reason=blockedRows.has(row)?'Blocked by a rule conflict or unsafe player data':!selectedRows.has(row)?'Not selected by the frequency setting':'Already has the requested equipment';
    reasonCounts.set(reason,(reasonCounts.get(reason)??0)+1);
  }
  const impact={matching:matchingRows.size,changing:changes.length,unchanged:matchingRows.size-changes.length,unchangedReasons:[...reasonCounts].map(([reason,players])=>({reason,players}))};
  return {changes,blocked,compatibilityWarnings,statistics,allocations,impact};
}

// The catalog's explicit mappings include repurposed mod colors. Never infer a
// color by rewriting asset strings, or manufacture an item not found in the save.
import {recolorEquipmentItem} from '../equipment/catalog.js';
function sameColorFamily(asset,other){return ['white','black','primary','secondary'].some(theme=>recolorEquipmentItem(asset,theme)===other||recolorEquipmentItem(other,theme)===asset);}
export {sameColorFamily};
export {compatible as mapperCompatibilityIssue};
