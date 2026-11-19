import fs from "node:fs";
import path from "node:path";
import ratingsDisplay from '../../shared/ratingsDisplay.cjs';

const defaults = Object.freeze({ textSize: "standard", ratingsDisplay: "numeric", toolDefaults: {}, activeSave: null, recentSaves: [], selectedPage: "home", theme: "light", accentColor: null, baseColor: null, updateNotes: null, lastSeenRelease: null, teamArtwork: {}, dynastyArtwork: {}, legacyArtworkMigration: null, customMatchupModel: null, toolPresets: [], window: { width: 1380, height: 860 } });
export function validateRatingsDisplay(value) { if (!ratingsDisplay.modes.includes(value)) throw new Error('Choose a supported ratings display.'); return value; }
export function normalizeAccentColor(value) { if (value === null) return null; if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error("Choose a valid app color."); return value.toLowerCase(); }

export class SettingsStore {
  constructor(filePath) { this.filePath = filePath; this.value = { ...defaults }; }
  load() {
    try { this.value = { ...defaults, ...JSON.parse(fs.readFileSync(this.filePath, "utf8")) }; } catch { this.value = { ...defaults }; }
    this.value.ratingsDisplay = ratingsDisplay.normalize(this.value.ratingsDisplay);
    return this.value;
  }
  get() { return structuredClone(this.value); }
  update(patch) {
    const next = { ...this.value, ...patch };
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    fs.renameSync(temporary, this.filePath);
    this.value = next;
    return this.get();
  }
}
