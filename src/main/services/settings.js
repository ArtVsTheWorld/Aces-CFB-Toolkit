import fs from "node:fs";
import path from "node:path";

const defaults = Object.freeze({ activeSave: null, recentSaves: [], selectedPage: "home", theme: "light", accentColor: null, teamArtwork: {}, toolPresets: [], window: { width: 1380, height: 860 } });
export function normalizeAccentColor(value) { if (value === null) return null; if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error("Choose a valid app color."); return value.toLowerCase(); }

export class SettingsStore {
  constructor(filePath) { this.filePath = filePath; this.value = { ...defaults }; }
  load() {
    try { this.value = { ...defaults, ...JSON.parse(fs.readFileSync(this.filePath, "utf8")) }; } catch { this.value = { ...defaults }; }
    return this.value;
  }
  get() { return structuredClone(this.value); }
  update(patch) {
    this.value = { ...this.value, ...patch };
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(this.value, null, 2)}\n`, "utf8");
    fs.renameSync(temporary, this.filePath);
    return this.get();
  }
}
