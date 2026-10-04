import fs from "node:fs";
import path from "node:path";

export class HistoryStore {
  constructor(filePath) { this.filePath = filePath; this.entries = []; }
  load() { try { const value = JSON.parse(fs.readFileSync(this.filePath, "utf8")); this.entries = Array.isArray(value) ? value : []; } catch { this.entries = []; } return this.list(); }
  add(entry) { const stored = { id: entry.id, timestamp: entry.timestamp, toolId: entry.toolId, toolName: entry.toolName, toolVersion: entry.toolVersion, inputPath: entry.inputPath, mode: entry.mode, status: entry.status, summary: entry.summary ?? [], backupPath: entry.backupPath ?? null, reportPath: entry.reportPath ?? null, reviewAvailable: Boolean(entry.reviewAvailable), logReference: entry.logReference ?? entry.id }; this.entries.unshift(stored); this.entries = this.entries.slice(0, 250); fs.mkdirSync(path.dirname(this.filePath), { recursive: true }); fs.writeFileSync(this.filePath, `${JSON.stringify(this.entries, null, 2)}\n`, "utf8"); return stored; }
  list(limit = 100) { return structuredClone(this.entries.slice(0, limit)); }
  get(id) { return structuredClone(this.entries.find(entry => entry.id === id) ?? null); }
}
