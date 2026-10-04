import RULES from "./rules.js";
import { generateCandidates, MINIMUM_PROMOTION_DISTANCE } from "./candidateGenerator.js";
import { getQuarterbackRank, isNumberAvailable, resolveDuplicates } from "./duplicateResolver.js";
import { isFallbackNumber, isLegalNumber, isPreferredNumber, isPromotionEligible } from "./numberRules.js";
import { sortRoster } from "./playerSorter.js";
import { applyTeamSpecificRules } from "./teamRules.js";
import { applyRetiredNumberRules } from "./retiredNumbers.js";
import { logChange, logDisplacement, logDuplicate, logFallbackChange, logRetiredChange, logWarning } from "./logger.js";
import { isProtectedNil } from "./nilPolicy.js";

const createStats = () => ({
  playersEvaluated: 0,
  duplicatesFound: 0,
  duplicateResolutions: 0,
  promotions: 0,
  promotionEligible: 0,
  suboptimalCorrections: 0,
  primaryPreferredAssignments: 0,
  secondaryPreferredAssignments: 0,
  fallbackAssignments: 0,
  totalChanges: 0,
  displacedPlayers: 0,
  stillSuboptimal: 0,
  teamRulesApplied: 0,
  teamRulesSkipped: 0,
  teamRuleDisplacements: 0,
  retiredNumbersCorrected: 0,
  prestigeNumbersFilled: 0,
  prestigeNumbersUnfilled: 0,
  prestigeUnfilledDetails: []
});

const movable = player => !isProtectedNil(player) && !player.teamRuleLocked;
const preferredSet = player => new Set([...(RULES[player.Position]?.preferred ?? []).flat()]);
const primarySet = player => new Set(RULES[player.Position]?.preferred?.[0] ?? []);
const fallbackSet = player => new Set([...(RULES[player.Position]?.fallback ?? []).flat()]);

function relocateLowerPriorityBlocker(player, roster, targets, oldNumber) {
  for (const target of targets) {
    const holders = roster.filter(candidate => candidate !== player && candidate.JerseyNum === target);
    if (holders.length !== 1) continue;
    const blocker = holders[0];
    if (!movable(blocker) || blocker.Position === "QB" || blocker.wasRenumberedThisRun) continue;
    if (roster.indexOf(blocker) <= roster.indexOf(player)) continue;

    blocker.isPromotionAttempt = false;
    const blockerCandidates = generateCandidates(blocker).candidates;
    for (const replacement of blockerCandidates) {
      if (replacement === blocker.JerseyNum || replacement === oldNumber) continue;
      if (!isNumberAvailable(blocker, replacement, roster)) continue;
      const blockerOldNumber = blocker.JerseyNum;
      blocker.JerseyNum = replacement;
      blocker.wasRenumberedThisRun = true;
      if (!isNumberAvailable(player, target, roster)) {
        blocker.JerseyNum = blockerOldNumber;
        blocker.wasRenumberedThisRun = false;
        continue;
      }
      player.JerseyNum = target;
      player.wasRenumberedThisRun = true;
      resolveDuplicates(roster);
      return { player: blocker, oldNumber: blockerOldNumber, newNumber: replacement };
    }
  }
  return null;
}

function assignNumber(player, roster, candidates, {
  preferredOnly = false,
  allowQbPreferredRescue = false,
  allowMandatoryDisplacement = false,
  respectCandidateOrder = false
} = {}) {
  const oldNumber = player.JerseyNum;
  const preferred = preferredSet(player);
  const fallback = fallbackSet(player);
  const preferredCandidates = candidates.filter(number => preferred.has(number) && number !== oldNumber);
  const fallbackCandidates = candidates.filter(number => fallback.has(number) && number !== oldNumber);

  if (respectCandidateOrder) {
    const orderedCandidates = candidates.filter(number => number !== oldNumber);
    const freeNumber = orderedCandidates.find(number => isNumberAvailable(player, number, roster));
    if (freeNumber !== undefined) {
      player.JerseyNum = freeNumber;
      player.wasRenumberedThisRun = true;
      resolveDuplicates(roster);
      return { changed: true, oldNumber, fallback: fallback.has(freeNumber), displacement: null };
    }
    if (allowMandatoryDisplacement) {
      const displacement = relocateLowerPriorityBlocker(player, roster, orderedCandidates, oldNumber);
      if (displacement) return { changed: true, oldNumber, fallback: isFallbackNumber(player), displacement };
    }
    return { changed: false, oldNumber, fallback: false, displacement: null };
  }

  const freePreferred = preferredCandidates.find(number => isNumberAvailable(player, number, roster));
  if (freePreferred !== undefined) {
    player.JerseyNum = freePreferred;
    player.wasRenumberedThisRun = true;
    resolveDuplicates(roster);
    return { changed: true, oldNumber, fallback: false, displacement: null };
  }

  const topThreeQb = player.Position === "QB" && getQuarterbackRank(player, roster) <= 3;
  if (allowQbPreferredRescue && topThreeQb) {
    const displacement = relocateLowerPriorityBlocker(player, roster, preferredCandidates, oldNumber);
    if (displacement) return { changed: true, oldNumber, fallback: false, displacement };
  }

  if (!preferredOnly) {
    const freeFallback = fallbackCandidates.find(number => isNumberAvailable(player, number, roster));
    if (freeFallback !== undefined) {
      player.JerseyNum = freeFallback;
      player.wasRenumberedThisRun = true;
      resolveDuplicates(roster);
      return { changed: true, oldNumber, fallback: true, displacement: null };
    }
  }

  if (allowMandatoryDisplacement) {
    const targets = preferredOnly ? preferredCandidates : [...preferredCandidates, ...fallbackCandidates];
    const displacement = relocateLowerPriorityBlocker(player, roster, targets, oldNumber);
    if (displacement) return { changed: true, oldNumber, fallback: isFallbackNumber(player), displacement };
  }
  return { changed: false, oldNumber, fallback: false, displacement: null };
}

function classifyAssignment(player, stats) {
  if (primarySet(player).has(player.JerseyNum)) stats.primaryPreferredAssignments++;
  else if (preferredSet(player).has(player.JerseyNum)) stats.secondaryPreferredAssignments++;
  else if (fallbackSet(player).has(player.JerseyNum)) stats.fallbackAssignments++;
}

function recordChange(teamName, player, result, stats, reason, { duplicate = false, retired = false, promotion = false, teamRuleLabel = null } = {}) {
  if (!result.changed) return;
  stats.totalChanges++;
  stats.playersEvaluated++;
  if (duplicate) stats.duplicateResolutions++;
  if (promotion) stats.promotions++;
  classifyAssignment(player, stats);
  if (result.displacement) {
    stats.displacedPlayers++;
    logDisplacement(teamName, result.displacement.player, result.displacement.oldNumber, result.displacement.newNumber, reason);
  }
  if (teamRuleLabel) logDisplacement(teamName, player, result.oldNumber, player.JerseyNum, teamRuleLabel);
  else if (result.fallback) logFallbackChange(teamName, player, result.oldNumber, reason);
  else if (retired) logRetiredChange(teamName, player, result.oldNumber);
  else logChange(teamName, player, result.oldNumber, reason);
}

function duplicatePartner(player, roster) {
  return roster.find(other => other !== player && other.JerseyNum === player.JerseyNum);
}

function illegalCollisionForPlayer(player, roster) {
  const holders = roster
    .filter(candidate => candidate.JerseyNum === player.JerseyNum)
    .sort((left, right) => roster.indexOf(left) - roster.indexOf(right));
  return holders.length > 1 && holders.some(holder => holder.mustRenumberDuplicate) ? holders : null;
}

// When the priority player in a collision has a genuinely better number open,
// let that player take the upgrade and leave the old number to the lower-priority
// holder. Primary-tier holders and positions with promotions disabled stay put.
function collisionUpgradeCandidates(player, enablePromotions) {
  if (!isLegalNumber(player) || isFallbackNumber(player)) {
    player.isPromotionAttempt = false;
    return generateCandidates(player).candidates.filter(number => preferredSet(player).has(number));
  }
  if (!enablePromotions) return [];
  if (!isPromotionEligible(player)) return [];
  player.isPromotionAttempt = true;
  const candidates = generateCandidates(player).candidates;
  player.isPromotionAttempt = false;
  return candidates;
}

function rollPromotionWinners(roster, stats, random, enablePromotions) {
  const winners = new Set();
  if (!enablePromotions) return winners;
  sortRoster(roster);
  for (const player of roster) {
    if (!movable(player) || player.wasRenumberedThisRun || !isPromotionEligible(player)) continue;
    stats.promotionEligible++;
    const chance = Number(RULES[player.Position]?.promoteChance ?? 0);
    if (random() < chance) winners.add(player);
  }
  return winners;
}

function isTrueFreshman(player) {
  return String(player.SchoolYear ?? "").trim().toLowerCase() === "freshman" &&
    String(player.RedshirtStatus ?? "").trim().toLowerCase() !== "previous";
}

function mandatoryRelocation(player) {
  if (player.mandatoryJerseyRelocation) return player.mandatoryJerseyRelocation;
  if (player.retiredNumbers?.has(player.JerseyNum)) {
    return { type: "retired", label: "retired number protected", reservedNumber: player.JerseyNum };
  }
  return null;
}

// A mandatory move should not accidentally act like a promotion. True freshmen
// displaced by a tradition or retired-number rule try secondary preferred
// numbers, then fallbacks, and use prestige/primary numbers only as a last resort.
function generateCandidatesUsingOriginalNumber(player, relocation) {
  if (!relocation?.originalNumber && relocation?.originalNumber !== 0) return generateCandidates(player).candidates;
  const temporaryNumber = player.JerseyNum;
  player.JerseyNum = relocation.originalNumber;
  const candidates = generateCandidates(player).candidates;
  player.JerseyNum = temporaryNumber;
  return candidates;
}

function mandatoryRelocationCandidates(player, relocation) {
  const generated = generateCandidatesUsingOriginalNumber(player, relocation);
  if (!isTrueFreshman(player) || relocation?.type === "freshman-reallocation") return generated;
  const rule = RULES[player.Position];
  if (!rule) return generated;
  const secondary = new Set((rule.preferred ?? []).slice(1).flat());
  const fallback = new Set((rule.fallback ?? []).flat());
  const primary = new Set(rule.preferred?.[0] ?? []);
  return [
    ...generated.filter(number => secondary.has(number)),
    ...generated.filter(number => fallback.has(number)),
    ...generated.filter(number => primary.has(number)),
    ...generated.filter(number => !secondary.has(number) && !fallback.has(number) && !primary.has(number))
  ].filter((number, index, all) => all.indexOf(number) === index);
}

// Releasing editable true-freshman claims before allocation prevents EA's
// generated freshman numbers from blocking established players. Each freshman
// receives a unique temporary value and later chooses at the normal roster
// priority position. Their real original number remains available to reclaim.
function releaseTrueFreshmanClaims(teamGroups) {
  let temporaryNumber = -1000;
  for (const team of teamGroups.values()) {
    for (const roster of [team.offense, team.defense, team.specialists ?? []]) {
      for (const player of roster) {
        if (!movable(player) || !isTrueFreshman(player) || !RULES[player.Position]) continue;
        const originalNumber = player.JerseyNum;
        const existingRelocation = player.mandatoryJerseyRelocation;
        const retired = player.retiredNumbers?.has(originalNumber) === true;
        player.freshmanReleasedNumber = originalNumber;
        player.mandatoryJerseyRelocation = existingRelocation
          ? { ...existingRelocation, originalNumber }
          : retired
            ? { type: "retired", label: "retired number protected", reservedNumber: originalNumber, originalNumber }
            : { type: "freshman-reallocation", label: "true freshman number allocation", originalNumber };
        player.JerseyNum = temporaryNumber--;
      }
    }
  }
}

function nextUnifiedAction(roster, promotionWinners, attemptedPromotions, attemptedFallbacks) {
  sortRoster(roster);
  resolveDuplicates(roster);
  for (const player of roster) {
    const collision = illegalCollisionForPlayer(player, roster);
    const mandatoryCollisionPlayer = collision?.find(holder => movable(holder) && mandatoryRelocation(holder));
    if (mandatoryCollisionPlayer) {
      if (player === mandatoryCollisionPlayer) {
        return { type: "mandatory", player, relocation: mandatoryRelocation(player) };
      }
      continue;
    }
    if (movable(player) && !player.wasRenumberedThisRun) {
      const relocation = mandatoryRelocation(player);
      if (relocation) return { type: "mandatory", player, relocation };
    }
    if (collision) {
      if (collision[0] === player) return { type: "collision", player, collision };
      continue;
    }
    if (!movable(player) || player.wasRenumberedThisRun) continue;
    if (!isLegalNumber(player)) return { type: "invalid", player };
    if (isFallbackNumber(player) && !attemptedFallbacks.has(player)) return { type: "fallback", player };
    if (promotionWinners.has(player) && !attemptedPromotions.has(player) && isPromotionEligible(player)) {
      return { type: "promotion", player };
    }
  }
  return null;
}

function processRoster(roster, teamName, stats, random, enablePromotions) {
  sortRoster(roster);
  resolveDuplicates(roster);

  // Roll promotion eligibility once, then put successful promotions,
  // collision groups, invalid numbers, and fallback upgrades into one dynamic
  // player-priority queue. Team-rule and retired-number displacements also wait
  // for the affected player's normal priority position.
  const promotionWinners = rollPromotionWinners(roster, stats, random, enablePromotions);
  const attemptedPromotions = new Set();
  const attemptedFallbacks = new Set();

  for (let guard = 0; guard < roster.length * 4; guard++) {
    const action = nextUnifiedAction(roster, promotionWinners, attemptedPromotions, attemptedFallbacks);
    if (!action) break;
    const player = action.player;

    if (action.type === "mandatory") {
      player.isPromotionAttempt = false;
      const result = assignNumber(player, roster, mandatoryRelocationCandidates(player, action.relocation), {
        allowQbPreferredRescue: true,
        allowMandatoryDisplacement: true,
        respectCandidateOrder: true
      });
      if (!result.changed) break;
      if (action.relocation.originalNumber !== undefined) result.oldNumber = action.relocation.originalNumber;
      const teamRuleLabel = action.relocation.type === "team-rule" ? action.relocation.label : null;
      if (player.JerseyNum !== result.oldNumber) {
        recordChange(teamName, player, result, stats, action.relocation.label, {
          retired: action.relocation.type === "retired",
          teamRuleLabel
        });
      } else {
        // Reclaiming the released original number is not a real change and
        // should not block the optional final 0-10 fill pass.
        player.wasRenumberedThisRun = false;
      }
      player.mandatoryJerseyRelocation = undefined;
      continue;
    }

    if (action.type === "collision") {
      const collision = action.collision;
      const leader = collision[0];
      const partner = collision.find(holder => holder !== leader) ?? null;

      if (movable(leader) && !leader.wasRenumberedThisRun && promotionWinners.has(leader)) {
        attemptedPromotions.add(leader);
        leader.isPromotionAttempt = true;
        const promotionCandidates = generateCandidates(leader).candidates;
        leader.isPromotionAttempt = false;
        const hasPromotion = promotionCandidates.some(number =>
          number !== leader.JerseyNum && isNumberAvailable(leader, number, roster)
        );
        if (hasPromotion) {
          stats.duplicatesFound++;
          if (partner) logDuplicate(teamName, leader, partner);
          leader.isPromotionAttempt = true;
          const result = assignNumber(leader, roster, generateCandidates(leader).candidates, { preferredOnly: true });
          leader.isPromotionAttempt = false;
          recordChange(teamName, leader, result, stats, "promotion resolving duplicate", { duplicate: true, promotion: true });
          continue;
        }
      }

      if (movable(leader) && !leader.wasRenumberedThisRun) {
        const upgradeCandidates = collisionUpgradeCandidates(leader, enablePromotions);
        const hasFreeUpgrade = upgradeCandidates.some(number =>
          number !== leader.JerseyNum && isNumberAvailable(leader, number, roster)
        );
        if (hasFreeUpgrade) {
          stats.duplicatesFound++;
          if (partner) logDuplicate(teamName, leader, partner);
          const result = assignNumber(leader, roster, upgradeCandidates, { preferredOnly: true });
          recordChange(teamName, leader, result, stats, "duplicate resolved - priority player upgraded", { duplicate: true });
          continue;
        }
      }

      const mover = roster.find(holder =>
        collision.includes(holder) && movable(holder) && !holder.wasRenumberedThisRun && holder.mustRenumberDuplicate
      );
      if (!mover) break;
      const moverPartner = duplicatePartner(mover, roster);
      stats.duplicatesFound++;
      if (moverPartner) logDuplicate(teamName, mover, moverPartner);
      mover.isPromotionAttempt = false;
      const result = assignNumber(mover, roster, generateCandidates(mover).candidates, {
        allowQbPreferredRescue: true,
        allowMandatoryDisplacement: true
      });
      if (!result.changed) break;
      recordChange(teamName, mover, result, stats, "duplicate resolved", { duplicate: true });
      continue;
    }

    if (action.type === "invalid") {
      player.isPromotionAttempt = false;
      const result = assignNumber(player, roster, generateCandidates(player).candidates, {
        allowQbPreferredRescue: true,
        allowMandatoryDisplacement: true
      });
      if (!result.changed) break;
      if (isLegalNumber(player)) stats.suboptimalCorrections++;
      recordChange(teamName, player, result, stats, "invalid number corrected");
      continue;
    }

    if (action.type === "fallback") {
      attemptedFallbacks.add(player);
      player.isPromotionAttempt = false;
      const result = assignNumber(player, roster, generateCandidates(player).candidates, {
        preferredOnly: true,
        allowQbPreferredRescue: true
      });
      recordChange(teamName, player, result, stats, "fallback upgraded to preferred");
      continue;
    }

    attemptedPromotions.add(player);
    player.isPromotionAttempt = true;
    const result = assignNumber(player, roster, generateCandidates(player).candidates, { preferredOnly: true });
    player.isPromotionAttempt = false;
    recordChange(teamName, player, result, stats, "promotion", { promotion: true });
  }
  resolveDuplicates(roster);
}

const PRESTIGE_NUMBERS = Array.from({ length: 11 }, (_, number) => number);
const YEAR_PRIORITY = { Senior: 6, Junior: 4, Sophomore: 2, Freshman: 0 };

function fillCandidateTier(player) {
  if (isFallbackNumber(player)) return 0;
  if (isPreferredNumber(player) && !primarySet(player).has(player.JerseyNum)) return 1;
  if (isPreferredNumber(player)) return 2;
  return 3;
}

function compareFillCandidates(a, b) {
  const tierDifference = fillCandidateTier(a.player) - fillCandidateTier(b.player);
  if (tierDifference !== 0) return tierDifference;
  const overallDifference = Number(b.player.OverallRating ?? 0) - Number(a.player.OverallRating ?? 0);
  if (overallDifference !== 0) return overallDifference;
  const ageDifference = Number(b.player.Age ?? 0) - Number(a.player.Age ?? 0);
  if (ageDifference !== 0) return ageDifference;
  const seniority = player => (YEAR_PRIORITY[player.SchoolYear] ?? 0) + (player.RedshirtStatus === "Previous" ? 1 : 0);
  const seniorityDifference = seniority(b.player) - seniority(a.player);
  if (seniorityDifference !== 0) return seniorityDifference;
  return `${a.player.LastName ?? ""},${a.player.FirstName ?? ""}`.localeCompare(
    `${b.player.LastName ?? ""},${b.player.FirstName ?? ""}`
  );
}

function fillPrestigeNumbers(team, teamName, stats) {
  const allPlayers = [...team.offense, ...team.defense];
  const occupied = new Set(allPlayers.map(player => player.JerseyNum));
  const missing = new Set(PRESTIGE_NUMBERS.filter(number => !occupied.has(number)));
  if (!missing.size) return;

  const candidates = [
    ...team.offense.map(player => ({ player, roster: team.offense })),
    ...team.defense.map(player => ({ player, roster: team.defense }))
  ].filter(({ player }) =>
    movable(player) &&
    !player.wasRenumberedThisRun &&
    !PRESTIGE_NUMBERS.includes(player.JerseyNum)
  ).sort(compareFillCandidates);

  for (const { player, roster } of candidates) {
    player.isPromotionAttempt = false;
    const target = generateCandidates(player).candidates.find(number =>
      missing.has(number) &&
      preferredSet(player).has(number) &&
      Math.abs(Number(player.JerseyNum) - number) >= MINIMUM_PROMOTION_DISTANCE &&
      isNumberAvailable(player, number, roster)
    );
    if (target === undefined) continue;

    const oldNumber = player.JerseyNum;
    player.JerseyNum = target;
    player.wasRenumberedThisRun = true;
    missing.delete(target);
    stats.prestigeNumbersFilled++;
    logChange(teamName, player, oldNumber, "vacant 0-10 number filled");
  }

  for (const number of [...missing].sort((a, b) => a - b)) {
    const retired = allPlayers.some(player => player.retiredNumbers?.has(number));
    const reserved = allPlayers.some(player => player.teamReservedNumbers?.has(number));
    const reason = retired
      ? "retired-number protection"
      : reserved
        ? "team-specific number reservation"
        : "no safe eligible player met the position, availability, and three-number distance rules";
    stats.prestigeNumbersUnfilled++;
    stats.prestigeUnfilledDetails.push({ teamName, number, reason });
    logWarning(`0-10 FILL SKIPPED: ${teamName} | #${number} | ${reason}`);
  }
}

export function runRenumberEngine(teamGroups, teamNames, {
  enableTeamRules = false,
  enableRetiredNumbers = false,
  enablePromotions = true,
  random = Math.random
} = {}) {
  const stats = createStats();
  if (enableRetiredNumbers) applyRetiredNumberRules(teamGroups, teamNames);

  const allPlayers = [...teamGroups.values()].flatMap(team => [...team.offense, ...team.defense, ...(team.specialists ?? [])]);
  const initialSuboptimal = allPlayers.filter(player => !isProtectedNil(player) && !isLegalNumber(player)).length;

  if (enableTeamRules) applyTeamSpecificRules(teamGroups, teamNames, stats, random);
  if (enablePromotions) releaseTrueFreshmanClaims(teamGroups);
  for (const [teamIndex, team] of teamGroups) {
    if (![...team.offense, ...team.defense, ...(team.specialists ?? [])].length) continue;
    const teamName = teamNames.get(teamIndex) ?? `Team ${teamIndex}`;
    processRoster(team.offense, teamName, stats, random, enablePromotions);
    processRoster(team.defense, teamName, stats, random, enablePromotions);
    processRoster(team.specialists ?? [], teamName, stats, random, false);
    if (enablePromotions) fillPrestigeNumbers(team, teamName, stats);
  }

  stats.totalChanges = allPlayers.filter(player => player.originalJerseyNum !== player.JerseyNum).length;
  stats.retiredNumbersCorrected = allPlayers.filter(player =>
    player.originalJerseyNum !== player.JerseyNum && player.retiredNumbers?.has(player.originalJerseyNum)
  ).length;
  stats.stillSuboptimal = allPlayers.filter(player => !isProtectedNil(player) && !isLegalNumber(player)).length;
  return { stats, initialSuboptimal };
}
