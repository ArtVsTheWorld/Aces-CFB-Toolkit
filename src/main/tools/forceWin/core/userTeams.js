import { sf } from "../openSave.js";
import { FORCE_WIN_SCHEMA } from "./schema.js";

// Build the canonical display-name list from the already UID-selected team table.
export function availableTeamNames(teamTable) {
  const fields = FORCE_WIN_SCHEMA.team.nameCandidates;
  return [...new Set(teamTable.records
    .filter(record => record && !record.isEmpty)
    .map(record => fields.map(field => sf(record, field)).find(Boolean))
    .filter(Boolean)
    .map(String))];
}

export function availableTeamOptions(teamTable) {
  const fields = FORCE_WIN_SCHEMA.team.nameCandidates;
  return teamTable.records.flatMap((record, row) => {
    if (!record || record.isEmpty) return [];
    const name = fields.map(field => sf(record, field)).find(Boolean);
    return name ? [{ value: String(row), label: String(name), name: String(name), row }] : [];
  }).sort((left, right) => left.label.localeCompare(right.label) || left.row - right.row);
}

export function resolveTeamRowIds(values, teamTable, label = "Team") {
  const options = availableTeamOptions(teamTable);
  const byId = new Map(options.map(option => [option.value, option]));
  const resolved = new Set();
  for (const value of values ?? []) {
    const id = String(value);
    if (!byId.has(id)) throw new Error(`${label} row ${id} was not found in the selected team table.`);
    resolved.add(id);
  }
  return resolved;
}

// Resolve comma-separated team input. Exact matches win; a unique partial match is accepted.
function resolveTeamNames(raw, teamTable, label = "Team") {
  if (!raw || !raw.trim()) return new Set();
  const available = availableTeamNames(teamTable);
  const byLower = new Map(available.map(name => [name.toLowerCase(), name]));
  const resolved = new Set();
  for (const requested of raw.split(",").map(value => value.trim()).filter(Boolean)) {
    const query = requested.toLowerCase();
    let match = byLower.get(query);
    if (!match) {
      const partial = available.filter(name => name.toLowerCase().includes(query));
      if (partial.length === 1) match = partial[0];
      else if (partial.length > 1) {
        throw new Error(`${label} "${requested}" is ambiguous: ${partial.slice(0, 8).join(", ")}`);
      }
    }
    if (!match) throw new Error(`${label} "${requested}" was not found in the selected team table.`);
    resolved.add(match);
  }
  return resolved;
}

export function resolveSkippedTeamNames(raw, teamTable) {
  return resolveTeamNames(raw, teamTable, "Skipped team");
}
