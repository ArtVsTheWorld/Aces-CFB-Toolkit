const BODY_TATTOO_SLOTS = Object.freeze([
  "LeftArmTattoo",
  "RightArmTattoo",
  "LeftLegTattoo",
  "RightLegTattoo"
]);

const BODY_TATTOO_SLOT_SET = new Set(BODY_TATTOO_SLOTS);
const DEFAULT_TATTOO_ASSETS = Object.freeze({
  LeftArmTattoo: "ArmTattoo_None",
  RightArmTattoo: "ArmTattoo_None",
  LeftLegTattoo: "LegTattoo_None",
  RightLegTattoo: "LegTattoo_None"
});

export const UNLOCKED_TATTOO_ELIGIBLE_POSITIONS = new Set([
  "QB", "FB", "WR", "HB", "TE", "LE", "RE", "DT", "MLB", "CB", "FS", "LOLB", "ROLB", "SS"
]);

// Exact ItemNames and arm slots are cross-checked against the user's Unlocked
// prefab export and the Unlocked 95 manifest. Style/coverage labels describe the
// source asset names, not unverified artwork motifs. These styles are opt-in.
const OPTIONAL_ARM_TATTOOS = Object.freeze([
  ["ArmTattoo_Tattoos_Japanese_01_FullSleeveR", "Japanese full-arm sleeve — design 01"],
  ["ArmTattoo_Tattoos_Japanese_01_FullSleeveR2", "Japanese full-arm sleeve — design 01, alternate"],
  ["ArmTattoo_Tattoos_Japanese_02_FullSleeveL", "Japanese full-arm sleeve — design 02"],
  ["ArmTattoo_Tattoos_Japanese_02_FullSleeveL2", "Japanese full-arm sleeve — design 02, alternate"],
  ["ArmTattoo_Tattoos_Japanese_03_ForearmHalfSleeve", "Japanese forearm half-sleeve — design 03"],
  ["ArmTattoo_Tattoos_Japanese_03_ForearmHalfSleeve2", "Japanese forearm half-sleeve — design 03, alternate"],
  ["ArmTattoo_Tattoos_Japanese_07_ArmSleeve_v02", "Japanese arm sleeve — design 07"],
  ["ArmTattoo_Tattoos_Japanese_07_ArmSleeve_v03", "Japanese arm sleeve — design 07, alternate"],
  ["ArmTattoo_Tattoos_Japanese_08_ArmSleeve_v01", "Japanese arm sleeve — design 08"],
  ["ArmTattoo_Tattoos_Japanese_08_ArmSleeve_v02", "Japanese arm sleeve — design 08, alternate"],
  ["ArmTattoo_Tattoos_Japanese_09_ArmFloating_v02", "Japanese floating arm design 09"],
  ["ArmTattoo_Tattoos_Japanese_10_ArmFloating_v01", "Japanese floating arm design 10"],
  ["ArmTattoo_Tattoos_Japanese_ArmFloating_v01", "Japanese floating arm design — alternate"],
  ["ArmTattoo_Tattoos_Japanese_12_Arm_v02", "Japanese arm design 12"],
  ["ArmTattoo_Tattoos_Polynesian_Hawaiian_Arm", "Polynesian Hawaiian I"],
  ["ArmTattoo_Tattoos_Polynesian_Hawaiian_Arm_v02", "Polynesian Hawaiian II"],
  ["ArmTattoo_Tattoos_Polynesian_Maori_Arm_A", "Polynesian Māori I"],
  ["ArmTattoo_Tattoos_Polynesian_Maori_Arm_B", "Polynesian Māori II"],
  ["ArmTattoo_Tattoos_Polynesian_Samoan_StickerA", "Polynesian Samoan I — sticker design"],
  ["ArmTattoo_Tattoos_Polynesian_Samoan_StickerB", "Polynesian Samoan II — sticker design"],
  ["ArmTattoo_Tattoos_Polynesian_Samoan_Arm_v01", "Polynesian Samoan III"],
  ["ArmTattoo_Tattoos_Polynesian_Tongan_Arm_A", "Polynesian Tongan I"],
  ["ArmTattoo_Tattoos_Polynesian_Tongan_Arm_B", "Polynesian Tongan II"],
  ["ArmTattoo_Tattoos_Polynesian_Tongan_Arm_C_v01", "Polynesian Tongan III"],
  ["ArmTattoo_Tattoos_Polynesian_Tongan_Arm_C_v02", "Polynesian Tongan IV"]
].map(([asset, label]) => Object.freeze({ asset, label, weight: 1, defaultSelected: false, group: asset.includes("Japanese") ? "Japanese arm designs (off by default)" : "Polynesian arm designs (off by default)" })));

const ARM_TATTOOS = Object.freeze([
  { asset: "CujoMatty_ArmTats_35", weight: 4, label: "Arm Tattoo 35" },
  { asset: "CujoMatty_ArmTats_37", weight: 4, label: "Arm Tattoo 37" },
  { asset: "CujoMatty_ArmTats_22", weight: 2, label: "Arm Tattoo 22" },
  { asset: "CujoMatty_ArmTats_26", weight: 2, label: "Arm Tattoo 26" },
  { asset: "CujoMatty_ArmTats_36", weight: 2, label: "Arm Tattoo 36" },
  { asset: "CujoMatty_ArmTats_38", weight: 2, label: "Arm Tattoo 38" },
  { asset: "CujoMatty_ArmTats_21", weight: 1, label: "Arm Tattoo 21" },
  { asset: "CujoMatty_ArmTats_23", weight: 1, label: "Arm Tattoo 23" },
  { asset: "CujoMatty_ArmTats_40", weight: 1, label: "Arm Tattoo 40" },
  { asset: "CujoMatty_ArmTats_41", weight: 1, label: "Arm Tattoo 41" },
  // Additional item resources verified in CFB27 Unlocked 95's mod manifest.
  ...[24, 25, 27, 28, 29, 30, 31, 32, 33, 34, 39].map(number => ({ asset: `CujoMatty_ArmTats_${number}`, weight: 1, label: `Arm Tattoo ${number}` }))
].map(item => Object.freeze({ ...item, label: `CujoMatty custom arm design ${item.asset.split("_").at(-1)}`, group: "CujoMatty custom arm designs", defaultSelected: true })).concat(OPTIONAL_ARM_TATTOOS));

const LEG_TATTOOS = Object.freeze([
  { asset: "LegTattoo_Three", weight: 4, label: "Custom leg design 3" },
  { asset: "LegTattoo_Four", weight: 4, label: "Custom leg design 4" },
  { asset: "LegTattoo_Five", weight: 4, label: "Custom leg design 5" },
  { asset: "LegTattoo_One", weight: 2, label: "Custom leg design 1" },
  { asset: "LegTattoo_Two", weight: 1, label: "Custom leg design 2" }
]);

export const UNLOCKED_TATTOO_POOL = Object.freeze([
  ...ARM_TATTOOS.filter(item => item.defaultSelected).map(item => ({ value: item.asset, label: item.label, type: "arm", group: item.group, defaultSelected: true })).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
  ...LEG_TATTOOS.map(item => ({ value: item.asset, label: item.label, type: "leg", group: "Custom leg designs", defaultSelected: true })),
  ...OPTIONAL_ARM_TATTOOS.map(item => ({ value: item.asset, label: item.label, type: "arm", group: item.group, defaultSelected: false }))
].map(Object.freeze));
export const DEFAULT_UNLOCKED_TATTOO_SELECTION = Object.freeze(UNLOCKED_TATTOO_POOL.filter(item => item.defaultSelected).map(item => item.value));
export function normalizeTattooSelection(selection) {
  if (selection === undefined) return [...DEFAULT_UNLOCKED_TATTOO_SELECTION];
  if (!Array.isArray(selection) || selection.some(value => !UNLOCKED_TATTOO_POOL.some(item => item.value === value))) throw new Error("Choose tattoos from the available tattoo pool.");
  return [...new Set(selection)];
}

const ARM_CHOICES = Object.freeze([
  { value: "left", weight: 30 },
  { value: "right", weight: 30 },
  { value: "both", weight: 40 }
]);

const BODY_TATTOO_SLOT = /^(Left|Right)(Arm|Leg)Tattoo$/;
const isHeadLoadout = loadout => loadout?.loadoutType === "Head" || loadout?.loadoutCategory === "Head";
const isPlayerOnFieldLoadout = loadout => loadout?.loadoutType === "PlayerOnField" || loadout?.loadoutCategory === "PlayerOnField";
const slotOf = element => String(element?.slotType ?? "");
const isNoneTattoo = asset => !asset || /(?:^|_)None$/i.test(String(asset));

function weightedChoice(items, rng) {
  let roll = rng() * items.reduce((sum, item) => sum + item.weight, 0);
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items.at(-1);
}

function setSlot(elements, slot, asset) {
  const existing = elements.find(element => slotOf(element) === slot);
  if (existing) existing.itemAssetName = asset;
  else elements.push({ slotType: slot, itemAssetName: asset });
}

function setVisibleSocks(elements) {
  const socks = elements.find(element => slotOf(element) === "InnerSocks")
    ?? elements.find(element => slotOf(element) === "assetName");
  if (socks) socks.itemAssetName = "Gear_Socks_Low";
  else elements.push({ slotType: "InnerSocks", itemAssetName: "Gear_Socks_Low" });
}

export function hasUnlockedBodyTattoo(parsed) {
  for (const loadout of parsed?.loadouts ?? []) {
    for (const element of loadout?.loadoutElements ?? []) {
      if (BODY_TATTOO_SLOT.test(slotOf(element)) && !isNoneTattoo(element.itemAssetName)) return true;
    }
  }
  return false;
}

export function hasPlayerOnFieldEquipment(parsed) {
  return (parsed?.loadouts ?? []).some(loadout => isPlayerOnFieldLoadout(loadout) && Array.isArray(loadout.loadoutElements));
}

function ensureBodyTattooLoadout(parsed) {
  if (!Array.isArray(parsed.loadouts)) parsed.loadouts = [];
  const bodyElements = new Map();
  let tattooLoadout = parsed.loadouts.find(loadout =>
    !isHeadLoadout(loadout)
    && !isPlayerOnFieldLoadout(loadout)
    && Array.isArray(loadout?.loadoutElements)
    && loadout.loadoutElements.some(element => BODY_TATTOO_SLOT.test(slotOf(element)))
  );

  for (const loadout of parsed.loadouts) {
    if (!Array.isArray(loadout?.loadoutElements)) continue;
    const kept = [];
    for (const element of loadout.loadoutElements) {
      const slot = slotOf(element);
      if (BODY_TATTOO_SLOT_SET.has(slot)) {
        if (!bodyElements.has(slot)) bodyElements.set(slot, element);
      } else kept.push(element);
    }
    loadout.loadoutElements = kept;
  }

  if (!tattooLoadout) {
    tattooLoadout = { loadoutCategory: "Base", loadoutElements: [] };
    const gearIndex = parsed.loadouts.findIndex(isPlayerOnFieldLoadout);
    if (gearIndex < 0) parsed.loadouts.push(tattooLoadout);
    else parsed.loadouts.splice(gearIndex, 0, tattooLoadout);
  }

  // The game identifies its tattoo layer by category. A synthetic loadoutType
  // named "loadoutElements" can make the whole on-field outfit render as defaults.
  tattooLoadout.loadoutCategory = "Base";
  if (tattooLoadout.loadoutType === "loadoutElements") delete tattooLoadout.loadoutType;

  const preserved = Array.isArray(tattooLoadout.loadoutElements) ? tattooLoadout.loadoutElements : [];
  tattooLoadout.loadoutElements = [
    ...preserved,
    ...BODY_TATTOO_SLOTS.map(slot => bodyElements.get(slot) ?? { slotType: slot, itemAssetName: DEFAULT_TATTOO_ASSETS[slot] })
  ];
  return tattooLoadout.loadoutElements;
}

function normalizeOnFieldLoadouts(parsed) {
  let changed = false;
  for (const loadout of parsed?.loadouts ?? []) {
    if (loadout?.loadoutType !== "PlayerOnField" || !["GearOnly", "PlayerOnField"].includes(loadout.loadoutCategory)) continue;
    // A tattoo Base layer can coexist with a type-only PlayerOnField outfit.
    // Keeping a second category here makes some outfits render as game defaults.
    delete loadout.loadoutCategory;
    changed = true;
  }
  return changed;
}

export function repairUnlockedTattooLoadout(parsed) {
  const hasBodyTattoo = hasUnlockedBodyTattoo(parsed);
  if (!hasBodyTattoo || !hasPlayerOnFieldEquipment(parsed)) return false;
  const malformedLayer = (parsed.loadouts ?? []).some(loadout =>
    !isHeadLoadout(loadout)
    && loadout?.loadoutElements?.some(element => BODY_TATTOO_SLOT_SET.has(slotOf(element)))
    && (loadout.loadoutCategory !== "Base" || loadout.loadoutType === "loadoutElements")
  );
  const malformedGear = (parsed.loadouts ?? []).some(loadout =>
    loadout?.loadoutType === "PlayerOnField" && ["GearOnly", "PlayerOnField"].includes(loadout.loadoutCategory)
  );
  if (!malformedLayer && !malformedGear) return false;
  ensureBodyTattooLoadout(parsed);
  normalizeOnFieldLoadouts(parsed);
  return true;
}

function exposedArmSides(parsed) {
  const gear = (parsed?.loadouts ?? []).filter(isPlayerOnFieldLoadout);
  return ["left", "right"].filter(side => gear.every(loadout => {
    const asset = loadout.loadoutElements?.find(element => slotOf(element) === `${side === "left" ? "Left" : "Right"}ArmWear`)?.itemAssetName;
    return !asset || /(?:^|_)None$/i.test(asset) || /Quarter|ArmTape/i.test(asset);
  }));
}

export function rollUnlockedTattoo(rng, parsed, selection) {
  const selected = new Set(normalizeTattooSelection(selection)), arms = ARM_TATTOOS.filter(item => selected.has(item.asset)), legs = LEG_TATTOOS.filter(item => selected.has(item.asset));
  const availableArms = parsed ? exposedArmSides(parsed) : ["left", "right"];
  const canArm = availableArms.length > 0 && arms.length > 0, canLeg = legs.length > 0;
  if (!canArm && !canLeg) return null;
  const kind = canArm
    ? weightedChoice([{ value: "arm", weight: 80 }, { value: "leg", weight: 12 }, { value: "both", weight: 8 }].filter(item => item.value === "arm" || canLeg), rng).value
    : "leg";
  const plan = { kind, arms: {}, legs: null };
  if (kind === "arm" || kind === "both") {
    const preferred = weightedChoice(ARM_CHOICES, rng).value;
    const sides = preferred === "both" && availableArms.length === 2
      ? ["left", "right"]
      : [availableArms.includes(preferred) ? preferred : availableArms[Math.floor(rng() * availableArms.length)]];
    const first = weightedChoice(arms, rng);
    plan.arms[sides[0]] = first;
    if (sides.length === 2) {
      const different = rng() < 0.35;
      plan.arms.right = different && arms.length > 1
        ? weightedChoice(arms.filter(item => item.asset !== first.asset), rng)
        : first;
    }
  }
  if (kind === "leg" || kind === "both") plan.legs = weightedChoice(legs, rng);
  return plan;
}

export function buildUnlockedTattooPopulationPlan(entries, capPercentage, rng, selection) {
  const selected = normalizeTattooSelection(selection);
  const eligible = [];
  const existing = [];
  for (const entry of entries) {
    let parsed;
    try { parsed = JSON.parse(entry.rawData); } catch { continue; }
    if (!hasPlayerOnFieldEquipment(parsed)) continue;
    if (hasUnlockedBodyTattoo(parsed)) existing.push(entry);
    else eligible.push(entry);
  }

  const eligiblePlayers = eligible.length + existing.length;
  const capCount = Math.floor(eligiblePlayers * (capPercentage / 100));
  const additionsAllowed = Math.max(0, capCount - existing.length);
  for (let index = eligible.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [eligible[index], eligible[swap]] = [eligible[swap], eligible[index]];
  }
  const plans = new Map();
  for (const entry of eligible) {
    if (plans.size >= additionsAllowed) break;
    const plan = rollUnlockedTattoo(rng, JSON.parse(entry.rawData), selected);
    if (plan) plans.set(entry.visualsRow, plan);
  }
  const projectedTattooPlayers = existing.length + plans.size;
  return {
    plans,
    stats: {
      capPercentage,
      capCount,
      eligiblePlayers,
      existingTattooPlayers: existing.length,
      addedTattooPlayers: plans.size,
      projectedTattooPlayers,
      projectedPrevalence: eligiblePlayers ? projectedTattooPlayers / eligiblePlayers : 0,
      existingAboveCap: existing.length > capCount
    }
  };
}

export function applyUnlockedTattooPlan(parsed, plan) {
  if (!plan || hasUnlockedBodyTattoo(parsed)) return null;
  const gearLoadouts = (parsed?.loadouts ?? []).filter(loadout => isPlayerOnFieldLoadout(loadout) && Array.isArray(loadout.loadoutElements));
  if (!gearLoadouts.length) return null;
  const tattooElements = ensureBodyTattooLoadout(parsed);
  normalizeOnFieldLoadouts(parsed);

  if (plan.legs) {
    setSlot(tattooElements, "LeftLegTattoo", plan.legs.asset);
    setSlot(tattooElements, "RightLegTattoo", plan.legs.asset);
    for (const loadout of gearLoadouts) {
      setVisibleSocks(loadout.loadoutElements);
      setSlot(loadout.loadoutElements, "InnerPants", "BottomBase_None");
    }
  }
  for (const [side, item] of Object.entries(plan.arms)) {
    const title = side === "left" ? "Left" : "Right";
    setSlot(tattooElements, `${title}ArmTattoo`, item.asset);
  }
  const parts = [
    ...Object.entries(plan.arms).map(([side, item]) => `${side} arm: ${item.label}`),
    ...(plan.legs ? [`both legs: ${plan.legs.label}; low socks and bare legs`] : [])
  ];
  return {
    oldItem: "No body tattoo",
    newItem: parts.join(" · "),
    tattooKind: plan.kind,
    tattooAsset: [...Object.values(plan.arms).map(item => item.asset), ...(plan.legs ? [plan.legs.asset] : [])].join(", "),
    tattooSides: [...Object.keys(plan.arms), ...(plan.legs ? ["both legs"] : [])].join(", ")
  };
}
