import { randomUUID } from "node:crypto";

// Settings only: never persist cached plans, review decisions, or an Active Save.
export class ToolPresets {
  constructor(settings) { this.settings = settings; }
  list() { const saved = this.settings.get().toolPresets; return Array.isArray(saved) ? saved : []; }
  save(request) {
    const { toolId, configuration, id } = request ?? {}, name = String(request?.name ?? "").trim();
    if (typeof toolId !== "string" || !toolId || !name || name.length > 80) throw new Error("Give your preset a name from 1 to 80 characters.");
    if (!configuration || typeof configuration !== "object" || Array.isArray(configuration) || configuration.version !== 1 || !configuration.values || typeof configuration.values !== "object" || Array.isArray(configuration.values)) throw new Error("Invalid preset settings.");
    const serialized = JSON.stringify(configuration);
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
