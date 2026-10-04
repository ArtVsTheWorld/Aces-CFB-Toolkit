// Open/save helper for CFB27 franchise saves. Exposes small utilities used
// across the tool: openSave, readTable, ref encode/parse, and a
// safe-field accessor. Keeps original behavior while tightening spacing.
import path from "path";
import { fileURLToPath } from "url";
import maddenPkg from "madden-franchise";
const Franchise = maddenPkg.default || maddenPkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SCHEMA_DIR = process.env.RG_SCHEMA_DIR || path.join(__dirname, "..", "engine-data");
const SCHEMA_OVERRIDE = () => ({ major: 486, minor: 1, gameYear: 27, path: path.join(SCHEMA_DIR, "C27_486_1.gz") });

export async function openSave(savePath) {
    return Franchise.create(savePath, { schemaDirectory: SCHEMA_DIR, schemaOverride: SCHEMA_OVERRIDE() });
}

export function tableByUniqueId(file, uniqueId) {
    const table = file.tables.find(t => t.uniqueId === uniqueId || t.header?.uniqueId === uniqueId);
    if (!table) throw new Error(`Table ${uniqueId} not found`);
    return table;
}

export async function readTable(file, uniqueId) {
    const t = tableByUniqueId(file, uniqueId);
    await t.readRecords();
    return t;
}

export function parseRef(bin) {
    if (typeof bin !== "string" || bin.length < 32 || !/[1-9]/.test(bin)) return null;
    return { tableId: parseInt(bin.slice(0, 15), 2), row: parseInt(bin.slice(15), 2) };
}

export function makeRef(tableId, row) {
    return tableId.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
}

export const sf = (rec, field) => {
    try { return rec[field]; } catch { return undefined; }
};
