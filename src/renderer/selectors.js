function checkboxPicker(id, label, values, helper, defaults = []) {
  if(!/donor-players$/.test(id)&&!values.some(value=>value.position)) {
    const grouped=values.some(value=>value.group);
    values=grouped?[...values].sort((a,b)=>ToolkitSelectionOrder.alpha(a.group??'',b.group??'')||ToolkitSelectionOrder.comparator(id,values)(a,b)):ToolkitSelectionOrder.sortChoices(id,values);
  }
  const selectedValues = new Set(defaults.map(String)), grouped = id === "equipment-donor-players" || values.length > 200 && values.some(value => value.position);
  const options = values.map((value, order) => ({ value: String(value.value ?? value.name ?? value), label: String(value.label ?? value.name ?? value), group: grouped ? localizedPosition(value.position ?? "Unknown") : "", section: ["unlocked-tattoo-pool","equipment-remove-items"].includes(id) ? String(value.group ?? "") : "", order, searchAliases: Array.isArray(value.searchAliases) ? value.searchAliases.join(" ") : "", team: String(value.team ?? ""), name: String(value.name ?? ""), overall: grouped && value.overall !== null && Number.isFinite(Number(value.overall)) ? Number(value.overall) : null }));
  const groups = [...new Set(options.map(option => option.group).filter(Boolean))].sort(positionCompare);
  const sorting = grouped ? `<label class="donor-sort-control" for="equipment-player-sort">Sort<select id="equipment-player-sort" data-option-sort${id==="equipment-donor-players"?' data-order="preserve"':''}>${id==="equipment-donor-players"?'<option value="overall" selected>Highest Overall</option><option value="default">Team</option>':'<option value="default">Default Order</option><option value="overall">Overall (Highest First)</option>'}</select></label>` : "";
  const lazy = /^(?:commentary|boost)-players$/.test(id) && options.length > 200;
  const rows = (lazy ? [] : options).map((option, index) => `${option.section && options[index - 1]?.section !== option.section ? `<strong class="tattoo-pool-heading" data-option-section="${escapeHtml(option.section)}">${escapeHtml(option.section)}</strong>` : ""}<label class="team-picker-row option-picker-row" data-option-row data-position="${escapeHtml(option.group)}" data-option-order="${option.order}" data-overall="${option.overall ?? ""}" data-donor-team="${escapeHtml(option.team)}" data-donor-name="${escapeHtml(option.name)}" data-section="${escapeHtml(option.section)}" data-search="${escapeHtml(`${option.label} ${option.searchAliases} ${option.value}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim())}"><input type="checkbox" data-option-choice value="${escapeHtml(option.value)}" ${selectedValues.has(option.value) ? "checked" : ""}><span>${escapeHtml(option.label)}</span></label>`).join("");
  return `<div class="team-picker option-picker${grouped ? " donor-player-picker" : ""}" data-option-picker="${id}"${lazy ? ' data-lazy-options="true"' : ''} data-option-group="${escapeHtml(groups[0] ?? "")}"><label data-multi-label-for="${id}" data-base-label="${escapeHtml(label)}" data-empty-meaning="${multiSelectEmptyMeaning(id)}">${escapeHtml(label)}</label>${grouped ? `<div class="option-position-tabs" role="group" aria-label="Player Position">${groups.map(group => `<button type="button" class="button secondary tiny" data-option-position="${escapeHtml(group)}"><strong>${escapeHtml(group)}</strong><span></span></button>`).join("")}</div><p class="muted">Switch position groups to choose players. Checked players stay selected across positions.</p>` : ""}<div class="team-picker-toolbar"><input class="input" data-option-search placeholder="Search ${grouped ? "this position" : escapeHtml(label.toLowerCase())}…" aria-label="Search ${escapeHtml(label)}">${sorting}${id==="equipment-remove-items"?`<label>Category<select data-removal-category><option value="">All categories</option>${[...new Set(options.map(option=>option.section))].filter(Boolean).map(category=>`<option>${escapeHtml(category)}</option>`).join('')}</select></label>`:""}<button type="button" class="button secondary tiny" data-option-all>${grouped ? (id==="equipment-donor-players"?"Select all in this position":"Select position") : "All"}</button><button type="button" class="button secondary tiny" data-option-clear>${grouped ? "Clear position" : "Clear"}</button></div>${id==="equipment-donor-players"?'<details class="copy-position-settings donor-count-settings"><summary>Select Donors by Count</summary><div class="donor-count-controls"><label># of Donors<input class="input" type="text" inputmode="numeric" value="30" data-donor-select-count></label><button type="button" class="button secondary" data-donor-select-top>Select Top #</button></div><p class="muted">Highest-rated donors in this position. Other position selections stay.</p><p role="status" data-donor-select-status></p></details>':""}<div class="team-picker-summary" data-option-summary></div><div class="team-picker-list option-picker-list" role="group" aria-label="${escapeHtml(label)}">${rows}</div>${lazy ? `<input type="hidden" data-lazy-option-catalog value="${escapeHtml(JSON.stringify(options))}">` : ""}<div class="empty option-picker-empty" hidden>No options match this search.</div><select id="${id}" class="team-picker-source" multiple hidden aria-hidden="true" tabindex="-1">${options.map(option => `<option value="${escapeHtml(option.value)}" ${selectedValues.has(option.value) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select><p class="muted">${helper} Click a checkbox to select or deselect. ${grouped ? "Shift-click another player to select or deselect the players in between. Search and bulk buttons apply to the current position." : ""}</p></div>`;
}

const lazyOptionCatalogs = new WeakMap();
function lazyOptionCatalog(shell) {
  if (!lazyOptionCatalogs.has(shell)) lazyOptionCatalogs.set(shell, JSON.parse(shell.querySelector('[data-lazy-option-catalog]').value));
  return lazyOptionCatalogs.get(shell);
}
function renderLazyOptions(shell) {
  if (shell.dataset.lazyOptions !== 'true') return;
  const selected = new Set([...shell.querySelector('select[multiple]').selectedOptions].map(option => option.value));
  const rows = lazyOptionCatalog(shell).filter(option => option.group === shell.dataset.optionGroup);
  shell.querySelector('.option-picker-list').innerHTML = rows.map(option => `<label class="team-picker-row option-picker-row" data-option-row data-position="${escapeHtml(option.group)}" data-option-order="${option.order}" data-overall="${option.overall ?? ''}" data-section="" data-search="${escapeHtml((option.label+' '+option.value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''))}"><input type="checkbox" data-option-choice value="${escapeHtml(option.value)}" ${selected.has(option.value)?'checked':''}><span>${escapeHtml(option.label)}</span></label>`).join('');
}
function donorRowCompare(left, right, mode) {
  const overall = row => row.dataset.overall !== "" && Number.isFinite(Number(row.dataset.overall)) ? Number(row.dataset.overall) : -Infinity;
  if (mode === "default" && left.dataset.donorTeam && right.dataset.donorTeam) {
    const team = left.dataset.donorTeam.localeCompare(right.dataset.donorTeam);
    if (team) return team;
    if (overall(left) !== overall(right)) return overall(left) > overall(right) ? -1 : 1;
    const name = (left.dataset.donorName ?? "").localeCompare(right.dataset.donorName ?? "");
    if (name) return name;
  }
  if (mode === "overall" && overall(left) !== overall(right)) return overall(left) > overall(right) ? -1 : 1;
  return Number(left.dataset.optionOrder) - Number(right.dataset.optionOrder);
}

function checkboxSelectionRange(values, anchor, target) {
  const start = values.indexOf(anchor), end = values.indexOf(target);
  return start < 0 || end < 0 ? [] : values.slice(Math.min(start, end), Math.max(start, end) + 1);
}

function sortDonorPicker(shell) {
  const control = shell.querySelector("[data-option-sort]");
  if (!control) return;
  const list = shell.querySelector(".option-picker-list"), fragment = document.createDocumentFragment();
  [...list.querySelectorAll("[data-option-row]")].sort((left, right) => donorRowCompare(left, right, control.value)).forEach(row => fragment.append(row));
  list.append(fragment);
  filterCheckboxPicker(shell);
}

function syncCheckboxPicker(shell) {
  const select = shell.querySelector("select[multiple]"), chosen = new Set([...select.selectedOptions].map(option => option.value));
  shell.querySelectorAll("[data-option-choice]").forEach(input => input.checked = chosen.has(input.value));
  shell.querySelectorAll("[data-option-position]").forEach(button => {
    const group = button.dataset.optionPosition, inputs = shell.dataset.lazyOptions === 'true' ? lazyOptionCatalog(shell).filter(option => option.group === group).map(option => ({ checked: chosen.has(option.value) })) : [...shell.querySelectorAll("[data-option-row]")].filter(row => row.dataset.position === group).map(row => row.querySelector("input"));
    button.setAttribute("aria-pressed", String(shell.dataset.optionGroup === group));
    button.querySelector("span").textContent = `${inputs.filter(input => input.checked).length}/${inputs.length}`;
  });
  const selected = [...select.selectedOptions], summary = shell.querySelector("[data-option-summary]");
  summary.innerHTML = selected.length ? selected.slice(0, 4).map(option => `<span class="selection-chip">${escapeHtml(option.textContent)}</span>`).join("") + (selected.length > 4 ? `<span class="selection-chip more">+${selected.length - 4} more</span>` : "") : `<span class="selection-empty">${multiSelectEmptyMeaning(select.id) === "All" ? "All options are allowed" : "No options selected"}</span>`;
  updateMultiSelectCount(select);
}

function filterCheckboxPicker(shell) {
  const query = shell.querySelector("[data-option-search]").value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), group = shell.dataset.optionGroup;
  let visible = 0;
  shell.querySelectorAll("[data-option-row]").forEach(row => { row.hidden = Boolean((group && row.dataset.position !== group) || (shell.querySelector("[data-removal-category]")?.value && row.dataset.section !== shell.querySelector("[data-removal-category]").value) || (query && !row.dataset.search.includes(query))); if (!row.hidden) visible++; });
  shell.querySelectorAll("[data-option-section]").forEach(heading => { heading.hidden = ![...shell.querySelectorAll("[data-option-row]")].some(row => !row.hidden && row.dataset.section === heading.dataset.optionSection); });
  shell.querySelector(".option-picker-empty").hidden = visible > 0;
  shell.querySelector(".option-picker-list").scrollTop = 0;
}

function bindCheckboxPickers(root = content) {
  root.querySelectorAll("[data-option-picker]").forEach(shell => {
    if (shell.dataset.bound === "true") return;
    // Main pages retain only native selection state. Materialize checkbox rows
    // on demand inside the filter editor, one position group at a time.
    if (shell.dataset.lazyOptions === 'true' && !shell.closest('dialog')) return;
    renderLazyOptions(shell);
    shell.dataset.bound = "true";
    const select = shell.querySelector("select[multiple]"), grouped = shell.classList.contains("donor-player-picker");
    let anchor = null, pendingRange = [];
    if (grouped) shell.addEventListener("click", event => {
      if (!event.target.matches("[data-option-choice]")) return;
      const values = [...shell.querySelectorAll("[data-option-row]")].filter(row => !row.hidden).map(row => row.querySelector("input").value);
      pendingRange = event.shiftKey ? checkboxSelectionRange(values, anchor, event.target.value) : [];
      if (!pendingRange.length) anchor = event.target.value;
    });
    shell.addEventListener("change", event => {
      if (!event.target.matches("[data-option-choice]")) return;
      const values = new Set(pendingRange.length ? pendingRange : [event.target.value]);
      pendingRange = [];
      for (const option of select.options) if (values.has(option.value)) option.selected = event.target.checked;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    shell.querySelector("[data-removal-category]")?.addEventListener("change",()=>filterCheckboxPicker(shell));
    shell.querySelector("[data-option-search]").addEventListener("input", () => { anchor = null; filterCheckboxPicker(shell); });
    shell.querySelector("[data-option-sort]")?.addEventListener("change", () => { anchor = null; sortDonorPicker(shell); });
    shell.querySelectorAll("[data-option-position]").forEach(button => button.addEventListener("click", () => { anchor = null; shell.dataset.optionGroup = button.dataset.optionPosition; shell.querySelector("[data-option-search]").value = ""; renderLazyOptions(shell); sortDonorPicker(shell); filterCheckboxPicker(shell); syncCheckboxPicker(shell); }));
    for (const [attribute, checked] of [["data-option-all", true], ["data-option-clear", false]]) shell.querySelector(`[${attribute}]`).addEventListener("click", () => {
      const group = shell.dataset.optionGroup;
      anchor = null;
      const values = new Set([...shell.querySelectorAll("[data-option-row]")].filter(row => (!group || row.dataset.position === group) && ((select.dataset.configOriginal??select.id)!=="equipment-remove-items" || !row.hidden)).map(row => row.querySelector("input").value));
      for (const option of select.options) if (values.has(option.value)) option.selected = checked;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    shell.querySelector('[data-donor-select-top]')?.addEventListener('click',()=>{
      const count=Number(shell.querySelector('[data-donor-select-count]').value),status=shell.querySelector('[data-donor-select-status]');
      if(!Number.isSafeInteger(count)||count<1){status.textContent='Enter a whole number of at least 1.';return;}
      const candidates=[...shell.querySelectorAll('[data-option-row]')].filter(row=>row.dataset.position===shell.dataset.optionGroup).sort((a,b)=>Number(b.dataset.overall)-Number(a.dataset.overall)||Number(a.dataset.optionOrder)-Number(b.dataset.optionOrder));
      const selected=new Set(candidates.slice(0,count).map(row=>row.querySelector('input').value)),position=new Set(candidates.map(row=>row.querySelector('input').value));
      for(const option of select.options)if(position.has(option.value))option.selected=selected.has(option.value);
      select.dispatchEvent(new Event('change',{bubbles:true}));status.textContent=`Selected ${selected.size} donors in ${shell.dataset.optionGroup}.`;
    });
    select.addEventListener("change", () => syncCheckboxPicker(shell));
    if(shell.querySelector("[data-option-sort]"))sortDonorPicker(shell);else filterCheckboxPicker(shell); syncCheckboxPicker(shell);
  });
}

function migrateEquipmentSessionSettings(values) {
  const included = document.getElementById("equipment-included");
  if (included && Array.isArray(values["equipment-excluded"])) {
    const excluded = new Set(values["equipment-excluded"]), previous = values["equipment-included"] ?? [];
    const teams = previous.length ? previous : [...included.options].map(option => option.value);
    if (excluded.size) values["equipment-included"] = teams.filter(team => !excluded.has(team));
    if (excluded.size && !values["equipment-included"].length) throw new Error("These older team settings exclude every team. Choose teams before Preview.");
    delete values["equipment-excluded"];
  }
  if (values["equipment-cross-percent"] === undefined && values["equipment-multiple-percent"] === undefined) {
    if (values["equipment-force-cross"]) { values["equipment-cross-percent"] = "100"; values["equipment-multiple-percent"] = "0"; }
    else if (values["equipment-disable-cross"]) { values["equipment-cross-percent"] = "0"; values["equipment-multiple-percent"] = "30"; }
  }
  delete values["equipment-force-cross"]; delete values["equipment-disable-cross"];
}
