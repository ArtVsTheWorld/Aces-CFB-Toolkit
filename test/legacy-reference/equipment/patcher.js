import { parseRef, sf } from "../openSave.js";
import { enforceArmSleeveCompatibility } from "./compatibility.js";

export const TRUE_FRESHMAN_REDSHIRT = new Set(["eligible", "current"]);
export const PROTECTED_BRAND_SLOTS = new Set(["LeftHandWear", "RightHandWear", "LeftShoe", "RightShoe", "LeftShoeOverride", "RightShoeOverride"]);
export const BODY_DEPENDENT_SLOTS = new Set(["InnerShirt", "OuterShirt"]);
const PERSONAL_SLOTS = new Set(["CharacterBodyType", "CustomHead", "PlusHead", "Face", "FaceTexture", "Hair", "FacialHair", "Eyebrow", "Eyes", "Ears", "Cheek", "Chin", "Jaw", "Mouth", "Nose", "LeftArmTattoo", "RightArmTattoo", "LeftLegTattoo", "RightLegTattoo", "NeckTattoo"]);
const FACE_PAINT_OPTIONS = ["FaceMarks_EyePaint", "FaceMarks_EyePaint2", "FaceMarks_EyePaint3", "FaceMarks_EyePaintCross", "FaceMarks_EyeTape", "FaceMarks_EyeTapeLeft", "FaceMarks_EyeTapeRight", "FaceMarks_NoseEyeTape", "FaceMarks_NoseTape", "FaceMarks_NoseTapeEyePaint"];
const BROKEN_HOODIE_ASSET = "Gear_Undershirt_Hoodie";
const HOODIE_ASSET = "Gear_Undershirt_HoodieSleeveless";
const SLOT_GROUPS = new Map([
  ["helmet", new Set(["HeadWear", "FaceMask", "Visor", "MouthWear"])],
  ["upper body + arms", new Set(["OuterShirt", "InnerShirt", "Shoulderpads", "BackPlate", "FlakJacket", "Neckpad", "LeftArmWear", "RightArmWear", "LeftElbowWear", "RightElbowWear", "LeftWristWear", "RightWristWear"])],
  ["lower body + waist", new Set(["Towel", "WaistWear", "WaistWearOverride", "InnerPants", "InnerSocks", "KneeWear", "LeftThighWear", "RightThighWear", "LeftKneeBrace", "RightKneeBrace", "LeftCalfWear", "RightCalfWear", "LeftSpat", "RightSpat"])]]
);
const POSITION_FAMILIES = [
  new Set(["DT", "LE", "RE"]),
  new Set(["LOLB", "MLB", "ROLB", "LB"]),
  new Set(["CB", "FS", "SS", "SAFETY"]),
  new Set(["LT", "LG", "C", "RG", "RT"]),
  new Set(["K", "P"])
];
const CROSS_POSITION_POOLS = new Map([
  ["WR", ["CB", "FS", "SS", "HB"]],
  ["HB", ["CB", "FS", "SS", "WR"]],
  ["TE", ["LOLB", "MLB", "ROLB", "LB", "WR"]],
  ["LOLB", ["TE", "FS", "SS", "HB"]],
  ["MLB", ["TE", "FS", "SS", "HB"]],
  ["ROLB", ["TE", "FS", "SS", "HB"]],
  ["LB", ["TE", "FS", "SS", "HB"]],
  ["CB", ["WR", "HB"]],
  ["FS", ["WR", "HB", "LOLB", "MLB", "ROLB", "LB"]],
  ["SS", ["WR", "HB", "LOLB", "MLB", "ROLB", "LB"]],
  ["SAFETY", ["WR", "HB", "LOLB", "MLB", "ROLB", "LB"]]
]);

export function getBaseDonorPositions(position) {
  const family = POSITION_FAMILIES.find(positions => positions.has(position));
  return family ? [...family] : [position];
}

export function getCrossDonorPositions(position) {
  return [...(CROSS_POSITION_POOLS.get(position) ?? [])];
}

export function rollEquipmentMode(rng, crossEligible, mixedChance = 0.30, crossMixedChance = 0.10) {
  const roll = rng();
  if (crossEligible && roll < crossMixedChance) return "cross";
  if (roll < mixedChance + (crossEligible ? crossMixedChance : 0)) return "mixed";
  return "full";
}

export function isTrueFreshman(record) {
  return String(sf(record, "SchoolYear") ?? "").toLowerCase() === "freshman"
    && TRUE_FRESHMAN_REDSHIRT.has(String(sf(record, "RedshirtStatus") ?? "").toLowerCase());
}

export function isPlaceholder(record) {
  return String(sf(record, "FirstName") ?? "").trim().toLowerCase() === "omar"
    && String(sf(record, "LastName") ?? "").trim().toLowerCase() === "omar";
}

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeMouthpieceColor(assetName, color) {
  if (typeof assetName !== "string" || /(?:^|_)none$/i.test(assetName)) return assetName;
  const separator = assetName.lastIndexOf("_");
  if (separator < 0) return assetName;
  return `${assetName.slice(0, separator)}_${color}`;
}

function slotOf(element) {
  return element?.slotType || (/^GearFaceMask/i.test(element?.itemAssetName ?? "") ? "FaceMask" : "");
}

function setSlot(elements, slot, itemAssetName) {
  const existing = elements.find(element => slotOf(element) === slot);
  if (existing) existing.itemAssetName = itemAssetName;
  else elements.push({ slotType: slot, itemAssetName });
}

export function rollFacePaint(rng) {
  return rng() < 0.60 ? "FaceMarks_None" : FACE_PAINT_OPTIONS[Math.floor(rng() * FACE_PAINT_OPTIONS.length)];
}

function finalizeEquipment(elements, rng) {
  for (const element of elements) {
    if (slotOf(element) === "InnerShirt" && element.itemAssetName === BROKEN_HOODIE_ASSET) {
      element.itemAssetName = HOODIE_ASSET;
    }
    if (slotOf(element) !== "MouthWear" || typeof element.itemAssetName !== "string" || /(?:^|_)none$/i.test(element.itemAssetName)) continue;
    element.itemAssetName = normalizeMouthpieceColor(element.itemAssetName, rng() < 0.75 ? "White" : "Black");
  }
  setSlot(elements, "OuterPants", "GearPants_AboveKnee");
  setSlot(elements, "FacePaint", rollFacePaint(rng));
  return enforceArmSleeveCompatibility(elements);
}

function playerOnFieldLoadouts(rawData) {
  const parsed = JSON.parse(rawData);
  if (!Array.isArray(parsed?.loadouts)) throw new Error("visuals JSON has no loadouts array");
  const loadouts = parsed.loadouts.filter(loadout => loadout?.loadoutType === "PlayerOnField");
  if (!loadouts.length || loadouts.some(loadout => !Array.isArray(loadout.loadoutElements))) throw new Error("visuals JSON has no valid PlayerOnField equipment loadout");
  return { parsed, loadouts };
}

function playerInfo(record, row, teamNames, teamApparel = new Map()) {
  const teamIndex = Number(sf(record, "TeamIndex"));
  return { row, teamIndex, branding: String(teamApparel.get(teamIndex) ?? "").trim().toLowerCase(), bodyType: String(sf(record, "CharacterBodyType") ?? "").trim().toLowerCase(), firstName: String(sf(record, "FirstName") ?? "").trim(), lastName: String(sf(record, "LastName") ?? "").trim(), team: teamNames.get(teamIndex) ?? `Team ${sf(record, "TeamIndex") ?? "?"}`, position: String(sf(record, "Position") ?? "Unknown"), classYear: String(sf(record, "SchoolYear") ?? "Unknown"), redshirtStatus: String(sf(record, "RedshirtStatus") ?? ""), jersey: sf(record, "JerseyNum") ?? sf(record, "JerseyNumber") ?? "?", overall: Number(sf(record, "OverallRating") ?? 0) };
}

function visualsFor(record, visualsTableId, visualsRecords) {
  const ref = parseRef(sf(record, "CharacterVisuals"));
  if (!ref || ref.tableId !== visualsTableId) throw new Error("missing or invalid CharacterVisuals reference");
  const visual = visualsRecords[ref.row];
  if (!visual || visual.isEmpty) throw new Error("referenced CharacterVisuals row is empty");
  const raw = sf(visual, "RawData");
  if (typeof raw !== "string" || !raw.trim()) throw new Error("CharacterVisuals RawData is empty");
  return { ref, visual, ...playerOnFieldLoadouts(raw) };
}

const choose = (items, rng) => items[Math.floor(rng() * items.length)];
const donorSummary = donor => ({ row: donor.row, firstName: donor.firstName, lastName: donor.lastName, team: donor.team, position: donor.position, classYear: donor.classYear, redshirtStatus: donor.redshirtStatus, jersey: donor.jersey, overall: donor.overall });

function copySlots(targetElements, donorElements, allowedSlots = null, { allowBrandSlots = false, preserveSlots = new Set() } = {}) {
  const mustPreserve = slot => preserveSlots.has(slot) || (!allowBrandSlots && PROTECTED_BRAND_SLOTS.has(slot)) || PERSONAL_SLOTS.has(slot);
  const preserved = targetElements.filter(element => mustPreserve(slotOf(element)));
  const copied = donorElements.filter(element => {
    const slot = slotOf(element);
    return !mustPreserve(slot) && slot !== "FacePaint" && slot !== "OuterPants" && (!allowedSlots || allowedSlots.has(slot));
  }).map(element => structuredClone(element));
  if (!allowedSlots) return [...copied, ...preserved.map(element => structuredClone(element))];
  const allowed = allowedSlots;
  return [...targetElements.filter(element => !allowed.has(slotOf(element)) || preserveSlots.has(slotOf(element))).map(element => structuredClone(element)), ...copied];
}

function shuffle(items, rng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function patchFreshmanEquipment(playerRecords, visualsRecords, visualsTableId, options = {}) {
  const { teamNames = new Map(), teamApparel = new Map(), donorPlayerRecords = playerRecords, donorVisualRecords = visualsRecords, donorVisualsTableId = visualsTableId, donorTeamNames = teamNames, donorTeamApparel = teamApparel, fcsTeamIndexes = new Set(), excludedRecipientTeamIndexes = new Set(), eligiblePlayer = () => true, top = 125, mixedChance = 0.30, crossMixedChance = 0.10, seed = 1, apply = false } = options;
  const rng = mulberry32(seed);
  const donorsByPosition = new Map();
  const skipped = [];
  const referenceCounts = new Map();
  for (const record of playerRecords) {
    if (!record || record.isEmpty) continue;
    const ref = parseRef(sf(record, "CharacterVisuals"));
    if (ref?.tableId === visualsTableId) referenceCounts.set(ref.row, (referenceCounts.get(ref.row) ?? 0) + 1);
  }

  donorPlayerRecords.forEach((record, row) => {
    if (!record || record.isEmpty || isPlaceholder(record)) return;
    const teamIndex = Number(sf(record, "TeamIndex"));
    if (fcsTeamIndexes.has(teamIndex)) return;
    const year = String(sf(record, "SchoolYear") ?? "").toLowerCase();
    if (!["sophomore", "junior", "senior"].includes(year)) return;
    try {
      const visuals = visualsFor(record, donorVisualsTableId, donorVisualRecords);
      const info = playerInfo(record, row, donorTeamNames, donorTeamApparel);
      const list = donorsByPosition.get(info.position) ?? [];
      list.push({ record, ...info, visuals });
      donorsByPosition.set(info.position, list);
    } catch { /* unusable upperclassmen are not donors */ }
  });
  for (const list of donorsByPosition.values()) list.sort((a, b) => b.overall - a.overall || a.row - b.row);

  const changes = [];
  let sleeveCompatibilityCorrections = 0;
  playerRecords.forEach((record, row) => {
    if (!record || record.isEmpty || Boolean(sf(record, "IsNIL")) || !eligiblePlayer(record)) return;
    const teamIndex = Number(sf(record, "TeamIndex"));
    const isFcs = fcsTeamIndexes.has(teamIndex);
    if (!isTrueFreshman(record) || excludedRecipientTeamIndexes.has(teamIndex)) return;
    const target = playerInfo(record, row, teamNames, teamApparel);
    if (isPlaceholder(record)) { skipped.push({ ...target, isFcs, reason: "placeholder row" }); return; }
    let targetVisuals;
    try { targetVisuals = visualsFor(record, visualsTableId, visualsRecords); }
    catch (error) { skipped.push({ ...target, isFcs, reason: error.message }); return; }
    if (referenceCounts.get(targetVisuals.ref.row) !== 1) { skipped.push({ ...target, isFcs, reason: "CharacterVisuals row is shared; skipped to protect other players" }); return; }
    const candidatesFor = positions => positions.flatMap(position => (donorsByPosition.get(position) ?? []).slice(0, top))
      .filter(donor => donor.visuals.loadouts.length === targetVisuals.loadouts.length);
    const baseCandidates = candidatesFor(getBaseDonorPositions(target.position));
    if (!baseCandidates.length) { skipped.push({ ...target, isFcs, reason: "no compatible upperclassman donor in position pool" }); return; }

    const crossPositions = getCrossDonorPositions(target.position);
    const crossCandidates = candidatesFor(crossPositions);
    const ownPositionCandidates = candidatesFor([target.position]);
    const crossEligible = crossPositions.length > 0 && crossCandidates.length > 0 && ownPositionCandidates.length > 0;
    const equipmentMode = rollEquipmentMode(rng, crossEligible, mixedChance, crossMixedChance);
    const crossPositionMixed = equipmentMode === "cross";
    const mixed = equipmentMode !== "full";
    const donorUses = [];
    if (mixed) {
      let groupDonors;
      if (crossPositionMixed) {
        groupDonors = shuffle([choose(ownPositionCandidates, rng), choose(crossCandidates, rng), choose([...baseCandidates, ...crossCandidates], rng)], rng);
      } else groupDonors = [...SLOT_GROUPS].map(() => choose(baseCandidates, rng));
      let groupIndex = 0;
      for (const [group, slots] of SLOT_GROUPS) {
        const donor = groupDonors[groupIndex++];
        donorUses.push({ group, donor: donorSummary(donor) });
        const preserveSlots = donor.bodyType === target.bodyType ? new Set() : BODY_DEPENDENT_SLOTS;
        targetVisuals.loadouts.forEach((loadout, index) => { loadout.loadoutElements = copySlots(loadout.loadoutElements, donor.visuals.loadouts[index].loadoutElements, slots, { preserveSlots }); });
      }
    } else {
      const donor = choose(baseCandidates, rng);
      donorUses.push({ group: "full kit", donor: donorSummary(donor) });
      const preserveSlots = donor.bodyType === target.bodyType ? new Set() : BODY_DEPENDENT_SLOTS;
      targetVisuals.loadouts.forEach((loadout, index) => { loadout.loadoutElements = copySlots(loadout.loadoutElements, donor.visuals.loadouts[index].loadoutElements, null, { preserveSlots }); });
    }
    const brandedAccessoryCandidates = baseCandidates.filter(donor => target.branding && donor.branding === target.branding);
    if (brandedAccessoryCandidates.length) {
      const donor = choose(brandedAccessoryCandidates, rng);
      donorUses.push({ group: "gloves + cleats", donor: donorSummary(donor) });
      targetVisuals.loadouts.forEach((loadout, index) => {
        loadout.loadoutElements = copySlots(loadout.loadoutElements, donor.visuals.loadouts[index].loadoutElements, PROTECTED_BRAND_SLOTS, { allowBrandSlots: true });
      });
    }
    targetVisuals.loadouts.forEach(loadout => {
      sleeveCompatibilityCorrections += finalizeEquipment(loadout.loadoutElements, rng).length;
    });
    const newRawData = JSON.stringify(targetVisuals.parsed);
    if (apply) targetVisuals.visual.RawData = newRawData;
    changes.push({ target, donor: donorUses[0].donor, donorUses, mixed, crossPositionMixed, isFcs, visualsRow: targetVisuals.ref.row, newRawData });
  });
  return { changes, skipped, fcsChanged: changes.filter(change => change.isFcs).length, donorPositions: donorsByPosition.size, sleeveCompatibilityCorrections };
}
