// Validator: inspect finished rosters for duplicates and remaining
// suboptimal jerseys. This is read-only and intended for reporting.
import { isFallbackNumber, isPreferredNumber } from "./numberRules.js";
import { getQuarterbackRank, isAllowedExistingDuplicate } from "./duplicateResolver.js";
import { displayPosition } from "./logger.js";
import { isProtectedPlayer } from "./playerProtection.js";

export function validateRoster(teamName, sideName, roster) {
    let duplicates = 0, suboptimal = 0;
    const fallbackPlayers = [];
    const protectedPlayerFallbackPlayers = [];
    const protectedPlayerDuplicates = [];
    const grouped = new Map(); for (const player of roster) { if (!grouped.has(player.JerseyNum)) grouped.set(player.JerseyNum, []); grouped.get(player.JerseyNum).push(player); }
    for (const [number, players] of grouped) {
        if (players.length <= 1) continue;
        const allowedQBShare = players.length === 2 && isAllowedExistingDuplicate(players[0], players[1], roster);
        if (allowedQBShare) continue;
        if (players.every(isProtectedPlayer)) {
            protectedPlayerDuplicates.push({ number, players });
            continue;
        }

        const conflictingPlayers = players.filter(player => player.mustRenumberDuplicate);
        duplicates += conflictingPlayers.length || players.length - 1;
        console.log(`\n${teamName} | ${sideName} | Duplicate #${number}`);
        for (const p of players) console.log(`   ${p.FirstName} ${p.LastName} (${displayPosition(p.Position)}) (${p.SchoolYear}) | mustRenumber=${p.mustRenumberDuplicate}`);
    }
    for (const player of roster) {
        if (!isProtectedPlayer(player) && !isPreferredNumber(player)) suboptimal++;
        if (isFallbackNumber(player)) {
            if (isProtectedPlayer(player)) protectedPlayerFallbackPlayers.push(player);
            else fallbackPlayers.push(player);
        }
    }
    return { duplicates, suboptimal, fallbackPlayers, protectedPlayerFallbackPlayers, protectedPlayerDuplicates };
}

export function countTopThreeQbDuplicateConflicts(roster) {
    return roster.filter(player => {
        if (player.Position !== "QB" || isProtectedPlayer(player)) return false;
        const rank = getQuarterbackRank(player, roster);
        return rank !== null && rank <= 3 &&
            roster.some(other => other !== player && other.JerseyNum === player.JerseyNum);
    }).length;
}


