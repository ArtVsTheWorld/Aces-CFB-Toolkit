import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export class ReviewSnapshots {
  constructor(directory) { this.directory = directory; }
  file(id) { if (!/^[0-9a-f-]{36}$/i.test(String(id))) throw new Error("Invalid run ID."); return path.join(this.directory, `${id}.json.gz`); }
  save(id, result, rows) {
    fs.mkdirSync(this.directory, { recursive: true });
    let reviewRows = rows ?? result.details?.changes ?? [];
    if (result.mode === 'apply' && result.resultKind === 'automatic-force-win' && result.details?.leaveUnchangedRows?.length) {
      const omitted = new Set(result.details.leaveUnchangedRows.map(Number));
      reviewRows = reviewRows.map(row => omitted.has(Number(row.row)) ? { ...row, affected: false, forcedWinner: 'Unchanged', proposedForceWin: row.existingForceWin, status: 'Left unchanged by user' } : row);
    }
    const snapshot = { result: { ...result, planId: null, details: { ...result.details, changes: reviewRows.slice(0, 1000), totalPreviewRows: reviewRows.length } }, rows: reviewRows };
    const destination = this.file(id), temporary = `${destination}.tmp`;
    fs.writeFileSync(temporary, zlib.gzipSync(JSON.stringify(snapshot)));
    fs.renameSync(temporary, destination);
    return true;
  }
  get(id) { try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(this.file(id))).toString("utf8")); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
  prune(keptIds) { if (!fs.existsSync(this.directory)) return; const keep = new Set(keptIds); for (const name of fs.readdirSync(this.directory)) { const match = /^([0-9a-f-]{36})\.json\.gz$/i.exec(name); if (match && !keep.has(match[1])) fs.unlinkSync(path.join(this.directory, name)); } }
}
