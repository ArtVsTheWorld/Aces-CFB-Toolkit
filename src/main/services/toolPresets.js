import { randomUUID } from "node:crypto";
import { normalizeTeamAccessoryColors } from "../tools/equipment/core/recolor.js";

export function validatePresetConfiguration(configuration) {
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration) || configuration.version !== 1 || !configuration.values || typeof configuration.values !== 'object' || Array.isArray(configuration.values)) throw new Error('Invalid preset settings.');
  const scalar = value => typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) || value === null;
  if (Object.values(configuration.values).some(value => !scalar(value) && !(Array.isArray(value) && value.every(scalar)))) throw new Error('Invalid preset control values.');
  if (configuration.teamSelections != null && (typeof configuration.teamSelections !== 'object' || Array.isArray(configuration.teamSelections) || Object.values(configuration.teamSelections).some(value => !Array.isArray(value) || value.some(label => typeof label !== 'string')))) throw new Error('Invalid preset selections.');
  if (configuration.tapeColors != null && (typeof configuration.tapeColors !== 'object' || Array.isArray(configuration.tapeColors) || Object.values(configuration.tapeColors).some(value => typeof value !== 'string' && (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(percent => !Number.isFinite(Number(percent))))))) throw new Error('Invalid preset tape settings.');
  if (configuration.accessoryColors != null) normalizeTeamAccessoryColors(configuration.accessoryColors);
  const serialized = JSON.stringify(configuration);
  if (serialized.length > 250000 || /"(?:__proto__|prototype|constructor)"\s*:/.test(serialized)) throw new Error('Invalid or oversized preset settings.');
  return JSON.parse(serialized);
}

// Settings only: never persist cached plans, review decisions, or an Active Save.
export class ToolPresets {
  constructor(settings) { this.settings = settings; }
  list() { const saved = this.settings.get().toolPresets; return Array.isArray(saved) ? saved : []; }
  save(request) {
    const { toolId, configuration, id } = request ?? {}, name = String(request?.name ?? "").trim();
    if (typeof toolId !== "string" || !toolId || !name || name.length > 80) throw new Error("Give your preset a name from 1 to 80 characters.");
    if (!configuration || typeof configuration !== "object" || Array.isArray(configuration) || configuration.version !== 1 || !configuration.values || typeof configuration.values !== "object" || Array.isArray(configuration.values)) throw new Error("Invalid preset settings.");
    const serialized = JSON.stringify(validatePresetConfiguration(configuration));
    if (serialized.length > 250000 || /"(?:__proto__|prototype|constructor)"\s*:/.test(serialized)) throw new Error("Invalid or oversized preset settings.");
    const presets = this.list(), existing = id ? presets.find(preset => preset.id === id && preset.toolId === toolId) : null;
    if (id && !existing) throw new Error("This preset no longer exists.");
    if (presets.some(preset => preset.toolId === toolId && preset.id !== id && preset.name.toLowerCase() === name.toLowerCase())) throw new Error("A preset with this name already exists. Select it to replace it.");
    if (!existing && presets.length >= 200) throw new Error("You have 200 presets. Delete an unused preset before saving another.");
    const saved = { id: existing?.id ?? randomUUID(), toolId, name, configuration: JSON.parse(serialized), updatedAt: new Date().toISOString() };
    this.settings.update({ toolPresets: [...presets.filter(preset => preset.id !== saved.id), saved] });
    return saved;
  }
  delete({ toolId, id } = {}) {
    const presets = this.list();
    if (!presets.some(preset => preset.id === id && preset.toolId === toolId)) throw new Error("This preset no longer exists.");
    this.settings.update({ toolPresets: presets.filter(preset => preset.id !== id) });
    return this.list();
  }
}
