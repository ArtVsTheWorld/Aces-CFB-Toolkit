import { normalizeCustomModel } from "../tools/forceWin/core/customModel.js";

// A personal preference, not part of a dynasty or packaged application assets.
export function saveCustomMatchupModel(settings, input) {
  const customMatchupModel = normalizeCustomModel(input);
  if (!customMatchupModel) throw new Error("Choose and save a custom matchup model.");
  return settings.update({ customMatchupModel });
}
