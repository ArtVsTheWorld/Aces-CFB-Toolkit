// Enable ANSI colors only for an interactive terminal. Redirected log files
// remain plain text so they are easy to read and share.
const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

// Wrap a value in an ANSI color code when color output is available.
const paint = (code, value) => useColor ? `\x1b[${code}m${value}\x1b[0m` : String(value);

// Shared color helpers keep the meaning of each log category consistent.
export const colors = {
    cyan: value => paint(36, value),
    green: value => paint(32, value),
    yellow: value => paint(33, value),
    red: value => paint(31, value),
    magenta: value => paint(35, value),
    blue: value => paint(94, value),
    orange: value => paint("38;5;208", value),
    bold: value => paint(1, value),
    dim: value => paint(2, value)
};

export function playerName(player) {
    return `${player.FirstName} ${player.LastName}`;
}

const POSITION_LABELS = { MLB: "MIKE", LOLB: "SAM", ROLB: "WILL", LE: "LEDGE", RE: "REDG" };

export function displayPosition(position) {
    return POSITION_LABELS[position] ?? position;
}

export function displayClassYear(player) {
    const schoolYear = String(player.SchoolYear ?? "Unknown class").toUpperCase();
    if (schoolYear === "UNKNOWN CLASS") return schoolYear;
    return `${player.RedshirtStatus === "Previous" ? "RS" : "TRUE"} ${schoolYear}`;
}

// Format the player information repeated by change-oriented log messages.
export function playerDetails(player) {
    return `${playerName(player)} (${displayPosition(player.Position)}, ${displayClassYear(player)}, ${player.OverallRating} OVR)`;
}

// Duplicate messages are printed before any related displacement or change.
export function logDuplicate(teamName, player, otherPlayer) {
    console.log(colors.yellow(
        `DUPLICATE FOUND: ${teamName} | ${playerDetails(otherPlayer)} and ${playerDetails(player)} both wear #${player.JerseyNum}`
    ));
}

export function logPermittedDuplicate(teamName, number, reason) {
    console.log(colors.green(
        `PERMITTED DUPLICATE: ${teamName} | #${number} | ${reason}`
    ));
}

// Displacement messages identify players moved to free a requested number.
export function logDisplacement(teamName, player, oldNumber, newNumber, reason = "number needed") {
    console.log(colors.magenta(
        `REASSIGNED TO FREE A NUMBER: ${teamName} | ${playerDetails(player)} | #${oldNumber} -> #${newNumber} (${reason})`
    ));
}

// Standard change messages describe the player, number change, and reason.
export function logChange(teamName, player, oldNumber, reason) {
    console.log(colors.green(
        `CHANGED: ${teamName} | ${playerDetails(player)} | #${oldNumber} -> #${player.JerseyNum} (${reason})`
    ));
}

// Retired-number corrections use bright blue so they are visually distinct
// from standard changes, duplicates, displacements, and status messages.
export function logRetiredChange(teamName, player, oldNumber) {
    console.log(colors.blue(
        `RETIRED NUMBER PROTECTED: ${teamName} | ${playerDetails(player)} | #${oldNumber} -> #${player.JerseyNum}`
    ));
}

// Fallback assignments use orange so users can immediately distinguish them
// from preferred-number assignments and every other change category.
export function logFallbackChange(teamName, player, oldNumber, reason) {
    console.log(colors.orange(
        `FALLBACK ASSIGNED: ${teamName} | ${playerDetails(player)} | #${oldNumber} -> #${player.JerseyNum} (${reason})`
    ));
}

// General status helpers provide semantic colors without duplicating codes.
export function logInfo(message) {
    console.log(colors.cyan(message));
}

export function logWarning(message) {
    console.log(colors.yellow(message));
}

export function logError(message) {
    console.log(colors.red(message));
}
