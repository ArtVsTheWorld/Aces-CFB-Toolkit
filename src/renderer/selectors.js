function checkboxPicker(id, label, values, helper, defaults = []) {
  const selectedValues = new Set(defaults.map(String)), grouped = id === "equipment-donor-players";
  const options = values.map((value, order) => ({ value: String(value.value ?? value.name ?? value), label: String(value.label ?? value.name ?? value), group: grouped ? localizedPosition(value.position ?? "Unknown") : "", section: id === "unlocked-tattoo-pool" ? String(value.group ?? "") : "", order, overall: grouped && value.overall !== null && Number.isFinite(Number(value.overall)) ? Number(value.overall) : null }));
  const groups = [...new Set(options.map(option => option.group).filter(Boolean))].sort(positionCompare);
  const sorting = grouped ? `<label class="donor-sort-control" for="equipment-player-sort">Sort<select id="equipment-player-sort" data-option-sort><option value="default">Default Order</option><option value="overall">Overall (Highest First)</option></select></label>` : "";
  const rows = options.map((option, index) => `${option.section && options[index - 1]?.section !== option.section ? `<strong class="tattoo-pool-heading" data-option-section="${escapeHtml(option.section)}">${escapeHtml(option.section)}</strong>` : ""}<label class="team-picker-row option-picker-row" data-option-row data-position="${escapeHtml(option.group)}" data-option-order="${option.order}" data-overall="${option.overall ?? ""}" data-section="${escapeHtml(option.section)}" data-search="${escapeHtml(`${option.label} ${option.value}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))}"><input type="checkbox" data-option-choice value="${escapeHtml(option.value)}" ${selectedValues.has(option.value) ? "checked" : ""}><span>${escapeHtml(option.label)}</span></label>`).join("");
  return `<div class="team-picker option-picker${grouped ? " donor-player-picker" : ""}" data-option-picker="${id}" data-option-group="${escapeHtml(groups[0] ?? "")}"><label data-multi-label-for="${id}" data-base-label="${escapeHtml(label)}" data-empty-meaning="${multiSelectEmptyMeaning(id)}">${escapeHtml(label)}</label>${grouped ? `<div class="option-position-tabs" role="group" aria-label="Donor position">${groups.map(group => `<button type="button" class="button secondary tiny" data-option-position="${escapeHtml(group)}"><strong>${escapeHtml(group)}</strong><span></span></button>`).join("")}</div><p class="muted">Switch positions to choose donors. Checked players stay selected across positions.</p>` : ""}<div class="team-picker-toolbar"><input class="input" data-option-search placeholder="Search ${grouped ? "this position" : escapeHtml(label.toLowerCase())}…" aria-label="Search ${escapeHtml(label)}">${sorting}<button type="button" class="button secondary tiny" data-option-all>${grouped ? "Select position" : "All"}</button><button type="button" class="button secondary tiny" data-option-clear>${grouped ? "Clear position" : "Clear"}</button></div><div class="team-picker-summary" data-option-summary></div><div class="team-picker-list option-picker-list" role="group" aria-label="${escapeHtml(label)}">${rows}</div><div class="empty option-picker-empty" hidden>No options match this search.</div><select id="${id}" class="team-picker-source" multiple hidden aria-hidden="true" tabindex="-1">${options.map(option => `<option value="${escapeHtml(option.value)}" ${selectedValues.has(option.value) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select><p class="muted">${helper} Click a checkbox to select or deselect. ${grouped ? "Shift-click another player to select or deselect the players in between. Search and bulk buttons apply to the current position." : ""}</p></div>`;
}

function donorRowCompare(left, right, mode) {
  const overall = row => row.dataset.overall !== "" && Number.isFinite(Number(row.dataset.overall)) ? Number(row.dataset.overall) : -Infinity;
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
    const group = button.dataset.optionPosition, inputs = [...shell.querySelectorAll("[data-option-row]")].filter(row => row.dataset.position === group).map(row => row.querySelector("input"));
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
  shell.querySelectorAll("[data-option-row]").forEach(row => { row.hidden = Boolean((group && row.dataset.position !== group) || (query && !row.dataset.search.includes(query))); if (!row.hidden) visible++; });
  shell.querySelectorAll("[data-option-section]").forEach(heading => { heading.hidden = ![...shell.querySelectorAll("[data-option-row]")].some(row => !row.hidden && row.dataset.section === heading.dataset.optionSection); });
  shell.querySelector(".option-picker-empty").hidden = visible > 0;
  shell.querySelector(".option-picker-list").scrollTop = 0;
}

function bindCheckboxPickers(root = content) {
  root.querySelectorAll("[data-option-picker]").forEach(shell => {
    if (shell.dataset.bound === "true") return;
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
    shell.querySelector("[data-option-search]").addEventListener("input", () => { anchor = null; filterCheckboxPicker(shell); });
    shell.querySelector("[data-option-sort]")?.addEventListener("change", () => { anchor = null; sortDonorPicker(shell); });
    shell.querySelectorAll("[data-option-position]").forEach(button => button.addEventListener("click", () => { anchor = null; shell.dataset.optionGroup = button.dataset.optionPosition; shell.querySelector("[data-option-search]").value = ""; filterCheckboxPicker(shell); syncCheckboxPicker(shell); }));
    for (const [attribute, checked] of [["data-option-all", true], ["data-option-clear", false]]) shell.querySelector(`[${attribute}]`).addEventListener("click", () => {
      const group = shell.dataset.optionGroup;
      anchor = null;
      const values = new Set([...shell.querySelectorAll("[data-option-row]")].filter(row => !group || row.dataset.position === group).map(row => row.querySelector("input").value));
      for (const option of select.options) if (values.has(option.value)) option.selected = checked;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    select.addEventListener("change", () => syncCheckboxPicker(shell));
    filterCheckboxPicker(shell); syncCheckboxPicker(shell);
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
