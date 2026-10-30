import { equipmentSemantics } from "../catalog.js";
import { enforceCutoffPantsCompatibility } from "./uniformCompatibility.js";

import {LONG_SLEEVE_UNDERSHIRTS,incompatibleArmAccessories,sleeveUndershirtConflict,SHORT_BLACK_TAPE_JAMO} from './armFit.js';
export {LONG_SLEEVE_UNDERSHIRTS,sleeveUndershirtConflict} from './armFit.js';
const slotOf = element => element?.slotType || "";
export const RELAXED_TEE_REPLACEMENTS = Object.freeze({
  G_CompressionT_Crew_ShortSleeve_99Club_B_WHI: "Gear_Undershirt_CompressionTCrewSleeveless_Black",
  G_CompressionT_Crew_ShortSleeve_99Club_B_GOL: "Gear_Undershirt_CompressionTCrewSleeveless_White",
  G_CompressionT_Crew_LongSleeve_99Club_B_GOL: "Gear_Undershirt_CompressionTCrewSleeveless",
  G_CompressionT_Crew_LongSleeve_99Club_B_WHI: "Gear_Undershirt_CompressionTCrewSleeveless_Secondary"
});
export const RELAXED_TEE_INCOMPATIBLE_JERSEYS = new Set([
  "Gear_JerseyStyle_LowTuckedBP", "Gear_JerseyStyle_RolledLow", "Gear_JerseyStyle_Rolled",
  "Gear_Low_TuckedUndershirt", "Gear_JerseyStyle_RolledLowest", "Gear_JerseyStyle_RolledLowest_Untucked"
]);
export function enforceRelaxedTeeCompatibility(elements) {
  if (!elements.some(element => element?.slotType === "OuterShirt" && RELAXED_TEE_INCOMPATIBLE_JERSEYS.has(element.itemAssetName))) return [];
  const changes = [];
  for (const element of elements) {
    const replacement = element?.slotType === "InnerShirt" && RELAXED_TEE_REPLACEMENTS[element.itemAssetName];
    if (!replacement) continue;
    changes.push({ kind: "jersey-undershirt", slot: "InnerShirt", oldItem: element.itemAssetName, newItem: replacement });
    element.itemAssetName = replacement;
  }
  return changes;
}
export const isElbowLengthUndershirt = asset => /^GearArmSleeve_Undershirt_sleeveLongUnderarmor_normal_(?:Secondary|TeamColor|White|Black)$/i.test(asset ?? "");
export const isRolledArmSleeve = asset => /^GearArmSleeve_CompressionRolledUpShirt_/i.test(asset ?? "");
export const isWristCoach = asset => /^GearWrist_wristBandCoach_/i.test(asset ?? "");

export function relaxedTeeNeckwearConflict(undershirt,asset){
  if(!Object.hasOwn(RELAXED_TEE_REPLACEMENTS,undershirt??'')||typeof asset!=='string'||/(?:^|_)None$/i.test(asset)||asset==='FaceGear_BalaclavaNone')return false;
  // The tee itself proves the Unlocked outfit context, including the two
  // vanilla neck-roll IDs that Unlocked replaces with balaclavas.
  return /Turtle|Ski|Balaclava/i.test(asset)||['GearNeckpad_VintageNeckRoll','GearNeckpad_VintageSingleNeckRoll','G_CompressionT_Crew_LongSleeve_NikeHQ_B_BLA'].includes(asset);
}

export function armAccessoryRestrictions(sleeve, wrist, undershirt, options={}) {
  if(!LONG_SLEEVE_UNDERSHIRTS.has(undershirt)&&sleeve===SHORT_BLACK_TAPE_JAMO)return {elbow:true,wrist:false};
  const blocked=LONG_SLEEVE_UNDERSHIRTS.has(undershirt)||incompatibleArmAccessories(sleeve,options);
  return {elbow:blocked,wrist:blocked};
}
export const isWristElbowIncompatibleArmSleeve=incompatibleArmAccessories;
export const isHeavyOrPaddedArmSleeve = isWristElbowIncompatibleArmSleeve;
export function isMaskOrBalaclava(assetName, usingUnlockedMod = false) { return typeof assetName === "string" && (/Ski(?:Mask)?|Balaclava/i.test(assetName) || (usingUnlockedMod && ["GearNeckpad_VintageNeckRoll", "GearNeckpad_VintageSingleNeckRoll"].includes(assetName))) && !/(?:^|_)None$/i.test(assetName) && assetName !== "FaceGear_BalaclavaNone"; }
export function equippedMask(elements, usingUnlockedMod = false) { return elements.find(element => ["Neckpad", "NeckWear", "FaceWear"].includes(slotOf(element)) && isMaskOrBalaclava(element.itemAssetName, usingUnlockedMod))?.itemAssetName; }
export function isHangingMouthpiece(assetName) { return typeof assetName === "string" && /PacifierDualHanging/i.test(assetName); }

function setSlot(elements, slot, itemAssetName) {
  const existing = elements.find(element => slotOf(element) === slot);
  if (existing) existing.itemAssetName = itemAssetName;
  else elements.push({ slotType: slot, itemAssetName });
}

function clearArmAccessories(elements, side, source, corrections, blocked) {
  const wristSlot = `${side}WristWear`, elbowSlot = `${side}ElbowWear`;
  const wrist = elements.find(element => slotOf(element) === wristSlot)?.itemAssetName;
  const elbow = elements.find(element => slotOf(element) === elbowSlot)?.itemAssetName;
  const clearWrist = blocked.wrist && wrist && !/(?:^|_)None$/i.test(wrist);
  const elbowBlocked = equipmentSemantics(elbow)?.bodyRegion === "wrist" ? blocked.wrist : blocked.elbow;
  const clearElbow = elbowBlocked && elbow && !/(?:^|_)None$/i.test(elbow);
  if (!clearWrist && !clearElbow) return;
  if (clearWrist) setSlot(elements, wristSlot, "GearWrist_None");
  if (clearElbow) setSlot(elements, elbowSlot, "ElbowGear_None");
  corrections.push({ kind: "arm", side, sleeve: source, oldWrist: wrist ?? "Missing", oldElbow: elbow ?? "Missing" });
}

export function enforceEquipmentCompatibility(elements, { usingUnlockedMod = false, usingRawAccessoriesMod = false, allowCutoffLegLayers = false } = {}) {
  const corrections = enforceRelaxedTeeCompatibility(elements);
  const undershirt = elements.find(element => slotOf(element) === "InnerShirt")?.itemAssetName;
  for(const element of elements){
    const empty={NeckWear:'NeckWear_None',Neckpad:'GearNeckpad_None',FaceWear:'FaceGear_BalaclavaNone'}[slotOf(element)];
    if(empty&&relaxedTeeNeckwearConflict(undershirt,element.itemAssetName)){
      corrections.push({kind:'relaxed-tee-neckwear',slot:element.slotType,undershirt,oldItem:element.itemAssetName,newItem:empty});
      element.itemAssetName=empty;
    }
  }
  for (const side of ["Left", "Right"]) {
    let sleeve = elements.find(element => slotOf(element) === `${side}ArmWear`)?.itemAssetName;
    const reason=sleeveUndershirtConflict(sleeve,undershirt,{usingRawAccessoriesMod});
    if(reason){setSlot(elements,`${side}ArmWear`,'ArmSleeve_None');corrections.push({kind:'undershirt-arm',side,sleeve,undershirt,reason,slot:`${side}ArmWear`,oldItem:sleeve,newItem:'ArmSleeve_None'});sleeve='ArmSleeve_None';}
    const wrist = elements.find(element => slotOf(element) === `${side}WristWear`)?.itemAssetName;
    clearArmAccessories(elements, side, sleeve || undershirt, corrections, armAccessoryRestrictions(sleeve, wrist, undershirt,{usingRawAccessoriesMod}));
  }
  for(const side of ['Left','Right']){
    const wrist=elements.find(e=>slotOf(e)===`${side}WristWear`)?.itemAssetName,elbow=elements.find(e=>slotOf(e)===`${side}ElbowWear`)?.itemAssetName;
    if(wrist&&!/(?:^|_)None$/i.test(wrist)&&equipmentSemantics(elbow,{usingUnlockedMod,usingRawAccessoriesMod})?.bodyRegion==='wrist'){
      setSlot(elements,`${side}ElbowWear`,'ElbowGear_None');corrections.push({kind:'wrist-overlap',side,slot:`${side}ElbowWear`,oldItem:elbow,newItem:'ElbowGear_None'});
    }
  }
  corrections.push(...enforceMouthpieceCompatibility(elements, { usingUnlockedMod }));
  corrections.push(...enforceCutoffPantsCompatibility(elements,{allowLegLayers:allowCutoffLegLayers}));
  return corrections;
}

export function enforceMouthpieceCompatibility(elements, { usingUnlockedMod = false } = {}) {
  const corrections = [];
  const neckwear = equippedMask(elements, usingUnlockedMod);
  const mouthpiece = elements.find(element => slotOf(element) === "MouthWear")?.itemAssetName;
  if (isMaskOrBalaclava(neckwear, usingUnlockedMod) && mouthpiece && !/(?:^|_)None$/i.test(mouthpiece) && !isHangingMouthpiece(mouthpiece)) {
    setSlot(elements, "MouthWear", "GearMouthpiece_None");
    corrections.push({ kind: "mask-mouthpiece", mask: neckwear, oldMouthpiece: mouthpiece });
  }
  return corrections;
}

export const enforceArmSleeveCompatibility = enforceEquipmentCompatibility;
