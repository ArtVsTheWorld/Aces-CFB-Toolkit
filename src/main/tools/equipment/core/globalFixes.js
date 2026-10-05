import { parseRef, sf } from "../openSave.js";
import { EQUIPMENT_COLOR_THEMES, equipmentDisplayName, isInvalidMouthpieceAsset, mouthpieceColorVariants, UNLOCKED_POOLS } from "../catalog.js";
import { normalizeAccessoryColorWeights, normalizeTeamTapeColors, recolorPlayerAccessories, rollAccessoryColorTheme, teamTapeWeights } from "./recolor.js";
import { mulberry32 } from "./patcher.js";
import { enforceArmSleeveCompatibility, equippedMask } from "./compatibility.js";
import { applyUnlockedTattooPlan, buildUnlockedTattooPopulationPlan, repairUnlockedTattooLoadout, UNLOCKED_TATTOO_ELIGIBLE_POSITIONS } from "./tattoos.js";
import { buildHelmetBalancePlan, canUseVicis, helmetFamily, VICIS_HELMET } from "./helmetBalance.js";
import { effectiveHelmetWeights, facemaskFitsHelmet, helmetAllowed, helmetAllowedInMix, helmetModel, normalizeHelmetDistribution, rollCompatibleFacemask, rollCustomHelmet } from "./helmets.js";
import { POSITION_GROUPS, UNDERSHIRT_ASSETS, normalizeUndershirtWeights, normalizeVisorFrequencies, positionGroup } from "./passSettings.js";
import { normalizeFacemaskPools } from "./helmets.js";
import { correctBearsPadsSleeves, removeHandwarmers } from "./targetedCorrections.js";

export const APPROVED_SKILL_HELMETS = ["GearHelmet_Axiom", "GearHelmet_SchuttF7", "GearHelmet_SchuttF7Pro", "GearHelmet_Speed_Flex"];
const APPROVED_HELMET_SET = new Set(APPROVED_SKILL_HELMETS);
const OFFENSIVE_LINE_POSITIONS = new Set(["LT", "LG", "C", "RG", "RT"]);
const VISOR_POSITIONS = new Set(["WR", "CB", "FS", "SS", "LOLB", "MLB", "ROLB", "LB", "TE", "HB", "RB", "LE", "RE", "DT", "EDGE"]);
export const OAKLEY_CLEAR_VISOR = "GearVisor_visorOakley_clear";
export const OAKLEY_VISOR_REPLACEMENTS = Object.freeze({ GearVisor_visorClear: OAKLEY_CLEAR_VISOR, GearVisor_visorClearReflective: "GearVisor_visorOakley_clearreflective", GearVisor_visorDark: "GearVisor_visorOakley_Dark", GearVisor_visorDarkLight: "GearVisor_visorOakley_DarkLight" });
export function visorChanceForPosition(position) { const value=String(position??"").toUpperCase(); if(value==="QB"||["LE","RE","DT","EDGE"].includes(value))return 0.20; if(["WR","CB"].includes(value))return 0.60; return VISOR_POSITIONS.has(value)?0.40:0; }
const BROKEN_HOODIE_ASSET = "Gear_Undershirt_Hoodie";
const HOODIE_ASSET = "Gear_Undershirt_HoodieSleeveless";
const ROLLED_JERSEY_UNDERSHIRTS = [
  [HOODIE_ASSET, 5],
  ["Gear_Undershirt_CompressionTCrewSleeveless_Secondary", 30],
  ["Gear_Undershirt_CompressionTCrewSleeveless", 25],
  ["Gear_Undershirt_CompressionTCrewSleeveless_White", 35],
  ["Gear_Undershirt_CompressionTCrewSleeveless_Black", 5]
];
const LARGE_BODY_ROLLED_JERSEY_UNDERSHIRTS = [
  [HOODIE_ASSET, 5],
  ["Gear_Undershirt_CompressionTCrewSleeveless_Secondary", 30],
  ["Gear_Undershirt_CompressionTCrewSleeveless", 25],
  ["Gear_Undershirt_CompressionTCrewSleeveless_White", 30],
  ["Gear_Undershirt_CompressionTCrewSleeveless_Black", 5],
  ["Undershirt_None", 5]
];
export const UNDERSHIRT_DISTRIBUTION_LABEL = "Most players: hoodie 5%, team secondary 30%, team primary 25%, white 35%, black 5%. Muscular/standard builds: hoodie 5%, team secondary 30%, team primary 25%, white 30%, black 5%, no undershirt 5%.";
const LARGE_BODY_TYPES = new Set(["muscular", "standard"]);
const SOCK_STYLE_MIX = [
  ["Gear_Socks_Low", 85],
  ["Gear_Socks_High", 14],
  ["Gear_Socks_Under", 1]
];
export const SOCK_DISTRIBUTION_LABEL = "Mid socks become low socks 85%, high socks 14%, or under socks 1%. Mid socks are retained when spats are worn on both feet.";
export const HELMET_FAMILY_DISTRIBUTION_LABEL = "Replacement helmets use SpeedFlex 70%, Axiom 10%, Schutt F7 10%, and Schutt F7 Pro 10%.";
export const UNDERSHIRT_COLOR_MODES = Object.freeze({
  primary: "Gear_Undershirt_CompressionTCrewSleeveless",
  secondary: "Gear_Undershirt_CompressionTCrewSleeveless_Secondary",
  white: "Gear_Undershirt_CompressionTCrewSleeveless_White",
  black: "Gear_Undershirt_CompressionTCrewSleeveless_Black"
});

const MASKS = {
  GearHelmet_VicisZero2: {
    qb: [["GearFaceMask_VicisZero2BAR", 65], ["GearFaceMask_VicisZero2Robot", 25], ["GearFaceMask_VicisZero2_Robot808", 10]],
    skill: [["GearFaceMask_VicisZero2BAR", 40], ["GearFaceMask_VicisZero23BARRB", 25], ["GearFaceMask_VicisZero2Robot", 20], ["GearFaceMask_VicisZero2_RobotJagged", 15]],
    lb: [["GearFaceMask_VicisZero23BARLB", 35], ["GearFaceMask_VicisZero2RobotLB", 30], ["GearFaceMask_VicisZero2_Robot808", 20], ["GearFaceMask_VicisZero2_RobotJagged", 15]]
  },
  GearHelmet_Axiom: {
    qb: [["GearFaceMask_Axiom2barsingle", 18], ["GearFaceMask_Axiom2BarJagged", 7], ["GearFaceMask_Axiom3BarSingle", 5], ["GearFaceMask_AxiomRobotStraight", 22], ["GearFaceMask_AxiomRobotRBStraight", 18], ["GearFaceMask_AxiomRobotJagged", 14], ["GearFaceMask_AxiomRobotRBJagged", 11], ["GearFaceMask_AxiomRobot808", 5]],
    skill: [["GearFaceMask_Axiom2barsingle", 15], ["GearFaceMask_Axiom2BarJagged", 6], ["GearFaceMask_Axiom3BarSingle", 4], ["GearFaceMask_AxiomRobotStraight", 20], ["GearFaceMask_AxiomRobotRBStraight", 20], ["GearFaceMask_AxiomRobotJagged", 15], ["GearFaceMask_AxiomRobotRBJagged", 15], ["GearFaceMask_AxiomRobot808", 5]],
    lb: [["GearFaceMask_Axiom2barsingle", 10], ["GearFaceMask_Axiom2BarJagged", 5], ["GearFaceMask_Axiom3BarLBSingle", 7], ["GearFaceMask_Axiom3BarLBJagged", 3], ["GearFaceMask_AxiomRobotStraight", 15], ["GearFaceMask_AxiomRobotRBStraight", 20], ["GearFaceMask_AxiomRobotJagged", 15], ["GearFaceMask_AxiomRobotRBJagged", 20], ["GearFaceMask_AxiomRobot808", 5]]
  },
  GearHelmet_SchuttF7: {
    qb: [["GearFaceMask_F72Bar", 50], ["GearFaceMask_F72BarJagged", 10], ["GearFaceMask_F73Bar", 5], ["GearFaceMask_F7Robot", 8], ["GearFaceMask_F7Robot808", 4], ["GearFaceMask_F7RobotJagged", 6], ["GearFaceMask_F7RobotJagged2", 4], ["GearFaceMask_F7RobotJagged3", 3], ["GearFaceMask_F7RobotRB", 5], ["GearFaceMask_F7RobotRB2", 5]],
    skill: [["GearFaceMask_F72Bar", 40], ["GearFaceMask_F72BarJagged", 10], ["GearFaceMask_F73BarRB", 10], ["GearFaceMask_F7Robot", 8], ["GearFaceMask_F7Robot808", 4], ["GearFaceMask_F7RobotJagged", 7], ["GearFaceMask_F7RobotJagged2", 5], ["GearFaceMask_F7RobotJagged3", 4], ["GearFaceMask_F7RobotRB", 6], ["GearFaceMask_F7RobotRB2", 6]],
    lb: [["GearFaceMask_F72Bar", 30], ["GearFaceMask_F72BarJagged", 10], ["GearFaceMask_F73Bar", 10], ["GearFaceMask_F73BarRB", 10], ["GearFaceMask_F7Robot", 7], ["GearFaceMask_F7Robot808", 4], ["GearFaceMask_F7RobotJagged", 7], ["GearFaceMask_F7RobotJagged2", 5], ["GearFaceMask_F7RobotJagged3", 4], ["GearFaceMask_F7RobotRB", 7], ["GearFaceMask_F7RobotRB2", 6]]
  },
  GearHelmet_SchuttF7Pro: {
    qb: [["GearFaceMask_F7Pro2Bar", 60], ["GearFaceMask_F7Pro3BarRB", 10], ["GearFaceMask_F7ProRobot", 10], ["GearFaceMask_F7ProRobotJagged", 7], ["GearFaceMask_F7ProRobotJagged2", 5], ["GearFaceMask_F7ProRobotJagged3", 3], ["GearFaceMask_F7ProRobotRB", 5]],
    skill: [["GearFaceMask_F7Pro2Bar", 50], ["GearFaceMask_F7Pro3BarRB", 10], ["GearFaceMask_F7Pro3BarLB", 5], ["GearFaceMask_F7ProRobot", 10], ["GearFaceMask_F7ProRobotJagged", 8], ["GearFaceMask_F7ProRobotJagged2", 6], ["GearFaceMask_F7ProRobotJagged3", 4], ["GearFaceMask_F7ProRobotRB", 7]],
    lb: [["GearFaceMask_F7Pro2Bar", 35], ["GearFaceMask_F7Pro3BarLB", 15], ["GearFaceMask_F7Pro3BarRB", 10], ["GearFaceMask_F7ProRobot", 10], ["GearFaceMask_F7ProRobotJagged", 9], ["GearFaceMask_F7ProRobotJagged2", 7], ["GearFaceMask_F7ProRobotJagged3", 5], ["GearFaceMask_F7ProRobotRB", 9]]
  },
  GearHelmet_Speed_Flex: {
    qb: [["GearFaceMask_Speedflex2BarQB", 50], ["GearFaceMask_Speedflex2Bar", 12], ["GearFaceMask_Speedflex2Bar_WR", 8], ["GearFaceMask_SpeedflexRobot", 8], ["GearFaceMask_SpeedflexRobot808", 5], ["GearFaceMask_SpeedflexRobot808Jagged", 4], ["GearFaceMask_SpeedflexRobotJagged", 7], ["GearFaceMask_SpeedflexRobotRB", 3], ["GearFaceMask_SpeedflexRobotRBJagged", 3]],
    skill: [["GearFaceMask_Speedflex2Bar_WR", 38], ["GearFaceMask_Speedflex2Bar", 17], ["GearFaceMask_Speedflex3BarRB", 8], ["GearFaceMask_Speedflex3BarRBJagged", 7], ["GearFaceMask_SpeedflexRobot", 7], ["GearFaceMask_SpeedflexRobot808", 4], ["GearFaceMask_SpeedflexRobot808Jagged", 4], ["GearFaceMask_SpeedflexRobotJagged", 6], ["GearFaceMask_SpeedflexRobotRB", 5], ["GearFaceMask_SpeedflexRobotRBJagged", 4]],
    lb: [["GearFaceMask_Speedflex2Bar", 30], ["GearFaceMask_Speedflex3BarLB", 15], ["GearFaceMask_Speedflex3Bar", 8], ["GearFaceMask_Speedflex3BarRBJagged", 7], ["GearFaceMask_SpeedflexRobot", 7], ["GearFaceMask_SpeedflexRobot808", 4], ["GearFaceMask_SpeedflexRobot808Jagged", 5], ["GearFaceMask_SpeedflexRobotJagged", 7], ["GearFaceMask_SpeedflexRobotRB", 9], ["GearFaceMask_SpeedflexRobotRBJagged", 8]]
  }
};

function slotOf(element) {
  return element?.slotType || (/^GearFaceMask/i.test(element?.itemAssetName ?? "") ? "FaceMask" : "");
}

function setSlot(elements, slot, itemAssetName) {
  const existing = elements.find(element => slotOf(element) === slot);
  if (existing) {
    existing.itemAssetName = itemAssetName;
    if (!existing.slotType && slot === "FaceMask") existing.slotType = "FaceMask";
  } else elements.push({ slotType: slot, itemAssetName });
}

function weightedChoice(options, rng) {
  let roll = rng() * options.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [value, weight] of options) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return options.at(-1)[0];
}

export function rollApprovedHelmet(rng, allowVicis = false, position = "") {
  const roll = rng();
  if (allowVicis) {
    const weight = canUseVicis(position) ? 100 : 97;
    if (roll < 68 / weight) return "GearHelmet_Speed_Flex";
    if (roll < 75.5 / weight) return "GearHelmet_SchuttF7";
    if (roll < 83 / weight) return "GearHelmet_SchuttF7Pro";
    if (roll < 97 / weight) return "GearHelmet_Axiom";
    return VICIS_HELMET;
  }
  if (roll < 0.70) return "GearHelmet_Speed_Flex";
  if (roll < 0.80) return "GearHelmet_Axiom";
  if (roll < 0.90) return "GearHelmet_SchuttF7";
  return "GearHelmet_SchuttF7Pro";
}

export function rollFacemask(helmet, position, rng) {
  const group = position === "QB" ? "qb" : /^(?:LOLB|MLB|ROLB|LB)$/.test(position) ? "lb" : "skill";
  return weightedChoice(MASKS[helmet][group], rng);
}

export function rollRolledJerseyUndershirt(rng, colorMode = "weighted", bodyType = "", customWeights) {
  if (!["weighted", "custom"].includes(colorMode)) {
    const selected = UNDERSHIRT_COLOR_MODES[colorMode];
    if (!selected) throw new Error(`Unknown undershirt color mode: ${colorMode}`);
    return selected;
  }
  if (colorMode === "custom") {
    const mix = normalizeUndershirtWeights(customWeights)[LARGE_BODY_TYPES.has(String(bodyType).trim().toLowerCase()) ? "large" : "regular"];
    return weightedChoice(Object.entries(mix).map(([key, value]) => [UNDERSHIRT_ASSETS[key], value]), rng);
  }
  return weightedChoice(
    LARGE_BODY_TYPES.has(String(bodyType).trim().toLowerCase())
      ? LARGE_BODY_ROLLED_JERSEY_UNDERSHIRTS
      : ROLLED_JERSEY_UNDERSHIRTS,
    rng
  );
}

export function rollSockStyle(rng) {
  return weightedChoice(SOCK_STYLE_MIX, rng);
}

function hasSpatsOnBothFeet(elements) {
  return ["LeftSpat", "RightSpat"].every(slot => {
    const asset = elements.find(element => slotOf(element) === slot)?.itemAssetName;
    return Boolean(asset) && !/(?:^|_)none$/i.test(asset);
  });
}

export function visorPopulationGroup(position) {
  const group = positionGroup(position);
  return POSITION_GROUPS.includes(group) ? group : null;
}

function legitimateRosterPlayer(record, teamNames, fcsTeamIndexes) {
  if (!record || record.isEmpty) return false;
  const teamIndex = Number(sf(record, "TeamIndex"));
  const first = String(sf(record, "FirstName") ?? "").trim(), last = String(sf(record, "LastName") ?? "").trim();
  const position = String(sf(record, "Position") ?? "").trim().toUpperCase();
  return Number.isInteger(teamIndex) && teamIndex >= 0 && (teamIndex !== 255 || fcsTeamIndexes.has(teamIndex)) && (!teamNames.size || teamNames.has(teamIndex) || fcsTeamIndexes.has(teamIndex)) && first && last && position && !(first === "Omar" && last === "Omar" && position === "QB");
}

function onFieldLoadouts(raw) {
  try {
    const parsed = JSON.parse(raw);
    return (parsed?.loadouts ?? []).filter(loadout => loadout?.loadoutType === "PlayerOnField" && Array.isArray(loadout.loadoutElements));
  } catch { return []; }
}

function equippedVisor(loadouts) {
  return loadouts.some(loadout => { const asset = loadout.loadoutElements.find(element => slotOf(element) === "Visor")?.itemAssetName; return Boolean(asset) && !/(?:^|_)none$/i.test(asset); });
}

function equippedMouthpiece(loadouts) {
  return loadouts.some(loadout => { const asset = loadout.loadoutElements.find(element => slotOf(element) === "MouthWear")?.itemAssetName; return Boolean(asset) && !/(?:^|_)none$/i.test(asset); });
}

export function mouthpiecePopulationGroup(position) {
  const value = String(position ?? "").toUpperCase();
  if (["WR", "HB", "RB", "TE", "CB", "FS", "SS", "SAFETY", "LOLB", "MLB", "ROLB", "LB"].includes(value)) return "skill";
  if (OFFENSIVE_LINE_POSITIONS.has(value) || ["LE", "RE", "DT", "EDGE", "FB"].includes(value)) return "line";
  return null;
}

function rollHangingMouthpiece(rng, allowRandomMouthpieceColors, brandedOnly) {
  const pool = allowRandomMouthpieceColors
    ? [...UNLOCKED_POOLS.hangingMouthpieces, ...UNLOCKED_POOLS.colorfulHangingMouthpieces]
    : UNLOCKED_POOLS.hangingMouthpieces;
  const allowed = brandedOnly === undefined ? pool : pool.filter(item => isBrandedMouthpiece(item) === brandedOnly);
  return weightedChoice(allowed.map(item => {
    const branded = /^(?:Battle|NXTRND|Nike|Shock)\b/i.test(item.displayName);
    const pink = /(?:^|_)Pink(?:2|3)?$/i.test(item.itemName) || /\bPink\b/i.test(item.displayName);
    return [item, (branded ? 3 : 1) * (pink ? 0.15 : 1)];
  }), rng);
}

export const isBrandedMouthpiece = item => /^(?:Battle|NXTRND|Nike|Shock)\b/i.test(item?.displayName ?? "");

export function rollUnlockedMouthpiece(group, rng, allowRandomMouthpieceColors = false, brandedFrequency, masked = false) {
  if (brandedFrequency !== undefined) {
    const branded = rng() < brandedFrequency / 100;
    // All verified branded choices are hanging pacifiers. Never invent
    // branded standard pacifiers or mouthguards that are not in the catalog.
    if (branded || masked) return { type: "hanging", item: rollHangingMouthpiece(rng, allowRandomMouthpieceColors, branded) };
    const type = weightedChoice(group === "skill" ? [["hanging", 75], ["pacifier", 20], ["mouthguard", 5]] : [["pacifier", 60], ["mouthguard", 25], ["hanging", 15]], rng);
    if (type === "hanging") return { type, item: rollHangingMouthpiece(rng, allowRandomMouthpieceColors, false) };
    const pool = type === "pacifier" ? UNLOCKED_POOLS.standardPacifiers : UNLOCKED_POOLS.mouthguards;
    return { type, item: pool[Math.floor(rng() * pool.length)] };
  }
  const type = weightedChoice(group === "skill"
    ? [["hanging", 75], ["pacifier", 20], ["mouthguard", 5]]
    : [["pacifier", 60], ["mouthguard", 25], ["hanging", 15]], rng);
  if (type === "hanging") return { type, item: rollHangingMouthpiece(rng, allowRandomMouthpieceColors) };
  const pool = type === "pacifier" ? UNLOCKED_POOLS.standardPacifiers : UNLOCKED_POOLS.mouthguards;
  return { type, item: pool[Math.floor(rng() * pool.length)] };
}

export function randomizeExistingMouthpieceColors(loadouts, rng, allowRandomColors = false) {
  const replacements = new Map(), changes = [];
  for (const loadout of loadouts) for (const element of loadout.loadoutElements) {
    if (slotOf(element) !== "MouthWear" || typeof element.itemAssetName !== "string") continue;
    const oldItem = element.itemAssetName;
    if (!replacements.has(oldItem)) {
      const variants = mouthpieceColorVariants(oldItem, allowRandomColors);
      const chosen = variants.length ? weightedChoice(variants.map(item => [item, /\bPink\b/i.test(item.displayName) ? 0.15 : 1]), rng).itemName : oldItem;
      replacements.set(oldItem, chosen);
    }
    const newItem = replacements.get(oldItem);
    if (newItem !== oldItem) { element.itemAssetName = newItem; if (!changes.some(change => change.oldItem === oldItem)) changes.push({ oldItem, newItem }); }
  }
  return changes;
}

function noneUndershirt(loadouts) {
  return loadouts.some(loadout => loadout.loadoutElements.find(element => slotOf(element) === "InnerShirt")?.itemAssetName === "Undershirt_None");
}

export function equipmentPopulationState(playerRecords, visualsRecords, visualsTableId, teamNames = new Map(), fcsTeamIndexes = new Set(), activePlayerRows, visorFrequencies) {
  const createCohort = () => ({ visorGroups: new Map(), mouthpieceGroups: new Map(), undershirts: { total: 0, none: 0, floor: 0, limited: false } });
  const populations = { fbs: createCohort(), fcs: createCohort() };
  const populationByVisualRow = new Map();
  playerRecords.forEach((record, row) => {
    if (activePlayerRows instanceof Set && !activePlayerRows.has(row)) return;
    if (!legitimateRosterPlayer(record, teamNames, fcsTeamIndexes)) return;
    const ref = parseRef(sf(record, "CharacterVisuals"));
    if (!ref || ref.tableId !== visualsTableId) return;
    const visual = visualsRecords[ref.row], raw = visual && !visual.isEmpty ? sf(visual, "RawData") : null;
    if (typeof raw !== "string") return;
    const loadouts = onFieldLoadouts(raw); if (!loadouts.length) return;
    const cohortName = fcsTeamIndexes.has(Number(sf(record, "TeamIndex"))) ? "fcs" : "fbs";
    const cohort = populations[cohortName];
    const group = visorPopulationGroup(sf(record, "Position"));
    const largeBody = LARGE_BODY_TYPES.has(String(sf(record, "CharacterBodyType") ?? "").trim().toLowerCase());
    const entry = populationByVisualRow.get(ref.row) ?? { cohorts: {} };
    const cohortEntry = entry.cohorts[cohortName] ?? { visorGroups: new Map(), mouthpieceGroups: new Map(), largeBodyPlayers: 0 };
    if (group) {
      const stats = cohort.visorGroups.get(group) ?? { total: 0, equipped: 0, ceiling: visorFrequencies ? visorFrequencies[positionGroup(sf(record, "Position"))] / 100 : visorChanceForPosition(sf(record, "Position")), limited: false };
      stats.total += 1; if (equippedVisor(loadouts)) stats.equipped += 1; cohort.visorGroups.set(group, stats);
      if (!equippedVisor(loadouts)) cohortEntry.visorGroups.set(group, (cohortEntry.visorGroups.get(group) ?? 0) + 1);
    }
    const mouthpieceGroup = mouthpiecePopulationGroup(sf(record, "Position"));
    if (mouthpieceGroup) {
      const stats = cohort.mouthpieceGroups.get(mouthpieceGroup) ?? { total: 0, equipped: 0, ceiling: 0.85, limited: false };
      stats.total += 1; if (equippedMouthpiece(loadouts)) stats.equipped += 1; cohort.mouthpieceGroups.set(mouthpieceGroup, stats);
      if (!equippedMouthpiece(loadouts)) cohortEntry.mouthpieceGroups.set(mouthpieceGroup, (cohortEntry.mouthpieceGroups.get(mouthpieceGroup) ?? 0) + 1);
    }
    if (largeBody) { cohort.undershirts.total += 1; cohortEntry.largeBodyPlayers += 1; if (noneUndershirt(loadouts)) cohort.undershirts.none += 1; }
    entry.cohorts[cohortName] = cohortEntry;
    populationByVisualRow.set(ref.row, entry);
  });
  for (const cohort of Object.values(populations)) cohort.undershirts.floor = Math.ceil(cohort.undershirts.total * 0.05);
  return { populations, visorGroups: populations.fbs.visorGroups, mouthpieceGroups: populations.fbs.mouthpieceGroups, undershirts: populations.fbs.undershirts, populationByVisualRow };
}

export function isApprovedHelmetForPosition(helmet, position, allowVicis = false) {
  return OFFENSIVE_LINE_POSITIONS.has(position) || APPROVED_HELMET_SET.has(helmet) || (allowVicis && canUseVicis(position) && helmet === VICIS_HELMET);
}

export function applyGlobalEquipmentFixes(playerRecords, visualsRecords, visualsTableId, options = {}) {
  const { helmetFix = false, rolledJerseyFix = false, sockFix = false, sleeveCompatibilityFix = false, nikeThighPads = false, visorFix = false, unlockedRecolorFix = false, unlockedColorTheme = "weighted", unlockedMouthpieceFix = false, allowRandomMouthpieceColors = false, unlockedTattooFix = false, unlockedTattooCap = 33, undershirtColor = "weighted", pantsFix = false, skipNilPlayers = true, seed = 1, teamNames = new Map(), fcsTeamIndexes = new Set(), excludedTeamIndexes = new Set(), activePlayerRows, eligiblePlayer = () => true } = options;
  const visorFrequencies = normalizeVisorFrequencies(options.visorFrequencies), facemaskPools = normalizeFacemaskPools(options.facemaskPools);
  const rng = mulberry32((seed ^ 0xA5A5A5A5) >>> 0);
  const helmetDistribution = normalizeHelmetDistribution(helmetFix ? options.helmetDistribution : undefined);
  const supported = (helmet, position) => helmetDistribution ? helmetAllowed(helmet, position) : isApprovedHelmetForPosition(helmet, position, options.allowVicisZero2);
  const approved = (helmet, position) => helmetDistribution ? helmetAllowedInMix(helmetDistribution, helmet, position) : supported(helmet, position);
  const bearsRng = mulberry32((seed ^ 0xBEA25001) >>> 0);
  const recolorRng = mulberry32((seed ^ 0xC010AACC) >>> 0), colorWeights = normalizeAccessoryColorWeights(unlockedRecolorFix && unlockedColorTheme === "weighted" ? options.accessoryColorWeights : undefined), tapeColors = normalizeTeamTapeColors(unlockedRecolorFix ? options.teamTapeColors : undefined);
  const tapeRng = mulberry32((seed ^ 0x7A9EC010) >>> 0);
  const mouthpieceColorRng = mulberry32((seed ^ 0x4D50434C) >>> 0);
  const brandedFrequency = options.brandedMouthpieceFrequency ?? 75;
  const population = equipmentPopulationState(playerRecords, visualsRecords, visualsTableId, teamNames, fcsTeamIndexes, activePlayerRows, visorFrequencies);
  if (undershirtColor === "custom") for (const cohort of Object.values(population.populations)) cohort.undershirts.floor = Math.ceil(cohort.undershirts.total * normalizeUndershirtWeights(options.undershirtWeights).large.none / 100);
  const playersByVisualRow = new Map();
  const allPlayerReferences = new Map();
  playerRecords.forEach((record, row) => {
    if (!record || record.isEmpty) return;
    const ref = parseRef(sf(record, "CharacterVisuals"));
    if (!ref || ref.tableId !== visualsTableId) return;
    allPlayerReferences.set(ref.row, (allPlayerReferences.get(ref.row) ?? 0) + 1);
    if (!eligiblePlayer(record)) return;
    if (activePlayerRows instanceof Set && !activePlayerRows.has(row)) return;
    const list = playersByVisualRow.get(ref.row) ?? [];
    const teamIndex = Number(sf(record, "TeamIndex"));
    list.push({ record, row, position: String(sf(record, "Position") ?? ""), bodyType: String(sf(record, "CharacterBodyType") ?? ""), isNil: Boolean(sf(record, "IsNIL")), isFcs: fcsTeamIndexes.has(teamIndex), excluded: excludedTeamIndexes.has(teamIndex) });
    playersByVisualRow.set(ref.row, list);
  });

  const helmetEntries = [];
  if (helmetFix && helmetDistribution) for (const players of playersByVisualRow.values()) for (const player of players) {
    if (!(skipNilPlayers && player.isNil) && !player.excluded) effectiveHelmetWeights(helmetDistribution, player.position);
  }
  if (helmetFix && options.balanceExistingHelmets) for (const [visualsRow, players] of playersByVisualRow) {
    // Balancing uses single-owner records only. The existing correction path
    // still protects shared rows if even one linked player is excluded.
    if (players.length !== 1 || allPlayerReferences.get(visualsRow) !== 1) continue;
    const player = players[0];
    if ((skipNilPlayers && player.isNil) || player.excluded || (!helmetDistribution && OFFENSIVE_LINE_POSITIONS.has(player.position))) continue;
    if (!legitimateRosterPlayer(player.record, teamNames, fcsTeamIndexes)) continue;
    const visual = visualsRecords[visualsRow], loadouts = visual && !visual.isEmpty ? onFieldLoadouts(sf(visual, "RawData")) : [];
    if (!loadouts.length) continue;
    const helmets = loadouts.map(loadout => loadout.loadoutElements.find(element => slotOf(element) === "HeadWear")?.itemAssetName);
    // Count actual supported models even at 0%, so Preview shows their real
    // before counts. Exclusion is a repair rule, not an unknown-model label.
    const families = new Set(helmets.map(helmet => supported(helmet, player.position) ? helmetDistribution ? helmet : helmetFamily(helmet, options.allowVicisZero2) : "Other / mixed"));
    helmetEntries.push({ visualsRow, position: player.position, helmet: helmets[0], family: families.size === 1 ? [...families][0] : "Other / mixed", team: options.recolorTeamNames?.get(player.row) ?? teamNames.get(Number(sf(player.record, "TeamIndex"))) ?? String(sf(player.record, "TeamIndex")), cohort: player.isFcs ? "fcs" : "fbs" });
  }
  const helmetBalance = helmetFix && options.balanceExistingHelmets ? buildHelmetBalancePlan(helmetEntries, { allowVicis: options.allowVicisZero2, seed, distribution: helmetDistribution }) : null;
  const helmetRng = helmetBalance ? mulberry32((seed ^ 0x4D41534B) >>> 0) : rng;

  const tattooEntries = { fbs: [], fcs: [] };
  if (unlockedTattooFix) for (const [visualsRow, players] of playersByVisualRow) {
    if (players.length !== 1 || allPlayerReferences.get(visualsRow) !== 1) continue;
    const player = players[0];
    if ((skipNilPlayers && player.isNil) || player.excluded) continue;
    if (activePlayerRows instanceof Set && !activePlayerRows.has(player.row)) continue;
    if (!UNLOCKED_TATTOO_ELIGIBLE_POSITIONS.has(String(player.position).toUpperCase())) continue;
    const visual = visualsRecords[visualsRow];
    let rawData = null;
    try { rawData = visual && !visual.isEmpty ? sf(visual, "RawData") : null; } catch { continue; }
    if (typeof rawData !== "string") continue;
    tattooEntries[player.isFcs ? "fcs" : "fbs"].push({ visualsRow, player, rawData });
  }
  const tattooRng = mulberry32((seed ^ 0x7A770015) >>> 0);
  const tattooFbs = buildUnlockedTattooPopulationPlan(tattooEntries.fbs, unlockedTattooCap, tattooRng, unlockedTattooFix ? options.unlockedTattooSelection : undefined);
  const tattooFcs = buildUnlockedTattooPopulationPlan(tattooEntries.fcs, unlockedTattooCap, tattooRng, unlockedTattooFix ? options.unlockedTattooSelection : undefined);
  const tattooPlans = new Map([...tattooFbs.plans, ...tattooFcs.plans]);
  const combineTattooStats = (fbs, fcs) => {
    const eligiblePlayers = fbs.eligiblePlayers + fcs.eligiblePlayers;
    const projectedTattooPlayers = fbs.projectedTattooPlayers + fcs.projectedTattooPlayers;
    return {
      capPercentage: unlockedTattooCap,
      capCount: fbs.capCount + fcs.capCount,
      eligiblePlayers,
      existingTattooPlayers: fbs.existingTattooPlayers + fcs.existingTattooPlayers,
      addedTattooPlayers: fbs.addedTattooPlayers + fcs.addedTattooPlayers,
      projectedTattooPlayers,
      projectedPrevalence: eligiblePlayers ? projectedTattooPlayers / eligiblePlayers : 0,
      existingAboveCap: fbs.existingAboveCap || fcs.existingAboveCap,
      fbs,
      fcs
    };
  };
  const unlockedTattooPopulation = unlockedTattooFix ? combineTattooStats(tattooFbs.stats, tattooFcs.stats) : null;

  let pantsPlayersChanged = 0;
  let helmetPlayersChanged = 0;
  let visualsChanged = 0;
  const helmetChanges = [];
  const pantsChanges = [];
  const rolledJerseyChanges = [];
  const sleeveCompatibilityChanges = [];
  const nikeThighPadChanges = [];
  const sockChanges = [];
  const visorChanges = [];
  const oakleyVisorChanges = [];
  const bearsPadsChanges = [], handwarmerChanges = [], helmetAccessoryChanges = [];
  let oakleyVisorPlayersChanged = 0;
  const unlockedRecolorChanges = [];
  const unlockedMouthpieceChanges = [];
  const unlockedTattooChanges = [];
  let rolledJerseyPlayersChanged = 0;
  let sleeveCompatibilityPlayersChanged = 0;
  let nikeThighPadPlayersChanged = 0;
  let sockPlayersChanged = 0;
  let visorPlayersChanged = 0;
  let unlockedRecolorPlayersChanged = 0;
  let unlockedMouthpiecePlayersChanged = 0;
  let existingMouthpieceColorsChanged = 0;
  const existingMouthpieceColorChanges = [];
  let unlockedTattooPlayersChanged = 0;
  let unlockedTattooPlayersRepaired = 0;
  for (const [visualsRow, players] of playersByVisualRow) {
    // A shared record cannot be edited without also changing every player who
    // references it, so protect the whole row if any linked player is NIL or excluded.
    if (allPlayerReferences.get(visualsRow) !== players.length || players.some(player => (skipNilPlayers && player.isNil) || player.excluded) || new Set(players.map(player => player.isFcs)).size > 1) continue;
    const visual = visualsRecords[visualsRow];
    if (!visual || visual.isEmpty || typeof sf(visual, "RawData") !== "string") continue;
    let parsed;
    try { parsed = JSON.parse(sf(visual, "RawData")); } catch { continue; }
    const loadouts = (parsed?.loadouts ?? []).filter(loadout => loadout?.loadoutType === "PlayerOnField" && Array.isArray(loadout.loadoutElements));
    if (!loadouts.length) continue;
    const cohortName = players[0]?.isFcs ? "fcs" : "fbs";
    const populationEntry = population.populationByVisualRow.get(visualsRow)?.cohorts?.[cohortName];
    const populationCohort = population.populations[cohortName];
    let changed = false;
    const pantsNeedingFix = loadouts.filter(loadout => {
      const pants = loadout.loadoutElements.find(element => slotOf(element) === "OuterPants");
      return !pants?.itemAssetName || pants.itemAssetName === "GearPants_Standard";
    });
    if (pantsFix && pantsNeedingFix.length) {
      const oldPants = [...new Set(pantsNeedingFix.map(loadout =>
        loadout.loadoutElements.find(element => slotOf(element) === "OuterPants")?.itemAssetName ?? "Missing (game default)"
      ))].join(", ");
      for (const loadout of loadouts) setSlot(loadout.loadoutElements, "OuterPants", "GearPants_AboveKnee");
      pantsPlayersChanged += players.length;
      for (const player of players) pantsChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { oldItem: oldPants, newItem: "GearPants_AboveKnee" }));
      changed = true;
    }

    const skillPlayers = helmetFix && (helmetDistribution || players.every(player => !OFFENSIVE_LINE_POSITIONS.has(player.position))) ? players : [];
    const currentHelmets = loadouts.map(loadout => loadout.loadoutElements.find(element => slotOf(element) === "HeadWear")?.itemAssetName);
    const invalidHelmet = currentHelmets.some(helmet => !skillPlayers.every(player => approved(helmet, player.position)));
    const invalidMask = (helmetDistribution || facemaskPools) && loadouts.some(loadout => (!facemaskFitsHelmet(loadout.loadoutElements.find(element => slotOf(element) === "FaceMask")?.itemAssetName, loadout.loadoutElements.find(element => slotOf(element) === "HeadWear")?.itemAssetName) || facemaskPools && !facemaskPools[loadout.loadoutElements.find(element => slotOf(element) === "HeadWear")?.itemAssetName]?.includes(loadout.loadoutElements.find(element => slotOf(element) === "FaceMask")?.itemAssetName)));
    if (skillPlayers.length && (helmetBalance?.plans.has(visualsRow) || invalidHelmet || invalidMask)) {
      const position = skillPlayers[0].position;
      const helmet = helmetBalance?.plans.get(visualsRow) ?? (helmetDistribution ? invalidHelmet ? rollCustomHelmet(helmetDistribution, skillPlayers.map(player => player.position), helmetRng) : currentHelmets[0] : invalidHelmet ? rollApprovedHelmet(helmetRng, options.allowVicisZero2, skillPlayers.every(player => canUseVicis(player.position)) ? position : "") : currentHelmets[0]);
      const facemask = helmetDistribution || facemaskPools ? rollCompatibleFacemask(helmet, position, helmetRng, facemaskPools) : rollFacemask(helmet, position, helmetRng);
      const oldHelmet = [...new Set(currentHelmets.filter(Boolean))].join(", ") || "None";
      for (const loadout of loadouts) {
        setSlot(loadout.loadoutElements, "HeadWear", helmet);
        setSlot(loadout.loadoutElements, "FaceMask", facemask);
        if (helmetDistribution) {
          const model = helmetModel(helmet);
          for (const element of loadout.loadoutElements) {
            const replacement = element.slotType === "GuardianCap" && !model.guardianCap && /^GuardianCap_GuardianXT/.test(element.itemAssetName) ? "GuardianCap_None"
              : element.slotType === "MouthWear" && !model.hangingMouthpiece && /PacifierDualHanging/i.test(element.itemAssetName) ? "GearMouthpiece_None" : null;
            if (!replacement) continue;
            for (const player of skillPlayers) helmetAccessoryChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { oldItem: element.itemAssetName, newItem: replacement }));
            element.itemAssetName = replacement;
          }
        }
      }
      helmetPlayersChanged += skillPlayers.length;
      for (const player of skillPlayers) {
        const record = player.record;
        const teamIndex = Number(sf(record, "TeamIndex"));
        helmetChanges.push({
          row: player.row,
          team: teamNames.get(teamIndex) ?? `Team ${teamIndex}`,
          firstName: String(sf(record, "FirstName") ?? "").trim(),
          lastName: String(sf(record, "LastName") ?? "").trim(),
          position: player.position,
          classYear: String(sf(record, "SchoolYear") ?? "Unknown"),
          redshirtStatus: String(sf(record, "RedshirtStatus") ?? ""),
          jersey: sf(record, "JerseyNum") ?? sf(record, "JerseyNumber") ?? "?",
          overall: Number(sf(record, "OverallRating") ?? 0),
          isFcs: fcsTeamIndexes.has(teamIndex),
          oldHelmet,
          newHelmet: helmet,
          newFacemask: facemask
        });
      }
      changed = true;
    }
    if (rolledJerseyFix) {
      let jerseyChanged = false;
      const selectedUndershirts = new Set();
      const replacedUndershirts = new Set();
      for (const loadout of loadouts) {
        const outerShirt = loadout.loadoutElements.find(element => slotOf(element) === "OuterShirt");
        const innerShirt = loadout.loadoutElements.find(element => slotOf(element) === "InnerShirt");
        if (outerShirt?.itemAssetName !== "Gear_JerseyStyle_RolledLow" || !["Undershirt_None", BROKEN_HOODIE_ASSET].includes(innerShirt?.itemAssetName)) continue;
        replacedUndershirts.add(innerShirt.itemAssetName);
        const bodyType = players.every(player => LARGE_BODY_TYPES.has(player.bodyType.trim().toLowerCase()))
          ? players[0].bodyType
          : "";
        const replacement = innerShirt.itemAssetName === BROKEN_HOODIE_ASSET
          ? HOODIE_ASSET
          : rollRolledJerseyUndershirt(rng, undershirtColor, bodyType, options.undershirtWeights);
        if (replacement === innerShirt.itemAssetName) continue;
        if (innerShirt.itemAssetName === "Undershirt_None" && replacement !== "Undershirt_None" && LARGE_BODY_TYPES.has(String(bodyType).trim().toLowerCase())) {
          const linked = populationEntry?.largeBodyPlayers ?? 0;
          const otherNoneRemains = loadouts.some(other => other !== loadout && other.loadoutElements.find(element => slotOf(element) === "InnerShirt")?.itemAssetName === "Undershirt_None");
          const reduction = otherNoneRemains ? 0 : linked;
          if (populationCohort.undershirts.none - reduction < populationCohort.undershirts.floor) { populationCohort.undershirts.limited = true; continue; }
          populationCohort.undershirts.none -= reduction;
        }
        innerShirt.itemAssetName = replacement;
        selectedUndershirts.add(innerShirt.itemAssetName);
        jerseyChanged = true;
      }
      if (jerseyChanged) {
        rolledJerseyPlayersChanged += players.length;
        const newItem = [...selectedUndershirts].join(", ");
        for (const player of players) rolledJerseyChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { oldItem: [...replacedUndershirts].join(", "), newItem }));
        changed = true;
      }
    }
    if (sockFix && players.every(player => !OFFENSIVE_LINE_POSITIONS.has(String(player.position).toUpperCase()))) {
      const midSockLoadouts = loadouts.filter(loadout =>
        loadout.loadoutElements.find(element => slotOf(element) === "InnerSocks")?.itemAssetName === "Gear_Socks_Mid" &&
        !hasSpatsOnBothFeet(loadout.loadoutElements)
      );
      if (midSockLoadouts.length) {
        const selectedSocks = new Set();
        for (const loadout of midSockLoadouts) {
          const socks = loadout.loadoutElements.find(element => slotOf(element) === "InnerSocks");
          socks.itemAssetName = rollSockStyle(rng);
          selectedSocks.add(socks.itemAssetName);
        }
        sockPlayersChanged += players.length;
        for (const player of players) sockChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { oldItem: "Gear_Socks_Mid", newItem: [...selectedSocks].join(", ") }));
        changed = true;
      }
    }
    if (sleeveCompatibilityFix) {
      const corrections = loadouts.flatMap(loadout => enforceArmSleeveCompatibility(loadout.loadoutElements, { usingUnlockedMod: unlockedMouthpieceFix || unlockedRecolorFix || unlockedTattooFix }));
      if (corrections.length) {
        sleeveCompatibilityPlayersChanged += players.length;
        const details = corrections.map(item => item.kind === "mask-mouthpiece" ? `Mask ${item.mask} + ${item.oldMouthpiece}` : `${item.side}: ${item.sleeve}`).join(", ");
        const repaired = corrections.some(item => item.kind === "mask-mouthpiece") ? "Compatible arm gear / mouthpiece" : "Wrist None + Elbow None";
        for (const player of players) sleeveCompatibilityChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { oldItem: details, newItem: repaired }));
        changed = true;
      }
    }
    if (nikeThighPads) {
      const needsNike = loadouts.some(loadout => ["LeftThighWear", "RightThighWear"].some(slot =>
        loadout.loadoutElements.find(element => slotOf(element) === slot)?.itemAssetName !== "ThighPad_Nike"
      ));
      if (needsNike) {
        const oldItems = new Set();
        for (const loadout of loadouts) {
          for (const slot of ["LeftThighWear", "RightThighWear"]) {
            oldItems.add(loadout.loadoutElements.find(element => slotOf(element) === slot)?.itemAssetName ?? "Missing");
            setSlot(loadout.loadoutElements, slot, "ThighPad_Nike");
          }
        }
        nikeThighPadPlayersChanged += players.length;
        for (const player of players) nikeThighPadChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { oldItem: [...oldItems].join(", "), newItem: "ThighPad_Nike" }));
        changed = true;
      }
    }
    if (options.oakleyVisorFix) {
      const replacements = new Map();
      for (const loadout of loadouts) for (const element of loadout.loadoutElements) {
        const replacement = slotOf(element) === "Visor" && Object.hasOwn(OAKLEY_VISOR_REPLACEMENTS, element.itemAssetName) ? OAKLEY_VISOR_REPLACEMENTS[element.itemAssetName] : null;
        if (replacement) { replacements.set(element.itemAssetName, replacement); element.itemAssetName = replacement; }
      }
      if (replacements.size) {
        oakleyVisorPlayersChanged += players.length;
        for (const player of players) oakleyVisorChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { oldItem: [...replacements.keys()].join(", "), newItem: [...replacements.values()].join(", ") }));
        changed = true;
      }
    }
    if (visorFix) {
      const hasVisor = equippedVisor(loadouts);
      const chances = new Set(players.map(player => visorFrequencies[positionGroup(player.position)] / 100));
      const chance = chances.size === 1 ? [...chances][0] : 0;
      if (!hasVisor && chance > 0 && rng() < chance) {
        const affectedGroups = populationEntry?.visorGroups ?? new Map();
        const allowed = [...affectedGroups].every(([group, count]) => { const stats = populationCohort.visorGroups.get(group); return stats && stats.equipped + count <= Math.floor(stats.total * stats.ceiling); });
        if (!allowed) { for (const group of affectedGroups.keys()) { const stats = populationCohort.visorGroups.get(group); if (stats) stats.limited = true; } }
        else {
          for (const loadout of loadouts) setSlot(loadout.loadoutElements, "Visor", OAKLEY_CLEAR_VISOR);
          for (const [group, count] of affectedGroups) populationCohort.visorGroups.get(group).equipped += count;
          visorPlayersChanged += players.length;
          for (const player of players) visorChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { oldItem: "GearVisor_None", newItem: OAKLEY_CLEAR_VISOR }));
          changed = true;
        }
      }
    }
    if (unlockedMouthpieceFix) {
      if (!options.rerollExistingMouthpieces && options.randomizeExistingMouthpieceColors && equippedMouthpiece(loadouts)) {
        const colors = randomizeExistingMouthpieceColors(loadouts, mouthpieceColorRng, allowRandomMouthpieceColors);
        if (colors.length) {
          existingMouthpieceColorsChanged += players.length;
          for (const player of players) for (const color of colors) existingMouthpieceColorChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, color));
          changed = true;
        }
      }
      const groups = new Set(players.map(player => mouthpiecePopulationGroup(player.position)));
      const group = groups.size === 1 ? [...groups][0] : null;
      const repairInvalid = loadouts.some(loadout => loadout.loadoutElements.some(element => slotOf(element) === "MouthWear" && isInvalidMouthpieceAsset(element.itemAssetName)));
      if ((options.rerollExistingMouthpieces || repairInvalid) && group && equippedMouthpiece(loadouts)) {
        const rolled = rollUnlockedMouthpiece(group, mouthpieceColorRng, allowRandomMouthpieceColors, brandedFrequency, loadouts.some(loadout => equippedMask(loadout.loadoutElements, true)));
        const oldItems = [...new Set(loadouts.map(loadout => loadout.loadoutElements.find(element => slotOf(element) === "MouthWear")?.itemAssetName ?? "GearMouthpiece_None"))];
        if (rolled.item && oldItems.some(item => item !== rolled.item.itemName)) {
          for (const loadout of loadouts) setSlot(loadout.loadoutElements, "MouthWear", rolled.item.itemName);
          existingMouthpieceColorsChanged += players.length;
          for (const player of players) existingMouthpieceColorChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { oldItem: oldItems.join(", "), newItem: rolled.item.itemName, mouthpieceType: rolled.type, repairInvalid }));
          changed = true;
        }
      }
      if (group && !equippedMouthpiece(loadouts) && rng() < 0.85) {
        const affectedGroups = populationEntry?.mouthpieceGroups ?? new Map();
        const allowed = [...affectedGroups].every(([name, count]) => { const stats = populationCohort.mouthpieceGroups.get(name); return stats && stats.equipped + count <= Math.floor(stats.total * stats.ceiling); });
        if (!allowed) {
          for (const name of affectedGroups.keys()) { const stats = populationCohort.mouthpieceGroups.get(name); if (stats) stats.limited = true; }
        } else {
          const masked = loadouts.some(loadout => equippedMask(loadout.loadoutElements, true));
          const rolled = rollUnlockedMouthpiece(group, rng, allowRandomMouthpieceColors, brandedFrequency, masked);
          if (rolled.item) {
            for (const loadout of loadouts) setSlot(loadout.loadoutElements, "MouthWear", rolled.item.itemName);
            for (const [name, count] of affectedGroups) populationCohort.mouthpieceGroups.get(name).equipped += count;
            unlockedMouthpiecePlayersChanged += players.length;
            for (const player of players) unlockedMouthpieceChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { oldItem: "GearMouthpiece_None", newItem: rolled.item.itemName, mouthpieceType: rolled.type }));
            changed = true;
          }
        }
      }
    }
    const recolorTeams = players.map(player => options.recolorTeamNames?.has(player.row) ? options.recolorTeamNames.get(player.row) : teamNames.get(Number(sf(player.record, "TeamIndex"))) ?? `Team ${sf(player.record, "TeamIndex")}`);
    if (unlockedRecolorFix && allPlayerReferences.get(visualsRow) === players.length && recolorTeams.every(name => typeof name === "string") && new Set(recolorTeams).size === 1
      && (!(activePlayerRows instanceof Set) || players.every(player => activePlayerRows.has(player.row)))) {
      const theme = unlockedColorTheme === "weighted" ? rollAccessoryColorTheme(recolorRng, colorWeights) : unlockedColorTheme === "random" ? EQUIPMENT_COLOR_THEMES[Math.floor(recolorRng() * EQUIPMENT_COLOR_THEMES.length)] : unlockedColorTheme;
      const tapeColor = (options.tapeColorMode ?? "accessory") === "accessory" ? theme : rollAccessoryColorTheme(tapeRng, teamTapeWeights(recolorTeams[0], tapeColors));
      const replacements = recolorPlayerAccessories(loadouts, theme, tapeColor);
      if (replacements.size) {
        unlockedRecolorPlayersChanged += players.length;
        const oldItem = [...replacements.keys()].map(equipmentDisplayName).join(", ");
        const newItem = [...replacements.values()].map(equipmentDisplayName).join(", ");
        for (const player of players) unlockedRecolorChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { team: recolorTeams[0], oldItem, newItem, colorTheme: theme, tapeColor, displayValues: true }));
        changed = true;
      }
    }
    const tattooPlan = tattooPlans.get(visualsRow);
    if (tattooPlan) {
      const tattooChange = applyUnlockedTattooPlan(parsed, tattooPlan);
      if (tattooChange) {
        unlockedTattooPlayersChanged += players.length;
        for (const player of players) unlockedTattooChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, tattooChange));
        changed = true;
      }
    } else if (unlockedTattooFix && players.length === 1 && allPlayerReferences.get(visualsRow) === 1
      && (!activePlayerRows || activePlayerRows.has(players[0].row))
      && UNLOCKED_TATTOO_ELIGIBLE_POSITIONS.has(String(players[0].position).toUpperCase())
      && repairUnlockedTattooLoadout(parsed)) {
      unlockedTattooPlayersRepaired += 1;
      unlockedTattooChanges.push(playerLogInfo(players[0], teamNames, fcsTeamIndexes, {
        oldItem: "Tattoo layer preventing equipment from displaying",
        newItem: "Tattoo layer repaired; equipment preserved"
      }));
      changed = true;
    }
    // Re-run after optional CFB27 Unlocked passes because they can introduce
    // an arm-gear or mask/mouthpiece combination after the main correction pass.
    if (sleeveCompatibilityFix) {
      const corrections = loadouts.flatMap(loadout => enforceArmSleeveCompatibility(loadout.loadoutElements, { usingUnlockedMod: unlockedMouthpieceFix || unlockedRecolorFix || unlockedTattooFix }));
      if (corrections.length) {
        sleeveCompatibilityPlayersChanged += players.length;
        const details = corrections.map(item => item.kind === "mask-mouthpiece" ? `Mask ${item.mask} + ${item.oldMouthpiece}` : `${item.side}: ${item.sleeve}`).join(", ");
        for (const player of players) sleeveCompatibilityChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { oldItem: details, newItem: "Compatible arm gear / mouthpiece" }));
        changed = true;
      }
    }
    // These opt-in corrections touch only the requested sleeve/waist items.
    if (options.bearsPadsSleeveFix) {
      const corrections = correctBearsPadsSleeves(loadouts, players.map(player => player.bodyType), options.bearsPadsReplacement ?? "shooter", bearsRng);
      for (const player of players) for (const correction of corrections) bearsPadsChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, correction));
      if (corrections.length) changed = true;
    }
    if (options.removeHandwarmers) {
      const corrections = removeHandwarmers(loadouts);
      for (const player of players) for (const correction of corrections) handwarmerChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, correction));
      if (corrections.length) changed = true;
    }
    if (changed) {
      visual.RawData = JSON.stringify(parsed);
      visualsChanged++;
    }
  }
  const serializeCohort = cohort => ({
    visors: Object.fromEntries([...cohort.visorGroups].map(([group, stats]) => [group, { ...stats, ceilingCount: Math.floor(stats.total * stats.ceiling), prevalence: stats.total ? stats.equipped / stats.total : 0 }])),
    mouthpieces: Object.fromEntries([...cohort.mouthpieceGroups].map(([group, stats]) => [group, { ...stats, ceilingCount: Math.floor(stats.total * stats.ceiling), prevalence: stats.total ? stats.equipped / stats.total : 0 }])),
    undershirts: { ...cohort.undershirts, nonePercentage: cohort.undershirts.total ? cohort.undershirts.none / cohort.undershirts.total : 0 }
  });
  const fbsSafeguards = serializeCohort(population.populations.fbs), fcsSafeguards = serializeCohort(population.populations.fcs);
  const populationSafeguards = { ...fbsSafeguards, fbs: fbsSafeguards, fcs: fcsSafeguards };
  return { bearsPadsChanges, handwarmerChanges, helmetAccessoryChanges, helmetBalance: helmetBalance?.diagnostics ?? null, oakleyVisorPlayersChanged, oakleyVisorChanges, pantsPlayersChanged, helmetPlayersChanged, rolledJerseyPlayersChanged, sockPlayersChanged, sleeveCompatibilityPlayersChanged, nikeThighPadPlayersChanged, visorPlayersChanged, unlockedRecolorPlayersChanged, unlockedMouthpiecePlayersChanged, existingMouthpieceColorsChanged, existingMouthpieceColorChanges, unlockedTattooPlayersChanged, unlockedTattooPlayersRepaired, visualsChanged, helmetChanges, pantsChanges, rolledJerseyChanges, sockChanges, sleeveCompatibilityChanges, nikeThighPadChanges, visorChanges, unlockedRecolorChanges, unlockedMouthpieceChanges, unlockedTattooChanges, unlockedTattooPopulation, populationSafeguards };
}

function playerLogInfo(player, teamNames, fcsTeamIndexes, extra = {}) {
  const record = player.record;
  const teamIndex = Number(sf(record, "TeamIndex"));
  return {
    row: player.row,
    team: teamNames.get(teamIndex) ?? `Team ${teamIndex}`,
    firstName: String(sf(record, "FirstName") ?? "").trim(),
    lastName: String(sf(record, "LastName") ?? "").trim(),
    position: player.position,
    classYear: String(sf(record, "SchoolYear") ?? "Unknown"),
    redshirtStatus: String(sf(record, "RedshirtStatus") ?? ""),
    jersey: sf(record, "JerseyNum") ?? sf(record, "JerseyNumber") ?? "?",
    overall: Number(sf(record, "OverallRating") ?? 0),
    isFcs: fcsTeamIndexes.has(teamIndex),
    ...extra
  };
}
