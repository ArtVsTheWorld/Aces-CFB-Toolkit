function readJsonControl(id, fallback) {
  try { return JSON.parse(document.getElementById(id)?.value ?? "null") ?? fallback; } catch { throw new Error("A saved configuration is invalid. Reset this feature before previewing."); }
}
function undershirtSettingsMarkup(prepared) {
  const defaults = prepared.defaultUndershirtWeights;
  return `<div id="undershirt-field"><label for="undershirt-color"><strong>Undershirt Mix</strong></label><select id="undershirt-color"><option value="weighted">Toolkit Weighted Distribution</option><option value="primary">Team Primary</option><option value="secondary">Team Secondary</option><option value="white">White</option><option value="black">Black</option><option value="custom">Custom Percentages</option></select><p class="muted" id="undershirt-distribution">${escapeHtml(prepared.undershirtDistribution)}</p><div data-undershirt-custom>${Object.entries(defaults).map(([group, mix]) => `<section class="percentage-section"><h3>${group === "large" ? "Muscular / Standard Builds" : "Other Builds"}</h3><div class="probability-grid three">${Object.entries(mix).map(([color, value]) => percentageControl(`undershirt-${group}-${color}`, ({ hoodie: "Sleeveless Hoodie", none: "No Undershirt", primary: "Team Primary", secondary: "Team Secondary", white: "White", black: "Black" })[color], value)).join("")}</div><div class="percentage-total"><strong data-shirt-total="${group}"></strong><button type="button" class="button secondary" data-shirt-balance="${group}">Balance to 100%</button></div></section>`).join("")}</div></div>`;
}
function undershirtWeightOptions(root = document) {
  return Object.fromEntries(["regular", "large"].map(group => [group, Object.fromEntries(["hoodie", "secondary", "primary", "white", "black", "none"].map(color => [color, Number(configurationRead(root, `undershirt-${group}-${color}`).value)]))]));
}
function visorSettingsMarkup(prepared) {
  return `<div id="visor-settings-field"><p class="muted">These percentages control both the chance to add a visor and the maximum visor share within each position group. Existing visors are never removed. FBS and directional FCS populations are counted separately.</p><div class="probability-grid three">${Object.entries(prepared.defaultVisorFrequencies).map(([group, value]) => percentageControl(`visor-frequency-${group.replace("/", "-")}`, group, value)).join("")}</div></div>`;
}
function visorFrequencyOptions() { return Object.fromEntries(["QB", "HB", "FB", "WR", "TE", "OL", "EDGE", "DT", "LB", "CB", "FS", "SS", "K/P"].map(group => [group, Number(document.getElementById(`visor-frequency-${group.replace("/", "-")}`).value)])); }
function balanceWholeInputs(inputs) {
  const numbers = inputs.map(input => Math.max(0, Math.min(100, Number(input.value) || 0))), total = numbers.reduce((a, b) => a + b, 0), scaled = numbers.map((value, index) => total ? value * 100 / total : index ? 0 : 100), whole = scaled.map(Math.floor);
  const order = scaled.map((value, index) => ({ index, remainder: value % 1 })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let left = 100 - whole.reduce((a, b) => a + b, 0), at = 0; left > 0; left--, at++) whole[order[at].index]++;
  inputs.forEach((input, index) => input.value = String(whole[index]));
}
function bindAdvancedPassWindows() {
  const field = document.getElementById("undershirt-field");
  if (field) condenseConfiguration(field, { title: "Undershirt Settings", description: "Choose an existing preset or edit whole-number percentages for each body group. Only the Rolled-Jersey Undershirts pass uses these settings.", dependencies: ["fix-rolled"], enabled: () => document.getElementById("fix-rolled").checked, summary: root => configurationLabel(root, "undershirt-color") });
  const visors = document.getElementById("visor-settings-field");
  if (visors) condenseConfiguration(visors, { title: "Visor Frequency", description: "Configure each position group independently. These are addition chances and population limits, not a command to replace existing visors.", dependencies: ["fix-visors"], enabled: () => document.getElementById("fix-visors").checked, summary: root => ["QB", "WR", "LB", "OL"].map(group => `${group} ${configurationRead(root, `visor-frequency-${group}`).value}%`).join(" · ") });
  bindCustomMatchupEditor();
}
function syncAdvancedDraft(root) {
  const mode = configurationRead(root, "undershirt-color");
  if (mode) {
    root.querySelector("[data-undershirt-custom]").hidden = mode.value !== "custom";
    configurationRead(root, "undershirt-distribution").hidden = mode.value !== "weighted";
    for (const group of ["regular", "large"]) {
      const inputs = [...root.querySelectorAll(`[data-config-original^="undershirt-${group}-"]`)];
      root.querySelector(`[data-shirt-total="${group}"]`).textContent = `Total: ${inputs.reduce((sum, input) => sum + Number(input.value), 0)}%`;
      const button = root.querySelector(`[data-shirt-balance="${group}"]`);
      if (!button.dataset.bound) { button.dataset.bound = "true"; button.addEventListener("click", () => { balanceWholeInputs(inputs); inputs[0].dispatchEvent(new Event("input", { bubbles: true })); }); }
    }
  }
}
function validateAdvancedDraft(root) {
  if (configurationRead(root, "undershirt-color")?.value === "custom") {
    for (const [group, weights] of Object.entries(undershirtWeightOptions(root))) if (Object.values(weights).some(value => !Number.isInteger(value) || value < 0 || value > 100) || Object.values(weights).reduce((a, b) => a + b, 0) !== 100) return `${group === "large" ? "Muscular / Standard" : "Other Builds"}: use whole percentages totaling 100%.`;
  }
  return "";
}

function customMatchupMarkup() { return `<input id="force-custom-model-json" type="hidden" value="${escapeHtml(JSON.stringify(state.bootstrap?.settings?.customMatchupModel ?? null))}"><section class="configuration-entry" id="custom-model-entry" hidden><div><strong>Custom Matchup Model</strong><p id="custom-model-summary">Build from an existing model, then tune its influences and weekly force-win limit.</p></div><button type="button" class="button secondary" id="configure-custom-model">Customize Model</button></section>`; }
function bindCustomMatchupEditor() {
  const button = document.getElementById("configure-custom-model"), profile = document.getElementById("force-profile");
  if (!button || button.dataset.bound) return;
  button.dataset.bound = "true";
  const sync = () => { document.getElementById("custom-model-entry").hidden = profile.value !== "custom"; const value = readJsonControl("force-custom-model-json", null); document.getElementById("custom-model-summary").textContent = value ? `Based on ${value.basePreset} · Weekly limit: ${value.maxForceWinsPerWeek || "None"}` : "Choose a starting preset and save your model before Preview."; };
  profile.addEventListener("change", sync); document.getElementById("force-custom-model-json").addEventListener("change", sync);
  button.addEventListener("click", openCustomMatchupEditor); sync();
}
function openCustomMatchupEditor() {
  const prepared = state.prepared.get(`automatic-force-win|${state.activeSave.path}`), fields = prepared.customModelFields;
  let draft = structuredClone(readJsonControl("force-custom-model-json", prepared.customModelPresets.balanced));
  const dialog = createConfigurationDialog({ title: "Build Your Matchup Model", eyebrow: "Smart Force Win", description: "Start from an existing model, then tune how ratings, units, coaches, venue and rivalry/FCS context affect decisions and projected lines. Safety protections and the active-week lock always remain in place.", saveLabel: "Save Model" });
  if (!dialog) return;
  const groups = [...new Set(fields.map(field => field.group))], percentage = field => field.max === 1 || field.path.includes(".probability");
  const requiredGroups = new Set(["Team Ratings", "Passing Personnel", "Unit Matchups", "Final Ratings / Matchup Blend", "Coach Level Blend", "Continuity Staff Blend"]);
  const validate = () => {
    for (const field of fields) if (!Number.isFinite(draft.values[field.path]) || draft.values[field.path] < field.min || draft.values[field.path] > field.max) return `${field.label}: value is outside the allowed range.`;
    for (const group of requiredGroups) if (Math.abs(fields.filter(field => field.group === group).reduce((sum, field) => sum + draft.values[field.path], 0) - 1) > 1e-8) return `${group}: weights must total 100%. Use Balance to 100%.`;
    if (fields.filter(field => field.group === "Position Composite").reduce((sum, field) => sum + draft.values[field.path], 0) <= 0) return "Give at least one Position Composite a positive weight.";
    const values = draft.values;
    if (!(values["disparityLevels.2.min"] < values["disparityLevels.1.min"] && values["disparityLevels.1.min"] < values["disparityLevels.0.min"])) return "Mismatch thresholds must increase from Medium to High to Extreme.";
    const curve = fields.filter(field => field.path.includes(".probability"));
    if (curve.some((field, index) => index && values[field.path] < values[curve[index - 1].path])) return "Force-win chances must not decrease as the mismatch grows.";
    if (values["bettingLines.minimumTotal"] > values["bettingLines.maximumTotal"]) return "Minimum Over/Under cannot exceed Maximum Over/Under.";
    return "";
  };
  const update = () => {
    const error = validate(); dialog.querySelector("[data-config-error]").textContent = error; dialog.querySelector("[data-config-error]").hidden = !error; dialog.querySelector("[data-config-save]").disabled = Boolean(error);
    for (const field of fields) dialog.querySelector(`[data-slider-value="${field.path}"]`).textContent = `${Number((draft.values[field.path] * (percentage(field) ? 100 : 1)).toFixed(2))}${percentage(field) ? "%" : ""}`;
    for (const group of requiredGroups) dialog.querySelector(`[data-model-total="${group}"]`).textContent = `Total: ${Number((fields.filter(field => field.group === group).reduce((sum, field) => sum + draft.values[field.path], 0) * 100).toFixed(2))}%`;
    dialog.querySelector("[data-week-limit-value]").textContent = draft.maxForceWinsPerWeek ? `${draft.maxForceWinsPerWeek} per week` : "No limit";
  };
  const render = () => {
    dialog.querySelector(".configuration-body").innerHTML = `<div class="model-preset-toolbar"><label><strong>Starting Preset</strong><select data-model-preset>${prepared.profiles.map(profile => `<option value="${profile.value}" ${profile.value === draft.basePreset ? "selected" : ""}>${escapeHtml(profile.label)}</option>`).join("")}</select></label><button class="button secondary" type="button" data-load-model-preset>Load Starting Preset</button></div><p class="muted">Loading a preset replaces this draft. It never runs the tool. Relative weight groups must total 100%; other sliders control the strength of individual factors.</p><section class="model-slider-section"><h3>Weekly Force-Win Limit</h3><div class="model-slider"><span><span class="model-slider-caption"><label for="model-week-limit">Maximum New Force Wins Per Week</label> ${modelHelpButton("Weekly Force-Win Limit", "Maximum new assignments per week. Increase to allow more force wins; decrease to keep more games unforced. Zero means no limit. Stronger mismatches take priority, including forced FCS games; existing assignments are not cleared.")}</span><output data-week-limit-value></output></span><input type="range" min="0" max="100" step="1" value="${draft.maxForceWinsPerWeek}" id="model-week-limit" data-week-limit aria-label="Maximum New Force Wins Per Week"></div><p class="muted">0 means no limit. When more games qualify, stronger mismatches take priority. The limit includes the FCS forcing option and does not clear existing assignments.</p></section>${groups.map(group => `<details class="model-slider-section" ${["Team Ratings", "Final Ratings / Matchup Blend", "Coaching", "Venue"].includes(group) ? "open" : ""}><summary><strong>${escapeHtml(group)}</strong></summary>${fields.filter(field => field.group === group).map(field => { const scale = percentage(field) ? 100 : 1; return `<div class="model-slider"><span><span class="model-slider-caption"><label for="model-slider-${field.path}">${escapeHtml(field.label)}</label> ${modelHelpButton(field.label, field.description)}</span><output data-slider-value="${field.path}"></output></span><input type="range" min="${field.min * scale}" max="${field.max * scale}" step="${field.path.includes(".probability") ? .01 : field.step * scale}" value="${draft.values[field.path] * scale}" id="model-slider-${field.path}" data-model-path="${field.path}" data-scale="${scale}" aria-label="${escapeHtml(field.label)}"></div>`; }).join("")}${requiredGroups.has(group) ? `<div class="percentage-total"><strong data-model-total="${group}"></strong><button type="button" class="button secondary" data-model-balance="${group}">Balance to 100%</button></div>` : ""}</details>`).join("")}`;
    dialog.querySelectorAll("[data-model-path]").forEach(input => input.addEventListener("input", () => { draft.values[input.dataset.modelPath] = Number(input.value) / Number(input.dataset.scale); update(); }));
    dialog.querySelector("[data-week-limit]").addEventListener("input", event => { draft.maxForceWinsPerWeek = Number(event.target.value); update(); });
    dialog.querySelector("[data-load-model-preset]").addEventListener("click", () => { draft = structuredClone(prepared.customModelPresets[dialog.querySelector("[data-model-preset]").value]); render(); });
    dialog.querySelectorAll("[data-model-balance]").forEach(button => button.addEventListener("click", () => { const selected = fields.filter(field => field.group === button.dataset.modelBalance), inputs = selected.map(field => dialog.querySelector(`[data-model-path="${field.path}"]`)); balanceWholeInputs(inputs); inputs.forEach((input, index) => draft.values[selected[index].path] = Number(input.value) / 100); update(); }));
    update();
  };
  dialog.querySelector("[data-config-reset]").addEventListener("click", () => { draft = structuredClone(prepared.customModelPresets.balanced); render(); });
  let saving = false;
  dialog.addEventListener("cancel", event => { if (saving) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  dialog.querySelector("[data-config-save]").addEventListener("click", async () => {
    if (saving || validate()) return;
    saving = true; dialog.querySelectorAll("button").forEach(button => button.disabled = true);
    try {
      const savedSettings = await window.cfbToolkit.saveCustomMatchupModel(draft);
      state.bootstrap.settings = savedSettings;
      const control = document.getElementById("force-custom-model-json"), value = JSON.stringify(savedSettings.customMatchupModel);
      state.seasonLines = null; state.seasonLinesSave = null; state.seasonLinesError = null;
      dialog.closeEditor();
      if (value !== control.value) { control.value = value; control.dispatchEvent(new Event("change", { bubbles: true })); captureToolSettings(); }
      toast("Custom model saved on this computer");
    } catch (error) {
      const notice = dialog.querySelector("[data-config-error]"); notice.textContent = readableError(error).message; notice.hidden = false;
      dialog.querySelectorAll("button").forEach(button => button.disabled = false);
    } finally { saving = false; }
  });
  bindModelHelp(dialog); render(); dialog.showModal();
}
function undershirtWeightsSummary(weights) {
  const labels = { hoodie: "Hoodie", secondary: "Secondary", primary: "Primary", white: "White", black: "Black", none: "No Undershirt" };
  return Object.entries(weights).map(([group, values]) => `${group === "large" ? "Muscular / Standard Builds" : "Other Builds"}: ${Object.entries(values).filter(([, value]) => value > 0).map(([key, value]) => `${labels[key] ?? key} ${value}%`).join(" · ")}`).join("; ");
}
function modelHelpButton(label, description) {
  return `<button type="button" class="model-help-button" data-model-help="${escapeHtml(description)}" aria-label="About ${escapeHtml(label)}">?</button>`;
}
function bindModelHelp(dialog) {
  const tooltip = document.createElement("div"), id = `model-help-${++configurationSequence}`;
  tooltip.id = id; tooltip.className = "model-help-tooltip"; tooltip.setAttribute("role", "tooltip"); tooltip.hidden = true; dialog.append(tooltip);
  let active = null, timer;
  const hide = () => { clearTimeout(timer); active?.removeAttribute("aria-describedby"); active = null; tooltip.hidden = true; };
  const show = button => {
    clearTimeout(timer); active?.removeAttribute("aria-describedby"); active = button;
    button.setAttribute("aria-describedby", id); tooltip.textContent = button.dataset.modelHelp; tooltip.hidden = false;
    const bounds = button.getBoundingClientRect(), frame = dialog.getBoundingClientRect(), width = tooltip.getBoundingClientRect().width;
    const left = Math.max(Math.max(8, frame.left + 8), Math.min(bounds.left, Math.min(innerWidth - width - 8, frame.right - width - 8)));
    tooltip.style.left = left + "px"; tooltip.style.top = Math.max(8, bounds.bottom + 8) + "px";
    const height = tooltip.getBoundingClientRect().height;
    if (bounds.bottom + 8 + height > Math.min(innerHeight, frame.bottom) - 8) tooltip.style.top = Math.max(Math.max(8, frame.top + 8), bounds.top - height - 8) + "px";
  };
  dialog.addEventListener("mouseover", event => { const button = event.target.closest("[data-model-help]"); if (button) show(button); });
  dialog.addEventListener("mouseout", event => {
    if (!event.target.closest("[data-model-help]") || event.relatedTarget?.closest("[data-model-help]") || event.relatedTarget === tooltip) return;
    timer = setTimeout(() => { if (document.activeElement !== active) hide(); }, 120);
  });
  dialog.addEventListener("focusin", event => { if (event.target.matches("[data-model-help]")) show(event.target); });
  dialog.addEventListener("focusout", event => { if (event.target === active) hide(); });
  tooltip.addEventListener("mouseenter", () => clearTimeout(timer));
  tooltip.addEventListener("mouseleave", () => { if (document.activeElement !== active) hide(); });
  dialog.addEventListener("scroll", () => { if (active && document.activeElement === active) show(active); else hide(); }, true);
  dialog.addEventListener("keydown", event => { if (event.key === "Escape" && !tooltip.hidden) { event.preventDefault(); event.stopPropagation(); hide(); } });
  dialog.addEventListener("close", hide);
}
