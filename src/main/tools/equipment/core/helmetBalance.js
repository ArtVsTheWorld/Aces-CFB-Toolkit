import { mulberry32 } from "../core/patcher.js";
import { HELMET_MODELS, effectiveHelmetWeights, helmetAllowed, helmetPosition } from "./helmets.js";

export const VICIS_HELMET = "GearHelmet_VicisZero2";
const VICIS_POSITIONS = new Set(["QB", "TE", "LOLB", "MLB", "ROLB", "LB", "SAM", "MIKE", "WILL", "LE", "RE", "DT", "EDGE", "DE", "DL", "LEDG", "REDG"]);
export const canUseVicis = position => VICIS_POSITIONS.has(String(position ?? "").trim().toUpperCase());
export function helmetTargets(allowVicis = false) {
  return allowVicis ? { SpeedFlex: 68, "F7 / F7 Pro": 15, Axiom: 14, "Vicis Zero 2": 3 }
    : { SpeedFlex: 70, Axiom: 10, F7: 10, "F7 Pro": 10 };
}
export function helmetFamily(helmet, allowVicis = false) {
  return ({ GearHelmet_Speed_Flex: "SpeedFlex", GearHelmet_Axiom: "Axiom",
    GearHelmet_SchuttF7: allowVicis ? "F7 / F7 Pro" : "F7",
    GearHelmet_SchuttF7Pro: allowVicis ? "F7 / F7 Pro" : "F7 Pro",
    ...(allowVicis ? { [VICIS_HELMET]: "Vicis Zero 2" } : {}) })[helmet] ?? "Other / mixed";
}
function targetCounts(total, targets) {
  const weight = Object.values(targets).reduce((sum, value) => sum + value, 0);
  const entries = Object.entries(targets).map(([family, percent], index) => ({ family, count: Math.floor(total * percent / weight), remainder: total * percent / weight % 1, index }));
  let remaining = total - entries.reduce((sum, item) => sum + item.count, 0);
  for (const item of [...entries].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) if (remaining-- > 0) item.count++;
  return Object.fromEntries(entries.map(item => [item.family, item.count]));
}
const shuffle = (array, rng) => { for (let index = array.length - 1; index > 0; index--) { const at = Math.floor(rng() * (index + 1)); [array[index], array[at]] = [array[at], array[index]]; } return array; };
function spreadAcrossTeams(entries, rng) {
  const groups = new Map();
  for (const entry of entries) { const group = groups.get(entry.team) ?? []; group.push(entry); groups.set(entry.team, group); }
  const teams = shuffle([...groups.keys()].sort(), rng);
  for (const group of groups.values()) shuffle(group, rng);
  const ordered = [];
  while (ordered.length < entries.length) for (const team of teams) { const entry = groups.get(team).pop(); if (entry) ordered.push(entry); }
  return ordered;
}
function helmetForFamily(family, rng) {
  if (family === "F7 / F7 Pro") return rng() < 0.5 ? "GearHelmet_SchuttF7" : "GearHelmet_SchuttF7Pro";
  return { SpeedFlex: "GearHelmet_Speed_Flex", Axiom: "GearHelmet_Axiom", F7: "GearHelmet_SchuttF7", "F7 Pro": "GearHelmet_SchuttF7Pro", "Vicis Zero 2": VICIS_HELMET }[family];
}

// Callers supply only uniquely owned, safe-to-edit, scoped non-OL players.
// Deficient families receive invalid helmets first, then only surplus helmets.
// F7 variants are a single family with Vicis enabled, avoiding needless swaps.
export function buildHelmetBalancePlan(entries, { allowVicis = false, seed = 1, distribution = null } = {}) {
  if (distribution) return buildCustomHelmetBalance(entries, distribution, seed);
  const rng = mulberry32((seed ^ 0x48454C4D) >>> 0), targets = helmetTargets(allowVicis), plans = new Map(), cohorts = {};
  for (const cohort of ["fbs", "fcs"]) {
    const players = entries.filter(entry => entry.cohort === cohort), total = players.length, requestedCounts = targetCounts(total, targets);
    const vicisEligiblePlayers = players.filter(entry => canUseVicis(entry.position)).length;
    const vicisTargetLimited = allowVicis && requestedCounts["Vicis Zero 2"] > vicisEligiblePlayers;
    const counts = vicisTargetLimited
      ? { ...targetCounts(total - vicisEligiblePlayers, Object.fromEntries(Object.entries(targets).filter(([family]) => family !== "Vicis Zero 2"))), "Vicis Zero 2": vicisEligiblePlayers }
      : requestedCounts;
    const familyOf = entry => {
      const family = entry.family ?? helmetFamily(entry.helmet, allowVicis);
      return allowVicis && family === "Vicis Zero 2" && !canUseVicis(entry.position) ? "Other / mixed" : family;
    };
    const groups = new Map([...Object.keys(targets), "Other / mixed"].map(family => [family, []]));
    for (const entry of players) groups.get(familyOf(entry)).push(entry);
    const before = Object.fromEntries([...groups].map(([family, group]) => [family, group.length]));
    const candidates = [...spreadAcrossTeams(groups.get("Other / mixed"), rng)];
    let neededEligible = allowVicis ? Math.max(0, counts["Vicis Zero 2"] - before["Vicis Zero 2"] - candidates.filter(entry => canUseVicis(entry.position)).length) : 0;
    for (const [family, group] of groups) if (family !== "Other / mixed") {
      const ordered = spreadAcrossTeams(group, rng), surplus = Math.max(0, group.length - counts[family]);
      const preferred = neededEligible ? ordered.filter(entry => canUseVicis(entry.position)).slice(0, Math.min(surplus, neededEligible)) : [];
      const preferredSet = new Set(preferred);
      const selected = [...preferred, ...ordered.filter(entry => !preferredSet.has(entry))].slice(0, surplus);
      candidates.push(...selected);
      neededEligible = Math.max(0, neededEligible - selected.filter(entry => canUseVicis(entry.position)).length);
    }
    // If eligible Vicis recipients only have families already at/below target,
    // their necessary swaps also create deficits in those families. Keep the
    // extra swaps minimal and spread them across actual roster teams.
    if (neededEligible) {
      const selected = new Set(candidates);
      candidates.push(...spreadAcrossTeams(players.filter(entry => !selected.has(entry) && canUseVicis(entry.position) && familyOf(entry) !== "Vicis Zero 2"), rng).slice(0, neededEligible));
    }
    // Round-robin deficit families as well as donor teams, making the selected
    // replacements diverse without increasing the minimum number of changes.
    const after = { ...before }, changesByTeam = {};
    for (const entry of candidates) after[familyOf(entry)]--;
    const deficits = Object.entries(counts).map(([family, count]) => ({ family, count: Math.max(0, count - after[family]) }));
    const assign = (entry, family) => {
      plans.set(entry.visualsRow, helmetForFamily(family, rng));
      after[family]++;
      changesByTeam[entry.team] = (changesByTeam[entry.team] ?? 0) + 1;
    };
    const vicis = allowVicis ? deficits.find(deficit => deficit.family === "Vicis Zero 2") : null;
    const reserved = new Set();
    if (vicis?.count) for (const entry of candidates) {
      if (!canUseVicis(entry.position)) continue;
      assign(entry, vicis.family); reserved.add(entry);
      if (--vicis.count === 0) break;
    }
    const remaining = candidates.filter(entry => !reserved.has(entry));
    let index = 0;
    while (index < remaining.length) for (const deficit of deficits) {
      if (!deficit.count) continue;
      const entry = remaining[index++]; if (!entry) break;
      assign(entry, deficit.family); deficit.count--;
    }
    cohorts[cohort] = { eligiblePlayers: total, changes: candidates.length, changesByTeam, vicisEligiblePlayers, vicisTargetLimited,
      families: Object.keys(before).map(family => ({ family, before: before[family], after: after[family], targetCount: counts[family] ?? 0, requestedTargetCount: requestedCounts[family] ?? 0, targetPercent: targets[family] ?? 0, beforePercent: total ? before[family] * 100 / total : 0, afterPercent: total ? after[family] * 100 / total : 0 })) };
  }
  return { plans, diagnostics: { allowVicis, ...cohorts } };
}

function buildCustomHelmetBalance(entries, distribution, seed) {
  const rng = mulberry32((seed ^ 0x48454C4D) >>> 0), plans = new Map(), cohorts = {};
  const labels = Object.fromEntries(HELMET_MODELS.map(model => [model.id, model.label]));
  labels.other = "Other / mixed";
  for (const cohort of ["fbs", "fcs"]) {
    const players = entries.filter(entry => entry.cohort === cohort), positions = [], changesByTeam = {};
    for (const position of [...new Set(players.map(entry => helmetPosition(entry.position)))]) {
      const scoped = players.filter(entry => helmetPosition(entry.position) === position), weights = effectiveHelmetWeights(distribution, position);
      const counts = targetCounts(scoped.length, weights);
      const familyOf = entry => entry.family === "Other / mixed" || !helmetAllowed(entry.helmet, position) ? "other" : entry.helmet;
      const groups = new Map([...HELMET_MODELS.map(model => model.id), "other"].map(id => [id, []]));
      for (const entry of scoped) groups.get(familyOf(entry)).push(entry);
      const before = Object.fromEntries([...groups].map(([id, group]) => [id, group.length])), after = { ...before };
      const candidates = spreadAcrossTeams(groups.get("other"), rng);
      for (const [id, group] of groups) if (id !== "other") candidates.push(...spreadAcrossTeams(group, rng).slice(0, Math.max(0, group.length - (counts[id] ?? 0))));
      for (const entry of candidates) after[familyOf(entry)]--;
      const deficits = Object.entries(counts).map(([id, count]) => ({ id, count: Math.max(0, count - after[id]) }));
      const ordered = spreadAcrossTeams(candidates, rng);
      let index = 0;
      while (index < ordered.length) {
        let assigned = false;
        for (const deficit of deficits) {
          if (!deficit.count || index === ordered.length) continue;
          const entry = ordered[index++]; plans.set(entry.visualsRow, deficit.id); deficit.count--; after[deficit.id]++;
          changesByTeam[entry.team] = (changesByTeam[entry.team] ?? 0) + 1; assigned = true;
        }
        if (!assigned) throw new Error("Helmet balancing could not satisfy the validated targets.");
      }
      positions.push({ position, eligiblePlayers: scoped.length, changes: candidates.length,
        families: Object.keys(before).map(id => ({ id, family: labels[id], before: before[id], after: after[id], targetCount: counts[id] ?? 0, targetPercent: weights[id] ?? 0,
          beforePercent: before[id] * 100 / scoped.length, afterPercent: after[id] * 100 / scoped.length })) });
    }
    const families = [...HELMET_MODELS.map(model => model.id), "other"].map(id => {
      const rows = positions.map(position => position.families.find(family => family.id === id));
      const sum = key => rows.reduce((total, row) => total + row[key], 0);
      return { id, family: labels[id], before: sum("before"), after: sum("after"), targetCount: sum("targetCount"), targetPercent: players.length ? sum("targetCount") * 100 / players.length : 0,
        beforePercent: players.length ? sum("before") * 100 / players.length : 0, afterPercent: players.length ? sum("after") * 100 / players.length : 0 };
    });
    cohorts[cohort] = { eligiblePlayers: players.length, changes: positions.reduce((total, group) => total + group.changes, 0), changesByTeam, families, positions };
  }
  return { plans, diagnostics: { custom: true, ...cohorts } };
}
