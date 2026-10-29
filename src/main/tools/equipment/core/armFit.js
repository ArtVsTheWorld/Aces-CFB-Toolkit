import { EQUIPMENT_ITEMS, equipmentDisplayName, RAW_314 } from '../catalog.js';

const armItems=EQUIPMENT_ITEMS.filter(item=>item.slots.some(slot=>/^(Left|Right)ArmWear$/.test(slot)));
const names=item=>equipmentDisplayName(item.itemName);
export const ACCESSORY_COMPATIBLE_SLEEVES=new Set(armItems.filter(item=>/^(?:Arm Sleeve Quarter |Undershirt |Arm Tape Long |Arm Tape Short )/.test(names(item))).map(item=>item.itemName));
export const COMPRESSION_TEE_BLOCKED_SLEEVES=new Set(armItems.filter(item=>/^(?:Arm Sleeve Quarter |Undershirt |Arm Sleeve Full |Baggy Arm Sleeve )/.test(names(item))||/ Rolled Sleeve$/.test(names(item))).map(item=>item.itemName));
export const LONG_SLEEVE_UNDERSHIRTS=new Set([
 'G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD','G_CompressionT_Crew_LongSleeve_NikeHQ_B_GRE',
 'G_CompressionT_Crew_LongSleeve_NikeHQ_B_BEI','G_CompressionT_Crew_LongSleeve_NikeHQ_B_NAV'
]);
// These four stock color IDs are present in native player outfits; JER is the
// separately named White Compression Tee. Irish Jamo and Relaxed Tees are not
// inferred from the misleading shared ShortSleeve/LongSleeve file prefixes.
export const COMPRESSION_TEES=new Set([
 'G_CompressionT_Crew_ShortSleeve_Basic_WHI','G_CompressionT_Crew_ShortSleeve_Basic_BLA',
 'G_CompressionT_Crew_ShortSleeve_Basic_PRI','G_CompressionT_Crew_ShortSleeve_Basic_SEC',
 'G_CompressionT_Crew_ShortSleeve_BasicJ_JER'
]);
export const activeArmItem=asset=>typeof asset==='string'&&asset.length>0&&!/(?:^|_)None$/i.test(asset);
const rawJamo=new Set(RAW_314.jamoItems.map(item=>item.itemName));
export const SHORT_BLACK_TAPE_JAMO='GearArmSleeve_Quarter_armTape_normal_Black';
export const incompatibleArmAccessories=(sleeve,options={})=>activeArmItem(sleeve)&&((options.usingRawAccessoriesMod&&rawJamo.has(sleeve))||!ACCESSORY_COMPATIBLE_SLEEVES.has(sleeve));
export function sleeveUndershirtConflict(sleeve,undershirt,options={}){
 if(!activeArmItem(sleeve))return null;
 if(LONG_SLEEVE_UNDERSHIRTS.has(undershirt))return 'Longsleeve undershirts cannot be combined with arm sleeves';
 if(!(options.usingRawAccessoriesMod&&rawJamo.has(sleeve))&&COMPRESSION_TEES.has(undershirt)&&COMPRESSION_TEE_BLOCKED_SLEEVES.has(sleeve))return 'Compression Tees cannot be combined with this arm sleeve';
 return null;
}
