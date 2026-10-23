const uniformPositionGroups = ["QB", "HB", "FB", "WR", "TE", "OL", "EDGE", "DT", "LB", "CB", "FS", "SS", "K/P"];
function uniformCapDefaults(kind, prepared = {}) {
  return prepared[kind === "lower" ? "defaultLowerJerseyCaps" : "defaultCutoffPantsCaps"] ?? Object.fromEntries(uniformPositionGroups.map(group => [group, kind === "lower" ? ["OL", "DT"].includes(group) ? 0 : 100 : ["WR", "CB", "FS", "SS"].includes(group) ? 5 : 0]));
}
function uniformCapMarkup(prepared) {
  return ["lower", "cutoff"].map(kind => `<div id="${kind}-uniform-settings"><p class="notice">${kind === "lower" ? "Jersey Rolled Low Tucked Undershirt → Jersey Rolled Lowest. Rolled Jersey Low → Jersey Rolled Lowest Untucked." : "Only compatible players qualify: no leg base layer, an undershirt, and Rolled Lowest Untucked, Rolled Jersey Low, Tight Sleeves Untucked, or Rolled Jersey."}</p><h3 id="${kind}-uniform-cap-title">Position Caps</h3><p class="muted" data-help-for="${kind}-uniform-cap-title">These are maximum population shares, not independent chances. Existing ${kind === "lower" ? "lowest-rolled jerseys" : "cutoff pants"} count first and are not removed when already above the cap. 0% prevents new capped additions. Groups are independent; they do not total 100%. Small populations round down to whole players. Each team's position groups are capped separately within your Player Pool; unused allowance is not shared with other teams.</p><div class="probability-grid three">${Object.entries(uniformCapDefaults(kind, prepared)).map(([group, value]) => percentageControl(`${kind}-uniform-cap-${group.replace("/", "-")}`, group, value)).join("")}</div>${kind === "cutoff" ? `<label class="toggle-card"><input id="cutoff-replace-standard" type="checkbox"><span><strong>Also Replace All Standard Pants</strong><small>Changes compatible players wearing below-knee Pants Standard to Pants Cutoff, even if this exceeds the position cap. Off by default. These replacements count toward the cap before any Above-Knee Pants additions. Other gear is never removed to make a player qualify.</small></span></label><p class="muted" data-help-for="cutoff-replace-standard">When Above-Knee Pants is also enabled, this pass uses the pants each player started with. Standard pants only become cutoff pants when the checkbox above is selected.</p>` : ""}</div>`).join("");
}
function uniformCapOptions(kind, root = document) {
  return Object.fromEntries(uniformPositionGroups.map(group => [group, configurationNumber(root, `${kind}-uniform-cap-${group.replace("/", "-")}`)]));
}
function uniformCapSummary(kind, root = document) {
  const caps = uniformCapOptions(kind, root), allowed = Object.entries(caps).filter(([, value]) => value > 0);
  return "Per team · " + (allowed.length ? allowed.map(([group, value]) => `${group} ${value}%`).join(" · ") : "All positions disabled") + (kind === "cutoff" && configurationRead(root, "cutoff-replace-standard")?.checked ? " · All Compatible Standard Pants" : "");
}
function bindUniformPassWindows() {
  for (const kind of ["lower", "cutoff"]) {
    const toggle = `fix-unlocked-${kind === "lower" ? "lower-jersey" : "cutoff-pants"}`;
    condenseConfiguration(document.getElementById(`${kind}-uniform-settings`), {
      title: kind === "lower" ? "Lower Rolled Jersey Caps" : "Cutoff Pants Settings",
      description: "Set whole-number maximum shares for each team's position groups. Protected players stay unchanged and existing styles count toward the cap. Requires CFB27 Unlocked by Orckestra.",
      dependencies: [toggle], enabled: () => document.getElementById(toggle).checked,
      summary: root => uniformCapSummary(kind, root)
    });
  }
}
function uniformPopulationMarkup(details) {
  if (!details?.uniformPopulation?.length || !details.lowerRolledJerseyFix && !details.cutoffPantsFix) return "";
  return `<details class="helmet-population-audit"><summary>Uniform Style Caps — Before / Limit / After</summary><p>Limits apply separately to each team's position groups in your Player Pool, including protected players. Protected players stay unchanged; fit requirements may leave results below the cap. Existing styles are not removed to meet a lower limit. Standard Pants replacement, when selected, intentionally overrides the cutoff cap.</p><div class="table-scroll"><table><thead><tr><th>Population</th><th>Players</th>${details.lowerRolledJerseyFix ? "<th>Lowest Jersey: Before / Limit / After</th>" : ""}${details.cutoffPantsFix ? "<th>Cutoff Pants: Before / Limit / After</th><th>Standard Replacements</th><th>Fit Exclusions</th>" : ""}</tr></thead><tbody>${details.uniformPopulation.map(row => `<tr><td>${row.team ? `${escapeHtml(row.team)} · ` : ""}${escapeHtml(row.group)} · ${escapeHtml(row.cohort.toUpperCase())}</td><td>${row.total}</td>${details.lowerRolledJerseyFix ? `<td>${row.existingLower} / ${row.lowerTarget} (${row.lowerCap}%) / ${row.lowerAfter}</td>` : ""}${details.cutoffPantsFix ? `<td>${row.existingCutoff} / ${row.cutoffTarget} (${row.cutoffCap}%) / ${row.cutoffAfter}</td><td>${row.standardReplacements}</td><td>${row.incompatible}</td>` : ""}</tr>`).join("")}</tbody></table></div></details>`;
}
