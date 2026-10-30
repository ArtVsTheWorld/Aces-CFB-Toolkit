import { EQUIPMENT_ITEMS, RAW_ACCESSORIES_POOLS, UNLOCKED_POOLS, EQUIPMENT_TRUCK_POOLS, canGenerateItem, equipmentDisplayName, equipmentItem, RAW_314, itemBrand } from "../catalog.js";
import fs from "node:fs";
import PoolMigration from "../../../../shared/equipmentPoolMigration.cjs";
import { MOD_FACE_PAINT_ITEMS, VANILLA_FACE_PAINT_OPTIONS } from "./facepaint.js";

export const POOL_OWNERSHIP = JSON.parse(fs.readFileSync(new URL("../equipmentPoolOwnership.json", import.meta.url), "utf8"));
const STOCK = POOL_OWNERSHIP.vanillaItems;
export const isVanillaPoolItem = itemName => Object.hasOwn(STOCK, itemName);
const unique = items => [...new Map(items.filter(canGenerateItem).map(item => [item.itemName, item])).values()];
const category = (id, label, items, extra = {}) => ({ id, label, items: unique(items), ...extra });
export const UNLOCKED_SPATS=Object.freeze(EQUIPMENT_ITEMS.filter(item=>/^GearSpats_spatThin_(?:Black|White|TeamColor|SecondaryColor)$/.test(item.itemName)&&canGenerateItem(item)));
export const defaultUnlockedElbowItem=item=>!/^GearBicepBand_|^ElbowGear_(?:elbowBrace|elbowpad)/i.test(item.itemName);
// One allowlisted catalog feeds validation, generation, and the editors. A mod
// manifest alone is never permission to generate an unknown asset or slot.
let cachedDefinitions;
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function modPoolDefinitions() {
  if(cachedDefinitions)return cachedDefinitions;
  const gloves = EQUIPMENT_ITEMS.filter(item => item.category === "Gloves" && /^GearHand_(?!None)/i.test(item.itemName) && canGenerateItem(item));
  const teamGloveBrands = new Set(gloves.filter(item => /_(?:TeamColor|SecondaryColor)$/i.test(item.itemName)).map(itemBrand));
  const definitions = {
    unlocked: [
      category("undershirts", "Irish Jamo Sleeves", UNLOCKED_POOLS.undershirts, { defaultChance: 0 }),
      category("wristTape", "Taped Wrist with Cross", UNLOCKED_POOLS.wristTape, {defaultChance:3}),
      category("armSleeves", "Arm Sleeves", UNLOCKED_POOLS.armSleeves),
      category("elbowGear", "Elbow Gear & Bands", [...UNLOCKED_POOLS.elbowSweatbands, ...UNLOCKED_POOLS.bicepBands, ...UNLOCKED_POOLS.elbowPadsAndBraces, ...UNLOCKED_POOLS.shoulderStabilizers], {defaultItems:[...UNLOCKED_POOLS.elbowSweatbands, ...UNLOCKED_POOLS.elbowPadsAndBraces, ...UNLOCKED_POOLS.shoulderStabilizers].filter(item=>canGenerateItem(item)&&defaultUnlockedElbowItem(item)).map(item=>item.itemName)}),
      category("cleats", "Additional Cleats", EQUIPMENT_ITEMS.filter(item => item.category === "Cleats" && item.itemName.startsWith("Gear"))),
      category("gloves", "Additional Gloves", gloves, { defaultItems: gloves.filter(item => !teamGloveBrands.has(itemBrand(item)) || /_(?:TeamColor|SecondaryColor)$/i.test(item.itemName)).map(item => item.itemName) }),
      category("mouthpieces", "Mouthpieces", [...UNLOCKED_POOLS.unlockedMouthpieces, ...UNLOCKED_POOLS.colorfulHangingMouthpieces], { defaultItems: UNLOCKED_POOLS.unlockedMouthpieces.map(item => item.itemName) }),
      category("neckwear", "Turtlenecks & Neckwear", UNLOCKED_POOLS.neckwear),
      category("legSleeves", "Leg Base Layers", UNLOCKED_POOLS.legSleeves),
      category("balaclavas", "Normal Balaclavas", UNLOCKED_POOLS.balaclavas, { defaultChance: 5 }),
      category("thighPads", "Thigh Pads", UNLOCKED_POOLS.thighPads),
      category("towels", "Towels", UNLOCKED_POOLS.towels, {defaultChance:1}),
      category("socks", "Sock Styles", UNLOCKED_POOLS.socks),
      category("spats", "Spats — Both Feet", UNLOCKED_SPATS, {defaultChance:5})
    ],
    raw: [category("neckwear", "Turtlenecks & Necklaces", RAW_ACCESSORIES_POOLS.neckwear), category("skullcaps", "Skullcaps", RAW_ACCESSORIES_POOLS.skullcaps), category("backplates", "Backplates — No Flak Jacket", RAW_ACCESSORIES_POOLS.backplates ?? []), category('armSleeves', 'RAW Jamo Sleeves', RAW_ACCESSORIES_POOLS.armSleeves, {defaultChance: 0, defaultItems: []})],
    eljax: [category("armSleeves", "Team & Brand Arm Sleeves", EQUIPMENT_TRUCK_POOLS.armSleeves), category("visors", "Team & Brand Visors", EQUIPMENT_TRUCK_POOLS.visors),
      category("chinCovers", "Brand Logo Chin Covers", EQUIPMENT_TRUCK_POOLS.chinCovers),
      category("waistPlaycalls", "Waist Playcall Bands — QBs Only", EQUIPMENT_TRUCK_POOLS.waistPlaycalls),
      category("handwarmers", "Standard Logo Handwarmer", EQUIPMENT_TRUCK_POOLS.handwarmers, { defaultChance: 0, defaultItems: [] }),
      category("thighPads", "Jersey Number + Cross Thigh Pads", EQUIPMENT_TRUCK_POOLS.thighPads)]
  };
  const vanilla = [];
  definitions.unlocked = definitions.unlocked.map(entry => {
    const legacyDefaultItems = (entry.id==='towels'?[]:entry.defaultItems ?? entry.items.map(item => item.itemName)).filter(id=>!/^GearWrist_wristbrace_CompressShort_/i.test(id));
    const stockItems = entry.items.filter(item => isVanillaPoolItem(item.itemName)).map(item => {
      const name = STOCK[item.itemName].displayName;
      return {...item, displayName:name, replacedByUnlocked:Boolean(POOL_OWNERSHIP.replacements[item.itemName])};
    });
    if(stockItems.length) vanilla.push({...entry, label: ({cleats:'Cleats',gloves:'Gloves',mouthpieces:'Colored Hanging Mouthpieces',undershirts:'Undershirts'})[entry.id] ?? entry.label, items:stockItems, defaultItems:legacyDefaultItems.filter(id=>isVanillaPoolItem(id))});
    return {...entry, items:entry.items.filter(item=>POOL_OWNERSHIP.unlockedItems[item.itemName]).map(item=>({...item,displayName:POOL_OWNERSHIP.unlockedItems[item.itemName].displayName})), defaultItems:(entry.defaultItems??entry.items.map(item=>item.itemName)).filter(id=>POOL_OWNERSHIP.unlockedItems[id]), legacyDefaultItems, previousVanillaDefaultItems:POOL_OWNERSHIP.previousReviewDefaults[entry.id]?.vanilla??[], previousUnlockedDefaultItems:POOL_OWNERSHIP.previousReviewDefaults[entry.id]?.unlocked??[]};
  });
  // Menu-confirmed additions are available for explicit selection. Existing
  // category defaults and old presets keep their previous items and chances.
  for(const [id,label]of Object.entries(POOL_OWNERSHIP.additionalVanillaCategoryLabels??{})){
    const additions=Object.entries(STOCK).filter(([,entry])=>entry.poolCategory===id).map(([name,entry])=>({...equipmentItem(name,{usingUnlockedMod:false}),disabledWithUnlocked:Boolean(entry.disabledWithUnlocked),replacedByRaw:RAW_314.jamoItems.some(item=>item.itemName===name)})).filter(canGenerateItem);
    const existing=vanilla.find(c=>c.id===id);
    if(existing){existing.items=unique([...existing.items,...additions]);existing.label=label;}
    else if(additions.length)vanilla.push(category(id,label,additions,{defaultChance:0,defaultItems:[]}));
  }
  const sleeves=vanilla.find(c=>c.id==='armSleeves'),wrists=vanilla.find(c=>c.id==='wristGear');
  sleeves.defaultItems=[...new Set([...sleeves.defaultItems,...sleeves.items.filter(i=>/^Arm Sleeve (Quarter|Half) |^Arm Tape (Long|Short) /.test(i.displayName)).map(i=>i.itemName)])];
  wrists.defaultChance=10;
  wrists.defaultItems=wrists.items.filter(i=>/^Wrist Taped (Lite|Max|Normal) |^Glove Taped Large |^Wrist Band Normal /.test(i.displayName)).map(i=>i.itemName);
  definitions.vanilla = [...vanilla, {id:'facepaint',label:'Facepaint & Eye Tape',defaultChance:10,items:VANILLA_FACE_PAINT_OPTIONS.map(itemName=>({itemName,displayName:equipmentDisplayName(itemName)}))}];
  return cachedDefinitions=freeze(Object.fromEntries(Object.entries(definitions).map(([origin, categories]) => [origin, [...categories, ...(MOD_FACE_PAINT_ITEMS[origin] ? [{
    id: "facepaint", label: "Facepaint & Eye Tape", defaultChance: 10,
    items: MOD_FACE_PAINT_ITEMS[origin].map(itemName => ({ itemName, displayName: equipmentDisplayName(itemName) }))
  }] : [])].map(entry => ({ ...entry, defaultItems: (entry.defaultItems ?? entry.items.map(item => item.itemName)).filter(id=>!/^GearWrist_wristbrace_CompressShort_/i.test(id)) }))])));
}

export function normalizeModPools(value, defaultPercent = 10) {
  if (value !== undefined && (value === null || typeof value !== "object" || Array.isArray(value))) throw new Error("Equipment pool settings must contain named mod pools.");
  const definitions = modPoolDefinitions();
  value = PoolMigration.migrate(value, definitions, defaultPercent);
  if(value?._version!==undefined&&value._version!==2)throw Error("Unsupported equipment pool settings version.");
  for (const origin of Object.keys(value ?? {})) if (origin!=="_version"&&!definitions[origin]) throw new Error(`Unknown equipment pool: ${origin}.`);
  return { _version:2, ...Object.fromEntries(Object.entries(definitions).map(([origin, categories]) => {
    const supplied = value?.[origin];
    if (supplied !== undefined && (supplied === null || typeof supplied !== "object" || Array.isArray(supplied))) throw new Error(`Invalid ${origin} pool settings.`);
    for (const id of Object.keys(supplied ?? {})) if (!categories.some(category => category.id === id)) throw new Error(`Unknown ${origin} equipment category: ${id}.`);
    return [origin, Object.fromEntries(categories.map(category => {
      const choice = supplied?.[category.id];
      if (choice !== undefined && (choice === null || typeof choice !== "object" || Array.isArray(choice))) throw new Error(`Invalid ${category.label} settings.`);
      const chance = choice && Object.hasOwn(choice, "chance") ? choice.chance : category.defaultChance ?? defaultPercent;
      if (!Number.isInteger(chance) || chance < 0 || chance > 100) throw new Error(`${category.label}: use a whole percentage from 0 through 100.`);
      const items = choice && Object.hasOwn(choice, "items") ? choice.items : category.defaultItems;
      if (!Array.isArray(items) || items.some(id => typeof id !== "string" || !category.items.some(item => item.itemName === id))) throw new Error(`${category.label}: choose only items in this mod's supported pool.`);
      const groups=choice?.rollGroups;
      if(groups!==undefined&&(!Array.isArray(groups)||groups.some(group=>!group||!Number.isInteger(group.chance)||group.chance<0||group.chance>100||!Array.isArray(group.items)||group.items.some(id=>!items.includes(id)))||new Set(groups.flatMap(g=>g.items)).size!==groups.flatMap(g=>g.items).length||items.some(id=>!groups.some(g=>g.items.includes(id)))))throw Error(`${category.label}: invalid saved item chances.`);
      return [category.id, { chance, items: [...new Set(items)], ...(groups?{rollGroups:groups.map(group=>({chance:group.chance,items:[...group.items]}))}:{}) }];
    }))];
  }))};
}

export function configuredModItems(pool, configuration, category) {
  const selected = configuration?.[category]?.items;
  return selected === undefined ? pool : pool.filter(item => selected.includes(item.itemName));
}
export const modCategoryChance = (configuration, category, fallback) => configuration?.[category]?.chance === undefined ? fallback : configuration[category].chance / 100;
export function modPoolEditorCatalog() {
  return Object.fromEntries(Object.entries(modPoolDefinitions()).map(([origin, categories]) => [origin, categories.map(category => ({ ...category, items: category.items.map(item => ({ value: item.itemName, label: item.displayName, ...(item.replacedByUnlocked?{replacedByUnlocked:true}:{}),...(item.disabledWithUnlocked?{disabledWithUnlocked:true}:{}),...(item.replacedByRaw?{replacedByRaw:true}:{}) })) }))]));
}
