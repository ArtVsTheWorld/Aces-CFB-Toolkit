import { parseRef, sf } from "../openSave.js";
import { mulberry32 } from "./patcher.js";
import { enforceArmSleeveCompatibility } from "./compatibility.js";

export const APPROVED_SKILL_HELMETS = ["GearHelmet_Axiom", "GearHelmet_SchuttF7", "GearHelmet_SchuttF7Pro", "GearHelmet_Speed_Flex"];
const APPROVED_HELMET_SET = new Set(APPROVED_SKILL_HELMETS);
const SKILL_POSITIONS = new Set(["QB", "HB", "WR", "TE", "CB", "FS", "SS", "LOLB", "MLB", "ROLB", "LB", "SAFETY"]);
const VICIS_ZERO2_ALLOWED_POSITIONS = new Set(["TE", "LOLB", "MLB", "ROLB", "LB"]);
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
const LARGE_BODY_TYPES = new Set(["muscular", "standard"]);
const SOCK_STYLE_MIX = [
  ["Gear_Socks_Low", 85],
  ["Gear_Socks_High", 14],
  ["Gear_Socks_Under", 1]
];
export const UNDERSHIRT_COLOR_MODES = Object.freeze({
  primary: "Gear_Undershirt_CompressionTCrewSleeveless",
  secondary: "Gear_Undershirt_CompressionTCrewSleeveless_Secondary",
  white: "Gear_Undershirt_CompressionTCrewSleeveless_White",
  black: "Gear_Undershirt_CompressionTCrewSleeveless_Black"
});

const MASKS = {
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

export function rollApprovedHelmet(rng) {
  const roll = rng();
  if (roll < 0.70) return "GearHelmet_Speed_Flex";
  if (roll < 0.80) return "GearHelmet_Axiom";
  if (roll < 0.90) return "GearHelmet_SchuttF7";
  return "GearHelmet_SchuttF7Pro";
}

export function rollFacemask(helmet, position, rng) {
  const group = position === "QB" ? "qb" : /^(?:LOLB|MLB|ROLB|LB)$/.test(position) ? "lb" : "skill";
  return weightedChoice(MASKS[helmet][group], rng);
}

export function rollRolledJerseyUndershirt(rng, colorMode = "weighted", bodyType = "") {
  if (colorMode !== "weighted") {
    const selected = UNDERSHIRT_COLOR_MODES[colorMode];
    if (!selected) throw new Error(`Unknown undershirt color mode: ${colorMode}`);
    return selected;
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

export function isApprovedHelmetForPosition(helmet, position) {
  return APPROVED_HELMET_SET.has(helmet)
    || (helmet === "GearHelmet_VicisZero2" && VICIS_ZERO2_ALLOWED_POSITIONS.has(position));
}

export function applyGlobalEquipmentFixes(playerRecords, visualsRecords, visualsTableId, options = {}) {
  const { helmetFix = false, rolledJerseyFix = false, sockFix = false, sleeveCompatibilityFix = false, nikeThighPads = false, undershirtColor = "weighted", pantsFix = false, seed = 1, teamNames = new Map(), fcsTeamIndexes = new Set(), excludedTeamIndexes = new Set(), eligiblePlayer = () => true } = options;
  const rng = mulberry32((seed ^ 0xA5A5A5A5) >>> 0);
  const playersByVisualRow = new Map();
  playerRecords.forEach((record, row) => {
    if (!record || record.isEmpty || !eligiblePlayer(record)) return;
    const ref = parseRef(sf(record, "CharacterVisuals"));
    if (!ref || ref.tableId !== visualsTableId) return;
    const list = playersByVisualRow.get(ref.row) ?? [];
    list.push({ record, row, position: String(sf(record, "Position") ?? ""), bodyType: String(sf(record, "CharacterBodyType") ?? ""), isNil: Boolean(sf(record, "IsNIL")), excluded: excludedTeamIndexes.has(Number(sf(record, "TeamIndex"))) });
    playersByVisualRow.set(ref.row, list);
  });

  let pantsPlayersChanged = 0;
  let helmetPlayersChanged = 0;
  let visualsChanged = 0;
  const helmetChanges = [];
  const pantsChanges = [];
  const rolledJerseyChanges = [];
  const sleeveCompatibilityChanges = [];
  const nikeThighPadChanges = [];
  const sockChanges = [];
  let rolledJerseyPlayersChanged = 0;
  let sleeveCompatibilityPlayersChanged = 0;
  let nikeThighPadPlayersChanged = 0;
  let sockPlayersChanged = 0;
  for (const [visualsRow, players] of playersByVisualRow) {
    // A shared record cannot be edited without also changing every player who
    // references it, so protect the whole row if any linked player is NIL or excluded.
    if (players.some(player => player.isNil || player.excluded)) continue;
    const visual = visualsRecords[visualsRow];
    if (!visual || visual.isEmpty || typeof sf(visual, "RawData") !== "string") continue;
    let parsed;
    try { parsed = JSON.parse(sf(visual, "RawData")); } catch { continue; }
    const loadouts = (parsed?.loadouts ?? []).filter(loadout => loadout?.loadoutType === "PlayerOnField" && Array.isArray(loadout.loadoutElements));
    if (!loadouts.length) continue;
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

    const skillPlayers = helmetFix ? players.filter(player => SKILL_POSITIONS.has(player.position)) : [];
    const currentHelmets = loadouts.map(loadout => loadout.loadoutElements.find(element => slotOf(element) === "HeadWear")?.itemAssetName);
    if (skillPlayers.length && currentHelmets.some(helmet => !skillPlayers.every(player => isApprovedHelmetForPosition(helmet, player.position)))) {
      const position = skillPlayers[0].position;
      const helmet = rollApprovedHelmet(rng);
      const facemask = rollFacemask(helmet, position, rng);
      const oldHelmet = [...new Set(currentHelmets.filter(Boolean))].join(", ") || "None";
      for (const loadout of loadouts) {
        setSlot(loadout.loadoutElements, "HeadWear", helmet);
        setSlot(loadout.loadoutElements, "FaceMask", facemask);
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
          : rollRolledJerseyUndershirt(rng, undershirtColor, bodyType);
        if (replacement === innerShirt.itemAssetName) continue;
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
    if (sockFix) {
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
      const corrections = loadouts.flatMap(loadout => enforceArmSleeveCompatibility(loadout.loadoutElements));
      if (corrections.length) {
        sleeveCompatibilityPlayersChanged += players.length;
        const details = corrections.map(item => `${item.side}: ${item.sleeve}`).join(", ");
        for (const player of players) sleeveCompatibilityChanges.push(playerLogInfo(player, teamNames, fcsTeamIndexes, { oldItem: details, newItem: "Wrist None + Elbow None" }));
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
    if (changed) {
      visual.RawData = JSON.stringify(parsed);
      visualsChanged++;
    }
  }
  return { pantsPlayersChanged, helmetPlayersChanged, rolledJerseyPlayersChanged, sockPlayersChanged, sleeveCompatibilityPlayersChanged, nikeThighPadPlayersChanged, visualsChanged, helmetChanges, pantsChanges, rolledJerseyChanges, sockChanges, sleeveCompatibilityChanges, nikeThighPadChanges };
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
    isFcs: fcsTeamIndexes.has(teamIndex),
    ...extra
  };
}
