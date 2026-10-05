/* Presentation-only editors. Canonical controls stay in the tool form; windows
 * edit isolated clones and emit the existing change events only after Save. */
let configurationSequence = 0;
const configurationEntries = new WeakMap();

function createConfigurationDialog({ title, description = "", eyebrow = "Configuration", className = "", saveLabel = "Save Settings", immediate = false }) {
  if (document.querySelector("dialog.configuration-dialog[open]")) return null;
  const opener = document.activeElement, dialog = document.createElement("dialog"), token = `configuration-${++configurationSequence}`;
  dialog.className = `configuration-dialog ${className}`;
  dialog.setAttribute("aria-labelledby", `${token}-title`);
  dialog.setAttribute("aria-describedby", `${token}-description`);
  dialog.innerHTML = `<header class="configuration-header"><div><div class="eyebrow">${escapeHtml(eyebrow)}</div><h2 id="${token}-title">${escapeHtml(title)}</h2></div><button type="button" class="button secondary" data-config-cancel aria-label="Close ${escapeHtml(title)}">Close</button></header><p id="${token}-description" class="configuration-description">${escapeHtml(description)}</p><div class="configuration-body"></div><footer class="configuration-footer"><div><span data-config-dirty>${immediate ? "Changes are saved immediately on this computer." : "Settings stay unchanged until you save. Cancel discards this draft."}</span><p class="configuration-error" role="alert" data-config-error hidden></p></div><div class="configuration-footer-actions">${immediate ? "" : '<button type="button" class="button secondary" data-config-reset>Reset Defaults</button><button type="button" class="button secondary" data-config-cancel>Cancel</button>'}<button type="button" class="button" data-config-save>${escapeHtml(saveLabel)}</button></div></footer>`;
  document.body.append(dialog);
  dialog.closeEditor = () => { dialog.close(); dialog.remove(); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  dialog.querySelectorAll("[data-config-cancel]").forEach(button => button.addEventListener("click", () => dialog.closeEditor()));
  dialog.addEventListener("cancel", event => { event.preventDefault(); dialog.closeEditor(); });
  return dialog;
}
function closeConfigurationDialogs() { document.querySelectorAll("dialog.configuration-dialog").forEach(dialog => dialog.closeEditor()); }
function configurationValue(control) { return control.multiple ? [...control.selectedOptions].map(option => option.value) : ["checkbox", "radio"].includes(control.type) ? control.checked : control.value; }
function setConfigurationValue(control, value) {
  if (control.multiple) { const chosen = new Set(value); [...control.options].forEach(option => option.selected = chosen.has(option.value)); }
  else if (["checkbox", "radio"].includes(control.type)) control.checked = Boolean(value);
  else control.value = value;
}
function configurationControls(root) { return [...root.querySelectorAll("input[id],select[id],textarea[id]")].filter(control => control.type !== "file" && control.type !== "search" && !(control.tagName !== "SELECT" && control.id.includes("search"))); }
function configurationDefaults(source) {
  return Object.fromEntries(configurationControls(source).map(control => [control.id, control.multiple ? [...control.options].filter(option => option.defaultSelected).map(option => option.value) : ["checkbox", "radio"].includes(control.type) ? control.defaultChecked : control.tagName === "SELECT" ? [...control.options].find(option => option.defaultSelected)?.value ?? control.options[0]?.value ?? "" : control.defaultValue]));
}
function configurationSelectionSummary(control, empty = multiSelectEmptyMeaning(control.id) === "All" ? "All allowed" : "None selected") {
  const chosen = [...control.selectedOptions], labels = chosen.map(option => option.textContent.trim() + (option.dataset?.user === "true" ? " (User)" : ""));
  return chosen.length ? `${chosen.length} of ${control.options.length} selected · ${labels.slice(0, 3).join(", ")}${labels.length > 3 ? ` +${labels.length - 3} more` : ""}` : empty;
}
function configurationRead(root, id) { return root.querySelector(`[data-config-original="${id}"]`) ?? root.querySelector(`#${id}`); }
function configurationLabel(root, id) { const control = configurationRead(root, id); return control?.selectedOptions?.[0]?.textContent.trim() ?? ""; }
function configurationNumber(root, id) { const control = configurationRead(root, id); return control?.value.trim() === "" ? NaN : Number(control?.value); }
function commitConfigurationDraft(controls, draft, original, close) {
  const changed = controls.filter(control => JSON.stringify(configurationValue(configurationRead(draft, control.id))) !== JSON.stringify(original[control.id]));
  changed.forEach(control => setConfigurationValue(control, configurationValue(configurationRead(draft, control.id))));
  close();
  changed.forEach(control => control.dispatchEvent(new Event("change", { bubbles: true })));
  return changed.length;
}

function condenseConfiguration(element, specification) {
  if (!element || element.closest(".configuration-source") || configurationEntries.has(element)) return;
  const source = document.createElement("div"), entry = document.createElement("section");
  source.className = "configuration-source"; source.hidden = true;
  entry.className = "configuration-entry";
  entry.innerHTML = `<div><strong>${escapeHtml(specification.title)}</strong><p data-config-summary></p></div><button type="button" class="button secondary" data-config-open>${escapeHtml(specification.action ?? "Configure")}</button>`;
  element.before(entry, source); source.append(element);
  if (specification.dependencies?.length === 1) document.getElementById(specification.dependencies[0])?.closest(".toggle-card")?.after(entry);
  const defaults = configurationDefaults(source);
  const refresh = () => {
    entry.querySelector("[data-config-summary]").textContent = specification.summary?.(source) ?? "Customize these settings.";
    entry.querySelector("button").disabled = specification.enabled ? !specification.enabled() : false;
  };
  configurationEntries.set(element, { source, entry, refresh });
  source.addEventListener("change", refresh);
  for (const id of specification.dependencies ?? []) document.getElementById(id)?.addEventListener("change", refresh);
  entry.querySelector("button").addEventListener("click", () => openConfigurationEditor(source, defaults, specification, refresh));
  refresh();
}

function openConfigurationEditor(source, defaults, specification, refresh) {
  const dialog = createConfigurationDialog({ title: specification.title, description: specification.description, eyebrow: specification.eyebrow ?? state.bootstrap.registry.tools.find(tool => tool.id === state.page)?.name ?? "Toolkit Settings", className: specification.className ?? "" });
  if (!dialog) return;
  const draft = source.cloneNode(true), prefix = `draft-${configurationSequence}-`, controls = configurationControls(source), original = Object.fromEntries(controls.map(control => [control.id, configurationValue(control)]));
  draft.className = "configuration-draft"; draft.hidden = false;
  if (draft.firstElementChild) draft.firstElementChild.hidden = false;
  const identifiers = [...draft.querySelectorAll("[id]")].map(node => node.id);
  for (const node of [draft, ...draft.querySelectorAll("*")]) {
    delete node.dataset.bound; delete node.dataset.sessionRestored;
    for (const attribute of [...node.attributes]) {
      if (attribute.name === "id") { node.dataset.configOriginal = attribute.value; node.id = prefix + attribute.value; }
      else if (attribute.name === "name" && node.type === "radio") node.name = prefix + attribute.value;
      else if (["for", "aria-labelledby", "aria-describedby"].includes(attribute.name) || attribute.name.startsWith("data-")) {
        if (attribute.name !== "data-config-original" && identifiers.includes(attribute.value)) node.setAttribute(attribute.name, prefix + attribute.value);
      }
    }
    if (node.matches("input,select,textarea")) { node.dataset.presetControl = ""; node.setCustomValidity(""); }
  }
  for (const [id, value] of Object.entries(original)) setConfigurationValue(configurationRead(draft, id), value);
  dialog.querySelector(".configuration-body").append(draft);
  bindMultiSelectEnhancements(draft); bindTeamPickers(draft); bindTeamLogoFallbacks(draft);
  const update = () => {
    syncConfigurationDraft(draft);
    const error = validateConfigurationDraft(draft, specification), node = dialog.querySelector("[data-config-error]");
    node.textContent = error; node.hidden = !error; dialog.querySelector("[data-config-save]").disabled = Boolean(error);
    const dirty = Object.entries(original).some(([id, value]) => JSON.stringify(configurationValue(configurationRead(draft, id))) !== JSON.stringify(value));
    dialog.querySelector("[data-config-dirty]").textContent = dirty ? "Unsaved settings · Save to keep them, or Cancel to discard." : "Settings stay unchanged until you save. Cancel discards this draft.";
  };
  draft.addEventListener("input", update); draft.addEventListener("change", update);
  draft.querySelectorAll("[data-balance-tape]").forEach(button => button.addEventListener("click", () => { balanceTeamTapeWeights(button.closest("[data-tape-team-row]")); update(); }));
  configurationRead(draft, "browse-donor")?.addEventListener("click", async () => {
    try { const value = await window.cfbToolkit.chooseSave(); if (value && dialog.isConnected) { configurationRead(draft, "equipment-donor").value = value; update(); } }
    catch (error) { toast(readableError(error).message); }
  });
  const tapeSearch = configurationRead(draft, "tape-team-search");
  tapeSearch?.addEventListener("input", () => {
    const query = tapeSearch.value.trim().toLowerCase(); draft.querySelectorAll("[data-tape-team-row]").forEach(row => row.hidden = !row.dataset.tapeTeamRow.includes(query));
    configurationRead(draft, "tape-team-empty").hidden = [...draft.querySelectorAll("[data-tape-team-row]")].some(row => !row.hidden);
  });
  dialog.querySelector("[data-config-reset]").addEventListener("click", () => {
    for (const [id, value] of Object.entries(defaults)) setConfigurationValue(configurationRead(draft, id), value);
    draft.querySelectorAll("[data-option-picker]").forEach(picker => { sortDonorPicker(picker); filterCheckboxPicker(picker); syncCheckboxPicker(picker); });
    draft.querySelectorAll("[data-team-picker]").forEach(picker => syncTeamPicker(picker.dataset.teamPicker, draft));
    update();
  });
  configurationRead(draft, "db-reset")?.addEventListener("click", () => {
    for (const [id, value] of Object.entries(defaults)) setConfigurationValue(configurationRead(draft, id), value);
    update();
  });
  dialog.querySelector("[data-config-save]").addEventListener("click", () => {
    if (validateConfigurationDraft(draft, specification)) return;
    // Commit as a batch: no handler observes a half-updated configuration.
    commitConfigurationDraft(controls, draft, original, () => dialog.closeEditor());
    refresh(); captureToolSettings();
  });
  update(); dialog.showModal();
}

function syncConfigurationDraft(root) {
  syncAdvancedDraft(root);
  const control = id => configurationRead(root, id), show = (id, visible) => { const node = control(id); if (node) node.hidden = !visible; };
  if (control("equipment-donor-mode")) {
    const manual = control("equipment-donor-mode").value === "selected";
    show("equipment-top-donors", !manual); show("equipment-selected-donors", manual);
    control("equipment-top-donors").querySelectorAll("input,button").forEach(input => input.disabled = manual);
    const remaining = 100 - configurationNumber(root, "equipment-cross-percent") - configurationNumber(root, "equipment-multiple-percent");
    control("equipment-mixing-help").textContent = remaining >= 0 ? `${remaining}% single-donor chance. The two mixing chances must total no more than 100%.` : "Mixing chances must total no more than 100%.";
    control("donor-count-help").textContent = `Uses the top ${control("equipment-top").value} eligible players at each position.`;
  }
  if (control("unlocked-color-theme")) {
    show("accessory-color-weights", control("unlocked-color-theme").value === "weighted");
    show("tape-distribution-settings", control("tape-color-mode").value !== "accessory");
    control("tape-distribution-settings").open = true;
    const total = [...root.querySelectorAll("[data-accessory-color]")].reduce((sum, input) => sum + Number(input.value), 0);
    control("accessory-color-total").textContent = `Total: ${total}% — must equal 100%.`;
    control("accessory-color-total").classList.toggle("invalid", total !== 100);
    root.querySelectorAll("[data-tape-team-row]").forEach(syncTeamTapeWeights);
  }
  if (control("db-total")) {
    const total = [...root.querySelectorAll(".db-percent")].reduce((sum, input) => sum + Number(input.value), 0);
    control("db-total").textContent = `${Number(total.toFixed(3))}%`; control("db-total").classList.toggle("invalid", Math.abs(total - 100) > 1e-9);
  }
}
function validateConfigurationDraft(root, specification) {
  const control = id => configurationRead(root, id);
  const active = node => !node.disabled && !node.closest("[hidden]");
  for (const input of root.querySelectorAll('input[type="number"]')) {
    if (!active(input) || input.value.trim() === "" && !input.hasAttribute("value")) continue;
    if (input.value.trim() === "" || !input.checkValidity()) return "Check the highlighted numbers. Use values within the shown range and step size.";
  }
  if (control("equipment-min") && control("equipment-min").value !== "" && control("equipment-max").value !== "" && Number(control("equipment-min").value) > Number(control("equipment-max").value)) return "Minimum Overall cannot be greater than Maximum Overall.";
  if (control("equipment-cross-percent") && configurationNumber(root, "equipment-cross-percent") + configurationNumber(root, "equipment-multiple-percent") > 100) return "Cross-position and multiple-donor chances must total no more than 100%.";
  if (control("equipment-donor-mode")?.value === "selected" && !control("equipment-donor-players").selectedOptions.length) return "Choose at least one donor player.";
  if (control("unlocked-color-theme")?.value === "weighted" && [...root.querySelectorAll("[data-accessory-color]")].reduce((sum, input) => sum + Number(input.value), 0) !== 100) return "Accessory percentages must total 100%.";
  if (control("tape-color-mode")?.value === "distribution") {
    const invalid = [...root.querySelectorAll("[data-tape-team-row]")].find(row => [...row.querySelectorAll("[data-tape-color]")].some(input => !Number.isInteger(Number(input.value)) || input.value === "" || !input.checkValidity()) || [...row.querySelectorAll("[data-tape-color]")].reduce((sum, input) => sum + Number(input.value), 0) !== 100);
    if (invalid) return `${invalid.querySelector(".tape-team-name strong").textContent}: Tape Color must use whole percentages totaling 100%. Find this team or use Balance to 100%.`;
  }
  if (control("db-total") && Math.abs([...root.querySelectorAll(".db-percent")].reduce((sum, input) => sum + Number(input.value), 0) - 100) > 1e-9) return "Starting percentages must total exactly 100%.";
  return (typeof validateAdvancedDraft === "function" ? validateAdvancedDraft(root) : "") || specification.validate?.(root) || "";
}

function bindConfigurationWindows() {
  const get = selector => content.querySelector(selector);
  const feature = (selector, specification) => condenseConfiguration(get(selector), specification);
  if (get("#equipment-wizard")) {
    for (const [field, toggle] of [["bears-pads-style-field", "fix-bears-pads"]]) get("#" + toggle)?.closest(".toggle-card")?.after(get("#" + field));
    feature(".player-filter-group", { title: "Player Filters", description: "These filters work together. Empty selections allow every option; NIL protection is configured here too.", summary: root => [["equipment-positions", "positions"], ["equipment-classes", "class years"], ["equipment-bodies", "body types"]].filter(([id]) => configurationRead(root, id)).map(([id, label]) => `${label}: ${configurationSelectionSummary(configurationRead(root, id))}`).join(" · ") + ` · ${configurationLabel(root, "equipment-redshirt-group")} · ${configurationRead(root, "equipment-skip-nil").checked ? "Skip NIL" : "Include NIL"} · OVR ${configurationRead(root, "equipment-min").value || "Any"}–${configurationRead(root, "equipment-max").value || "Any"}` });
    const donor = get('[data-equipment-panel="1"]:has(#equipment-donor-mode)');
    if (donor && !donor.querySelector(".configuration-entry")) {
      const group = document.createElement("div"); group.className = "donor-settings-content";
      [...donor.children].filter(node => !node.matches("header")).forEach(node => group.append(node)); donor.append(group);
      condenseConfiguration(group, { title: "Donor Settings", description: "Choose donors and mixing chances in one place. Specific-player donors come only from your active dynasty; their checked selections stay saved across positions.", summary: root => `${configurationLabel(root, "equipment-donor-mode")} · ${configurationRead(root, "equipment-donor-mode").value === "selected" ? configurationRead(root, "equipment-donor-players").selectedOptions.length + " players" : configurationRead(root, "equipment-top").value + " per position"} · Cross-position ${configurationRead(root, "equipment-cross-percent").value}% · Multiple donors ${configurationRead(root, "equipment-multiple-percent").value}%` });
    }
    feature("#equipment-no-drip-chances", { title: "No Drip Chances", description: "Chance to remove selected accessories for each position group.", dependencies: ["equipment-no-drip"], enabled: () => get("#equipment-no-drip").checked, summary: root => ["skill", "balanced", "heavy"].map(key => `${configurationRead(root, "equipment-no-drip-" + key).value}%`).join(" / ") });
    feature("#unlocked-mouthpiece-color-field", { title: "Mouthpiece Settings", description: "Colors, existing-mouthpiece rerolls and branded frequency apply together. QBs, kickers and punters remain excluded.", dependencies: ["fix-unlocked-mouthpieces"], enabled: () => get("#fix-unlocked-mouthpieces").checked, summary: root => `${configurationLabel(root, "unlocked-mouthpiece-colors")} · ${configurationRead(root, "mouthpiece-branded-frequency").value}% branded · ${configurationRead(root, "randomize-existing-mouthpieces").checked ? "Reroll existing" : "Keep existing"}` });
    feature("#unlocked-color-field", { title: "Colors & Tape", description: "Choose one accessory theme per player, then decide whether tape matches it or uses your team-by-team percentages. Tape is recolored, not added.", dependencies: ["fix-unlocked-recolor"], enabled: () => get("#fix-unlocked-recolor").checked, summary: root => `${configurationLabel(root, "unlocked-color-theme")} · ${configurationLabel(root, "tape-color-mode")}` });
    feature("#unlocked-tattoo-field", { title: "Tattoo Settings", description: "Choose a population cap and the designs that may be added. Existing tattoos are kept. Japanese and Polynesian styles start unchecked.", dependencies: ["fix-unlocked-tattoos"], enabled: () => get("#fix-unlocked-tattoos").checked, summary: root => `${configurationRead(root, "unlocked-tattoo-cap").value}% population cap · ${configurationRead(root, "unlocked-tattoo-pool").selectedOptions.length} designs selected` });
  }
  if (state.page === "nil-toggle") feature('.standard-config-workspace .ops-section:nth-of-type(2) .ops-section-body', { title: "Player Scope", description: "All filters work together. Leave every selection empty for the entire active dynasty roster. The preview lists every match before any flags change.", summary: root => ["nil-teams", "nil-players", "nil-positions", "nil-classes", "nil-redshirts"].map(id => `${configurationRead(root, id).selectedOptions.length || "All"} ${id.slice(4)}`).join(" · ") });
  if (state.page === "dealbreaker-fixer") feature('.ops-section:nth-of-type(2) .ops-section-body', { title: "Starting Dealbreaker Mix", description: "These are starting weights, not guaranteed final results. Each player's situation still affects assignments; None sets a minimum population share.", summary: root => [...root.querySelectorAll(".db-percent")].filter(input => Number(input.value)).map(input => `${dealbreakerLabels[input.dataset.value]} ${input.value}%`).join(" · ") });
  // Large selectors use the same searchable window. Small year/body lists stay
  // as compact checkbox choices, and selectors already inside an editor expand.
  for (const picker of content.querySelectorAll("[data-team-picker],[data-option-picker]")) {
    if (picker.closest(".configuration-source") || configurationEntries.has(picker)) continue;
    const select = picker.querySelector("select[multiple]");
    if (!select) continue;
    if (picker.hasAttribute("data-option-picker") && select.options.length <= 7) { picker.classList.add("compact-choice-picker"); continue; }
    const label = picker.querySelector("[data-base-label]").dataset.baseLabel;
    condenseConfiguration(picker, { title: label, action: "Select", description: picker.querySelector("p.muted")?.textContent ?? "Search and check the options you want.", summary: () => configurationSelectionSummary(select, select.id === "team-search" ? "No teams selected — choose at least one" : undefined), validate: root => select.id === "team-search" && !configurationRead(root, select.id).selectedOptions.length ? "Choose at least one team." : select.id === "boost-attributes" && !configurationRead(root, select.id).selectedOptions.length ? "Choose at least one attribute." : "" });
  }
  bindAdvancedPassWindows();
}
function settingsArtworkMarkup() {
  const teams = state.homeContext?.teams ?? [], selected = teams.find(team => team.name === state.selectedArtworkTeam) ?? teams[0], artwork = selected ? state.artwork[selected.name.trim().toLowerCase()] ?? {} : {};
  return `<div class="artwork-editor-layout">${selected ? `<div class="artwork-team-selector"><label for="settings-artwork-search">Find a Team</label><input class="input" id="settings-artwork-search" type="search" placeholder="Search teams…"><div class="artwork-team-list">${teams.map(team => `<button type="button" class="artwork-team-choice" data-artwork-team-choice="${escapeHtml(team.name)}" aria-pressed="${team.name === selected.name}"><img data-team-logo src="${forceLogoUrl(team.name)}" alt=""><span>${escapeHtml(team.name)}</span></button>`).join("")}</div><select id="settings-artwork-team" hidden aria-hidden="true"><option selected value="${escapeHtml(selected.name)}">${escapeHtml(selected.name)}</option></select></div><div class="settings-artwork-grid"><div class="settings-artwork-item"><strong>Team Logo</strong><div class="settings-logo-preview"><img data-team-logo src="${forceLogoUrl(selected.name)}" alt="${escapeHtml(selected.name)} logo"></div><p class="muted">Upload a 1024 × 1024 PNG, JPG, or WebP image.</p><div class="actions"><button class="button secondary" data-artwork-upload="logo">Upload Logo</button>${artwork.logo ? '<button class="button secondary" data-artwork-clear="logo">Use Default</button>' : ""}</div></div><div class="settings-artwork-item"><strong>Home Header</strong><div class="settings-header-preview"><img data-team-header src="${artwork.header || teamHeaderUrl(selected.name)}" alt="Header for ${escapeHtml(selected.name)}"></div><p class="muted">The included team header is used by default. Teams without one use the general football header. You can upload a custom image of any supported size.</p><div class="actions"><button class="button secondary" data-artwork-upload="header">Upload Header</button>${artwork.header ? '<button class="button secondary" data-artwork-clear="header">Use Default</button>' : ""}</div></div></div>` : `<div class="notice">Select a supported Dynasty save to choose a team's artwork.</div>`}</div>`;
}
function openTeamArtworkEditor() {
  const dialog = createConfigurationDialog({ title: "Team Artwork", description: "Choose a team, then upload a logo or Home header. Uploads and Use Default are saved immediately on this computer; they do not change your dynasty.", eyebrow: "Personal Settings", immediate: true, saveLabel: "Done", className: "artwork-editor" });
  if (!dialog) return;
  dialog.querySelector("[data-config-save]").addEventListener("click", () => dialog.closeEditor());
  refreshSettingsArtwork(); dialog.showModal();
}
function refreshSettingsArtwork() {
  const dialog = document.querySelector("dialog.artwork-editor");
  if (!dialog) { render(); return; }
  const body = dialog.querySelector(".configuration-body");
  body.innerHTML = settingsArtworkMarkup(); bindSettingsArtwork(); bindTeamLogoFallbacks(body);
  const summary = document.getElementById("artwork-summary"); if (summary) summary.textContent = `${Object.keys(state.artwork).length} teams with custom artwork · Defaults are used everywhere else.`;
}
