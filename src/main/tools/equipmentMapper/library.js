import {createHash} from 'node:crypto';
import {EQUIPMENT_ITEMS,equipmentItem,equipmentDisplayName,equipmentSemantics,itemBrand} from '../equipment/catalog.js';

const clone=value=>structuredClone(value);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const mapperDigest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const dependencySlots=slot=>slot==='HeadWear'?['FaceMask']:['WaistWear','LeftShoe','RightShoe'].includes(slot)?[`${slot}Override`]:[];
export function resolveMapperSlot(element,evidence={}){
  if(typeof element?.slotType==='string'&&element.slotType)return element.slotType;
  const known=equipmentItem(element?.itemAssetName)?.slots??[],observed=evidence[element?.itemAssetName]??[];
  if(known.length===1&&(!observed.length||observed.every(slot=>slot===known[0])))return known[0];
  if(!known.length&&observed.length===1)return observed[0];
  return null;
}
export const mapperElements=(elements,evidence)=>elements.map(element=>element&&({...element,...(resolveMapperSlot(element,evidence)?{slotType:resolveMapperSlot(element,evidence)}:{})}));
export function mapperContext(elements,slot,evidence){
  return Object.fromEntries(dependencySlots(slot).map(key=>[key,clone(elements.find(element=>resolveMapperSlot(element,evidence)===key)?{...elements.find(element=>resolveMapperSlot(element,evidence)===key),slotType:key}:null)]));
}
const isGearLayer=loadout=>loadout?.loadoutType==='PlayerOnField'||loadout?.loadoutCategory==='Base';
export const mapperCategoryLabel=value=>({Reserved:'Chin Cover',HeadBand:'Waist Playcall Band'})[value]??String(value??'Unresolved Gear').replace(/^(Left|Right)(?=[A-Z])/,'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\bShoe Override\b/,'Shoe Override');
export const mapperBrandLabel=value=>({nike:'Nike',adidas:'Adidas',underarmour:'Under Armour',underarmor:'Under Armour',ua:'Under Armour',jordan:'Jordan',battle:'Battle',nxtrnd:'NXTRND'})[String(value).toLowerCase()]??String(value).replace(/[_-]+/g,' ').replace(/\b[a-z]/g,letter=>letter.toUpperCase());
const isGearElement=(loadout,element)=>loadout.loadoutCategory!=='Base'||equipmentItem(element.itemAssetName)||/^(?:Gear|Tattoo|FaceMarks|ArmSleeve|Undershirt|G_)|tattoo/i.test(element.itemAssetName);
export const mapperItemName=asset=>({Gear_Socks_Low:'Low Socks',Gear_Socks_Mid:'Mid Socks',Gear_Socks_High:'High Socks'})[asset]??equipmentDisplayName(asset);
export const mapperTattooItem=item=>Boolean(item?.catalog&&/^(Left|Right)(Arm|Leg)Tattoo$/.test(item.slot));
export function mapperRuleLoadouts(raw,item,create=false){
 if(!mapperTattooItem(item))return (raw.loadouts??[]).filter(loadout=>loadout?.loadoutType==='PlayerOnField'&&Array.isArray(loadout.loadoutElements));
 const layers=(raw.loadouts??[]).filter(loadout=>loadout?.loadoutCategory==='Base'&&loadout.loadoutType!=='PlayerOnField'&&Array.isArray(loadout.loadoutElements)&&loadout.loadoutElements.some(element=>/^(Left|Right)(Arm|Leg)Tattoo$/.test(element?.slotType)));
 if(layers.length)return layers;
 const empty={loadoutCategory:'Base',loadoutElements:[]};if(create)raw.loadouts.push(empty);return [empty];
}

// Read every observed gear asset, without using the bundled catalog as an
// inclusion whitelist. Catalog/observations only help resolve missing slots.
export function mapperLibrary(players){
  const parsed=[],evidence={},issues=[],entries=new Map(),wearerSets=new Map();
  for(const player of players){
    let raw;try{raw=JSON.parse(player.rawData);}catch{issues.push({row:player.row,player:player.player,reason:'Unreadable equipment data'});continue;}
    if(!Array.isArray(raw?.loadouts)){issues.push({row:player.row,player:player.player,reason:'Missing equipment loadouts'});continue;}
    parsed.push({player,raw});
    for(const loadout of raw.loadouts)if(isGearLayer(loadout)&&Array.isArray(loadout?.loadoutElements))for(const element of loadout.loadoutElements){
      if(!element?.itemAssetName||!element.slotType)continue;
      const slots=evidence[element.itemAssetName]??=[];if(!slots.includes(element.slotType))slots.push(element.slotType);
    }
  }
  for(const slots of Object.values(evidence))slots.sort();
  for(const {player,raw}of parsed)for(const [loadoutIndex,loadout]of raw.loadouts.entries()){
    if(!isGearLayer(loadout)||!Array.isArray(loadout?.loadoutElements))continue;
    const elements=loadout.loadoutElements;
    for(const element of elements){
      if(typeof element?.itemAssetName!=='string'||!element.itemAssetName||!isGearElement(loadout,element))continue;
      const slot=resolveMapperSlot(element,evidence),normalized={...clone(element),...(slot?{slotType:slot}:{})},context=slot?mapperContext(elements,slot,evidence):{},onField=loadout.loadoutType==='PlayerOnField';
      const id=mapperDigest({element:normalized,context,...(!onField?{layer:loadout.loadoutType??loadout.loadoutCategory??'Other'}:{})}),known=equipmentItem(element.itemAssetName),semantic=equipmentSemantics(element.itemAssetName),duplicate=slot&&elements.filter(entry=>resolveMapperSlot(entry,evidence)===slot).length>1;
      const copyable=Boolean(onField&&slot&&!duplicate),reason=!onField?'This gear belongs to a non-player equipment layer.':!slot?'The save does not identify an unambiguous slot for this item.':duplicate?'This equipment layer contains duplicate entries for the same slot.':null;
      if(!entries.has(id))entries.set(id,{id,slot:slot??'Unresolved',asset:element.itemAssetName,name:mapperItemName(element.itemAssetName),category:mapperCategoryLabel(known?.category??slot??'Unresolved Gear'),brand:mapperBrandLabel(itemBrand(known)||'Universal / Unknown'),colors:semantic?.colors??[],side:/^(Left|Right)/.exec(slot??'')?.[1]??'Center',element:normalized,context,wearers:[],usage:0,known:Boolean(known),copyable,readOnlyReason:reason,locations:[]});
      const item=entries.get(id);item.usage++;if(!wearerSets.has(id))wearerSets.set(id,new Set());if(!wearerSets.get(id).has(player.row)){item.wearers.push(player.row);wearerSets.get(id).add(player.row);}item.copyable||=copyable;if(item.copyable)item.readOnlyReason=null;
      item.locations.push({row:player.row,loadout:loadoutIndex,layer:loadout.loadoutType??loadout.loadoutCategory??'Other',implicitSlot:!element.slotType});
    }
  }
  // Cleaned saves express empty slots by absence. Keep canonical None choices
  // available for clearing gear or replacing an empty slot in those saves.
  const observedSlots=new Set([...entries.values()].filter(item=>item.copyable).map(item=>item.slot)),emptySlots=new Set();
  for(const known of EQUIPMENT_ITEMS){
    if(!/(?:^|_)None$/i.test(known.itemName))continue;
    for(const slot of known.slots){
      if(!observedSlots.has(slot)||emptySlots.has(slot))continue;emptySlots.add(slot);
      const missing=parsed.filter(({raw})=>raw.loadouts.some(loadout=>loadout?.loadoutType==='PlayerOnField'&&Array.isArray(loadout.loadoutElements)&&!loadout.loadoutElements.some(element=>resolveMapperSlot(element,evidence)===slot)));
      if(!missing.length)continue;
      const element={slotType:slot,itemAssetName:known.itemName},context=Object.fromEntries(dependencySlots(slot).map(key=>[key,null])),id=mapperDigest({element,context});
      if(entries.has(id))continue;
      entries.set(id,{id,slot,asset:known.itemName,name:mapperItemName(known.itemName),category:mapperCategoryLabel(known.category??slot),brand:'Universal / Unknown',colors:[],side:/^(Left|Right)/.exec(slot)?.[1]??'Center',element,context,wearers:[...new Set(missing.map(({player})=>player.row))],usage:missing.length,known:true,copyable:true,readOnlyReason:null,locations:[]});
    }
  }
  const items=[...entries.values()].sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name)||a.slot.localeCompare(b.slot)||a.id.localeCompare(b.id));
  const groups=new Map(),groupWearers=new Map();
  for(const item of items){
    const known=equipmentItem(item.asset),family=known?[...new Set(known.slots.map(slot=>slot.replace(/^(Left|Right)/,'')))].sort():null,key=mapperDigest(known?{name:item.name,category:item.category,brand:item.brand,colors:[...item.colors].sort(),family}:{asset:item.asset});
    if(!groups.has(key)){groups.set(key,{id:key,asset:item.asset,assets:[],name:item.name,category:item.category,brand:item.brand,colors:item.colors,slots:[],sides:[],variantIds:[],wearers:[],usage:0,copyable:false});groupWearers.set(key,new Set());}
    const group=groups.get(key);if(!group.assets.includes(item.asset))group.assets.push(item.asset);group.variantIds.push(item.id);group.usage+=item.usage;group.copyable||=item.copyable;
    if(!group.slots.includes(item.slot))group.slots.push(item.slot);if(!group.sides.includes(item.side))group.sides.push(item.side);
    for(const row of item.wearers)if(!groupWearers.get(key).has(row)){group.wearers.push(row);groupWearers.get(key).add(row);}
  }
  return {items,groups:[...groups.values()].sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name)||a.asset.localeCompare(b.asset)),issues,resolution:evidence};
}
