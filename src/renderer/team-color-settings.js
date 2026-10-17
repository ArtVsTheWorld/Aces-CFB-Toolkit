// One row renderer and the existing whole-number balancing controls serve both
// distributions. Accessory and tape values remain independent configurations.
function teamColorDistributionMarkup(prepared, kind) {
  const tape = kind === "tape", prefix = tape ? "tape-team" : "accessory-team", title = tape ? "Tape Color" : "Accessory Color";
  const colors = [["white", "White"], ["black", "Black"], ["primary", "Team Primary"], ["secondary", "Team Secondary"]];
  const rows = prepared.teams.map((team, index) => {
    const name = team.name.toLowerCase(), defaults = prepared.tapeColorDefaults?.[name] ?? { white: 95, black: 5, primary: 0, secondary: 0 };
    return `<div class="tape-team-row" data-${tape ? "tape-team-row" : "accessory-team-row"}="${escapeHtml(name)}"><div class="tape-team-name"><img data-team-logo src="${forceLogoUrl(team.name)}" alt=""><strong>${escapeHtml(team.name)}</strong></div>${colors.map(([color, label]) => {
      const hex = color === "white" ? "#ffffff" : color === "black" ? "#000000" : prepared.teamColors?.[name]?.[color];
      const swatch = hex ? `<svg class="tape-color-swatch" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="${hex}"/></svg>` : "";
      return `<div class="tape-weight"><label for="${prefix}-color-${index}-${color}" title="${escapeHtml(label + (hex ? ': ' + hex : ''))}">${swatch}${label.replace("Team ", "")}</label><div class="input-suffix"><input class="input" id="${prefix}-color-${index}-${color}" ${tape ? `data-tape-team="${escapeHtml(name)}" data-tape-color="${color}"` : `data-accessory-team="${escapeHtml(name)}" data-accessory-team-color="${color}"`} type="number" min="0" max="100" step="1" value="${defaults[color]}" aria-label="${escapeHtml(label)} ${title.toLowerCase()} percentage for ${escapeHtml(team.name)}"><span>%</span></div></div>`;
    }).join("")}<div class="tape-total"><span ${tape ? "data-tape-total" : "data-accessory-team-total"}>Total: 100%</span><button class="button secondary" type="button" ${tape ? "data-balance-tape" : "data-balance-accessory-team"}>Balance to 100%</button></div></div>`;
  }).join("");
  return `<details class="tape-team-settings" id="${tape ? 'tape-distribution-settings' : 'accessory-team-distribution-settings'}" ${tape ? "" : "hidden"}><summary><strong>${title} by Team</strong><span>White, black, team primary, or team secondary</span></summary><p class="muted">${tape ? "Each player rolls a tape color separately from their accessory color." : "Each player rolls one accessory color from their team's mix. Match Tape to Player Accessory Color uses that same result, without a second roll."} Team defaults match the tape defaults; other teams start at 95% white and 5% black. Each row must total 100%. Primary and Secondary use the colors in your save. Existing items are recolored, not added.</p><input class="input" id="${tape ? 'tape-team' : 'accessory-team'}-search" type="search" placeholder="Find a team" aria-label="Find a team for ${title}"><div class="tape-team-list">${rows}</div><p class="muted" id="${tape ? 'tape-team' : 'accessory-team'}-empty" hidden>No teams match your search.</p></details>`;
}
function teamAccessoryOptions() {
  const teams = {};
  for (const input of document.querySelectorAll("[data-accessory-team][data-accessory-team-color]")) (teams[input.dataset.accessoryTeam] ??= {})[input.dataset.accessoryTeamColor] = input.value.trim() === "" ? NaN : Number(input.value);
  return teams;
}
function bindAccessoryTeamColors(toolId, prepared) {
  for (const row of document.querySelectorAll("[data-accessory-team-row]")) {
    row.querySelectorAll("[data-accessory-team-color]").forEach(input => { for (const event of ["input", "change"]) input.addEventListener(event, () => { syncTeamTapeWeights(row); invalidateEquipment(toolId); if (prepared) updateEquipmentReview(toolId, prepared); }); });
    row.querySelector("[data-balance-accessory-team]").addEventListener("click", () => balanceTeamTapeWeights(row));
  }
  document.getElementById("accessory-team-search")?.addEventListener("input", event => filterTeamColorRows(content, "accessory", event.target.value));
}
function filterTeamColorRows(root, kind, value) {
  const tape = kind === "tape", selector = tape ? "[data-tape-team-row]" : "[data-accessory-team-row]", query = value.trim().toLowerCase();
  const rows = [...root.querySelectorAll(selector)]; rows.forEach(row => row.hidden = !(tape ? row.dataset.tapeTeamRow : row.dataset.accessoryTeamRow).includes(query));
  const empty = configurationRead(root, tape ? "tape-team-empty" : "accessory-team-empty"); if (empty) empty.hidden = rows.some(row => !row.hidden);
}
function teamColorMixReviewRows(kind) {
  const tape = kind === "tape", mixes = new Map();
  for (const row of document.querySelectorAll(tape ? "[data-tape-team-row]" : "[data-accessory-team-row]")) {
    const mix = [...row.querySelectorAll(tape ? "[data-tape-color]" : "[data-accessory-team-color]")].map(input => `${tape ? input.dataset.tapeColor : input.dataset.accessoryTeamColor}: ${input.value}%`).join(" / ");
    if (!mixes.has(mix)) mixes.set(mix, []); mixes.get(mix).push(row.querySelector(".tape-team-name strong").textContent);
  }
  return [...mixes].map(([mix, teams]) => [(tape ? "Tape Color — " : "Accessory Color — ") + mix, teams.join(", ")]);
}
