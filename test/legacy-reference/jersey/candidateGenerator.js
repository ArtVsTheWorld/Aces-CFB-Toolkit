// Candidate Generator: build an ordered list of jersey candidates
// for a player based on the position RULES (preferred & fallback).
import RULES from "./rules.js";

export const MINIMUM_PROMOTION_DISTANCE = 3;

export function generateCandidates(player) {
    const rule = RULES[player.Position];
    if (!rule) return { candidates: [], fallbackStartIndex: 0 };

    let preferredCandidates = player.isPromotionAttempt
        ? [...(rule.preferred?.[0] ?? [])]
        : [...(rule.preferred ?? []).flat()];
    let fallbackCandidates = player.isPromotionAttempt ? [] : [...(rule.fallback ?? []).flat()];

    if (player.retiredNumbers) {
        preferredCandidates = preferredCandidates.filter(number => !player.retiredNumbers.has(number));
        fallbackCandidates = fallbackCandidates.filter(number => !player.retiredNumbers.has(number));
    }
    if (player.isPromotionAttempt) {
        preferredCandidates = preferredCandidates.filter(number =>
            Math.abs(number - player.JerseyNum) >= MINIMUM_PROMOTION_DISTANCE
        );
    }

    let favoredNumbers;
    const onesDigit = player.JerseyNum % 10;
    const tensDigit = Math.floor(player.JerseyNum / 10);

    if (player.Position === "DT") favoredNumbers = [90 + onesDigit, 90 + tensDigit];
    else favoredNumbers = [onesDigit, tensDigit, onesDigit + 10, tensDigit + 10];

    const orderTier = numbers => {
        const ordered = [];
        for (const number of favoredNumbers) {
            if (numbers.includes(number) && !ordered.includes(number)) ordered.push(number);
        }
        for (const number of numbers) if (!ordered.includes(number)) ordered.push(number);
        return ordered;
    };

    const orderedPreferred = orderTier(preferredCandidates);
    const preferredSet = new Set(orderedPreferred);
    const orderedFallback = orderTier(fallbackCandidates).filter(number => !preferredSet.has(number));
    const candidates = [...orderedPreferred, ...orderedFallback];
    const fallbackStartIndex = orderedPreferred.length;
    return { candidates, fallbackStartIndex };
}
