import { logChange, logInfo, logWarning, playerDetails, playerName } from "./logger.js";
import { isProtectedNil } from "./nilPolicy.js";

// Team-specific traditions are data-driven. Multiple rules may apply to one
// team, and a rule can reserve its number team-wide or on one side only.
export const TEAM_RULES = [
    {
        teamNames: ["LSU", "Louisiana State"],
        number: 7,
        label: "LSU #7 tradition",
        allowOppositeSidePairWithinOverall: 1,
        tieBreakByEffectiveSchoolYearThenRoll: true
    },
    {
        teamNames: ["LSU", "Louisiana State"],
        number: 18,
        label: "LSU #18 tradition",
        upperclassmenOnly: true,
        preferCaptains: true
    },
    {
        teamNames: ["Ohio State", "Ohio State Buckeyes"],
        number: 0,
        label: "Ohio State Block O tradition",
        upperclassmenOnly: true,
        preferCaptains: true
    },
    {
        teamNames: ["Penn State", "Penn State Nittany Lions"],
        number: 11,
        label: "Penn State defensive #11 tradition",
        side: "defense",
        eligiblePositions: ["LOLB", "ROLB", "LE", "RE", "EDGE"]
    }
];

function normalizeTeamName(name) {
    return String(name ?? "").trim().toLowerCase();
}

function findRules(teamName) {
    const normalized = normalizeTeamName(teamName);
    return TEAM_RULES.filter(rule =>
        rule.teamNames.some(name => normalizeTeamName(name) === normalized)
    );
}

const SCHOOL_YEAR_VALUE = { freshman: 1, sophomore: 2, junior: 3, senior: 4 };

export function effectiveSchoolYear(player) {
    const year = SCHOOL_YEAR_VALUE[String(player.SchoolYear ?? "").trim().toLowerCase()] ?? 0;
    const redshirtBonus = String(player.RedshirtStatus ?? "").trim().toLowerCase() === "previous" ? 1 : 0;
    return year + redshirtBonus;
}

function rankRecipients(players, rule, random) {
    return players
        .map(player => ({ player, roll: random() }))
        .sort((a, b) => {
            const overallDifference = Number(b.player.OverallRating ?? 0) - Number(a.player.OverallRating ?? 0);
            if (overallDifference !== 0) return overallDifference;
            if (rule.tieBreakByEffectiveSchoolYearThenRoll) {
                return effectiveSchoolYear(b.player) - effectiveSchoolYear(a.player) || b.roll - a.roll;
            }
            if (a.player.JerseyNum === rule.number && b.player.JerseyNum !== rule.number) return -1;
            if (b.player.JerseyNum === rule.number && a.player.JerseyNum !== rule.number) return 1;
            return playerName(a.player).localeCompare(playerName(b.player));
        })
        .map(entry => entry.player);
}

function isUpperclassman(player) {
    return player.SchoolYear === "Senior" ||
        (player.SchoolYear === "Junior" && player.RedshirtStatus === "Previous");
}

function hasCaptainsPatch(player) {
    return String(player.CaptainsPatch ?? "none").trim().toLowerCase() !== "none";
}

function rosterForRule(team, rule) {
    if (rule.side === "offense") return team.offense;
    if (rule.side === "defense") return team.defense;
    return [...team.offense, ...team.defense];
}

function eligibilityDescription(rule) {
    if (rule.eligiblePositions) return rule.eligiblePositions.join("/");
    if (rule.upperclassmenOnly) return "upperclassman";
    return "player";
}

function eligiblePlayersForRule(roster, rule, excluded = new Set()) {
    let eligiblePlayers = roster.filter(player =>
        !excluded.has(player) &&
        !isProtectedNil(player) &&
        !player.teamRuleLocked &&
        (!rule.upperclassmenOnly || isUpperclassman(player)) &&
        (!rule.eligiblePositions || rule.eligiblePositions.includes(player.Position))
    );

    if (rule.preferCaptains) {
        const captains = eligiblePlayers.filter(hasCaptainsPatch);
        if (captains.length > 0) eligiblePlayers = captains;
    }
    return eligiblePlayers;
}

function recipientPlan(team, rule, random) {
    if (rule.allowOppositeSidePairWithinOverall !== undefined && !rule.side) {
        const offense = rankRecipients(eligiblePlayersForRule(team.offense, rule), rule, random)[0];
        const defense = rankRecipients(eligiblePlayersForRule(team.defense, rule), rule, random)[0];
        if (offense && defense && Math.abs(Number(offense.OverallRating ?? 0) - Number(defense.OverallRating ?? 0)) <= rule.allowOppositeSidePairWithinOverall) {
            return [
                { player: offense, side: "offense", roster: team.offense },
                { player: defense, side: "defense", roster: team.defense }
            ];
        }
    }

    const roster = rosterForRule(team, rule);
    const recipient = rankRecipients(eligiblePlayersForRule(roster, rule), rule, random)[0];
    return recipient ? [{ player: recipient, side: rule.side, roster }] : [];
}

function applyRule(team, teamName, rule, stats, random) {
    const fullRoster = [...team.offense, ...team.defense];
    const plans = recipientPlan(team, rule, random);

    if (plans.length === 0) {
        stats.teamRulesSkipped++;
        logWarning(
            `TEAM RULE SKIPPED: ${teamName} | ${rule.label} has no eligible non-NIL ${eligibilityDescription(rule)}.`
        );
        return;
    }

    const blockers = plans.flatMap(plan =>
        plan.roster.filter(player => player !== plan.player && player.JerseyNum === rule.number)
    );
    const nilBlocker = blockers.find(isProtectedNil);

    if (nilBlocker) {
        stats.teamRulesSkipped++;
        logWarning(
            `TEAM RULE SKIPPED: ${teamName} | ${rule.label} is protected by NIL player ${playerDetails(nilBlocker)}.`
        );
        return;
    }

    for (const player of fullRoster) {
        if (!player.teamReservedNumbers) player.teamReservedNumbers = new Set();
        player.teamReservedNumbers.add(rule.number);
    }

    const recipients = new Set(plans.map(plan => plan.player));
    const displaced = new Set(blockers.filter(holder => !recipients.has(holder)));
    for (const holder of displaced) {
        holder.mandatoryJerseyRelocation = {
            type: "team-rule",
            label: rule.label,
            reservedNumber: rule.number
        };
    }

    for (const plan of plans) {
        const recipient = plan.player;
        const recipientOldNumber = recipient.JerseyNum;
        recipient.mandatoryJerseyRelocation = undefined;
        recipient.JerseyNum = rule.number;
        recipient.teamRuleLocked = true;
        recipient.teamRuleNumber = rule.number;
        recipient.teamRuleSide = plan.side;
        recipient.teamRuleLabel = rule.label;
        recipient.wasRenumberedThisRun = recipientOldNumber !== rule.number;
        stats.teamRulesApplied++;

        const sideLabel = plans.length === 2 ? ` (${plan.side})` : "";
        logInfo(`TEAM RULE: ${teamName} | ${rule.label}${sideLabel} awarded to ${playerDetails(recipient)}.`);
        if (recipientOldNumber !== rule.number) logChange(teamName, recipient, recipientOldNumber, rule.label);
    }
    stats.teamRuleDisplacements += displaced.size;
}

export function applyTeamSpecificRules(teamGroups, teamNames, stats, random = Math.random) {
    for (const [teamIndex, team] of teamGroups) {
        const teamName = teamNames.get(teamIndex) ?? `Team ${teamIndex}`;
        for (const rule of findRules(teamName)) applyRule(team, teamName, rule, stats, random);
    }
}

export function validateAppliedTeamRules(teamGroups, teamNames) {
    let violations = 0;

    for (const [teamIndex, team] of teamGroups) {
        const fullRoster = [...team.offense, ...team.defense];
        const recipients = fullRoster.filter(player =>
            player.teamRuleLocked && player.teamRuleNumber !== undefined
        );

        for (const recipient of recipients) {
            const roster = recipient.teamRuleSide
                ? team[recipient.teamRuleSide]
                : fullRoster;
            const holders = roster.filter(player => player.JerseyNum === recipient.teamRuleNumber);
            if (holders.length === 1 && holders[0] === recipient) continue;

            violations++;
            const teamName = teamNames.get(teamIndex) ?? `Team ${teamIndex}`;
            logWarning(
                `TEAM RULE VIOLATION: ${teamName} | ${recipient.teamRuleLabel ?? `#${recipient.teamRuleNumber}`} has ${holders.length} eligible-side holders; expected only ${playerDetails(recipient)}.`
            );
        }
    }

    return violations;
}


