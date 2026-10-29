import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {saveFingerprint} from '../jersey/planStore.js';
import {normalizeMapperRules,sameColorFamily} from './core.js';
import {expandMapperRules,mapperMatches,mapperWearingMatches} from './rules.js';
import {mapperRuleLoadouts,mapperElements} from './library.js';
import {displayPosition} from '../../../shared/localization.js';

// One detached source snapshot per worker. Native record/franchise objects are
// never retained. Query matches cache only row numbers, not parsed appearance.
let session;
export function mapperTargetSession(savePath,fingerprint,players,library){
  session={id:randomUUID(),savePath:path.resolve(savePath),fingerprint,players,library,matches:new Map()};
  return session.id;
}
export function queryMapperTargets({savePath,sessionId,fingerprint,rule,query='',page=0,selectedRows=[],selectedOnly=false}){
  const source=session;
  if(!source||source.id!==sessionId||source.savePath!==path.resolve(savePath)||source.fingerprint!==fingerprint||saveFingerprint(savePath)!==fingerprint)throw Error('The equipment list changed. Reload Equipment Mapper before choosing players.');
  if(typeof query!=='string'||query.length>300||!Number.isInteger(page)||page<0||!Array.isArray(selectedRows)||selectedRows.length>30000||selectedRows.some(row=>!Number.isSafeInteger(row)||row<0)||typeof selectedOnly!=='boolean')throw Error('Invalid player search.');
  const normalized=normalizeMapperRules([{...rule,scope:'all',playerRows:[],playerIdentities:[]}])[0],items=new Map(source.library.items.map(item=>[item.id,item]));
  for(const id of [normalized.replacementId,normalized.action==='replace'?normalized.sourceId:null,normalized.wearingItemId].filter(Boolean))if(!items.has(id)||items.get(id).copyable===false)throw Error('Select available catalog items before choosing players.');
  const parts=expandMapperRules([normalized],items),key=JSON.stringify(parts.map(part=>[part.action,part.sourceId,part.replacementId,part.matchMode,part.wearingItemId,part.wearingMatchMode]));
  if(!source.matches.has(key)){
    const rows=new Set();let unreadable=0;
    for(const player of source.players){
      try{
        const raw=JSON.parse(player.rawData);if(!Array.isArray(raw?.loadouts))throw Error();
        if(parts.some(part=>mapperRuleLoadouts(raw,items.get(part.action==='copy'?part.replacementId:part.sourceId)).some(loadout=>mapperWearingMatches(raw,loadout,part,items,source.library.resolution??{},sameColorFamily)&&(part.action==='copy'||mapperMatches(mapperElements(loadout.loadoutElements,source.library.resolution),items.get(part.sourceId),part,source.library.resolution,sameColorFamily).length))))rows.add(player.row);
      }catch{unreadable++;}
    }
    source.matches.set(key,{rows,unreadable});while(source.matches.size>8)source.matches.delete(source.matches.keys().next().value);
  }
  const equipment=source.matches.get(key),selected=new Set(selectedRows),wanted=query.trim().toLowerCase();
  const eligible=source.players.filter(player=>equipment.rows.has(player.row)&&(!rule.teams?.length||rule.teams.includes(player.team))&&(!rule.positions?.length||rule.positions.includes(player.position)));
  const eligibleRows=new Set(eligible.map(player=>player.row)),selectedMatching=selectedRows.filter(row=>eligibleRows.has(row)).length;
  const visible=(selectedOnly?source.players.filter(player=>selected.has(player.row)):eligible).filter(player=>`${player.player} ${player.team} ${player.position} ${displayPosition(player.position)}`.toLowerCase().includes(wanted)).sort((a,b)=>a.player.localeCompare(b.player)||a.team.localeCompare(b.team)||a.row-b.row);
  const pages=Math.max(1,Math.ceil(visible.length/100)),current=Math.min(page,pages-1);
  return {fingerprint,totalMatches:visible.length,matchingPlayers:eligible.length,selectedMatching,selectedOutsideFilters:selected.size-selectedMatching,page:current,pages,unreadable:equipment.unreadable,rows:visible.slice(current*100,current*100+100).map(({row,player,team,position,overall})=>({row,player,team,position,overall,outsideFilters:!eligibleRows.has(row)}))};
}
