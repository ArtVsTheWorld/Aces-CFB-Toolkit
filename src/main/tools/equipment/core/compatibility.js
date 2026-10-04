import { equipmentTags, equipmentSemantics } from "../catalog.js";

const INCOMPATIBLE_ARM_SLEEVE_PATTERNS = Object.freeze([
  /GearArmSleeve_Baggy_/i,
  /GearArmSleeve_(?:Full|Half|Shooter|Branded)/i,
  /GearArmSleeve_(?:McDavidPaddedCompressionSleeve|NikePaddedElbowCompressionSleeve|NikeProDriFitSleeve|NikeHyperstrongPaddedSleeve)/i,
  /GearArmSleeve_CompressionRolledUpShirt_/i,
  /GearArmSleeve_Undershirt_sleeveLongUnderarmor_normal_(?:Secondary|TeamColor|White|Black)$/i,
  /Padded.*Sleeve|Sleeve.*Padded/i
]);
const COMPATIBLE_ARM_SLEEVE_PATTERNS = Object.freeze([/GearArmSleeve_Quarter_/i, /armTape/i, /(?:^|_)None$/i]);
export const LONG_SLEEVE_UNDERSHIRTS = new Set([
  "G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD", "G_CompressionT_Crew_LongSleeve_NikeHQ_B_GRE",
  "G_CompressionT_Crew_LongSleeve_NikeHQ_B_BEI", "G_CompressionT_Crew_LongSleeve_NikeHQ_B_NAV"
]);
const slotOf = element => element?.slotType || "";
export const isElbowLengthUndershirt = asset => /^GearArmSleeve_Undershirt_sleeveLongUnderarmor_normal_(?:Secondary|TeamColor|White|Black)$/i.test(asset ?? "");
export const isRolledArmSleeve = asset => /^GearArmSleeve_CompressionRolledUpShirt_/i.test(asset ?? "");
export const isWristCoach = asset => /^GearWrist_wristBandCoach_/i.test(asset ?? "");

export function armAccessoryRestrictions(sleeve, wrist, undershirt) {
  // These shoulder-to-elbow styles leave the wrist free. A long InnerShirt
  // still covers it; the rolled sleeve only conflicts with the bulky coach.
  const fullInner = LONG_SLEEVE_UNDERSHIRTS.has(undershirt);
  if (isElbowLengthUndershirt(sleeve)) return { elbow: true, wrist: fullInner };
  if (isRolledArmSleeve(sleeve)) return { elbow: true, wrist: fullInner || isWristCoach(wrist) };
  const covered = fullInner || isWristElbowIncompatibleArmSleeve(sleeve);
  return { elbow: covered, wrist: covered };
}

export function isWristElbowIncompatibleArmSleeve(assetName) {
  if (isElbowLengthUndershirt(assetName) || isRolledArmSleeve(assetName)) return false;
  if (typeof assetName !== "string" || COMPATIBLE_ARM_SLEEVE_PATTERNS.some(pattern => pattern.test(assetName))) return false;
  return equipmentTags(assetName).includes("GearArm_FullSleeve") || INCOMPATIBLE_ARM_SLEEVE_PATTERNS.some(pattern => pattern.test(assetName));
}
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

export function enforceEquipmentCompatibility(elements, { usingUnlockedMod = false } = {}) {
  const corrections = [];
  const undershirt = elements.find(element => slotOf(element) === "InnerShirt")?.itemAssetName;
  for (const side of ["Left", "Right"]) {
    const sleeve = elements.find(element => slotOf(element) === `${side}ArmWear`)?.itemAssetName;
    const wrist = elements.find(element => slotOf(element) === `${side}WristWear`)?.itemAssetName;
    clearArmAccessories(elements, side, sleeve || undershirt, corrections, armAccessoryRestrictions(sleeve, wrist, undershirt));
  }
  const neckwear = equippedMask(elements, usingUnlockedMod);
  const mouthpiece = elements.find(element => slotOf(element) === "MouthWear")?.itemAssetName;
  if (isMaskOrBalaclava(neckwear, usingUnlockedMod) && mouthpiece && !/(?:^|_)None$/i.test(mouthpiece) && !isHangingMouthpiece(mouthpiece)) {
    setSlot(elements, "MouthWear", "GearMouthpiece_None");
    corrections.push({ kind: "mask-mouthpiece", mask: neckwear, oldMouthpiece: mouthpiece });
  }
  return corrections;
}

export const enforceArmSleeveCompatibility = enforceEquipmentCompatibility;
