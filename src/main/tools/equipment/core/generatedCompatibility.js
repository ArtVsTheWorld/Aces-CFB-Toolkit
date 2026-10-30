import { CUTOFF_PANTS, cutoffPantsConflict, uniformItem } from "./uniformCompatibility.js";
import { canGenerateItem, equipmentItem, equipmentSemantics, equipmentDisplayName, equipmentTags } from "../catalog.js";
import { armAccessoryRestrictions, sleeveUndershirtConflict, relaxedTeeNeckwearConflict, equippedMask, isMaskOrBalaclava, isHangingMouthpiece } from "./compatibility.js";

const active = value => typeof value === "string" && !/(?:^|_)None$/i.test(value) && value !== "FaceGear_BalaclavaNone";
const get = (elements, slot) => elements.find(element => element.slotType === slot)?.itemAssetName;


export function generatedItemConflict(elements, item, slots = item.slots, position = "", options={}) {
  if (!canGenerateItem(item)) return "Item is not eligible for pool generation";
  const semantic = item.semantic;
  const proposed=elements.filter(element=>!slots.includes(element.slotType)).concat(slots.map(slotType=>({slotType,itemAssetName:item.itemName})));
  if(slots.some(slot=>['FaceWear','NeckWear','Neckpad','MouthWear'].includes(slot))){
    const mask=equippedMask(proposed,options.usingUnlockedMod),mouth=get(proposed,'MouthWear');
    if(mask&&active(mouth)&&!isHangingMouthpiece(mouth))return 'Masks and balaclavas require a hanging mouthpiece or no mouthpiece';
  }
  const helmet=get(proposed,'HeadWear');
  if(helmet&&slots.includes('MouthWear')&&isHangingMouthpiece(item.itemName)&&!equipmentTags(helmet).includes('HangingMouthpiece'))return 'This helmet does not support hanging mouthpieces';
  if(helmet&&slots.includes('GuardianCap')&&/^GuardianCap_GuardianXT/.test(item.itemName)&&!equipmentTags(helmet).includes('GuardianCap'))return 'This helmet does not support a guardian cap';

  const proposedShirt=slots.includes('InnerShirt')?item.itemName:get(elements,'InnerShirt');
  if(slots.some(slot=>['InnerShirt','NeckWear','Neckpad','FaceWear'].includes(slot)))for(const slot of ['NeckWear','Neckpad','FaceWear'])if(relaxedTeeNeckwearConflict(proposedShirt,slots.includes(slot)?item.itemName:get(elements,slot)))return 'Relaxed tees cannot be worn with turtlenecks, ski masks or balaclavas';
  for(const side of ['Left','Right']){
    const armSlot=`${side}ArmWear`,sleeve=slots.includes(armSlot)?item.itemName:get(elements,armSlot),shirt=slots.includes('InnerShirt')?item.itemName:get(elements,'InnerShirt');
    if(slots.includes(armSlot)||slots.includes('InnerShirt')){
      const reason=sleeveUndershirtConflict(sleeve,shirt,options);if(reason)return reason;
      const blocked=armAccessoryRestrictions(sleeve,get(elements,`${side}WristWear`),shirt,options);
      for(const accessory of [`${side}WristWear`,`${side}ElbowWear`])if(!slots.includes(accessory)&&active(get(elements,accessory))){const wrist=accessory.endsWith('WristWear')||equipmentSemantics(get(elements,accessory))?.bodyRegion==='wrist';if(wrist?blocked.wrist:blocked.elbow)return 'Arm sleeve or undershirt conflicts with existing wrist/elbow gear';}
    }
    for(const slot of slots.filter(slot=>slot===`${side}WristWear`||slot===`${side}ElbowWear`)){
      const blocked=armAccessoryRestrictions(sleeve,item.itemName,shirt,options);
      if(slot.endsWith('WristWear')||semantic.bodyRegion==='wrist'?blocked.wrist:blocked.elbow)return 'Sleeve or undershirt covers the wrist/elbow gear';
      if(slot.endsWith('WristWear')&&equipmentSemantics(get(elements,`${side}ElbowWear`),options)?.bodyRegion==='wrist')return 'Existing elbow-slot wrist accessory occupies this region';
    }
  }
  if (semantic.actualType === "wrist-tape") {
    for (const slot of slots) {
      const side = slot.startsWith("Left") ? "Left" : "Right";
      if (armAccessoryRestrictions(get(elements, `${side}ArmWear`), item.itemName, get(elements, "InnerShirt"),options).wrist) return "Sleeve covers the wrist tape";
      if (equipmentSemantics(get(elements, `${side}ElbowWear`))?.bodyRegion === "wrist") return "Existing elbow-slot wrist accessory occupies this region";
    }
  }
  if (slots.some(slot=>['OuterShirt','InnerShirt','InnerPants'].includes(slot)) && uniformItem(elements, 'OuterPants') === CUTOFF_PANTS) {
    const proposed=elements.filter(element=>!slots.includes(element.slotType)).concat(slots.map(slotType=>({slotType,itemAssetName:item.itemName})));
    if(cutoffPantsConflict(proposed))return slots.includes('InnerPants')?'Leg base layers cannot be added with cutoff pants':'Outfit conflicts with cutoff pants';
  }
  if (semantic.actualType === "raw-backplate") {
    const flak = get(elements, "FlakJacket");
    // Missing or the catalogued None means no jacket. Unknown active values
    // are not proof that the area is free; leave the donor's outfit alone.
    if (flak && flak !== "Flakjacket_None") return "RAW backplates cannot be added with a flak jacket";
  }
  if (semantic.excludedPositions.includes(String(position).toUpperCase())) return "Item is not generated for this position";
  if (semantic.groups.length) for (const element of elements) {
    if (slots.includes(element.slotType) || !active(element.itemAssetName)) continue;
    const other = equipmentSemantics(element.itemAssetName,options);
    if (other?.groups.some(group => semantic.groups.includes(group))) return "Overlapping neckwear, headwear or shoulder equipment";
    // Unknown donor neckwear is kept; do not assume that it is a free layer.
    if (semantic.groups.includes("neckwear") && ["NeckWear", "Neckpad"].includes(element.slotType) && !other) return "Existing neckwear occupies this region";
  }
  if (["bicep-band", "rubber-wristband"].includes(semantic.actualType)) {
    for (const slot of slots) {
      const side = slot.startsWith("Left") ? "Left" : "Right";

      if (semantic.bodyRegion === "wrist" && active(get(elements, `${side}WristWear`))) return "Existing wrist equipment occupies this region";
    }
  }
  return null;
}

// Pool-only targeting must not restrict deliberate Equipment Mapper edits.
export function allowedPoolPosition(item, position){
  if(!item)return false;const p=String(position).toUpperCase();
  if(item.allowedPositions&&!item.allowedPositions.includes(p))return false;
  if(/^GearWrist_gloveTapedLarge_/i.test(item.itemName)&&!['LT','LG','C','RG','RT','OL','LE','RE','LEDG','REDG','LEDGE','REDGE','EDGE','DT','DL','LB','MLB','MIKE','SAM','WILL','LOLB','ROLB','TE','FB'].includes(p))return false;
  if(item.itemName==='Towel2_South'&&!['WR','CB','FS','SS','S'].includes(p))return false;
  if(['LT','LG','C','RG','RT','OL','DT','K','P'].includes(p)){
    if(/balaclava|turtleneck|string towel/i.test(item.displayName??'')||item.itemName==='Towel2_South')return false;
    if(item.slots?.some(slot=>/^(Left|Right)HandWear$/.test(slot))){
      const tape=/^GearHand_tapedHand/i.test(item.itemName);if(!tape||['K','P'].includes(p))return false;
    }
  }
  return true;
}
export const canGenerateEquipment = (loadouts, item, slots = item?.slots, position = "", options={}) => allowedPoolPosition(item, position) && loadouts.every(loadout => !generatedItemConflict(loadout.loadoutElements, item, slots, position,options));

// Provenance is local to one recipient, not stored in a global cache. Only new
// pool additions may be restored. Existing donor items are never removed here.
export function createGeneratedEquipmentState(loadouts) {
  return { before: structuredClone(loadouts), added: loadouts.map(() => new Map()) };
}
export function recordGeneratedEquipment(state, slots, itemName) {
  if (!state) return;
  for (const added of state.added) for (const slot of slots) added.set(slot, itemName);
}

export function enforceGeneratedEquipmentCompatibility(loadouts, state, position = "") {
  if (!state) return [];
  const corrections = [];
  loadouts.forEach((loadout, index) => {
    for (const [slot, asset] of state.added[index]) {
      const elements = loadout.loadoutElements;
      if (get(elements, slot) !== asset) continue;
      const item = equipmentItem(asset, state.options), reason = item && (!allowedPoolPosition(item, position) ? "Item is not generated for this position" : generatedItemConflict(elements, item, [slot], position,state.options));
      // A paired band/cleat shares a type on two sides but is not a conflict.
      if (!reason) continue;
      const at = elements.findIndex(element => element.slotType === slot);
      const old = state.before[index].loadoutElements.find(element => element.slotType === slot);
      if (old) elements[at] = structuredClone(old); else elements.splice(at, 1);
      corrections.push({ loadout: index, slot, oldItem: asset, newItem: old?.itemAssetName ?? "Removed generated item", reason });
    }
  });
  return corrections;
}

// Optional-pool descriptions must describe what survived No Drip and final
// compatibility checks, not earlier rolls that were subsequently removed.
export function finalGeneratedChanges(loadouts, changes, options) {
  return changes.flatMap(change => {
    const names = [...new Set(change.newItem.split(" + "))].filter(name => loadouts.some(loadout => loadout.loadoutElements.some(element => change.slots.includes(element.slotType) && element.itemAssetName === name)));
    if (!names.length) return [];
    return [{ ...change, newItem: names.join(" + "), displayName: names.length===1&&names[0]===change.newItem ? change.displayName : names.map(name => equipmentItem(name, options)?.displayName ?? equipmentDisplayName(name)).join(" + ") }];
  });
}
