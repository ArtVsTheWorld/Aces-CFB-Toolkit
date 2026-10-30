import {EQUIPMENT_ITEMS,RAW_314,equipmentSemantics,itemBrand,equipmentForSelectedMods} from '../equipment/catalog.js';
import {REMOVAL_NAMED_ITEMS} from '../equipment/core/removalInventory.js';
import {MOD_FACE_PAINT_ITEMS,VANILLA_FACE_PAINT_OPTIONS} from '../equipment/core/facepaint.js';
import {UNLOCKED_TATTOO_POOL} from '../equipment/core/tattoos.js';
import {mapperBrandLabel,mapperCategoryLabel,mapperItemName,mapperDigest} from './library.js';

export function normalizeMapperMods(value){
 if(!value||value.confirmed!==true)throw Error('Choose the equipment mods you use before opening Equipment Mapper.');
 for(const key of ['unlocked','raw','eljax','gameday'])if(value[key]!==undefined&&typeof value[key]!=='boolean')throw Error('Choose equipment mods using the checkboxes.');
 if(value.eljax!==undefined&&value.gameday!==undefined&&value.eljax!==value.gameday)throw Error('GameDay Gear selections do not agree.');
 return {confirmed:true,unlocked:value.unlocked===true,raw:value.raw===true,eljax:(value.eljax??value.gameday)===true};
}
const namedOrigin=item=>{
 const found=Object.entries(MOD_FACE_PAINT_ITEMS).find(([,items])=>items.includes(item.itemName));if(found)return found[0];
 if(VANILLA_FACE_PAINT_OPTIONS.includes(item.itemName))return 'vanilla';
 if(/raw/i.test(item.itemName))return 'raw';
 return 'unlocked';
};
export function mapperCatalog(mods){
 mods=normalizeMapperMods(mods);
 const catalog=new Map(EQUIPMENT_ITEMS.map(item=>[item.itemName,item]));
 for(const [itemName,slot,displayName]of [['Undershirt_None','InnerShirt','No Undershirt'],['BottomBase_None','InnerPants','No Leg Base Layer'],['NeckWear_None','NeckWear','No Neckwear'],['ArmTattoo_None','LeftArmTattoo','No Arm Tattoo'],['ArmTattoo_None','RightArmTattoo','No Arm Tattoo'],['LegTattoo_None','LeftLegTattoo','No Leg Tattoo'],['LegTattoo_None','RightLegTattoo','No Leg Tattoo']]){
  const previous=catalog.get(itemName);catalog.set(itemName,{itemName,displayName,category:'Empty Slots',origin:'vanilla',slots:[...new Set([...(previous?.slots??[]),slot])]});
 }
 for(const item of REMOVAL_NAMED_ITEMS)if(!catalog.has(item.itemName))catalog.set(item.itemName,{...item,origin:namedOrigin(item)});
 if(mods.raw)for(const item of RAW_314.jamoItems)catalog.set(item.itemName,{...item,origin:'raw'});
 for(const tattoo of UNLOCKED_TATTOO_POOL)catalog.set(tattoo.value,{itemName:tattoo.value,displayName:tattoo.label,origin:'unlocked',category:'Tattoo',slots:tattoo.type==='leg'?['LeftLegTattoo','RightLegTattoo']:['LeftArmTattoo','RightArmTattoo']});
 const items=[],groups=[];
 for(const original of catalog.values()){
  const known=equipmentForSelectedMods(original,{usingUnlockedMod:mods.unlocked,usingRawAccessoriesMod:mods.raw});
  if(known.origin==='unverified'||!known.slots?.length)continue;
  const required=['unlocked','raw','eljax'].includes(known.origin)?known.origin:null;if(required&&!mods[required])continue;
  const name=known.displayName??mapperItemName(known.itemName),category=mapperCategoryLabel(known.category),colors=equipmentSemantics(known.itemName)?.colors??[],brand=mapperBrandLabel(itemBrand(known)||'Universal'),variants=[];
  for(const slot of [...new Set(known.slots)]){
   const id='catalog:'+slot+':'+known.itemName,element={slotType:slot,itemAssetName:known.itemName};variants.push(id);
   items.push({id,slot,asset:known.itemName,name,category,brand,colors,side:/^(Left|Right)/.exec(slot)?.[1]??'Center',element,context:{},catalog:true,origin:required??'vanilla',wearers:[],usage:0,copyable:true,locations:[]});
  }
  groups.push({id:mapperDigest(known.itemName),asset:known.itemName,assets:[known.itemName],name,category,brand,colors,slots:[...new Set(known.slots)],variantIds:variants,wearers:[],usage:0,copyable:true});
 }
 const compare=(a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name)||a.asset.localeCompare(b.asset);
 return {items:items.sort(compare),groups:groups.sort(compare),resolution:{},issues:[],mods,catalog:true};
}
