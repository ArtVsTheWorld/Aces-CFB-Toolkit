function presetConfiguration() {
  captureToolSettings();
  const values = { ...(state.toolSettings.get(state.page) ?? {}) }, teamSelections = {};
  for (const id of Object.keys(values)) if (/^preset-|search|filter|^tape-team-color-/.test(id)) delete values[id];
  for (const select of content.querySelectorAll("select[id]")) {
    if (select.closest(".config-presets") || !saveSpecificSetting(select.id)) continue;
    teamSelections[select.id] = [...select.selectedOptions].map(option => option.textContent.trim());
    delete values[select.id];
  }
  return { version: 1, values, teamSelections, tapeColors: teamTapeOptions(), jerseyMode: state.page === "jersey-renumber" ? state.jerseyMode : undefined };
}

function presetValues(configuration) {
  const values = { ...configuration.values };
  const teamSelections = { ...configuration.teamSelections }, includedControl = document.getElementById("equipment-included");
  if (includedControl && teamSelections["equipment-excluded"] && !document.getElementById("equipment-excluded")) {
    const excluded = new Set(teamSelections["equipment-excluded"].map(label => label.toLowerCase()));
    const included = teamSelections["equipment-included"]?.length ? teamSelections["equipment-included"] : [...includedControl.options].map(option => option.textContent.trim());
    if (excluded.size) { teamSelections["equipment-included"] = included.filter(label => !excluded.has(label.toLowerCase())); if (!teamSelections["equipment-included"].length) throw new Error("Preset not loaded: its older team settings exclude every team. Choose teams manually."); }
    delete teamSelections["equipment-excluded"];
  }
  for (const [id, labels] of Object.entries(teamSelections)) {
    const select = document.getElementById(id);
    if (!select) throw new Error("This preset's team settings are not available in this tool.");
    const wanted = labels.map(label => label.toLowerCase()), options = [...select.options];
    const missing = labels.filter((label, index) => !options.some(option => option.textContent.trim().toLowerCase() === wanted[index]));
    if (missing.length) throw new Error(`Preset not loaded: these ${id === "equipment-donor-players" ? "eligible donor players" : "teams"} are not in this save: ${missing.join(", ")}. Choose a matching save or save a new preset for this one.`);
    if (id === "equipment-donor-players" && wanted.some(label => options.filter(option => option.textContent.trim().toLowerCase() === label).length !== 1)) throw new Error("Preset not loaded: a donor name matches multiple players. Choose those donors manually.");
    const selected = wanted.map(label => options.find(option => option.textContent.trim().toLowerCase() === label).value);
    values[id] = select.multiple ? selected : selected[0] ?? "";
  }
  // Team names, not row indexes, make tape settings portable between saves.
  for (const input of content.querySelectorAll("[data-tape-team][data-tape-color]")) {
    const mix = configuration.tapeColors?.[input.dataset.tapeTeam];
    if (mix === undefined) continue;
    values[input.id] = typeof mix === "string" ? (mix === input.dataset.tapeColor ? "100" : "0") : String(mix[input.dataset.tapeColor]);
  }
  return values;
}

function addPresetControls() {
  const tool = state.bootstrap?.registry?.tools?.find(item => item.id === state.page);
  if (!tool || !state.activeSave?.exists || document.querySelector(".config-presets") || state.commentaryReview) return;
  const actions = content.querySelector(".actions"), controls = content.querySelectorAll("input[id],select[id],textarea[id]");
  if (!actions || ![...controls].some(control => !control.id.includes("filter") && !control.dataset.previewFacet)) return;
  const panel = document.createElement("details"); panel.className = "config-presets";
  panel.innerHTML = `<summary><strong>Config Presets</strong><span>Save and reuse settings for this tool</span></summary><div class="preset-controls"><label for="preset-choice">Saved Preset<select id="preset-choice" data-preset-control><option value="">Choose a preset</option></select></label><button class="button secondary" id="preset-load" data-preset-control type="button" disabled>Load</button><button class="button secondary" id="preset-delete" data-preset-control type="button" disabled>Delete</button><label for="preset-name">Preset Name<input class="input" id="preset-name" data-preset-control maxlength="80" placeholder="e.g. Preseason gear"></label><button class="button secondary" id="preset-save" data-preset-control type="button">Save Preset</button></div><p class="muted">Saved on this computer and kept after restart. Loading replaces this tool's settings, clears its old preview, and never runs the tool. Team selections require matching teams in the Active Save.</p>`;
  actions.before(panel);
  const choice = panel.querySelector("#preset-choice"), name = panel.querySelector("#preset-name");
  const list = () => (state.bootstrap.settings.toolPresets ?? []).filter(preset => preset.toolId === tool.id).sort((a, b) => a.name.localeCompare(b.name));
  const sync = id => {
    choice.innerHTML = '<option value="">Choose a preset</option>' + list().map(preset => `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</option>`).join("");
    choice.value = id ?? "";
    panel.querySelector("#preset-load").disabled = panel.querySelector("#preset-delete").disabled = !choice.value;
  };
  sync();
  choice.addEventListener("change", () => { const preset = list().find(item => item.id === choice.value); name.value = preset?.name ?? ""; panel.querySelector("#preset-load").disabled = panel.querySelector("#preset-delete").disabled = !preset; });
  const busy = async action => {
    panel.querySelectorAll("button").forEach(button => { button.disabled = true; });
    try { await action(); } catch (error) { toast(readableError(error).message); }
    finally { if (panel.isConnected) { panel.querySelector("#preset-save").disabled = false; panel.querySelector("#preset-load").disabled = panel.querySelector("#preset-delete").disabled = !choice.value; } }
  };
  panel.querySelector("#preset-save").addEventListener("click", () => busy(async () => {
    const entered = name.value.trim(); if (!entered) throw new Error("Enter a name for your preset.");
    const existing = list().find(preset => preset.name.toLowerCase() === entered.toLowerCase());
    if (existing && !confirm(`Replace the saved preset "${existing.name}" with your current settings?`)) return;
    const configuration = presetConfiguration();
    if (tool.id === "equipment-patcher" && configuration.values["fix-unlocked-recolor"] && configuration.values["tape-color-mode"] !== "accessory" && [...content.querySelectorAll("[data-tape-color]")].some(input => input.getAttribute("aria-invalid") === "true")) throw new Error("Balance each team's Tape Color to whole percentages totaling 100% before saving this preset.");
    const saved = await window.cfbToolkit.savePreset({ toolId: tool.id, name: entered, id: existing?.id, configuration });
    state.bootstrap.settings.toolPresets = [...(state.bootstrap.settings.toolPresets ?? []).filter(preset => preset.id !== saved.id), saved];
    sync(saved.id); toast("Preset saved");
  }));
  panel.querySelector("#preset-load").addEventListener("click", () => busy(async () => {
    const preset = list().find(item => item.id === choice.value); if (!preset) throw new Error("Choose a preset to load.");
    const values = presetValues(preset.configuration);
    if (!confirm(`Load "${preset.name}"? This replaces your current settings for ${tool.name} and clears its preview.`)) return;
    state.toolSettings.set(tool.id, values);
    if (tool.id === "jersey-renumber") { state.jerseyMode = preset.configuration.jerseyMode === "no-duplicates" ? "no-duplicates" : "standard"; state.jerseyPreviews.clear(); }
    state.equipmentPreviews.delete(tool.id); state.equipmentWizard.delete(tool.id); state.genericPreviews.delete(tool.id); state.forceWinPreviews.delete(tool.id); state.dealbreakerPreviews.delete(tool.id);
    render(); toast(`Loaded ${preset.name} — run a new Preview when ready`);
  }));
  panel.querySelector("#preset-delete").addEventListener("click", () => busy(async () => {
    const preset = list().find(item => item.id === choice.value); if (!preset || !confirm(`Delete the saved preset "${preset.name}"?`)) return;
    state.bootstrap.settings.toolPresets = await window.cfbToolkit.deletePreset({ toolId: tool.id, id: preset.id });
    name.value = ""; sync(); toast("Preset deleted");
  }));
}
