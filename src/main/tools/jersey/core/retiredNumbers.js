// Retired-number rules are keyed by team display-name aliases. Add future
// schools here without changing the assignment algorithm.
export const RETIRED_NUMBER_RULES = [
    { teamNames: ["Akron"], numbers: [89] },
    { teamNames: ["Alabama A&M"], numbers: [22, 55] },
    { teamNames: ["Appalachian State"], numbers: [14, 23, 32, 38, 71] },
    { teamNames: ["Arizona State"], numbers: [11, 27, 33, 40, 42] },
    { teamNames: ["Arkansas"], numbers: [12, 77] },
    { teamNames: ["Army"], numbers: [24, 35, 41, 61] },
    { teamNames: ["Auburn"], numbers: [2, 7, 34, 88] },
    { teamNames: ["Austin Peay"], numbers: [30, 84] },
    { teamNames: ["Boise State"], numbers: [12] },
    { teamNames: ["Boston College"], numbers: [22, 68] },
    { teamNames: ["Bowling Green"], numbers: [29] },
    { teamNames: ["BYU", "Brigham Young"], numbers: [6, 8, 9, 14, 40, 81] },
    { teamNames: ["California", "Cal"], numbers: [12] },
    { teamNames: ["Central Michigan"], numbers: [62] },
    { teamNames: ["Clemson"], numbers: [4, 28, 66] },
    { teamNames: ["Colorado"], numbers: [2, 11, 12, 19, 24, 67] },
    { teamNames: ["Colorado State"], numbers: [14, 21, 48] },
    { teamNames: ["Drake"], numbers: [43] },
    { teamNames: ["East Carolina"], numbers: [16, 18, 29, 36] },
    { teamNames: ["Eastern Illinois"], numbers: [17, 18] },
    { teamNames: ["Eastern Washington"], numbers: [71, 84] },
    { teamNames: ["Fresno State"], numbers: [4, 8, 9, 12, 14, 15, 21, 22, 83] },
    { teamNames: ["Georgia"], numbers: [21, 34, 40, 62] },
    { teamNames: ["Georgia Southern"], numbers: [3, 8] },
    { teamNames: ["Georgia Tech"], numbers: [19] },
    { teamNames: ["Hawaii", "Hawai'i"], numbers: [15, 32] },
    { teamNames: ["Hofstra"], numbers: [3, 33, 74, 77, 89] },
    { teamNames: ["Houston"], numbers: [7, 11, 23, 78] },
    { teamNames: ["Idaho"], numbers: [9, 17, 53, 56, 64] },
    { teamNames: ["Idaho State"], numbers: [41] },
    { teamNames: ["Illinois"], numbers: [50, 77] },
    { teamNames: ["Indiana"], numbers: [32] },
    { teamNames: ["Indiana State"], numbers: [26] },
    { teamNames: ["Iowa"], numbers: [24, 62] },
    { teamNames: ["Iowa State"], numbers: [30] },
    { teamNames: ["Kansas"], numbers: [21, 42, 48] },
    { teamNames: ["Kansas State"], numbers: [11] },
    { teamNames: ["Kent State"], numbers: [9, 40, 79, 99] },
    { teamNames: ["Kentucky"], numbers: [21, 22] },
    { teamNames: ["Lafayette"], numbers: [53] },
    { teamNames: ["Liberty"], numbers: [23, 71, 83, 86] },
    { teamNames: ["Lincoln (MO)"], numbers: [20] },
    { teamNames: ["Louisville"], numbers: [8, 16] },
    { teamNames: ["LSU", "Louisiana State"], numbers: [20, 21, 37] },
    { teamNames: ["Marshall"], numbers: [72] },
    { teamNames: ["Memphis"], numbers: [8, 20, 30, 59, 64, 79, 83] },
    { teamNames: ["Miami (FL)", "Miami"], numbers: [10, 14, 42, 89] },
    { teamNames: ["Miami (OH)", "Miami Ohio"], numbers: [7, 40, 42] },
    { teamNames: ["Michigan"], numbers: [11, 21, 47, 48, 87, 98] },
    { teamNames: ["Michigan State"], numbers: [26, 46, 48, 78, 90, 95] },
    { teamNames: ["Middle Tennessee", "Middle Tennessee State"], numbers: [14, 20] },
    { teamNames: ["Minnesota"], numbers: [10, 54, 72] },
    { teamNames: ["Mississippi Valley State"], numbers: [18] },
    { teamNames: ["Missouri"], numbers: [23, 27, 37, 42, 44, 83] },
    { teamNames: ["Missouri Southern"], numbers: [9] },
    { teamNames: ["Montana"], numbers: [15, 22] },
    { teamNames: ["Montana State"], numbers: [21, 52, 77, 78] },
    { teamNames: ["Murray State"], numbers: [10, 11] },
    { teamNames: ["Navy"], numbers: [12, 19, 27, 30] },
    { teamNames: ["NC State", "North Carolina State"], numbers: [17, 18, 23, 40, 51, 63, 77, 81] },
    { teamNames: ["Nebraska"], numbers: [60, 64] },
    { teamNames: ["Nevada"], numbers: [27, 41] },
    { teamNames: ["New Mexico"], numbers: [42, 43, 44] },
    { teamNames: ["North Carolina"], numbers: [22, 46, 50, 59, 99] },
    { teamNames: ["North Dakota"], numbers: [41] },
    { teamNames: ["North Texas"], numbers: [28, 33, 55, 75] },
    { teamNames: ["Ohio State", "Ohio State Buckeyes"], numbers: [10, 22, 27, 31, 40, 45, 47, 99] },
    { teamNames: ["Oklahoma State"], numbers: [21, 34, 43, 55] },
    { teamNames: ["Ole Miss", "Mississippi"], numbers: [10, 18, 38, 74] },
    { teamNames: ["Oregon State"], numbers: [11] },
    { teamNames: ["Pacific"], numbers: [22, 39, 40, 41] },
    { teamNames: ["Penn State"], numbers: [22] },
    { teamNames: ["Pittsburgh", "Pitt"], numbers: [1, 13, 33, 42, 65, 73, 75, 79, 89, 97, 99] },
    { teamNames: ["Portland State"], numbers: [11, 18] },
    { teamNames: ["Rhode Island"], numbers: [12] },
    { teamNames: ["Rutgers"], numbers: [52] },
    { teamNames: ["San Diego State"], numbers: [8, 25, 28] },
    { teamNames: ["San Jose State", "San José State"], numbers: [52] },
    { teamNames: ["Savannah State"], numbers: [2] },
    { teamNames: ["South Carolina"], numbers: [2, 37, 38, 56] },
    { teamNames: ["Southeast Missouri State"], numbers: [67] },
    { teamNames: ["Southern Miss", "Southern Mississippi"], numbers: [4, 10, 44] },
    { teamNames: ["Stanford"], numbers: [1, 7, 16] },
    { teamNames: ["Syracuse"], numbers: [5, 9, 39, 44, 47, 72, 88] },
    { teamNames: ["TCU", "Texas Christian"], numbers: [5, 8, 45] },
    { teamNames: ["Tennessee"], numbers: [16, 32, 45, 49, 61, 62, 91, 92] },
    { teamNames: ["Texas"], numbers: [10, 12, 20, 22, 34, 60] },
    { teamNames: ["Texas Tech"], numbers: [44, 55, 81] },
    { teamNames: ["Toledo"], numbers: [16, 18, 77, 82] },
    { teamNames: ["Tulsa"], numbers: [14, 17, 31, 36, 45, 55, 64, 81, 83] },
    { teamNames: ["UCLA"], numbers: [5, 8, 13, 16, 34, 38, 42, 79, 80, 84] },
    { teamNames: ["UNLV"], numbers: [12] },
    { teamNames: ["USC", "Southern California"], numbers: [3, 5, 11, 12, 13, 20, 32, 33] },
    { teamNames: ["Utah"], numbers: [22] },
    { teamNames: ["Virginia"], numbers: [12, 24, 35, 48, 73, 97] },
    { teamNames: ["Virginia Tech"], numbers: [10, 25, 73, 78, 84] },
    { teamNames: ["Washington State"], numbers: [7, 14] },
    { teamNames: ["Weber State"], numbers: [10] },
    { teamNames: ["West Virginia"], numbers: [9, 21, 75, 77, 90] },
    { teamNames: ["Western Michigan"], numbers: [44, 49] },
    { teamNames: ["Wisconsin"], numbers: [33, 35, 40, 80, 83, 88] },
    { teamNames: ["Wyoming"], numbers: [17] }
];

const normalize = value => String(value ?? "").trim().toLowerCase();

export function getRetiredNumbers(teamName) {
    const normalized = normalize(teamName);
    const rule = RETIRED_NUMBER_RULES.find(candidate =>
        candidate.teamNames.some(alias => normalize(alias) === normalized)
    );
    return new Set(rule?.numbers ?? []);
}

// Attach the applicable set to every player so low-level number helpers can
// enforce it without depending on team-table lookups.
export function applyRetiredNumberRules(teamGroups, teamNames) {
    for (const [teamIndex, team] of teamGroups) {
        const retiredNumbers = getRetiredNumbers(teamNames.get(teamIndex));
        for (const player of [...team.offense, ...team.defense, ...(team.specialists ?? [])]) player.retiredNumbers = retiredNumbers;
    }
}


