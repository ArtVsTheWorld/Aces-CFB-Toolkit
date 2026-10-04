import fs from "node:fs";
import path from "node:path";
import maddenPkg from "madden-franchise";
import { validateSavePath } from "./files.js";

const Franchise = maddenPkg.default || maddenPkg;
export const PLAYER_TABLE_UID = 1612938518;
export const TEAM_TABLE_UID = 3359508968;
export const SUPPORTED_SCHEMAS = Object.freeze([
  Object.freeze({ version: "C27_468_2", gameYear: 27, major: 468, minor: 2, saveHeaders: ["809_0", "814_0"] }),
  Object.freeze({ version: "C27_486_6", gameYear: 27, major: 486, minor: 6, saveHeaders: ["833_0"] })
]);
export function resolveBundledSchemaForHeader(gameYear, major, minor) { const headerVersion=`${Number(major)}_${Number(minor)}`; return SUPPORTED_SCHEMAS.find(item=>item.gameYear===Number(gameYear)&&item.saveHeaders.includes(headerVersion))??null; }
const DIRECTIONAL_FCS_ASSETS = new Set(["FCSE", "FCSMW", "FCSNW", "FCSSE", "FCSW"]);

export function isDirectionalFcsTeam(record) {
  if (!record || record.isEmpty) return false;
  const identifiers = [record.AssetName, record.UniformAssetName, record.ShortName, record.TEAM_PREFIX_NAME]
    .map(value => String(value ?? "").trim().toUpperCase());
  return identifiers.some(value => DIRECTIONAL_FCS_ASSETS.has(value)) ||
    (Number(record.TeamIndex) === 255 && /^FCS\s+(?:EAST|MIDWEST|NORTHWEST|SOUTHEAST|WEST)$/i.test(String(record.DisplayName ?? "").trim()));
}

export function detectSaveSchema(savePath, schemaDirectory) {
  const input = validateSavePath(savePath);
  const header = new Franchise(input, { autoParse: false });
  const meta = header.expectedSchemaVersion ?? {};
  const match = resolveBundledSchemaForHeader(header.gameYear, meta.major, meta.minor);
  const displayPart = value => Number.isFinite(Number(value)) ? Number(value) : "?";
  const detected = `C${displayPart(header.gameYear)}_${displayPart(meta.major)}_${displayPart(meta.minor)}`;
  if (!match) throw new Error(`Save Version: ${detected} · Unsupported. Ace's CFB Toolkit will not guess a schema or modify this save.`);
  const schemaPath = path.join(schemaDirectory, `${match.version}.gz`);
  if (!fs.existsSync(schemaPath)) throw new Error(`The bundled ${match.version} schema is missing. Reinstall Ace's CFB Toolkit.`);
  return { ...match, saveHeader: detected, path: schemaPath, supported: true };
}

export function inspectSaveSchema(savePath, schemaDirectory) {
  try { return detectSaveSchema(savePath, schemaDirectory); }
  catch (error) { return { version: /Save Version: ([^·]+)/.exec(error.message)?.[1]?.trim() ?? "Unknown", supported: false, error: error.message }; }
}

export async function openCfb27Save(savePath, schemaPath) {
  const input = validateSavePath(savePath);
  const detected = detectSaveSchema(input, path.dirname(schemaPath));
  const franchise = await Franchise.create(input, { schemaDirectory: path.dirname(detected.path), schemaOverride: { major: detected.major, minor: detected.minor, gameYear: detected.gameYear, path: detected.path } });
  return { franchise, savePath: input };
}

export function tableByUniqueId(franchise, uniqueId) {
  const table = franchise.tables.find(candidate => candidate.uniqueId === uniqueId || candidate.header?.uniqueId === uniqueId);
  if (!table) throw new Error(`Required game table ${uniqueId} was not found in this save.`);
  return table;
}

export async function readTables(franchise, uniqueIds) {
  const tables = Object.fromEntries(Object.entries(uniqueIds).map(([name, uid]) => [name, tableByUniqueId(franchise, uid)]));
  await Promise.all(Object.values(tables).map(table => table.readRecords()));
  return tables;
}

export function availableTeams(records) {
  const teams = []; const seen = new Set();
  records.forEach((record, row) => { if (!record || record.isEmpty) return; const teamIndex = Number.isInteger(Number(record.TeamIndex)) ? Number(record.TeamIndex) : row; const name = String(record.DisplayName || record.LongName || record.ShortName || "").trim(); const key = `${teamIndex}|${name.toLowerCase()}`; if (!name || seen.has(key)) return; seen.add(key); teams.push({ teamIndex, name }); });
  return teams.sort((left, right) => left.name.localeCompare(right.name));
}

export function resolveTeam(value, teams) {
  const wanted = String(value ?? "").trim().toLowerCase();
  const exact = teams.filter(team => team.name.toLowerCase() === wanted); if (exact.length === 1) return exact[0];
  const partial = teams.filter(team => team.name.toLowerCase().includes(wanted)); if (partial.length === 1) return partial[0];
  if (!wanted) throw new Error("Select a team.");
  if (partial.length > 1) throw new Error(`Team name is ambiguous: ${partial.slice(0, 6).map(team => team.name).join(", ")}.`);
  throw new Error(`No team matched "${value}".`);
}
