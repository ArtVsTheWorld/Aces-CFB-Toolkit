export function parseRef(bin) { if (typeof bin !== "string" || bin.length < 32 || !/[1-9]/.test(bin)) return null; return { tableId: parseInt(bin.slice(0, 15), 2), row: parseInt(bin.slice(15), 2) }; }
export const sf = (record, field) => { try { return record[field]; } catch { return undefined; } };
