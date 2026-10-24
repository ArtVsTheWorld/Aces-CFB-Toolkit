function modPoolName(origin) { return { unlocked: "CFB27 Unlocked", raw: "RAW Accessories", eljax: "ELJAX's Equipment Truck" }[origin] ?? origin; }
function modPoolOptions() {
  return readJsonControl("equipment-mod-pools", {});
}
function modPoolControlsMarkup() {
  return '<input type="hidden" id="equipment-mod-pools" value="{}">' + ["unlocked", "raw", "eljax"].map(origin => `<section class="configuration-entry" data-mod-pool-entry="${origin}"><div><strong>${escapeHtml(modPoolName(origin))} Pool Settings</strong><p data-mod-pool-summary></p></div><button type="button" class="button secondary" data-mod-pool-open="${origin}">Configure Pool</button></section>`).join("");
}
function modPoolSummary(origin, prepared) {
  const categories = prepared.modPoolCategories?.[origin] ?? [], custom = modPoolOptions()[origin];
  return categories.map(category => {
    const settings = custom?.[category.id];
    return `${category.label}: ${settings?.chance ?? category.defaultChance ?? Number(document.getElementById("equipment-expanded-percent")?.value || 10)}% · ${(settings?.items ?? category.defaultItems).length} items`;
  }).join("; ");
}
function modPoolCategoryMarkup(origin, categories) {
  const categoryId = `mod-pool-${origin}-category`, chanceId = `mod-pool-${origin}-chance`;
  return `<div class="mod-pool-controls"><div class="configuration-field"><div class="field-caption"><label for="${categoryId}">Equipment Category</label>${modelHelpButton("Equipment Category", "Choose an equipment category to configure.").replace("data-model-help=", "data-pool-help data-model-help=")}</div><select id="${categoryId}" data-pool-category>${categories.map(category => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.label)}</option>`).join("")}</select></div><div class="configuration-field"><label for="${chanceId}">Category Chance</label><div class="input-suffix"><input id="${chanceId}" class="input" type="number" min="0" max="100" step="1" data-pool-chance><span>%</span></div></div></div>`;
}
function openModPoolEditor(origin, prepared) {
  const categories = prepared.modPoolCategories?.[origin] ?? [];
  if (!categories.length) return;
  const previous = modPoolOptions(), defaultPercent = Number(document.getElementById("equipment-expanded-percent")?.value || 10);
  const defaults = () => Object.fromEntries(categories.map(category => [category.id, { chance: category.defaultChance ?? defaultPercent, items: [...category.defaultItems] }]));
  let draft = { ...defaults(), ...structuredClone(previous[origin] ?? {}) }, active = categories[0].id;
  const initialDraft = JSON.stringify(draft);
  const dialog = createConfigurationDialog({ title: `${modPoolName(origin)} Equipment Pool`, eyebrow: "Equipment Randomizer", className: "mod-pool-editor", description: "Choose supported items and each category's chance after donor copying. Categories roll independently, so percentages do not need to total 100%. Existing donor gear is not filtered out by these choices.", saveLabel: "Save Pool Settings" });
  if (!dialog) return;
  const body = dialog.querySelector(".configuration-body");
  body.innerHTML = `<p class="notice">${origin === "eljax" ? "Requires GameDay Gear v2.0+ (ELJAX's Equipment Truck) by ElJax YT." : origin === "raw" ? "Requires RAW Accessories v3.1.4+ by Delonte RAW." : "Requires CFB27 Unlocked v0.97+ by Orckestra."}</p>${modPoolCategoryMarkup(origin, categories)}<input type="search" class="input" data-pool-search aria-label="Find an equipment item" placeholder="Find an item…"><div class="actions"><button class="button secondary" type="button" data-pool-all>Select All</button><button class="button secondary" type="button" data-pool-clear>Clear</button><button class="button secondary" type="button" data-pool-defaults>Default Category</button></div><p data-pool-count></p><div class="mod-pool-items" data-pool-items></div>`;
  const categoryControl = body.querySelector("[data-pool-category]"), chance = body.querySelector("[data-pool-chance]"), search = body.querySelector("[data-pool-search]"), error = dialog.querySelector("[data-config-error]");
  const validate = () => {
    const invalid = categories.find(category => !Number.isInteger(draft[category.id].chance) || draft[category.id].chance < 0 || draft[category.id].chance > 100 || draft[category.id].items.some(id => !category.items.some(item => item.value === id)));
    const message = invalid ? `${invalid.label}: use a whole percentage from 0 through 100 and supported items only.` : "";
    error.textContent = message; error.hidden = !message; dialog.querySelector("[data-config-save]").disabled = Boolean(message);
    dialog.querySelector("[data-config-dirty]").textContent = JSON.stringify(draft) === initialDraft ? "Settings stay unchanged until you save. Cancel discards this draft." : "Unsaved settings · Save to keep them, or Cancel to discard.";
    return !message;
  };
  const renderItems = () => {
    const category = categories.find(category => category.id === active), choices = draft[active], query = search.value.trim().toLowerCase(), selected = new Set(choices.items);
    const items = category.items.filter(item => `${item.label} ${item.value}`.toLowerCase().includes(query));
    body.querySelector("[data-pool-count]").textContent = `${selected.size} of ${category.items.length} selected · ${items.length} shown. Clear prevents new additions in this category.`;
    body.querySelector("[data-pool-items]").innerHTML = items.length ? items.map(item => `<label class="mod-pool-item ${selected.has(item.value) ? "selected" : ""}"><input type="checkbox" data-pool-item="${escapeHtml(item.value)}" ${selected.has(item.value) ? "checked" : ""}><span>${escapeHtml(item.label)}</span></label>`).join("") : '<p class="muted">No matching items.</p>';
    body.querySelectorAll("[data-pool-item]").forEach(input => input.addEventListener("change", () => { const items = new Set(draft[active].items); if (input.checked) items.add(input.dataset.poolItem); else items.delete(input.dataset.poolItem); draft[active].items = [...items]; input.closest("label").classList.toggle("selected", input.checked); body.querySelector("[data-pool-count]").textContent = `${items.size} of ${category.items.length} selected · ${body.querySelectorAll("[data-pool-item]").length} shown. Clear prevents new additions in this category.`; validate(); }));
  };
  const render = () => {
    categoryControl.value = active; chance.value = draft[active].chance;
    body.querySelector("[data-pool-help]").dataset.modelHelp = active === "facepaint" ? "Controls the chance these selected styles join the normal facepaint roll. 100% always includes them; 0% leaves vanilla styles only for this mod. The normal no-facepaint chance and position restrictions still apply."
      : active === "backplates" ? "Adds only to outfits without a flak jacket. A jacket in any on-field loadout blocks the addition."
      : active === "waistPlaycalls" ? "Adds only to quarterbacks. Playcall bands and handwarmers use separate slots and can be worn together. White, Black, and Team Primary are supported."
      : active === "handwarmers" ? "Disabled by default. Select the logo handwarmer and set a chance above 0% to allow it. This does not replace a waist playcall band."
      : ["cleats", "gloves"].includes(active) ? "Only selected items compatible with the player's apparel brand may be picked. No compatible items means this category is skipped."
      : "Chance for this category to receive an additional item. Selected items are equally likely when compatible; position and outfit safeguards still apply. 0% disables this category.";
    renderItems(); validate();
  };
  categoryControl.addEventListener("change", () => { active = categoryControl.value; search.value = ""; render(); });
  const updateChance = () => { draft[active].chance = chance.value === "" ? NaN : Number(chance.value); validate(); };
  chance.addEventListener("input", updateChance); chance.addEventListener("change", updateChance);
  search.addEventListener("input", renderItems);
  body.querySelector("[data-pool-all]").addEventListener("click", () => { draft[active].items = categories.find(category => category.id === active).items.map(item => item.value); renderItems(); validate(); });
  body.querySelector("[data-pool-clear]").addEventListener("click", () => { draft[active].items = []; renderItems(); validate(); });
  body.querySelector("[data-pool-defaults]").addEventListener("click", () => { draft[active] = defaults()[active]; render(); });
  dialog.querySelector("[data-config-reset]").addEventListener("click", () => { draft = defaults(); render(); });
  dialog.querySelector("[data-config-save]").addEventListener("click", () => {
    if (!validate()) return;
    const control = document.getElementById("equipment-mod-pools"); control.value = JSON.stringify({ ...previous, [origin]: draft });
    dialog.closeEditor(); control.dispatchEvent(new Event("change", { bubbles: true })); captureToolSettings();
  });
  render(); dialog.showModal();
}
function bindModPoolWindows() {
  const prepared = state.prepared.get(`${state.page}|${state.activeSave?.path}`);
  if (!prepared) return;
  for (const entry of content.querySelectorAll("[data-mod-pool-entry]")) {
    const origin = entry.dataset.modPoolEntry, toggle = document.getElementById({ unlocked: "equipment-unlocked", raw: "equipment-raw-accessories", eljax: "equipment-truck" }[origin]);
    toggle.closest(".toggle-card").after(entry);
    const refresh = () => { entry.hidden = !toggle.checked; entry.querySelector("button").disabled = !toggle.checked; entry.querySelector("[data-mod-pool-summary]").textContent = !modPoolOptions()[origin] ? `Toolkit defaults · ${document.getElementById("equipment-expanded-percent").value}% for most categories${origin === "unlocked" ? " · Jamo sleeves off" : origin === "eljax" ? " · Logo handwarmer off" : ""} · Default items` : "Custom pool · " + (prepared.modPoolCategories[origin] ?? []).filter(category => (modPoolOptions()[origin][category.id]?.items.length ?? category.defaultItems.length) && (modPoolOptions()[origin][category.id]?.chance ?? category.defaultChance ?? 10)).length + " categories active"; };
    toggle.addEventListener("change", refresh); document.getElementById("equipment-mod-pools").addEventListener("change", refresh); document.getElementById("equipment-expanded-percent").addEventListener("change", refresh);
    entry.querySelector("button").addEventListener("click", () => openModPoolEditor(origin, prepared)); refresh();
  }
}
