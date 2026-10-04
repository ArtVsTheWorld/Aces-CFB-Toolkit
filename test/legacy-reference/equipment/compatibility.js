const HEAVY_SLEEVE_PATTERNS = Object.freeze([
  /GearArmSleeve_Baggy_/i,
  /GearArmSleeve_McDavidPaddedCompressionSleeve_/i,
  /GearArmSleeve_NikePaddedElbowCompressionSleeve_/i,
  /GearArmSleeve_NikeProDriFitSleeve_/i,
  /GearArmSleeve_NikeHyperstrongPaddedSleeve_/i,
  /Padded.*Sleeve|Sleeve.*Padded/i
]);

const slotOf = element => element?.slotType || "";

export function isHeavyOrPaddedArmSleeve(assetName) {
  return typeof assetName === "string" && HEAVY_SLEEVE_PATTERNS.some(pattern => pattern.test(assetName));
}

function setSlot(elements, slot, itemAssetName) {
  const existing = elements.find(element => slotOf(element) === slot);
  if (existing) existing.itemAssetName = itemAssetName;
  else elements.push({ slotType: slot, itemAssetName });
}

// The in-game editor prevents these collisions. Direct table editing does not,
// so normalize both wrist and elbow slots on whichever arm wears a heavy sleeve.
export function enforceArmSleeveCompatibility(elements) {
  const correctedArms = [];
  for (const side of ["Left", "Right"]) {
    const sleeve = elements.find(element => slotOf(element) === `${side}ArmWear`)?.itemAssetName;
    if (!isHeavyOrPaddedArmSleeve(sleeve)) continue;
    const wristSlot = `${side}WristWear`;
    const elbowSlot = `${side}ElbowWear`;
    const wrist = elements.find(element => slotOf(element) === wristSlot)?.itemAssetName;
    const elbow = elements.find(element => slotOf(element) === elbowSlot)?.itemAssetName;
    if (wrist === "GearWrist_None" && elbow === "ElbowGear_None") continue;
    setSlot(elements, wristSlot, "GearWrist_None");
    setSlot(elements, elbowSlot, "ElbowGear_None");
    correctedArms.push({ side, sleeve, oldWrist: wrist ?? "Missing", oldElbow: elbow ?? "Missing" });
  }
  return correctedArms;
}
