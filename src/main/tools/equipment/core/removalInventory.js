import fs from 'node:fs';
import {equipmentDisplayName} from '../catalog.js';
import {MOD_FACE_PAINT_ITEMS,VANILLA_FACE_PAINT_OPTIONS} from './facepaint.js';
import {LONG_SLEEVE_UNDERSHIRTS,RELAXED_TEE_REPLACEMENTS} from './compatibility.js';

const offline=JSON.parse(fs.readFileSync(new URL('../equipmentOfflineInventory.json',import.meta.url),'utf8'));
export const REMOVAL_DISPLAY_ALIASES=JSON.parse(fs.readFileSync(new URL('../equipmentRemovalAliases.json',import.meta.url),'utf8')).aliases;
const explicitSlotOnly=new Set(['G_Hoodie_Sleeveless_Ravens_ML_PUR','G_CompressionT_Crew_ShortSleeve_BasicJ_JER','FaceMarks_RawDiamondStudEarrings']);
const entry=(itemName,category,slots)=>({itemName,displayName:equipmentDisplayName(itemName),category,slots,requiresExplicitSlot:explicitSlotOnly.has(itemName)});
// Removal also needs named assets that are intentionally outside generation's
// wearable-item catalog. These families already have established save slots;
// this list never adds an item to a randomizer or changes its generation rules.
export const REMOVAL_NAMED_ITEMS=Object.freeze([
  ...new Set([...VANILLA_FACE_PAINT_OPTIONS,...Object.values(MOD_FACE_PAINT_ITEMS).flat()])
].map(id=>entry(id,'Facepaint',['FacePaint'])).concat(
  [...LONG_SLEEVE_UNDERSHIRTS,...Object.keys(RELAXED_TEE_REPLACEMENTS),
    'G_Hoodie_Sleeveless_Ravens_ML_PUR','G_CompressionT_Crew_ShortSleeve_BasicJ_JER',
    ...Object.keys(offline.displayNames).filter(id=>/^gear_undershirt_irishjamo_(?:jer|whi|bla|pri|sec)$/.test(id))]
    .map(id=>entry(id,'Undershirt',['InnerShirt'])),
  Object.keys(offline.displayNames).filter(id=>/^GuardianCap_RawLongDreadlocks/.test(id)&&!id.endsWith('None'))
    .map(id=>entry(id,'Guardian Cap',['GuardianCap'])),
  ['GearNeckpad_SkiPrimary','GearNeckpad_SkiSecondary']
    .filter(id=>offline.displayNames[id]).map(id=>entry(id,'Neckwear',['Neckpad'])),
  Object.keys(offline.displayNames).filter(id=>/^neckwear_raw_turtleneck(?:_(?:black|white|secondary))?$/.test(id))
    .map(id=>entry(id,'Neckwear',['NeckWear'])),
  ['FaceMarks_RawDiamondStudEarrings'].filter(id=>offline.displayNames[id])
    .map(id=>entry(id,'Facepaint',['FacePaint']))
));
