// Player Filter: small helpers deciding whether a player should be
// considered for renumbering (valid position, real roster slot, etc.).
const VALID_POSITIONS = new Set(["QB", "HB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "LE", "RE", "EDGE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS", "K", "P"]);

function isPlaceholderPlayer(player) {
    return player.FirstName === "Omar" && player.LastName === "Omar" && player.Position === "QB" && player.JerseyNum === 0;
}

export function shouldProcess(player) {
    if (player.TeamIndex < 0 || player.TeamIndex === 255) return false;
    if (isPlaceholderPlayer(player)) return false;
    if (!VALID_POSITIONS.has(player.Position)) return false;
    return true;
}
