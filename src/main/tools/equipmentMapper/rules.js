import {mapperDigest,mapperElements,mapperContext} from './library.js';
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
  return elements.filter(element=>element.slotType===source.slot&&(rule.matchMode==='exact'?mapperDigest({element,context:mapperContext(elements,element.slotType,resolution)})===source.id:element.itemAssetName===source.asset||rule.matchMode==='item'&&sameColorFamily(element.itemAssetName,source.asset))).map(element=>element.slotType);
}
export function mapperRuleCaps(players,rules,items,resolution,inScope,sameColorFamily){
  const selections=new Map(),allocations=[];
  for(const number of new Set(rules.map(rule=>rule.reportRule))){
    const parts=rules.filter(rule=>rule.reportRule===number),rule=parts[0],cap=rule.replacementCap??100,teams=new Map();
    if(!Number.isInteger(cap)||cap<0||cap>100)throw new Error('Replacement caps must be whole percentages from 0 to 100.');
    for(const player of players){
      if(!inScope(player,rule))continue;
      let raw;try{raw=JSON.parse(player.rawData);if(!Array.isArray(raw?.loadouts))throw new Error();}catch{if(cap>0&&cap<100)throw new Error(`Cannot evaluate a replacement cap because ${player.player}'s equipment is unreadable. The save was not changed.`);continue;}
      const matched=rule.action==='copy'||raw?.loadouts?.some(loadout=>loadout?.loadoutType==='PlayerOnField'&&Array.isArray(loadout.loadoutElements)&&parts.some(part=>mapperMatches(mapperElements(loadout.loadoutElements,resolution),items.get(part.sourceId),part,resolution,sameColorFamily).length));
      if(!matched)continue;
      const teamKey=Number.isInteger(player.teamIndex)?player.teamIndex:player.team;if(!teams.has(teamKey))teams.set(teamKey,{name:player.team,index:player.teamIndex,candidates:[]});teams.get(teamKey).candidates.push(player);
    }
    const selected=new Set(cap===100?players.filter(player=>inScope(player,rule)).map(player=>player.row):[]);
    for(const {name:team,index:teamIndex,candidates}of teams.values()){
      // Stable sampling, not roster/team order. Increasing the cap retains the
      // previously selected players; a paired rule counts each player once.
      const key=JSON.stringify(parts.map(part=>[part.action,part.sourceId,part.replacementId,part.matchMode]));
      const ordered=candidates.map(player=>({player,key:mapperDigest([key,team,player.row,player.player])})).sort((a,b)=>a.key.localeCompare(b.key)),count=Math.floor(candidates.length*cap/100);
      for(const item of ordered.slice(0,count))selected.add(item.player.row);
      allocations.push({rule:number,team,teamIndex,percentage:cap,matchedPlayers:candidates.length,selectedPlayers:count});
    }
    selections.set(number,selected);
  }
  return {selections,allocations};
}
