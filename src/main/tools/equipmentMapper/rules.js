import {mapperDigest,mapperElements,mapperContext,mapperRuleLoadouts,mapperTattooItem} from './library.js';
export const pairedMapperSlot=slot=>({LeftHandWear:'RightHandWear',RightHandWear:'LeftHandWear',LeftShoe:'RightShoe',RightShoe:'LeftShoe',LeftArmWear:'RightArmWear',RightArmWear:'LeftArmWear'})[slot]??null;
export function expandMapperRules(rules,items){
  return rules.flatMap((rule,index)=>{
    const replacement=items.get(rule.replacementId),source=items.get(rule.sourceId),pair=rule.pairSides===true;
    const base={...rule,reportRule:index+1,pairSides:false};
    if(!pair)return [base];
    const slot=pairedMapperSlot(replacement?.slot),partner=items.get(rule.replacementPairId),sourcePartner=items.get(rule.sourcePairId);
    if(!slot||!partner||partner.slot!==slot||partner.copyable===false)throw new Error('Select the other side of the replacement pair, or turn off paired copying.');
    if(rule.action==='replace'&&(!sourcePartner||sourcePartner.copyable===false||sourcePartner.slot!==pairedMapperSlot(source?.slot)||sourcePartner.slot!==partner.slot))throw new Error('Select the other side of the existing item pair. Each side must stay in its own slot.');
    return [base,{...base,replacementId:partner.id,sourceId:sourcePartner?.id}];
  });
}
export function mapperMatches(elements,source,rule,resolution,sameColorFamily){
  if(source&&/(?:^|_)None$/i.test(source.asset)&&!elements.some(element=>element.slotType===source.slot)){
    const implicit={slotType:source.slot,itemAssetName:source.asset};
    if(rule.matchMode!=='exact'||mapperDigest({element:implicit,context:mapperContext(elements,source.slot,resolution)})===source.id)return [source.slot];
  }
  return elements.filter(element=>element.slotType===source.slot&&(rule.matchMode==='exact'&&!source.catalog?mapperDigest({element,context:mapperContext(elements,element.slotType,resolution)})===source.id:element.itemAssetName===source.asset||rule.matchMode==='item'&&sameColorFamily(element.itemAssetName,source.asset))).map(element=>element.slotType);
}
export function mapperRuleCaps(players,rules,items,resolution,inScope,sameColorFamily){
  const selections=new Map(),allocations=[];
  for(const number of new Set(rules.map(rule=>rule.reportRule))){
    const parts=rules.filter(rule=>rule.reportRule===number),rule=parts[0],frequency=rule.frequency,cap=frequency??rule.replacementCap??100,teams=new Map();
    if(rule.fillToFrequency!==undefined&&typeof rule.fillToFrequency!=='boolean')throw Error('Fill to Frequency must be on or off.');
    if(!Number.isInteger(cap)||cap<0||cap>100)throw new Error('Replacement caps must be whole percentages from 0 to 100.');
    for(const player of players){
      if(!inScope(player,rule))continue;
      let raw;try{raw=JSON.parse(player.rawData);if(!Array.isArray(raw?.loadouts))throw new Error();}catch{if(cap>0&&cap<100)throw new Error(`Cannot evaluate a replacement cap because ${player.player}'s equipment is unreadable. The save was not changed.`);continue;}
      const matched=parts.some(part=>mapperRuleLoadouts(raw,items.get(part.action==='copy'?part.replacementId:part.sourceId)).some(loadout=>mapperWearingMatches(raw,loadout,part,items,resolution,sameColorFamily)&&(part.action==='copy'||mapperMatches(mapperElements(loadout.loadoutElements,resolution),items.get(part.sourceId),part,resolution,sameColorFamily).length)));
      if(!matched)continue;
      const teamKey=Number.isInteger(player.teamIndex)?player.teamIndex:player.team;if(!teams.has(teamKey))teams.set(teamKey,{name:player.team,index:player.teamIndex,candidates:[]});teams.get(teamKey).candidates.push(player);
    }
    const selected=new Set(frequency===undefined&&cap===100&&!rule.wearingItemId?players.filter(player=>inScope(player,rule)).map(player=>player.row):[]);
    for(const {name:team,index:teamIndex,candidates}of teams.values()){
      // Stable sampling, not roster/team order. Increasing the cap retains the
      // previously selected players; a paired rule counts each player once.
      const key=JSON.stringify(parts.map(part=>[part.action,part.sourceId,part.replacementId,part.matchMode]));
      const ordered=candidates.map(player=>({player,key:mapperDigest([key,team,player.row,player.player])})).sort((a,b)=>a.key.localeCompare(b.key)),count=(frequency===undefined?Math.floor:Math.ceil)(candidates.length*cap/100);
      let chosen=0;for(const item of ordered){if(chosen>=count)break;const roll=parseInt(mapperDigest(['chance',key,team,item.player.row]).slice(0,12),16)/0x1000000000000;if(frequency===undefined||rule.fillToFrequency||roll<cap/100){selected.add(item.player.row);chosen++;}}
      allocations.push({rule:number,team,teamIndex,percentage:cap,fillToFrequency:rule.fillToFrequency===true,matchedPlayers:candidates.length,selectedPlayers:chosen,limit:count});
    }
    selections.set(number,selected);
  }
  return {selections,allocations};
}

// Gear conditions must match the outfit being edited. Body tattoos live in a
// shared Base layer, so a tattoo condition applies to the player's outfits.
export function mapperWearingMatches(raw,loadout,rule,items,resolution,sameColorFamily){
  if(!rule.wearingItemId)return true;
  const item=items.get(rule.wearingItemId),matches=candidate=>mapperMatches(mapperElements(candidate.loadoutElements??[],resolution),item,{matchMode:rule.wearingMatchMode??'asset'},resolution,sameColorFamily).length>0;
  const layers=mapperRuleLoadouts(raw,item);
  if(mapperTattooItem(item)||loadout?.loadoutCategory==='Base'&&loadout?.loadoutType!=='PlayerOnField')return layers.some(matches);
  return layers.includes(loadout)&&matches(loadout);
}
