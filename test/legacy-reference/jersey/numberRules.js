// Number rules helpers: determine legality, promotion eligibility,
// whether a player needs renumbering, and a summary reason object.
import RULES from "./rules.js";

function isPromotionBlockedFreshman(player) {
    if (String(player.SchoolYear ?? "").toLowerCase() !== "freshman") return false;
    const redshirtStatus = String(player.RedshirtStatus ?? "").toLowerCase();
    return redshirtStatus !== "previous";
}

export function isLegalNumber(player) {
    if (player.teamRuleLocked && player.JerseyNum === player.teamRuleNumber) return true;
    if (player.retiredNumbers?.has(player.JerseyNum)) return false;
    const rule = RULES[player.Position];
    if (!rule) return true;
    const legalNumbers = [...(rule.preferred ?? []).flat(), ...(rule.fallback ?? []).flat()];
    return legalNumbers.includes(player.JerseyNum);
}

export function isPromotionEligible(player) {
    if (isPromotionBlockedFreshman(player)) return false;
    const rule = RULES[player.Position];
    if (!rule || !rule.promoteChance) return false;
    const secondaryGroup = rule.preferred[1];
    if (!secondaryGroup) return false;
    return secondaryGroup.includes(player.JerseyNum);
}

export function needsRenumber(player) {
    player.isPromotionAttempt = false;
    const rule = RULES[player.Position];
    if (!rule) return false;
    if (!isLegalNumber(player)) return true;
    if (isPromotionBlockedFreshman(player)) return false;
    if (!rule.promoteChance) return false;
    const secondaryGroup = rule.preferred[1];
    if (!secondaryGroup || !secondaryGroup.includes(player.JerseyNum)) return false;
    player.isPromotionAttempt = Math.random() < rule.promoteChance;
    return player.isPromotionAttempt;
}

export function getRenumberReason(player) {
    return {
        suboptimal: !isLegalNumber(player),
        retired: player.retiredNumbers?.has(player.JerseyNum) === true,
        promotion: player.isPromotionAttempt === true,
        duplicate: player.mustRenumberDuplicate
    };
}

export function isPreferredNumber(player) {
    if (player.teamRuleLocked && player.JerseyNum === player.teamRuleNumber) return true;
    if (player.retiredNumbers?.has(player.JerseyNum)) return false;
    const rule = RULES[player.Position];
    if (!rule) return true;
    return [...(rule.preferred ?? []).flat()].includes(player.JerseyNum);
}

export function isFallbackNumber(player) {
    if (player.teamRuleLocked && player.JerseyNum === player.teamRuleNumber) return false;
    const rule = RULES[player.Position];
    return Boolean(rule && [...(rule.fallback ?? []).flat()].includes(player.JerseyNum));
}
