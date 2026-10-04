import { parseRef, sf } from "../openSave.js";
import { brandedEquipmentItems, canGenerateItem, equipmentDisplayName, equipmentItem, isInvalidMouthpieceAsset, recolorEquipmentItem, recolorMouthpieceItem, UNLOCKED_POOLS, RAW_ACCESSORIES_POOLS } from "../catalog.js";
import { enforceArmSleeveCompatibility } from "./compatibility.js";
import { canGenerateEquipment, createGeneratedEquipmentState, enforceGeneratedEquipmentCompatibility, finalGeneratedChanges, recordGeneratedEquipment } from "./generatedCompatibility.js";
import { BRAND_SLOTS, assignCompatibleBrandEquipment, guardBrandEquipment } from "./brandCompatibility.js";
import { buildFacePaintPool, facePaintSource, rollFacePaint } from "./facepaint.js";
export { rollFacePaint } from "./facepaint.js";

export const TRUE_FRESHMAN_REDSHIRT = new Set(["eligible", "current"]);
export const PROTECTED_BRAND_SLOTS = BRAND_SLOTS;
export const BODY_DEPENDENT_SLOTS = new Set(["InnerShirt", "OuterShirt"]);
const PERSONAL_SLOTS = new Set(["CharacterBodyType", "CustomHead", "PlusHead", "Face", "FaceTexture", "Hair", "FacialHair", "Eyebrow", "Eyes", "Ears", "Cheek", "Chin", "Jaw", "Mouth", "Nose", "LeftArmTattoo", "RightArmTattoo", "LeftLegTattoo", "RightLegTattoo", "NeckTattoo"]);
export const MOUTHGUARD_COLOR_WEIGHTS = Object.freeze(["Black", "White", "Primary", "Secondary"]);
export const TEAM_PRIMARY_MOUTHGUARD = "GearMouthpiece_PacifierDualHanging_TeamColor";
export const TEAM_SECONDARY_MOUTHGUARD = "GearMouthpiece_PacifierDualHanging_SecondaryColor";
const BROKEN_HOODIE_ASSET = "Gear_Undershirt_Hoodie";
const HOODIE_ASSET = "Gear_Undershirt_HoodieSleeveless";
const SLOT_GROUPS = new Map([
  ["helmet", new Set(["HeadWear", "FaceMask", "Visor", "MouthWear", "GuardianCap", "FaceWear"])],
  ["upper body + arms", new Set(["OuterShirt", "InnerShirt", "Shoulderpads", "BackPlate", "FlakJacket", "Neckpad", "NeckWear", "LeftArmWear", "RightArmWear", "LeftElbowWear", "RightElbowWear", "LeftWristWear", "RightWristWear"])],
  ["lower body + waist", new Set(["OuterPants", "Towel", "WaistWear", "WaistWearOverride", "InnerPants", "InnerSocks", "KneeWear", "LeftThighWear", "RightThighWear", "LeftKneeBrace", "RightKneeBrace", "LeftCalfWear", "RightCalfWear", "LeftSpat", "RightSpat"])]]
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
  const theme = { Primary: "primary", Secondary: "secondary", Black: "black", White: "white" }[color];
  const recolored = recolorMouthpieceItem(assetName, theme);
  if (equipmentItem(assetName)?.themeColors) return recolored;
  if (recolored !== assetName) return recolored;
  if (color === "Primary") return TEAM_PRIMARY_MOUTHGUARD;
  if (color === "Secondary") return TEAM_SECONDARY_MOUTHGUARD;
  const separator = assetName.lastIndexOf("_");
  return separator < 0 ? assetName : `${assetName.slice(0, separator)}_${color}`;
}

function slotOf(element) {
  return element?.slotType || (/^GearFaceMask/i.test(element?.itemAssetName ?? "") ? "FaceMask" : "");
}

function setSlot(elements, slot, itemAssetName) {
  const existing = elements.find(element => slotOf(element) === slot);
  if (existing) existing.itemAssetName = itemAssetName;
  else elements.push({ slotType: slot, itemAssetName });
}

function setPairedSlot(elements, slots, itemAssetName) {
  for (const slot of slots) setSlot(elements, slot, itemAssetName);
}

function removeSlot(elements, slot) {
  for (let index = elements.length - 1; index >= 0; index--) if (slotOf(elements[index]) === slot) elements.splice(index, 1);
}

const OFFENSIVE_LINE_POSITIONS = new Set(["LT", "LG", "C", "RG", "RT"]);
const DEFENSIVE_POSITIONS = new Set(["LE", "RE", "DT", "EDGE", "LOLB", "MLB", "ROLB", "LB", "CB", "FS", "SS", "SAFETY"]);
const DEFENSIVE_LINE_POSITIONS = new Set(["LE", "RE", "DT", "EDGE"]);

export function noDripChanceForPosition(position, percentages) {
  const value = String(position ?? "").toUpperCase();
  if (["CB", "FS", "SS", "SAFETY", "WR"].includes(value)) return (percentages?.skill ?? 1) / 100;
  if (["HB", "RB", "TE", "QB", "LOLB", "MLB", "ROLB", "LB"].includes(value)) return (percentages?.balanced ?? 3) / 100;
  if (OFFENSIVE_LINE_POSITIONS.has(value) || DEFENSIVE_LINE_POSITIONS.has(value) || ["K", "P", "FB"].includes(value)) return (percentages?.heavy ?? 6) / 100;
  return 0;
}

export function unlockedElbowPoolForPosition(position) {
  const value = String(position ?? "").toUpperCase();
  if (["QB", "K", "P"].includes(value)) return [];
  const items = [...UNLOCKED_POOLS.elbowSweatbands, ...UNLOCKED_POOLS.bicepBands];
  if (OFFENSIVE_LINE_POSITIONS.has(value) || DEFENSIVE_LINE_POSITIONS.has(value)) items.push(...UNLOCKED_POOLS.elbowPadsAndBraces);
  if (DEFENSIVE_POSITIONS.has(value)) items.push(...UNLOCKED_POOLS.shoulderStabilizers);
  return items;
}

function currentSlotItems(loadouts, slots) {
  return [...new Set(loadouts.flatMap(loadout => slots.map(slot => loadout.loadoutElements.find(element => slotOf(element) === slot)?.itemAssetName).filter(Boolean)))];
}

function applyCatalogItem(loadouts, label, item, slots, changes, state) {
  if (!item) return;
  slots ??= item.slots;
  const oldItems = currentSlotItems(loadouts, slots);
  for (const loadout of loadouts) setPairedSlot(loadout.loadoutElements, slots, item.itemName);
  recordGeneratedEquipment(state, slots, item.itemName);
  if (oldItems.length !== 1 || oldItems[0] !== item.itemName) changes.push({ category: label, slots, oldItems, newItem: item.itemName, displayName: equipmentDisplayName(item.itemName) });
}

export function applyAsymmetricElbowGear(loadouts, pool, rng, changes, state, position) {
  if (!pool.length) return;
  let left;
  for (const side of ["Left", "Right"]) {
    const slot = `${side}ElbowWear`;
    const available = pool.filter(item => canGenerateEquipment(loadouts, item, [slot], position));
    if (!available.length) continue;
    let chosen = choose(available, rng);
    const bandTypes = ["bicep-band", "sweatband"];
    if (side === "Right" && bandTypes.includes(left?.semantic.actualType) && bandTypes.includes(chosen.semantic.actualType)) {
      const color = left.semantic.colors[0], coordinated = equipmentItem(recolorEquipmentItem(chosen.itemName, color));
      // Never invent a variant or fall back to independently colored bands.
      chosen = bandTypes.includes(coordinated?.semantic.actualType) && coordinated.semantic.colors[0] === color ? coordinated : left;
    }
    if (side === "Left") left = chosen;
    applyCatalogItem(loadouts, `${side} elbow wear`, chosen, [slot], changes, state);
  }
}

export function applyUnlockedRandomizerEquipment(loadouts, target, rng, perCategoryChance = 0.10, state = createGeneratedEquipmentState(loadouts)) {
  const changes = [];
  const rollItem = (label, pool, slots) => {
    pool = pool.filter(item => canGenerateEquipment(loadouts, item, slots ?? item.slots, target.position));
    if (!pool.length || rng() >= perCategoryChance) return;
    applyCatalogItem(loadouts, label, choose(pool, rng), slots, changes, state);
  };
  if (UNLOCKED_POOLS.armSleeves.length && rng() < perCategoryChance) {
    const left = choose(UNLOCKED_POOLS.armSleeves, rng);
    const right = /^GearArmSleeve_Baggy_/i.test(left.itemName) ? left : choose(UNLOCKED_POOLS.armSleeves, rng);
    const paired = [left, right].find(item => /^GearArmSleeve_Baggy_/i.test(item.itemName));
    if (paired) applyCatalogItem(loadouts, "Arm sleeves", paired, ["LeftArmWear", "RightArmWear"], changes, state);
    else {
      applyCatalogItem(loadouts, "Left arm sleeve", left, ["LeftArmWear"], changes, state);
      applyCatalogItem(loadouts, "Right arm sleeve", right, ["RightArmWear"], changes, state);
    }
  }
  const elbowPool = unlockedElbowPoolForPosition(target.position);
  if (elbowPool.length && rng() < perCategoryChance) applyAsymmetricElbowGear(loadouts, elbowPool, rng, changes, state, target.position);
  rollItem("Cleats", brandedEquipmentItems("Cleats", target.branding).filter(canGenerateItem), ["LeftShoe", "RightShoe"]);
  const brandedGloves = brandedEquipmentItems("Gloves", target.branding).filter(item => /^GearHand_(?!None)/i.test(item.itemName));
  const teamColorGloves = brandedGloves.filter(item => /_(?:TeamColor|SecondaryColor)$/i.test(item.itemName));
  rollItem("Gloves", teamColorGloves.length ? teamColorGloves : brandedGloves, ["LeftHandWear", "RightHandWear"]);
  rollItem("Mouthpiece", UNLOCKED_POOLS.unlockedMouthpieces, ["MouthWear"]);
  rollItem("Neckwear", UNLOCKED_POOLS.neckwear, null);
  rollItem("Leg sleeve", UNLOCKED_POOLS.legSleeves, ["InnerPants"]);
  rollItem("Balaclava", UNLOCKED_POOLS.balaclavas, ["FaceWear"]);
  rollItem("Thigh pads", UNLOCKED_POOLS.thighPads, ["LeftThighWear", "RightThighWear"]);
  rollItem("Towel", UNLOCKED_POOLS.towels, ["Towel"]);
  return changes;
}

export function applyRawRandomizerEquipment(loadouts, rng, perCategoryChance = 0.10, state = createGeneratedEquipmentState(loadouts), position = "") {
  const changes = [];
  const neckwear = RAW_ACCESSORIES_POOLS.neckwear.filter(item => canGenerateEquipment(loadouts, item, item.slots, position));
  if (neckwear.length && rng() < perCategoryChance) {
    applyCatalogItem(loadouts, "Neckwear", choose(neckwear, rng), null, changes, state);
  }
  const caps = RAW_ACCESSORIES_POOLS.skullcaps.filter(item => canGenerateEquipment(loadouts, item, ["GuardianCap"], position));
  if (caps.length && rng() < perCategoryChance) {
    applyCatalogItem(loadouts, "Skullcap", choose(caps, rng), ["GuardianCap"], changes, state);
  }
  return changes;
}

export function applyNoDripEquipment(loadouts, position) {
  const changes = [];
  const replace = (label, slots, itemName, preserve = () => false) => {
    const oldItems = currentSlotItems(loadouts, slots).filter(item => !preserve(item));
    if (!oldItems.length) return;
    for (const loadout of loadouts) for (const slot of slots) {
      const current = loadout.loadoutElements.find(element => slotOf(element) === slot)?.itemAssetName;
      if (!preserve(current)) setSlot(loadout.loadoutElements, slot, itemName);
    }
    changes.push({ category: label, oldItems, newItem: itemName, displayName: equipmentDisplayName(itemName) });
  };
  replace("Arm sleeves", ["LeftArmWear", "RightArmWear"], "ArmSleeve_None", item => !item || /(?:^|_)None$/i.test(item));
  replace("Elbow wear", ["LeftElbowWear", "RightElbowWear"], "ElbowGear_None", item => !item || /(?:^|_)None$/i.test(item));
  replace("Gloves", ["LeftHandWear", "RightHandWear"], "GearHand_None", item => !item || /(?:^|_)None$/i.test(item) || /^GearHand_taped/i.test(item));
  replace("Towel", ["Towel"], "Towel_None", item => !item || /(?:^|_)None$/i.test(item));
  replace("Neckwear", ["Neckpad"], "GearNeckpad_None", item => !item || /(?:^|_)None$/i.test(item));
  replace("Turtleneck", ["NeckWear"], "NeckWear_None", item => !item || /(?:^|_)None$/i.test(item));
  replace("Balaclava", ["FaceWear"], "FaceGear_None", item => !item || /(?:^|_)None$/i.test(item) || !/Balaclava/i.test(item));
  replace("Socks", ["InnerSocks"], "Gear_Socks_Low", item => item === "Gear_Socks_Low");
  const legItems = currentSlotItems(loadouts, ["InnerPants"]);
  if (legItems.some(item => /^GearLegsBase_(?:Left|Right)Sleeve|^GearLegBase_Socks_Under_(?:Both|NFL)_/i.test(item))) {
    for (const loadout of loadouts) removeSlot(loadout.loadoutElements, "InnerPants");
    changes.push({ category: "Leg sleeves", oldItems: legItems, newItem: "None", displayName: "None" });
  }
  return { position: String(position ?? ""), changes };
}

function finalizeEquipment(elements, rng, facePaintPool, position, usingUnlockedMod = false) {
  for (const element of elements) {
    if (slotOf(element) === "InnerShirt" && element.itemAssetName === BROKEN_HOODIE_ASSET) {
      element.itemAssetName = HOODIE_ASSET;
    }
    if (slotOf(element) !== "MouthWear" || typeof element.itemAssetName !== "string" || /(?:^|_)none$/i.test(element.itemAssetName)) continue;
    element.itemAssetName = normalizeMouthpieceColor(element.itemAssetName, MOUTHGUARD_COLOR_WEIGHTS[Math.floor(rng() * MOUTHGUARD_COLOR_WEIGHTS.length)]);
  }
  setSlot(elements, "FacePaint", rollFacePaint(rng, facePaintPool, position));
  return enforceArmSleeveCompatibility(elements, { usingUnlockedMod });
}

function playerOnFieldLoadouts(rawData) {
  const parsed = JSON.parse(rawData);
  if (!Array.isArray(parsed?.loadouts)) throw new Error("visuals JSON has no loadouts array");
  const loadouts = parsed.loadouts.filter(loadout => loadout?.loadoutType === "PlayerOnField");
  if (!loadouts.length || loadouts.some(loadout => !Array.isArray(loadout.loadoutElements))) throw new Error("visuals JSON has no valid PlayerOnField equipment loadout");
  return { parsed, loadouts };
}

function playerInfo(record, row, teamNames, teamApparel = new Map(), playerApparel = new Map()) {
  const teamIndex = Number(sf(record, "TeamIndex"));
  const branding = playerApparel.has(row) ? playerApparel.get(row) : teamApparel.get(teamIndex);
  return { row, teamIndex, branding: String(branding ?? "").trim().toLowerCase(), bodyType: String(sf(record, "CharacterBodyType") ?? "").trim().toLowerCase(), firstName: String(sf(record, "FirstName") ?? "").trim(), lastName: String(sf(record, "LastName") ?? "").trim(), team: teamNames.get(teamIndex) ?? `Team ${sf(record, "TeamIndex") ?? "?"}`, position: String(sf(record, "Position") ?? "Unknown"), classYear: String(sf(record, "SchoolYear") ?? "Unknown"), redshirtStatus: String(sf(record, "RedshirtStatus") ?? ""), jersey: sf(record, "JerseyNum") ?? sf(record, "JerseyNumber") ?? "?", overall: Number(sf(record, "OverallRating") ?? 0) };
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

export function collectEquipmentDonors(playerRecords, visualsRecords, visualsTableId, { rosterRows = null, fcsTeamIndexes = new Set(), teamNames = new Map(), teamApparel = new Map(), playerApparel = new Map() } = {}) {
  const donors = [];
  playerRecords.forEach((record, row) => {
    if (!record || record.isEmpty || isPlaceholder(record) || (rosterRows && !rosterRows.has(row))) return;
    if (fcsTeamIndexes.has(Number(sf(record, "TeamIndex")))) return;
    if (!["sophomore", "junior", "senior"].includes(String(sf(record, "SchoolYear") ?? "").toLowerCase())) return;
    try { donors.push({ record, ...playerInfo(record, row, teamNames, teamApparel, playerApparel), visuals: visualsFor(record, visualsTableId, visualsRecords) }); }
    catch { /* Preserve the existing exclusion of unusable donor visuals. */ }
  });
  return donors;
}

function copySlots(targetElements, donorElements, allowedSlots = null, { allowBrandSlots = false, preserveSlots = new Set() } = {}) {
  const donorHasPants = donorElements.some(element => slotOf(element) === "OuterPants");
  const donorHasInvalidMouthpiece = donorElements.some(element => slotOf(element) === "MouthWear" && isInvalidMouthpieceAsset(element.itemAssetName));
  const mustPreserve = slot => preserveSlots.has(slot) || (!allowBrandSlots && PROTECTED_BRAND_SLOTS.has(slot)) || PERSONAL_SLOTS.has(slot) || (slot === "OuterPants" && !donorHasPants) || (slot === "MouthWear" && donorHasInvalidMouthpiece);
  const preserved = targetElements.filter(element => mustPreserve(slotOf(element)));
  const copied = donorElements.filter(element => {
    const slot = slotOf(element);
    return !mustPreserve(slot) && slot !== "FacePaint" && (!allowedSlots || allowedSlots.has(slot));
  }).map(element => structuredClone(element));
  if (!allowedSlots) return [...copied, ...preserved.map(element => structuredClone(element))];
  const allowed = allowedSlots;
  return [...targetElements.filter(element => !allowed.has(slotOf(element)) || mustPreserve(slotOf(element))).map(element => structuredClone(element)), ...copied];
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
  const { teamNames = new Map(), teamApparel = new Map(), donorPlayerRecords = playerRecords, donorVisualRecords = visualsRecords, donorVisualsTableId = visualsTableId, donorTeamNames = teamNames, donorTeamApparel = teamApparel, recipientRosterRows = null, donorRosterRows = null, fcsTeamIndexes = new Set(), excludedRecipientTeamIndexes = new Set(), eligiblePlayer = isTrueFreshman, top = 125, mixedChance = 0.30, crossMixedChance = 0.10, forceCrossPosition = false, usingUnlockedMod = false, noDripProfile = false, skipNilPlayers = true, unlockedItemChance = 0.10, seed = 1, apply = false } = options;
  const disableCrossPosition = options.disableCrossPosition === true;
  if (disableCrossPosition && forceCrossPosition) throw new Error("Disable cross-position mixing and forced mixing cannot both be enabled.");
  const selectedRows = options.donorRows === undefined ? null : new Set(options.donorRows);
  const playerApparel = options.playerApparel ?? new Map(), donorPlayerApparel = options.donorPlayerApparel ?? (donorPlayerRecords === playerRecords ? playerApparel : new Map());
  if (selectedRows && (!selectedRows.size || [...selectedRows].some(row => !Number.isInteger(row) || row < 0))) throw new Error("Select at least one eligible donor player.");
  const donorLimit = selectedRows ? Infinity : top;
  const rng = mulberry32(seed);
  const donorsByPosition = new Map();
  const skipped = [];
  const referenceCounts = new Map();
  for (const [row, record] of playerRecords.entries()) {
    if (!record || record.isEmpty) continue;
    if (recipientRosterRows && !recipientRosterRows.has(row)) continue;
    const ref = parseRef(sf(record, "CharacterVisuals"));
    if (ref?.tableId === visualsTableId) referenceCounts.set(ref.row, (referenceCounts.get(ref.row) ?? 0) + 1);
  }

  const availableDonors = collectEquipmentDonors(donorPlayerRecords, donorVisualRecords, donorVisualsTableId, { rosterRows: donorRosterRows, fcsTeamIndexes, teamNames: donorTeamNames, teamApparel: donorTeamApparel, playerApparel: donorPlayerApparel });
  if (selectedRows && [...selectedRows].some(row => !availableDonors.some(donor => donor.row === row))) throw new Error("A selected donor is no longer eligible in this save. Choose donors again.");
  for (const donor of availableDonors) {
    if (selectedRows && !selectedRows.has(donor.row)) continue;
    const list = donorsByPosition.get(donor.position) ?? [];
    list.push(donor); donorsByPosition.set(donor.position, list);
  }
  for (const list of donorsByPosition.values()) list.sort((a, b) => b.overall - a.overall || a.row - b.row);
  const facePaintPool = buildFacePaintPool([...donorsByPosition.values()].flatMap(list => list.slice(0, donorLimit)), options);
  const protectedDonorRecords = donorPlayerRecords === playerRecords
    ? new Set([...donorsByPosition.values()].flatMap(list => list.slice(0, donorLimit).map(donor => donor.record)))
    : new Set();

  const changes = [];
  let sleeveCompatibilityCorrections = 0;
  playerRecords.forEach((record, row) => {
    if (!record || record.isEmpty || (skipNilPlayers && Boolean(sf(record, "IsNIL"))) || !eligiblePlayer(record)) return;
    if (recipientRosterRows && !recipientRosterRows.has(row)) return;
    const teamIndex = Number(sf(record, "TeamIndex"));
    const isFcs = fcsTeamIndexes.has(teamIndex);
    if (excludedRecipientTeamIndexes.has(teamIndex)) return;
    const target = playerInfo(record, row, teamNames, teamApparel, playerApparel);
    if (isPlaceholder(record)) { skipped.push({ ...target, isFcs, reason: "placeholder row" }); return; }
    if (protectedDonorRecords.has(record)) { skipped.push({ ...target, isFcs, reason: selectedRows ? "selected donor pool; original equipment preserved" : `top-${top} donor pool; original equipment preserved` }); return; }
    let targetVisuals;
    try { targetVisuals = visualsFor(record, visualsTableId, visualsRecords); }
    catch (error) { skipped.push({ ...target, isFcs, reason: error.message }); return; }
    if (referenceCounts.get(targetVisuals.ref.row) !== 1) { skipped.push({ ...target, isFcs, reason: "CharacterVisuals row is shared; skipped to protect other players" }); return; }
    const originalLoadouts = structuredClone(targetVisuals.loadouts);
    const candidatesFor = positions => positions.flatMap(position => (donorsByPosition.get(position) ?? []).slice(0, donorLimit))
      .filter(donor => donor.record !== record && donor.visuals.loadouts.length === targetVisuals.loadouts.length);
    const crossPositions = disableCrossPosition ? [] : getCrossDonorPositions(target.position);
    const crossCandidates = candidatesFor(crossPositions);
    const baseCandidates = candidatesFor(disableCrossPosition ? [target.position] : getBaseDonorPositions(target.position));
    if (!baseCandidates.length && !(forceCrossPosition && crossCandidates.length)) { skipped.push({ ...target, isFcs, reason: "no compatible upperclassman donor in position pool" }); return; }
    const ownPositionCandidates = candidatesFor([target.position]);
    const crossEligible = crossPositions.length > 0 && crossCandidates.length > 0 && (forceCrossPosition || ownPositionCandidates.length > 0);
    const equipmentMode = forceCrossPosition && crossEligible ? "cross" : rollEquipmentMode(rng, crossEligible, mixedChance, crossMixedChance);
    const crossPositionMixed = equipmentMode === "cross";
    const mixed = equipmentMode !== "full";
    const donorUses = [];
    const usedDonors = [];
    if (mixed) {
      let groupDonors;
      if (crossPositionMixed) {
        groupDonors = forceCrossPosition
          ? [...SLOT_GROUPS].map(() => choose(crossCandidates, rng))
          : shuffle([choose(ownPositionCandidates, rng), choose(crossCandidates, rng), choose([...baseCandidates, ...crossCandidates], rng)], rng);
      } else groupDonors = [...SLOT_GROUPS].map(() => choose(baseCandidates, rng));
      let groupIndex = 0;
      for (const [group, slots] of SLOT_GROUPS) {
        const donor = groupDonors[groupIndex++];
        usedDonors.push(donor);
        donorUses.push({ group, donor: donorSummary(donor) });
        const preserveSlots = donor.bodyType === target.bodyType ? new Set() : BODY_DEPENDENT_SLOTS;
        targetVisuals.loadouts.forEach((loadout, index) => { loadout.loadoutElements = copySlots(loadout.loadoutElements, donor.visuals.loadouts[index].loadoutElements, slots, { preserveSlots }); });
      }
    } else {
      const donor = choose(baseCandidates, rng);
      usedDonors.push(donor);
      donorUses.push({ group: "full kit", donor: donorSummary(donor) });
      const preserveSlots = donor.bodyType === target.bodyType ? new Set() : BODY_DEPENDENT_SLOTS;
      targetVisuals.loadouts.forEach((loadout, index) => { loadout.loadoutElements = copySlots(loadout.loadoutElements, donor.visuals.loadouts[index].loadoutElements, null, { preserveSlots }); });
    }
    const brandCandidates = forceCrossPosition && crossEligible ? crossCandidates : crossPositionMixed ? [...baseCandidates, ...crossCandidates] : baseCandidates;
    const branded = assignCompatibleBrandEquipment(targetVisuals.loadouts, target, brandCandidates, usedDonors, rng);
    donorUses.push(...branded.donorUses.map(use => ({ group: use.group, donor: donorSummary(use.donor) })));
    targetVisuals.loadouts.forEach(loadout => {
      sleeveCompatibilityCorrections += finalizeEquipment(loadout.loadoutElements, rng, facePaintPool.options, target.position, usingUnlockedMod).length;
    });
    const generated = usingUnlockedMod || options.usingRawAccessoriesMod ? createGeneratedEquipmentState(targetVisuals.loadouts) : null;
    let unlockedChanges = usingUnlockedMod ? applyUnlockedRandomizerEquipment(targetVisuals.loadouts, target, rng, unlockedItemChance, generated) : [];
    let rawChanges = options.usingRawAccessoriesMod ? applyRawRandomizerEquipment(targetVisuals.loadouts, rng, unlockedItemChance, generated, target.position) : [];
    const noDrip = noDripProfile && rng() < noDripChanceForPosition(target.position, options.noDripPercentages);
    const noDripChanges = noDrip ? applyNoDripEquipment(targetVisuals.loadouts, target.position).changes : [];
    const brandCorrections = guardBrandEquipment(targetVisuals.loadouts, target, originalLoadouts);
    const facePaint = targetVisuals.loadouts.map((loadout, index) => { const asset = loadout.loadoutElements.find(element => slotOf(element) === "FacePaint")?.itemAssetName; return { loadout: index, asset, source: facePaintSource(asset, facePaintPool.diagnostics) }; });
    targetVisuals.loadouts.forEach(loadout => { sleeveCompatibilityCorrections += enforceArmSleeveCompatibility(loadout.loadoutElements, { usingUnlockedMod }).length; });
    const generatedCorrections = enforceGeneratedEquipmentCompatibility(targetVisuals.loadouts, generated, target.position);
    sleeveCompatibilityCorrections += generatedCorrections.length;
    unlockedChanges = finalGeneratedChanges(targetVisuals.loadouts, unlockedChanges);
    rawChanges = finalGeneratedChanges(targetVisuals.loadouts, rawChanges);
    const newRawData = JSON.stringify(targetVisuals.parsed);
    if (apply) targetVisuals.visual.RawData = newRawData;
    changes.push({ target, donor: donorUses[0].donor, donorUses, mixed, crossPositionMixed, isFcs, visualsRow: targetVisuals.ref.row, newRawData, brandAssignments: branded.audits, brandCorrections, facePaint, ...(generatedCorrections.length ? { generatedCorrections } : {}), ...(usingUnlockedMod ? { unlockedChanges } : {}), ...(options.usingRawAccessoriesMod ? { rawChanges } : {}), ...(noDripProfile ? { noDrip, noDripChanges } : {}) });
  });
  return { changes, skipped, facePaintPools: facePaintPool.diagnostics, brandCorrections: changes.reduce((sum, change) => sum + change.brandCorrections.length, 0), fcsChanged: changes.filter(change => change.isFcs).length, donorPositions: donorsByPosition.size, sleeveCompatibilityCorrections, ...(usingUnlockedMod ? { unlockedPlayersChanged: changes.filter(change => change.unlockedChanges.length).length } : {}), ...(options.usingRawAccessoriesMod ? { rawPlayersChanged: changes.filter(change => change.rawChanges.length).length } : {}), ...(noDripProfile ? { noDripPlayers: changes.filter(change => change.noDrip).length } : {}) };
}
