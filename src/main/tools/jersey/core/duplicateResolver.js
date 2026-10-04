// Duplicate Resolver: mark later players with conflicting jerseys
// (mustRenumberDuplicate = true) and provide a small helper to
// check whether a number is free on a roster side.

import { isProtectedNil } from "./nilPolicy.js";

// Only the fourth-rated QB or lower may share an offensive jersey number.
// Rankings are recalculated every run, so progression automatically removes
// the exception when a QB moves into the top three.
export function getQuarterbackRank(player, roster) {
    if (player?.Position !== "QB") return null;
    const quarterbacks = roster
        .filter(candidate => candidate?.Position === "QB" && !isProtectedNil(candidate))
        .sort((a, b) => Number(b.OverallRating ?? 0) - Number(a.OverallRating ?? 0));
    const index = quarterbacks.indexOf(player);
    return index < 0 ? null : index + 1;
}

export function isBackupQbDuplicateEligible(player, roster) {
    const rank = getQuarterbackRank(player, roster);
    return rank !== null && rank >= 4;
}

export function isAllowedExistingDuplicate(firstPlayer, secondPlayer, roster) {
    if (!Array.isArray(roster)) return false;
    const firstIsBackupQb = isBackupQbDuplicateEligible(firstPlayer, roster);
    const secondIsBackupQb = isBackupQbDuplicateEligible(secondPlayer, roster);
    // The exception is for one fourth-string-or-lower QB sharing with one
    // non-QB offensive player. Two quarterbacks may never share a number.
    return (firstIsBackupQb && secondPlayer?.Position !== "QB") ||
        (secondIsBackupQb && firstPlayer?.Position !== "QB");
}

export function resolveDuplicates(roster) {
    for (const player of roster) player.mustRenumberDuplicate = false;

    const playersByNumber = new Map();
    for (const player of roster) {
        if (!playersByNumber.has(player.JerseyNum)) playersByNumber.set(player.JerseyNum, []);
        playersByNumber.get(player.JerseyNum).push(player);
    }

    for (const players of playersByNumber.values()) {
        if (players.length <= 1) continue;
        if (players.length === 2 && isAllowedExistingDuplicate(players[0], players[1], roster)) continue;

        const nilPlayers = players.filter(isProtectedNil);
        if (nilPlayers.length > 0) {
            for (const player of players) {
                if (isProtectedNil(player)) continue;
                if (nilPlayers.some(nilPlayer => !isAllowedExistingDuplicate(nilPlayer, player, roster))) {
                    player.mustRenumberDuplicate = true;
                }
            }
            continue;
        }

        const primary = players.find(player => !isBackupQbDuplicateEligible(player, roster)) ?? players[0];
        const backupQb = primary.Position === "QB" ? undefined :
            players.find(player => player !== primary && isBackupQbDuplicateEligible(player, roster));
        for (const player of players) {
            if (player !== primary && player !== backupQb) player.mustRenumberDuplicate = true;
        }
    }
}

export function isNumberAvailable(currentPlayer, targetNumber, roster) {
    if (currentPlayer.retiredNumbers?.has(targetNumber)) return false;
    if (
        currentPlayer.teamReservedNumbers?.has(targetNumber) &&
        !(currentPlayer.teamRuleLocked && currentPlayer.teamRuleNumber === targetNumber)
    ) return false;
    const holders = roster.filter(otherPlayer => otherPlayer !== currentPlayer && otherPlayer.JerseyNum === targetNumber);
    if (!holders.length) return true;
    return holders.length === 1 && isAllowedExistingDuplicate(currentPlayer, holders[0], roster);
}


