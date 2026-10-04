import RULES from "./rules.js";
import { MINIMUM_PROMOTION_DISTANCE } from "./candidateGenerator.js";
import { effectiveSchoolYear, TEAM_RULES } from "./teamRules.js";
import { getRetiredNumbers } from "./retiredNumbers.js";

const OL = new Set(["LT", "LG", "C", "RG", "RT"]);
const SPECIALISTS = new Set(["K", "P"]);
const SKILL = new Set(["WR", "CB", "FS", "SS", "TE", "LOLB", "MLB", "ROLB", "HB"]);
const DL = new Set(["LE", "RE", "EDGE", "DT"]);
const ALL_NUMBERS = Object.freeze(Array.from({ length: 100 }, (_, number) => number));
const SPECIALIST_NUMBERS = Object.freeze([
  ...Array.from({ length: 19 }, (_, index) => index + 1),
  ...Array.from({ length: 80 }, (_, index) => 99 - index),
  0
]);

const number = value => Number(value);
const normalized = value => String(value ?? "").trim().toLowerCase();
const age = player => Number(player.Age ?? 0);
const overall = player => Number(player.OverallRating ?? 0);
const playerName = player => `${player.FirstName ?? ""} ${player.LastName ?? ""}`.trim();

export function noDuplicatePositionTier(position) {
  if (position === "QB") return 0;
  if (SKILL.has(position)) return 1;
  if (DL.has(position)) return 2;
  if (OL.has(position)) return 3;
  if (SPECIALISTS.has(position) || position === "FB") return 4;
  return 4;
}

export function sortNoDuplicateRoster(roster) {
  return [...roster].sort((left, right) => {
    const tierDifference = noDuplicatePositionTier(left.Position) - noDuplicatePositionTier(right.Position);
    if (tierDifference !== 0) return tierDifference;
    const ratingDifference = overall(right) - overall(left);
    if (Math.abs(ratingDifference) <= 4) {
      const leftReceiver = left.Position === "WR";
      const rightReceiver = right.Position === "WR";
      if (leftReceiver !== rightReceiver) return leftReceiver ? -1 : 1;

      const defensive = position => ["LE", "RE", "EDGE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS"].includes(position);
      const secondary = position => ["CB", "FS", "SS"].includes(position);
      if (defensive(left.Position) && defensive(right.Position) && secondary(left.Position) !== secondary(right.Position)) {
        return secondary(left.Position) ? -1 : 1;
      }
    }
    return ratingDifference || age(right) - age(left) || playerName(left).localeCompare(playerName(right));
  });
}

export function ruleCandidates(player) {
  if (OL.has(player.Position)) {
    const rule = RULES[player.Position];
    return { preferred: [...(rule?.preferred ?? []).flat()], fallback: [] };
  }
  if (SPECIALISTS.has(player.Position)) return { preferred: [...SPECIALIST_NUMBERS], fallback: [] };
  const rule = RULES[player.Position];
  if (!rule) return { preferred: [...ALL_NUMBERS], fallback: [] };
  return {
    preferred: [...(rule.preferred ?? []).flat()],
    fallback: [...(rule.fallback ?? []).flat()]
  };
}

function isTrueFreshman(player) {
  return normalized(player.SchoolYear) === "freshman" && normalized(player.RedshirtStatus) !== "previous";
}

function isPromotionCandidate(player, current, candidate) {
  const rule = RULES[player.Position];
  return Boolean(
    rule?.preferred?.[1]?.includes(current) &&
    rule.preferred[0]?.includes(candidate) &&
    Math.abs(candidate - current) >= MINIMUM_PROMOTION_DISTANCE
  );
}

function promotionTarget(player, claimed, retired, random) {
  if (OL.has(player.Position) || SPECIALISTS.has(player.Position) || player.Position === "FB" || isTrueFreshman(player)) return null;
  const rule = RULES[player.Position];
  if (!rule?.promoteChance || !rule.preferred?.[1]?.includes(number(player.JerseyNum))) return null;
  if (random() >= rule.promoteChance) return null;
  return rule.preferred[0].find(candidate =>
    !claimed.has(candidate) && !retired.has(candidate) &&
    isPromotionCandidate(player, number(player.JerseyNum), candidate)
  ) ?? null;
}

function isUpperclassman(player) {
  return player.SchoolYear === "Senior" ||
    (player.SchoolYear === "Junior" && player.RedshirtStatus === "Previous");
}

function hasCaptainPatch(player) {
  return normalized(player.CaptainsPatch ?? "none") !== "none";
}

function matchingTeamRules(teamName) {
  const wanted = normalized(teamName);
  return TEAM_RULES.filter(rule => rule.teamNames.some(alias => normalized(alias) === wanted));
}

function chooseTeamRuleRecipients(roster, teamName, random) {
  const locked = new Map();
  const alreadyChosen = new Set();
  for (const rule of matchingTeamRules(teamName)) {
    let eligible = roster.filter(player =>
      !alreadyChosen.has(player) &&
      (!rule.upperclassmenOnly || isUpperclassman(player)) &&
      (!rule.eligiblePositions || rule.eligiblePositions.includes(player.Position))
    );
    if (rule.preferCaptains && eligible.some(hasCaptainPatch)) eligible = eligible.filter(hasCaptainPatch);
    eligible = eligible
      .map(player => ({ player, roll: random() }))
      .sort((left, right) => {
        const ratingDifference = overall(right.player) - overall(left.player);
        if (ratingDifference !== 0) return ratingDifference;
        if (rule.tieBreakByEffectiveSchoolYearThenRoll) {
          return effectiveSchoolYear(right.player) - effectiveSchoolYear(left.player) || right.roll - left.roll;
        }
        return age(right.player) - age(left.player) ||
          (number(right.player.JerseyNum) === rule.number ? 1 : 0) - (number(left.player.JerseyNum) === rule.number ? 1 : 0) ||
          playerName(left.player).localeCompare(playerName(right.player));
      })
      .map(entry => entry.player);
    if (!eligible.length || locked.has(rule.number)) continue;
    locked.set(rule.number, { player: eligible[0], label: rule.label });
    alreadyChosen.add(eligible[0]);
  }
  return locked;
}

function availableCandidates(player, claimed, retired) {
  const { preferred, fallback } = ruleCandidates(player);
  const ordered = [...new Set([...preferred, ...fallback, ...ALL_NUMBERS])];
  return ordered.filter(candidate => !claimed.has(candidate) && !retired.has(candidate));
}

export function validateNoDuplicates(roster) {
  const groups = new Map();
  for (const player of roster) {
    const jersey = number(player.JerseyNum);
    if (!groups.has(jersey)) groups.set(jersey, []);
    groups.get(jersey).push(player);
  }
  return [...groups.entries()].filter(([, holders]) => holders.length > 1);
}

export function runNoDuplicatesRoster(roster, teamName, {
  enableTeamRules = true,
  enableRetiredNumbers = true,
  enablePromotions = true,
  random = Math.random
} = {}) {
  if (roster.length > 100) throw new Error(`${teamName} has ${roster.length} rostered players but only 100 jersey numbers exist.`);
  const retired = enableRetiredNumbers ? getRetiredNumbers(teamName) : new Set();
  const ordered = sortNoDuplicateRoster(roster);
  const claimed = new Set();
  const claimedBy = new Map();
  const lockedPlayers = new Set();
  const changes = [];
  // Absolute-uniqueness mode can only award one copy of a tradition number,
  // even when standard mode permits LSU #7 on both sides of the ball.
  const teamRuleRecipients = enableTeamRules ? chooseTeamRuleRecipients(roster, teamName, random) : new Map();

  for (const [jersey, { player, label }] of teamRuleRecipients) {
    const oldNumber = number(player.JerseyNum);
    player.JerseyNum = jersey;
    claimed.add(jersey);
    claimedBy.set(jersey, player);
    lockedPlayers.add(player);
    if (oldNumber !== jersey) changes.push({ player, oldNumber, newNumber: jersey, reason: label, fallback: false });
  }

  for (const player of ordered) {
    if (lockedPlayers.has(player)) continue;
    const current = number(player.JerseyNum);
    const { preferred, fallback } = ruleCandidates(player);
    const legal = preferred.includes(current) || fallback.includes(current);
    const currentAvailable = Number.isInteger(current) && current >= 0 && current <= 99 &&
      !claimed.has(current) && !retired.has(current) && legal;
    // A unique fallback QB used to be left untouched because it did not need
    // duplicate repair. Give every QB a deterministic free attempt at a
    // preferred number before accepting that existing fallback.
    const qbFallbackUpgrade = currentAvailable && player.Position === "QB" && fallback.includes(current)
      ? preferred.find(candidate => !claimed.has(candidate) && !retired.has(candidate)) ?? null
      : null;
    const promoted = enablePromotions && currentAvailable
      ? promotionTarget(player, claimed, retired, random)
      : null;

    if (currentAvailable && promoted === null && qbFallbackUpgrade === null) {
      claimed.add(current);
      claimedBy.set(current, player);
      continue;
    }

    const candidates = availableCandidates(player, claimed, retired);
    const replacement = qbFallbackUpgrade ?? promoted ?? candidates[0];
    if (replacement === undefined) {
      throw new Error(`${teamName} has no unused, non-retired jersey number available for ${playerName(player)}.`);
    }
    const duplicateWith = claimed.has(current) ? claimedBy.get(current) : null;
    const reason = qbFallbackUpgrade !== null
      ? "fallback upgraded to preferred"
      : promoted !== null
        ? "promotion"
        : claimed.has(current) ? "duplicate resolved"
        : retired.has(current) ? "retired number protected"
        : "position range corrected";
    player.JerseyNum = replacement;
    claimed.add(replacement);
    claimedBy.set(replacement, player);
    changes.push({
      player,
      oldNumber: current,
      newNumber: replacement,
      reason,
      fallback: !preferred.includes(replacement),
      duplicateWith
    });
  }

  const duplicates = validateNoDuplicates(roster);
  if (duplicates.length) throw new Error(`${teamName} still has ${duplicates.length} duplicate jersey group(s) after allocation.`);
  const fallbackPlayers = roster.filter(player => {
    const { preferred, fallback } = ruleCandidates(player);
    return fallback.includes(number(player.JerseyNum)) || (!preferred.includes(number(player.JerseyNum)) && !fallback.includes(number(player.JerseyNum)));
  });
  return {
    changes,
    retiredNumbers: retired,
    teamRulesApplied: teamRuleRecipients.size,
    analytics: {
      fallbackPlayers,
      wrFallbacks: fallbackPlayers.filter(player => player.Position === "WR").length,
      qbFallbacks: fallbackPlayers.filter(player => player.Position === "QB").length
    }
  };
}

export const NO_DUPLICATE_VALID_POSITIONS = Object.freeze(new Set([
  "QB", "HB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT",
  "LE", "RE", "EDGE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS", "K", "P"
]));


