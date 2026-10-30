function modPoolName(origin) { return { vanilla: "CFB 27 Equipment", unlocked: "CFB27 Unlocked", raw: "RAW Accessories", eljax: "ELJAX's Equipment Truck" }[origin] ?? origin; }
function modPoolOptions() {
  return readJsonControl("equipment-mod-pools", {});
}
function modPoolControlsMarkup() {
  return '<input type="hidden" id="equipment-mod-pools" value="{}">' + ["vanilla", "unlocked", "raw", "eljax"].map(origin => `<section class="configuration-entry" data-mod-pool-entry="${origin}"><div><strong>${escapeHtml(modPoolName(origin))} Pool Settings</strong><p data-mod-pool-summary></p></div><button type="button" class="button secondary" data-mod-pool-open="${origin}">Configure Pool</button></section>`).join("");
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
  const categories = (prepared.modPoolCategories?.[origin] ?? []).filter(category=>category.items.length);
  if (!categories.length) return;
  const previous = modPoolOptions(), defaultPercent = Number(document.getElementById("equipment-expanded-percent")?.value || 10);
  const defaults = () => Object.fromEntries(categories.map(category => [category.id, { chance: category.defaultChance ?? defaultPercent, items: [...category.defaultItems] }]));
  let draft = { ...defaults(), ...structuredClone(previous[origin] ?? {}) }, active = categories[0].id;
  const initialDraft = JSON.stringify(draft);
  const dialog = createConfigurationDialog({ title: origin==='vanilla'?'CFB 27 Equipment Pool':`${modPoolName(origin)} Equipment Pool`, eyebrow: "Equipment Randomizer", className: "mod-pool-editor", description: "Choose extra items and how often each category is added. Category chances are independent; they do not need to add up to 100%. Pool choices do not remove donor gear. Outfit fit and position rules still apply.", saveLabel: "Save Settings" });
  if (!dialog) return;
  const body = dialog.querySelector(".configuration-body");
  body.innerHTML = `<p class="notice">${origin === "vanilla" ? "Standard game equipment. No equipment mod required. Some equipment mods replace standard styles; marked choices are skipped when the replacing mod is selected." : origin === "eljax" ? "Requires GameDay Gear v2.0+ (ELJAX's Equipment Truck) by ElJax YT." : origin === "raw" ? "Requires RAW Accessories v3.1.4+ by Delonte RAW." : "Requires CFB27 Unlocked v0.97+ by Orckestra."}</p>${modPoolCategoryMarkup(origin, categories)}<input type="search" class="input" data-pool-search aria-label="Find an equipment item" placeholder="Find an item…"><div class="actions"><button class="button secondary" type="button" data-pool-all>Select All</button><button class="button secondary" type="button" data-pool-clear>Clear</button><button class="button secondary" type="button" data-pool-defaults>Default Category</button></div><p data-pool-count></p><p class="notice" data-pool-migrated hidden></p><div class="mod-pool-items" data-pool-items></div>`;
  const categoryControl = body.querySelector("[data-pool-category]"), chance = body.querySelector("[data-pool-chance]"), search = body.querySelector("[data-pool-search]"), error = dialog.querySelector("[data-config-error]");
  const validate = () => {
    const invalid = categories.find(category => !Number.isInteger(draft[category.id].chance) || draft[category.id].chance < 0 || draft[category.id].chance > 100 || draft[category.id].items.some(id => !category.items.some(item => item.value === id)));
    const message = invalid ? `${invalid.label}: use a whole percentage from 0 through 100 and supported items only.` : "";
    error.textContent = message; error.hidden = !message; dialog.querySelector("[data-config-save]").disabled = Boolean(message);
    dialog.querySelector("[data-config-dirty]").textContent = JSON.stringify(draft) === initialDraft ? "Settings stay unchanged until you save. Cancel discards this draft." : "Unsaved settings · Save to keep them, or Cancel to discard.";
    return !message;
  };
  const renderItems = () => {
    const groups=draft[active].rollGroups, note=body.querySelector('[data-pool-migrated]');
    note.hidden=!groups;note.textContent=groups?'Your saved items keep their previous percentages, shown beside their names. Changing Category Chance gives every selected item that percentage.':'';
    const category = categories.find(category => category.id === active), choices = draft[active], query = search.value.trim().toLowerCase(), selected = new Set(choices.items);
    const items = category.items.filter(item => `${item.label} ${item.value}`.toLowerCase().includes(query));
    body.querySelector("[data-pool-count]").textContent = `${selected.size} of ${category.items.length} selected · ${items.length} shown. Clear prevents new additions in this category.`;
    body.querySelector("[data-pool-items]").innerHTML = items.length ? items.map(item => `<label class="mod-pool-item ${selected.has(item.value) ? "selected" : ""}"><input type="checkbox" data-pool-item="${escapeHtml(item.value)}" ${selected.has(item.value) ? "checked" : ""}><span>${escapeHtml(item.label)}${choices.rollGroups?` · ${choices.rollGroups.find(g=>g.items.includes(item.value))?.chance??choices.chance}%`:''}${origin==='vanilla'&&item.replacedByUnlocked&&document.getElementById('equipment-unlocked').checked?' · Use the Unlocked pool for this style':''}${origin==='vanilla'&&item.disabledWithUnlocked&&document.getElementById('equipment-unlocked').checked?' · Unavailable with Unlocked':''}${origin==='vanilla'&&item.replacedByRaw&&document.getElementById('equipment-raw-accessories').checked?' · RAW replaces this style':''}</span></label>`).join("") : '<p class="muted">No matching items.</p>';
    body.querySelectorAll("[data-pool-item]").forEach(input => input.addEventListener("change", () => { const items = new Set(draft[active].items); if (input.checked) items.add(input.dataset.poolItem); else items.delete(input.dataset.poolItem); draft[active].items = [...items]; if(draft[active].rollGroups){for(const g of draft[active].rollGroups)g.items=g.items.filter(id=>items.has(id));if(input.checked&&!draft[active].rollGroups.some(g=>g.items.includes(input.dataset.poolItem)))draft[active].rollGroups.push({chance:draft[active].chance,items:[input.dataset.poolItem]});} input.closest("label").classList.toggle("selected", input.checked); body.querySelector("[data-pool-count]").textContent = `${items.size} of ${category.items.length} selected · ${body.querySelectorAll("[data-pool-item]").length} shown. Clear prevents new additions in this category.`; validate(); }));
  };
  const render = () => {
    categoryControl.value = active; chance.value = draft[active].chance;
    body.querySelector("[data-pool-help]").dataset.modelHelp = active === "facepaint" ? "Chance to replace the copied donor face paint with one of these selected styles. Set 0% or clear the list to keep the donor’s face paint. Other enabled pools can still roll their own styles."
      : active === "backplates" ? "Adds only to outfits without a flak jacket. A jacket in any on-field loadout blocks the addition."
      : active === "waistPlaycalls" ? "Adds only to quarterbacks. Playcall bands and handwarmers use separate slots and can be worn together. White, Black, and Team Primary are supported."
      : active === "handwarmers" ? "Disabled by default. Select the logo handwarmer and set a chance above 0% to allow it. This does not replace a waist playcall band."
      : active === "gloves" ? "QBs use donor gloves only and keep at most one. OL, DT, K and P do not receive pool gloves. Taped hands can roll for OL and DT. Other positions use selected styles that match their team’s brand."
      : active === "wristGear" ? "Adds selected wrist gear only when the sleeves leave room. Large glove tape is used only for DL, OL, LB, TE and FB. Existing donor gear can still be copied."
      : active === "towels" ? "String Towels roll only for WR, CB and safeties. The default chance is 1%. Existing donor towels are kept under the normal donor rules."
      : active === "cleats" ? "Only selected items compatible with the player's apparel brand may be picked. No compatible items means this category is skipped."
      : "Chance for this category to receive an additional item. Selected items are equally likely when compatible; position and outfit safeguards still apply. 0% disables this category.";
    renderItems(); validate();
  };
  categoryControl.addEventListener("change", () => { active = categoryControl.value; search.value = ""; render(); });
  const updateChance = () => { delete draft[active].rollGroups; body.querySelector('[data-pool-migrated]').hidden=true; draft[active].chance = chance.value === "" ? NaN : Number(chance.value); renderItems(); validate(); };
  chance.addEventListener("input", updateChance); chance.addEventListener("change", updateChance);
  search.addEventListener("input", renderItems);
  body.querySelector("[data-pool-all]").addEventListener("click", () => { draft[active].items = categories.find(category => category.id === active).items.map(item => item.value); if(draft[active].rollGroups){const assigned=new Set(draft[active].rollGroups.flatMap(g=>g.items)),extra=draft[active].items.filter(id=>!assigned.has(id));if(extra.length)draft[active].rollGroups.push({chance:draft[active].chance,items:extra});} renderItems(); validate(); });
  body.querySelector("[data-pool-clear]").addEventListener("click", () => { draft[active].items = []; delete draft[active].rollGroups; renderItems(); validate(); });
  body.querySelector("[data-pool-defaults]").addEventListener("click", () => { draft[active] = defaults()[active]; render(); });
  dialog.querySelector("[data-config-reset]").addEventListener("click", () => { draft = defaults(); render(); });
  dialog.querySelector("[data-config-save]").addEventListener("click", () => {
    if (!validate()) return;
    if (JSON.stringify(draft) === initialDraft) { dialog.closeEditor(); return; }
    const control = document.getElementById("equipment-mod-pools"); control.value = JSON.stringify({ ...previous, _version:2, vanilla: previous.vanilla ?? {}, [origin]: draft });
    dialog.closeEditor(); control.dispatchEvent(new Event("change", { bubbles: true })); captureToolSettings();
  });
  render(); dialog.showModal();
}
function bindModPoolWindows() {
  const prepared = state.prepared.get(`${state.page}|${state.activeSave?.path}`);
  if (!prepared) return;
  for (const entry of content.querySelectorAll("[data-mod-pool-entry]")) {
    const origin = entry.dataset.modPoolEntry, toggle = document.getElementById({ vanilla: "equipment-vanilla", unlocked: "equipment-unlocked", raw: "equipment-raw-accessories", eljax: "equipment-truck" }[origin]);
    toggle.closest(".toggle-card").after(entry);
    const refresh = () => { entry.hidden = !toggle.checked; entry.querySelector("button").disabled = !toggle.checked; entry.querySelector("[data-mod-pool-summary]").textContent = !modPoolOptions()[origin] ? `Toolkit defaults · ${document.getElementById("equipment-expanded-percent").value}% for most categories${["unlocked", "raw"].includes(origin) ? " · Jamo sleeves off" : origin === "eljax" ? " · Logo handwarmer off" : ""} · Default items` : "Custom pool · " + (prepared.modPoolCategories[origin] ?? []).filter(category => (modPoolOptions()[origin][category.id]?.items.length ?? category.defaultItems.length) && (modPoolOptions()[origin][category.id]?.chance ?? category.defaultChance ?? 10)).length + " categories active"; };
    toggle.addEventListener("change", refresh); document.getElementById("equipment-mod-pools").addEventListener("change", refresh); document.getElementById("equipment-expanded-percent").addEventListener("change", refresh);
    entry.querySelector("button").addEventListener("click", () => openModPoolEditor(origin, prepared)); refresh();
  }
}

function migrateEquipmentPoolSettings(values) {
  if(typeof EquipmentPoolMigration==='undefined'||state.page!=='freshman-equipment')return;
  const prepared=state.prepared.get(`${state.page}|${state.activeSave?.path}`);
  if(!prepared?.modPoolCategories)return;
  const raw=values['equipment-mod-pools'];
  if(raw){
    let parsed;try{parsed=JSON.parse(raw);}catch{return;}
    if(parsed&&typeof parsed==='object'){
      values['equipment-mod-pools']=JSON.stringify(EquipmentPoolMigration.migrate(parsed,prepared.modPoolCategories,Number(values["equipment-expanded-percent"]??10)));
    }
  }
  // Older presets used one switch for stock extras and Unlocked extras.
  // Preserve that switch's intent when restoring them into the split UI.
  if(!Object.hasOwn(values,'equipment-vanilla')&&Object.hasOwn(values,'equipment-unlocked'))values['equipment-vanilla']=values['equipment-unlocked'];
}
