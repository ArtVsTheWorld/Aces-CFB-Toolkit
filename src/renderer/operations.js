// Additional pages reuse the shared session, preview, history and logo helpers.
async function nilTogglePage(tool) {
  if (!state.activeSave?.exists) { content.innerHTML = `${toolHeader(tool)}${inputCard()}`; bindCommon(); return; }
  const savePath = state.activeSave.path;
  content.innerHTML = `${toolHeader(tool)}<section class="card"><div class="status"><span class="spinner"></span>Reading active player rosters…</div></section>`;
  try {
    const key = `${tool.id}|${savePath}`;
    let prepared = state.prepared.get(key);
    if (!prepared) { prepared = await window.cfbToolkit.prepareTool({ toolId: tool.id, savePath }); state.prepared.set(key, prepared); }
    if (state.page !== tool.id || state.activeSave?.path !== savePath) return;
    content.innerHTML = `${toolHeader(tool)}<div class="standard-config-workspace"><div class="notice">Only the NIL flag changes. This flag controls in-game player editing; it is not a reliable record of real-life NIL status. All filters below work together. Empty selections mean all active-roster players.</div><section class="ops-section"><header class="ops-section-header"><span class="step-number">1</span><div><h2>Target NIL Value</h2><p>Choose the value to write to matching players.</p></div></header><div class="ops-section-body"><label for="nil-target">New NIL Flag</label><select id="nil-target"><option value="false">NIL = False — Allow In-Game Editing</option><option value="true">NIL = True — Restrict In-Game Editing</option></select></div></section><section class="ops-section"><header class="ops-section-header"><span class="step-number">2</span><div><h2>Player Scope</h2><p>Leave every filter empty to target the entire active dynasty roster, or combine filters to narrow it down.</p></div></header><div class="ops-section-body"><div class="compact-grid">${teamPicker("nil-teams", "Teams", prepared.teams, "Empty means all teams.")}${multiSelect("nil-players", "Specific Players", prepared.players, "Empty means all players who match the other filters.")}</div><div class="compact-grid selector-grid">${multiSelect("nil-positions", "Positions", [...prepared.positions].sort(positionCompare).map(value => ({ value, label: localizedPosition(value) })))}${multiSelect("nil-classes", "Class Years", prepared.classes)}${multiSelect("nil-redshirts", "Redshirt Status", prepared.redshirtStatuses.map(value => ({ value, label: ({ Eligible: "Not Yet Redshirted", Current: "Currently Redshirting", Previous: "Previously Redshirted" })[value] })), "Empty includes every redshirt status. Previously Redshirted + Sophomore selects redshirt sophomores.")}</div></div></section><div class="actions"><button class="button" id="preview">Preview NIL Changes →</button></div></div>${standardPreviewWorkspace("NIL Flag Preview", "Every matching player is shown, including players already at the requested value. Only different NIL flags are written.", "apply")}`;
    bindCommon(); bindRun(tool.id); restoreToolSettings();
    const cached = state.genericPreviews.get(tool.id);
    if (cached) { renderResult(document.querySelector("#run-output"), cached); document.querySelector("#apply").disabled = !cached.planId; showStandardPreviewStage(true); }
  } catch (error) { showError(readableError(error)); }
}
function nilToggleResults(result) {
  const rows = previewChanges(result), view = state.genericResultViews.get("nil-toggle") ?? "cards";
  const flag = value => value ? "True" : "False";
  const cards = rows.map(row => `<article class="team-boost-player-card"><img data-team-logo src="${forceLogoUrl(row.team)}" alt=""><div class="team-boost-player"><strong>${escapeHtml(row.player)}</strong><span>${escapeHtml(row.team)} · ${escapeHtml(row.position)} · ${escapeHtml(row.redshirtStatus === "Previous" ? "RS " : "")}${escapeHtml(row.classYear)}</span></div><span class="selection-chip">${row.changed ? "Change" : "Already Set"}</span><div class="nil-flag-change">IsNIL: <strong>${flag(row.currentValue)} → ${flag(row.proposedValue)}</strong></div></article>`).join("");
  const table = `<div class="preview-scroll"><table class="generic-result-table"><thead><tr><th>Team</th><th>Player</th><th>Position</th><th>Class</th><th>Redshirt Status</th><th>Current IsNIL</th><th>New IsNIL</th><th>Result</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escapeHtml(row.team)}</td><td>${escapeHtml(row.player)}</td><td>${escapeHtml(row.position)}</td><td>${escapeHtml(row.classYear)}</td><td>${escapeHtml(row.redshirtStatus)}</td><td>${flag(row.currentValue)}</td><td>${flag(row.proposedValue)}</td><td>${row.changed ? "Change" : "Already Set"}</td></tr>`).join("")}</tbody></table></div>`;
  return `<div class="review-toolbar"><input class="input" id="nil-result-filter" placeholder="Search matching players…"></div><div class="equipment-result-switch"><strong>${result.details.totalSearchMatches ?? result.details.totalPreviewRows} matching players</strong><div class="view-toggle" role="group" aria-label="NIL preview view"><button data-generic-view="cards" class="${view === "cards" ? "active" : ""}">Cards</button><button data-generic-view="table" class="${view === "table" ? "active" : ""}">Table</button></div></div><div class="equipment-card-list generic-player-card-list" ${view === "cards" ? "" : "hidden"}>${cards || '<div class="empty">No players match these filters.</div>'}</div><div class="generic-player-table-view" ${view === "table" ? "" : "hidden"}>${table}</div>`;
}
function helmetBalancePreview(diagnostics) {
  if (!diagnostics) return "";
  return `<details class="helmet-balance-preview" open><summary><strong>Helmet Population Balance</strong><span>Minimum swaps toward the selected targets</span></summary><p class="muted">Counts cover safe, uniquely owned, eligible non-OL equipment records. FBS and directional FCS are balanced separately. Players outside your filters and protected/shared records are not included in balancing.</p>${[["FBS", diagnostics.fbs], ["Directional FCS", diagnostics.fcs]].filter(([, cohort]) => cohort?.eligiblePlayers).map(([name, cohort]) => `<h3>${name} · ${cohort.eligiblePlayers} players · ${cohort.changes} planned replacements</h3>${cohort.vicisTargetLimited ? `<p class="muted">There are only ${cohort.vicisEligiblePlayers} eligible QB, TE, LB, or DL players for Vicis. The achievable target is adjusted to respect that limit; the other helmet families share the remaining players.</p>` : ""}<div class="preview-scroll"><table><thead><tr><th>Helmet Family</th><th>Before</th><th>After</th><th>Target</th></tr></thead><tbody>${cohort.families.map(family => `<tr><td>${escapeHtml(family.family)}</td><td>${family.before} (${family.beforePercent.toFixed(1)}%)</td><td>${family.after} (${family.afterPercent.toFixed(1)}%)</td><td>${family.targetCount} (${family.targetPercent}%)</td></tr>`).join("")}</tbody></table></div><details><summary>Replacements by Team</summary><p class="muted">${Object.entries(cohort.changesByTeam).map(([team, count]) => `${escapeHtml(team)}: ${count}`).join(" · ") || "No swaps needed."}</p></details>`).join("")}</details>`;
}
function notableWeekMatchups(rows, week) {
  const ranked = rank => Number.isInteger(rank) && rank >= 1 && rank <= 25;
  return rows.filter(row => row.week === week).sort((a, b) => {
    const count = row => Number(ranked(row.homeRank)) + Number(ranked(row.awayRank));
    const rating = row => Math.min(row.homeOverall ?? 0, row.awayOverall ?? 0);
    return count(b) - count(a) || rating(b) - rating(a) || Math.abs(a.favoriteSpread) - Math.abs(b.favoriteSpread) || a.row - b.row;
  }).slice(0, 3);
}
function homeMatchupLines() {
  if (!state.activeSave?.schema?.supported) return "";
  const season = state.homeContext?.season, week = season?.weekType === "RegularSeason" ? season.week : null;
  const rows = state.seasonLinesSave === state.activeSave.path ? notableWeekMatchups(state.seasonLines?.rows ?? [], week) : [];
  const rank = (value, name) => `${Number.isInteger(value) && value >= 1 && value <= 25 ? `#${value} ` : ""}${escapeHtml(name)}`;
  return `<section class="home-matchups"><div class="home-section-heading"><div><span class="home-section-icon">◇</span><h2>Season Matchup Lines</h2><p>${week !== null ? `Top Matchups · Week ${week}` : "Explore this season's projected matchups"}</p></div><button class="button" id="open-season-lines">View Season Lines →</button></div>${rows.length ? `<div class="home-matchup-grid">${rows.map(row => `<article class="home-matchup-card"><div class="home-matchup-teams"><div><img data-team-logo src="${forceLogoUrl(row.awayTeam)}" alt=""><strong>${rank(row.awayRank, row.awayTeam)}</strong></div><span>${row.neutral ? "vs" : "at"}</span><div><img data-team-logo src="${forceLogoUrl(row.homeTeam)}" alt=""><strong>${rank(row.homeRank, row.homeTeam)}</strong></div></div><div class="home-matchup-numbers"><div><small>SPREAD</small><strong>${escapeHtml(row.favorite)} ${Number(row.favoriteSpread).toFixed(1)}</strong></div><div><small>OVER / UNDER</small><strong>${Number(row.total).toFixed(1)}</strong></div></div><div class="home-matchup-moneyline"><small>MONEYLINE</small><span>${escapeHtml(row.favorite)} <b>${forceMoneyline(row.favoriteMoneyline)}</b></span><span>${escapeHtml(row.underdog)} <b>${forceMoneyline(row.underdogMoneyline)}</b></span></div>${row.rivalry ? '<small class="matchup-rivalry">Rivalry</small>' : ""}</article>`).join("")}</div><p class="muted home-matchup-note">Ranked matchups first, then stronger paired rosters and closer projected spreads.</p>` : `<p class="muted">${state.homeLinesLoading ? "Reading this season's matchup projections…" : state.seasonLinesError ? "Home projections are unavailable for this save. Open Season Lines for details." : week !== null ? "No projected matchups are available for the active week." : "Spread, moneyline, and over/under projections are available without running Smart Force Win."}</p>`}</section>`;
}
async function ensureHomeLines() {
  const savePath = state.activeSave?.path;
  if (!state.activeSave?.schema?.supported || !savePath || state.homeLinesLoading || state.seasonLinesSave === savePath || state.seasonLinesError) return;
  state.homeLinesLoading = true;
  try {
    const data = await window.cfbToolkit.homeLines({});
    if (state.activeSave?.path !== savePath) return;
    state.seasonLines = data; state.seasonLinesSave = savePath;
  } catch (error) { if (state.activeSave?.path === savePath) state.seasonLinesError = readableError(error).message; }
  finally { state.homeLinesLoading = false; if (state.page === "home") { content.innerHTML = homePage(); bindCommon(); } }
}
