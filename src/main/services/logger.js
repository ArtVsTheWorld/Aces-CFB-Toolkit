import fs from "node:fs";
import path from "node:path";

const safeValue = value => typeof value === "string" && value.length > 500 ? `${value.slice(0, 500)}…` : value;

export class AppLogger {
  constructor(directory) { this.directory = directory; }
  write(level, event, details = {}) {
    fs.mkdirSync(this.directory, { recursive: true });
    const entry = { timestamp: new Date().toISOString(), level, event, ...Object.fromEntries(Object.entries(details).map(([key, value]) => [key, safeValue(value)])) };
    fs.appendFileSync(path.join(this.directory, `${entry.timestamp.slice(0, 10)}.jsonl`), `${JSON.stringify(entry)}\n`, "utf8");
    return entry;
  }
  list(limit = 300) {
    if (!fs.existsSync(this.directory)) return [];
    return fs.readdirSync(this.directory).filter(name => name.endsWith(".jsonl")).sort().reverse().flatMap(name => fs.readFileSync(path.join(this.directory, name), "utf8").trim().split(/\r?\n/).filter(Boolean).reverse().map(line => { try { return JSON.parse(line); } catch { return null; } })).filter(Boolean).slice(0, limit);
  }
  clear() {
    if (!fs.existsSync(this.directory)) return;
    for (const name of fs.readdirSync(this.directory)) if (name.endsWith(".jsonl")) fs.rmSync(path.join(this.directory, name));
  }
}
