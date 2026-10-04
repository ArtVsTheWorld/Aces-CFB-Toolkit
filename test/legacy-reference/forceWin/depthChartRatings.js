import { parseRef, sf } from "../openSave.js";

const POSITION_DEPTH = Object.freeze({
  QB: 1, HB: 2, WR: 3, TE: 2, LT: 1, LG: 1, C: 1, RG: 1, RT: 1,
  LE: 1, RE: 1, DT: 2, LOLB: 1, MLB: 2, ROLB: 1, CB: 3, FS: 1, SS: 1,
  K: 1, P: 1
});
const GROUPS = Object.freeze({
  qb: ["QB"], rb: ["HB"], wr: ["WR"], te: ["TE"],
  ol: ["LT", "LG", "C", "RG", "RT"], dl: ["LE", "RE", "DT"],
  lb: ["LOLB", "MLB", "ROLB"], db: ["CB", "FS", "SS"], st: ["K", "P"]
});

const tableId = table => Number(table?.header?.tableId ?? table?.tableId);
const weightedAverage = values => {
  const valid = values.filter(item => Number.isFinite(item.rating));
  if (!valid.length) return null;
  return Math.round(valid.reduce((sum, item) => sum + item.rating * item.weight, 0) /
    valid.reduce((sum, item) => sum + item.weight, 0));
};

// A multi-unit average is naturally more compressed than the game's old team
// OVR. These anchors keep weak/FCS depth charts near their familiar 50s/60s,
// while progressively expanding separation so elite teams still reach the 90s.
const COMPOSITE_SCALE = Object.freeze([
  [40, 40], [50, 48], [60, 57], [65, 63], [70, 70],
  [75, 78], [80, 87], [85, 95], [90, 99]
]);

export function scaleStarterComposite(value) {
  if (!Number.isFinite(value)) return null;
  if (value <= COMPOSITE_SCALE[0][0]) return Math.max(0, Math.round(value));
  if (value >= COMPOSITE_SCALE.at(-1)[0]) return 99;
  const upperIndex = COMPOSITE_SCALE.findIndex(([raw]) => value <= raw);
  const [lowerRaw, lowerScaled] = COMPOSITE_SCALE[upperIndex - 1];
  const [upperRaw, upperScaled] = COMPOSITE_SCALE[upperIndex];
  const progress = (value - lowerRaw) / (upperRaw - lowerRaw);
  return Math.round(lowerScaled + progress * (upperScaled - lowerScaled));
}

// Build ratings from the players who are actually listed on each team's active depth chart.
export function buildDepthChartRatings({ teamTable, playerTable, depthChartTable, depthChartPlayersTable }) {
  const expectedDepthChartId = tableId(depthChartTable);
  const expectedDepthPlayersId = tableId(depthChartPlayersTable);
  const expectedPlayerId = tableId(playerTable);
  const result = new Map();
  for (let teamRow = 0; teamRow < teamTable.records.length; teamRow += 1) {
    const team = teamTable.records[teamRow];
    if (!team || team.isEmpty) continue;
    const byPosition = new Map();
    const starters = {};
    const warnings = [];
    const depthRef = parseRef(sf(team, "DepthChart"));
    if (!depthRef || depthRef.tableId !== expectedDepthChartId) {
      result.set(teamRow, { ratings: {}, starters, warnings: ["team DepthChart reference is missing or targets the wrong table"] });
      continue;
    }
    const depth = depthChartTable.records[depthRef.row];
    if (!depth || depth.isEmpty) {
      result.set(teamRow, { ratings: {}, starters, warnings: [`referenced DepthChart row ${depthRef.row} is missing or empty`] });
      continue;
    }
    for (const [position, limit] of Object.entries(POSITION_DEPTH)) {
      const listRef = parseRef(sf(depth, position));
      if (!listRef || listRef.tableId !== expectedDepthPlayersId) continue;
      const list = depthChartPlayersTable.records[listRef.row];
      const players = [];
      for (let slot = 0; slot < limit; slot += 1) {
        const playerRef = parseRef(sf(list, `Player${slot}`));
        if (!playerRef || playerRef.tableId !== expectedPlayerId) continue;
        const player = playerTable.records[playerRef.row];
        const rating = Number(sf(player, "OverallRating"));
        if (player && !player.isEmpty && Number.isFinite(rating)) {
          players.push({ rating, weight: slot === 0 ? 1 : 0.35 });
          if (slot === 0) {
            starters[position] = {
              row: playerRef.row,
              name: `${sf(player, "FirstName") ?? ""} ${sf(player, "LastName") ?? ""}`.trim() || `Player row ${playerRef.row}`,
              position: String(sf(player, "Position") ?? position),
              rating,
              awareness: Number(sf(player, "AwarenessRating") ?? 0),
              schoolYear: String(sf(player, "SchoolYear") ?? ""),
              redshirtStatus: String(sf(player, "RedshirtStatus") ?? ""),
              age: Number(sf(player, "Age") ?? 0)
            };
          }
        }
      }
      byPosition.set(position, players);
    }
    const ratings = {};
    for (const [group, positions] of Object.entries(GROUPS)) {
      const value = weightedAverage(positions.flatMap(position => byPosition.get(position) ?? []));
      if (value !== null) ratings[group] = value;
    }
    const rawOffense = weightedAverage(["qb", "rb", "wr", "te", "ol"]
      .filter(key => ratings[key] !== undefined).map(key => ({
        rating: ratings[key],
        weight: key === "qb" ? 1.6 : key === "ol" ? 1.3 : 1
      })));
    const rawDefense = weightedAverage(["dl", "lb", "db"]
      .filter(key => ratings[key] !== undefined).map(key => ({ rating: ratings[key], weight: key === "dl" ? 1.3 : 1 })));
    ratings.rawOffense = rawOffense;
    ratings.rawDefense = rawDefense;
    ratings.offense = scaleStarterComposite(rawOffense);
    ratings.defense = scaleStarterComposite(rawDefense);
    const compositeParts = [
      { rating: rawOffense, weight: 1 },
      { rating: rawDefense, weight: 1 },
      { rating: ratings.st, weight: 0.2 }
    ];
    const rawComposite = weightedAverage(compositeParts);
    ratings.rawComposite = rawComposite;
    ratings.overall = scaleStarterComposite(rawComposite);
    for (const key of Object.keys(ratings)) if (ratings[key] === null) delete ratings[key];
    const required = Object.keys(POSITION_DEPTH);
    const missing = required.filter(position => !starters[position]);
    if (missing.length) warnings.push(`incomplete depth chart (${missing.join(", ")} missing)`);
    result.set(teamRow, { ratings, starters, warnings });
  }
  return result;
}
