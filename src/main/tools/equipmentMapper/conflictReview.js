import {isDeepStrictEqual} from 'node:util';
import {mapperCompatibilityIssue} from './core.js';
import {mapperDigest,mapperElements,resolveMapperSlot,mapperItemName} from './library.js';
import {equipmentItem,equipmentSemantics} from '../equipment/catalog.js';
import {RELAXED_TEE_REPLACEMENTS,RELAXED_TEE_INCOMPATIBLE_JERSEYS,relaxedTeeNeckwearConflict,sleeveUndershirtConflict,armAccessoryRestrictions,equippedMask,isHangingMouthpiece} from '../equipment/core/compatibility.js';
import {CUTOFF_PANTS,CUTOFF_JERSEYS,cutoffPantsConflict} from '../equipment/core/uniformCompatibility.js';
import {facemaskFitsHelmet,helmetModel} from '../equipment/core/helmets.js';

const clone=structuredClone,empty=asset=>!asset||/(?:^|_)None$/i.test(asset)||asset==='FaceGear_BalaclavaNone';
const itemAt=(elements,slot,resolution)=>elements.find(e=>resolveMapperSlot(e,resolution)===slot);
const choices=new Set(['fix','skip','anyway']);
const libraryIndexes=new WeakMap();
function indexFor(library){
  if(!libraryIndexes.has(library))libraryIndexes.set(library,new Map(library.items.filter(i=>i.copyable!==false).map(i=>[i.slot+'|'+i.asset,i])));
  return libraryIndexes.get(library);
}
function safeNeighbors(elements,locked,library,reason,options){
  const resolution=library.resolution??{},index=indexFor(library),get=slot=>itemAt(elements,slot,resolution)?.itemAssetName,actions=[];
  const put=(slot,asset)=>{if(!locked.has(slot)&&asset&&get(slot)!==asset&&index.has(slot+'|'+asset)&&elements.filter(e=>resolveMapperSlot(e,resolution)===slot).length<=1)actions.push({slot,asset});};
  const clear=slot=>{if(!empty(get(slot)))put(slot,library.items.find(i=>i.slot===slot&&empty(i.asset)&&i.copyable!==false)?.asset);};
  const sleeveless=()=>{
    const color=equipmentSemantics(get('InnerShirt'),options)?.colors?.[0]??'white',suffix=({black:'_Black',primary:'',secondary:'_Secondary',white:'_White'})[String(color).toLowerCase()]??'_White';
    put('InnerShirt',RELAXED_TEE_REPLACEMENTS[get('InnerShirt')]??'Gear_Undershirt_CompressionTCrewSleeveless'+suffix);
  };
  if(/cutoff pants|leg base layer/i.test(reason)&&get('OuterPants')===CUTOFF_PANTS){
    put('OuterPants','GearPants_AboveKnee');
    if(cutoffPantsConflict(mapperElements(elements,resolution))){clear('InnerPants');if(empty(get('InnerShirt')))sleeveless();if(!CUTOFF_JERSEYS.has(get('OuterShirt')))put('OuterShirt','Gear_JerseyStyle_RolledLowest_Untucked');}
  }
  if(/Relaxed tees.*jersey/i.test(reason)&&RELAXED_TEE_INCOMPATIBLE_JERSEYS.has(get('OuterShirt'))){sleeveless();put('OuterShirt','Gear_JerseyStyle_SleeveStandard');}
  if(/Relaxed tees.*(?:turtleneck|neckwear|mask)/i.test(reason)){
    for(const slot of ['NeckWear','Neckpad','FaceWear'])if(relaxedTeeNeckwearConflict(get('InnerShirt'),get(slot)))clear(slot);
    sleeveless();
  }
  if(/sleeve|wrist|elbow|undershirt covers/i.test(reason)){
    for(const side of ['Left','Right']){
      const arm=side+'ArmWear',wrist=side+'WristWear',elbow=side+'ElbowWear',blocked=armAccessoryRestrictions(get(arm),get(wrist),get('InnerShirt'),options);
      if(sleeveUndershirtConflict(get(arm),get('InnerShirt'),options)){clear(arm);sleeveless();}
      if(blocked.wrist&&!empty(get(wrist))){clear(wrist);clear(arm);sleeveless();}
      const elbowBlocked=equipmentSemantics(get(elbow),options)?.bodyRegion==='wrist'?blocked.wrist:blocked.elbow;
      if(elbowBlocked&&!empty(get(elbow))){clear(elbow);clear(arm);sleeveless();}
      if(!empty(get(wrist))&&equipmentSemantics(get(elbow),options)?.bodyRegion==='wrist'){clear(elbow);clear(wrist);}
    }
  }
  if(/Masks and balaclavas require/i.test(reason)){
    clear('MouthWear');for(const slot of ['NeckWear','Neckpad','FaceWear'])if(get(slot)===equippedMask(mapperElements(elements,resolution),options.usingUnlockedMod))clear(slot);
  }
  if(/backplates.*flak jacket/i.test(reason)){clear('FlakJacket');clear('BackPlate');}
  if(/Overlapping neckwear|Existing neckwear occupies/i.test(reason)){
    for(const slot of ['NeckWear','Neckpad','FaceWear','HeadBand','HelmetAccessory'])if(equipmentItem(get(slot),options))clear(slot);
  }
  if(/helmet|facemask|hanging mouthpiece|guardian cap/i.test(reason)){
    if(/hanging mouthpiece/i.test(reason))clear('MouthWear');
    if(/helmet accessory|guardian cap/i.test(reason)){clear('GuardianCap');clear('HelmetAccessory');}
    const mask=library.items.find(i=>i.slot==='FaceMask'&&facemaskFitsHelmet(i.asset,get('HeadWear')));if(mask)put('FaceMask',mask.asset);
    const needsCap=!empty(get('HelmetAccessory'))||/^GuardianCap_GuardianXT/.test(get('GuardianCap')??''),needsMouth=isHangingMouthpiece(get('MouthWear'));
    const helmets=library.items.filter(i=>i.slot==='HeadWear'&&helmetModel(i.asset));
    const fits=i=>(!locked.has('FaceMask')||facemaskFitsHelmet(get('FaceMask'),i.asset))&&(!needsCap||helmetModel(i.asset).guardianCap)&&(!needsMouth||helmetModel(i.asset).hangingMouthpiece);
    const helmet=helmets.find(i=>fits(i)&&facemaskFitsHelmet(get('FaceMask'),i.asset))??helmets.find(fits);if(helmet)put('HeadWear',helmet.asset);
  }
  const seen=new Set();return actions.filter(a=>{const key=a.slot+'|'+a.asset;if(seen.has(key))return false;seen.add(key);return true;}).map(({slot,asset})=>{
    const result=clone(elements),old=itemAt(result,slot,resolution);
    if(old)old.itemAssetName=asset;else result.push({slotType:slot,itemAssetName:asset});return result;
  });
}
const slotDiff=(before,after,resolution)=>[...new Set([...before,...after].map(e=>resolveMapperSlot(e,resolution)).filter(Boolean))].filter(slot=>!isDeepStrictEqual(itemAt(before,slot,resolution)??null,itemAt(after,slot,resolution)??null));
function sameRequest(actual,expected){
  if(!actual||!expected)return actual===expected||empty(actual?.itemAssetName)&&empty(expected?.itemAssetName);
  return isDeepStrictEqual(actual,expected);
}
export function proposeMapperFix(player,library){
  const resolution=library.resolution??{},options={usingUnlockedMod:library.mods?.unlocked===true,usingRawAccessoriesMod:library.mods?.raw===true},original=JSON.parse(player.rawData),raw=JSON.parse(player.newRawData),requested=player.requestedSlots??player.edits.map(e=>({loadout:e.loadout,slot:e.slot,element:e.after})),extras=[];
  for(const loadout of new Set(player.edits.map(e=>e.loadout))){
    const start=raw.loadouts[loadout]?.loadoutElements,before=original.loadouts[loadout]?.loadoutElements??[];
    if(!Array.isArray(start))return {available:false,reason:'This outfit cannot be safely adjusted.'};
    const locks=requested.filter(r=>r.loadout===loadout),locked=new Set(locks.map(r=>r.slot)),baseSlots=player.edits.filter(e=>e.loadout===loadout).map(e=>e.slot),queue=[start],seen=new Set([mapperDigest(start)]);let solved,lastIssue;
    for(let cursor=0;cursor<queue.length&&cursor<96;cursor++){
      const candidate=queue[cursor];
      if(!locks.every(r=>sameRequest(itemAt(mapperElements(candidate,resolution),r.slot,resolution)??null,r.element)))return {available:false,reason:'The requested item cannot be preserved safely.'};
      const issue=mapperCompatibilityIssue(mapperElements(candidate,resolution),[...new Set([...baseSlots,...slotDiff(start,candidate,resolution)])],player,mapperElements(before,resolution),options);
      if(!issue){solved=candidate;break;}if(issue.blocking)return {available:false,reason:issue.reason};lastIssue=issue;
      for(const next of safeNeighbors(candidate,locked,library,issue,options)){
        const key=mapperDigest(next);if(!seen.has(key)&&queue.length<192){seen.add(key);queue.push(next);}
      }
    }
    if(!solved)return {available:false,reason:'No verified fix keeps every requested item. Choose Skip, Apply Anyway, or edit the rule.',detail:String(lastIssue??'')};
    for(const slot of slotDiff(start,solved,resolution))extras.push({rule:null,loadout,slot,before:clone(itemAt(start,slot,resolution)??null),after:clone(itemAt(solved,slot,resolution)??null),compatibilityFix:true});
    raw.loadouts[loadout].loadoutElements=solved;
  }
  return {available:true,newRawData:JSON.stringify(raw),edits:extras};
}
export function createMapperReviewSource(preview,library,progress=()=>{}){
  const groups=new Map(),variants=new Map(),fixes=new Map(),players=new Map(preview.changes.map(p=>[p.row,p])),options={usingUnlockedMod:library.mods?.unlocked===true,usingRawAccessoriesMod:library.mods?.raw===true};
  let completed=0;
  for(const warning of preview.compatibilityWarnings){
    progress(++completed,preview.compatibilityWarnings.length);
    const player=players.get(warning.row);if(!player)continue;
    const fix=proposeMapperFix(player,library),id=mapperDigest(['mapper-conflict',warning.reason]).slice(0,20);fixes.set(player.row,fix);
    if(!groups.has(id))groups.set(id,{id,reason:warning.reason,players:[],variants:[]});const group=groups.get(id);
    const changes=(fix.edits??[]).map(e=>({loadout:e.loadout,slot:e.slot,before:e.before?mapperItemName(e.before.itemAssetName,options):'Not Equipped',after:e.after?mapperItemName(e.after.itemAssetName,options):'Not Equipped'})),variantId=mapperDigest([fix.available,changes,fix.reason]).slice(0,20);
    let variant=variants.get(id+'|'+variantId);if(!variant){variant={id:variantId,available:fix.available,reason:fix.reason??'',changes,count:0};group.variants.push(variant);variants.set(id+'|'+variantId,variant);}variant.count++;
    group.players.push({row:player.row,player:player.player,team:player.team,position:player.position,variantId});
  }
  return {preview:clone(preview),groups:[...groups.values()],fixes};
}
export function normalizeMapperReviewChoices(source,value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Choose a conflict-review action for each group or player.');
  const knownGroups=new Set(source.groups.map(g=>g.id)),knownPlayers=new Set(source.groups.flatMap(g=>g.players.map(p=>String(p.row))));
  const result={groups:{},players:{}};
  for(const [key,known]of [['groups',knownGroups],['players',knownPlayers]]){
    const input=value[key]??{};if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>30000)throw Error('Invalid conflict-review choices.');
    for(const [id,action]of Object.entries(input)){if(!known.has(id)||!choices.has(action))throw Error('The conflict-review choices no longer match this preview.');result[key][id]=action;}
  }
  for(const group of source.groups)result.groups[group.id]??='fix';
  return result;
}
export function applyMapperReviewChoices(source,value){
  const decisions=normalizeMapperReviewChoices(source,value),preview=clone(source.preview),actions=new Map(),summary={fixed:0,skipped:0,anyway:0};
  for(const group of source.groups)for(const p of group.players){
    const action=decisions.players[p.row]??decisions.groups[group.id];if(action==='fix'&&!source.fixes.get(p.row)?.available)throw Error(`${p.player} has no verified fix that preserves the requested items. Choose Skip or Apply Anyway.`);
    actions.set(p.row,action);summary[({fix:'fixed',skip:'skipped',anyway:'anyway'})[action]]++;
  }
  preview.changes=preview.changes.flatMap(player=>{
    const action=actions.get(player.row);if(action==='skip')return [];
    if(action==='fix'){const fix=source.fixes.get(player.row);return [{...player,newRawData:fix.newRawData,edits:[...player.edits,...clone(fix.edits)],conflictDecision:action}];}
    return [{...player,...(action?{conflictDecision:action}:{})}];
  });
  preview.compatibilityWarnings=preview.compatibilityWarnings.filter(w=>actions.get(w.row)==='anyway');
  preview.impact={...preview.impact,changing:preview.changes.length,unchanged:preview.impact.unchanged+summary.skipped,unchangedReasons:[...preview.impact.unchangedReasons,...(summary.skipped?[{reason:'Skipped during conflict review',players:summary.skipped}]:[])]};
  return {preview,decisions,summary,actions};
}
