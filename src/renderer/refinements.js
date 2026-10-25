/* Shared v20.0 refinements. Existing serializers and preview plans remain the
 * source of truth; these summaries never estimate eligibility or write saves. */
function appConfirm(title, message, proceed = 'Continue', footer = 'Nothing changes unless you continue and approve Apply.') {
  return new Promise(resolve => {
    const dialog = createConfigurationDialog({ title, description: message, eyebrow: 'Please Confirm', saveLabel: proceed, immediate: true, className: 'confirmation-editor' });
    if (!dialog) { resolve(false); return; }
    let settled = false;
    const finish = value => { if (settled) return; settled = true; close(); resolve(value); };
    const close = dialog.closeEditor; dialog.closeEditor = () => finish(false);
    dialog.querySelector('[data-config-dirty]').textContent = footer;
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'button secondary'; cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => finish(false)); dialog.querySelector('.configuration-footer-actions').prepend(cancel);
    dialog.querySelector('[data-config-save]').addEventListener('click', () => finish(true));
    dialog.showModal(); cancel.focus();
  });
}
let toolRunSequence = 0;
function beginToolRun(output) { const token = String(++toolRunSequence); output.dataset.runToken = token; return token; }
function currentToolRun(output, save, page, token) { return Boolean(output?.isConnected && state.activeSave?.path === save && state.page === page && output.dataset.runToken === token); }
content.addEventListener('change', event => {
  if (!event.target.id || event.target.dataset.previewFacet || event.target.closest('.config-presets') || /result-filter/.test(event.target.id)) return;
  content.querySelectorAll('#run-output,#analysis-output,#force-review-status').forEach(output => { output.dataset.runToken = String(++toolRunSequence); });
  content.querySelectorAll('#preview,#equipment-preview,#force-preview,#jersey-preview').forEach(button => button.disabled = false);
  const analysis = content.querySelector('#analysis-output');
  if (analysis?.querySelector('.tool-progress,.spinner')) {
    analysis.innerHTML = '<div class="notice">Settings changed. Analyze Matches again to use the current filters.</div>';
    const button = content.querySelector('#analyze-commentary');
    if (button && document.getElementById('commentary-classes')) { button.disabled = false; button.textContent = 'Analyze Matches →'; }
  }
});
function selectSummary(id, empty = 'All') {
  const control = document.getElementById(id); if (!control) return '';
  if (redshirtFilterIds.includes(control.dataset.configOriginal ?? id)) return redshirtScopeSummary(document, id);
  const labels = [...control.selectedOptions].map(option => option.textContent);
  return labels.length ? labels.length === control.options.length ? (empty.startsWith('All') ? empty : 'All ' + (control.closest('[data-team-picker],[data-option-picker]')?.querySelector('[data-base-label]')?.dataset.baseLabel ?? 'Options')) : labels.length > 3 ? `${labels.slice(0, 3).join(', ')} +${labels.length - 3}` : labels.join(', ') : empty;
}
function affectedScopeSummary() {
  const page = state.page;
  if(page==='equipment-mapper'){
    let rules=[];try{rules=JSON.parse(document.getElementById('mapper-rules')?.value??'[]');}catch{}
    return rules.length?`${rules.length} queued mappings · ${rules.slice(0,3).map(mapperScopeSummary).join(' / ')}${rules.length>3?' / More scopes listed below':''} · original EA roster players included`:'No mappings queued. Choose equipment and targets first.';
  }
  if (page.includes('equipment')) return [selectSummary('equipment-included', 'All Teams'), selectSummary('equipment-positions', 'All Positions'), selectSummary('equipment-classes', 'All Class Years'), selectSummary('equipment-redshirt-group'), document.getElementById('equipment-protect-ea')?.checked ? 'Original EA Players Protected' : 'Original EA Players Included', `OVR ${document.getElementById('equipment-min')?.value || 'Any'}–${document.getElementById('equipment-max')?.value || 'Any'}`].filter(Boolean).join(' · ');
  if (page === 'roster-generator') return rosterAffectedSummary();
  if (page === 'team-boost') return [selectSummary('team-search', 'No Teams Selected'), selectSummary('boost-positions', 'All Positions'), selectSummary('boost-classes', 'All Class Years'), selectSummary('boost-redshirt', 'All Redshirt Statuses'), selectSummary('boost-players', 'All Players'), document.getElementById('player-scope')?.selectedOptions[0]?.textContent].filter(Boolean).join(' · ');
  if (page === 'nil-toggle') return ['nil-teams', 'nil-players', 'nil-positions', 'nil-classes'].every(id => { const select = document.getElementById(id); return !select?.selectedOptions.length || select.selectedOptions.length === select.options.length; }) && !redshirtScopeStatuses(document.getElementById('nil-redshirts')?.value).length ? 'ENTIRE DYNASTY · All rostered players · Check the target NIL value carefully' : ['nil-teams', 'nil-players', 'nil-positions', 'nil-classes', 'nil-redshirts'].map(id => selectSummary(id)).join(' · ');
  if (page === 'commentary-id') return [selectSummary('commentary-teams', 'All Teams'), selectSummary('commentary-positions', 'All Positions'), selectSummary('commentary-classes', 'All Class Years'), selectSummary('commentary-players', 'All Players'), document.getElementById('freshmen-only')?.checked ? 'True Freshmen Only' : '', selectSummary('commentary-redshirt', 'All Redshirt Statuses'), 'Original EA Roster Players Always Protected'].filter(Boolean).join(' · ');
  if (page === 'jersey-renumber') return `All eligible rosters except: ${selectSummary('jersey-skipped', 'None')} · ${document.getElementById('jersey-protect-ea')?.checked ? 'Original EA Players Protected' : state.jerseyMode === 'no-duplicates' ? 'Original EA Players Included · Player Locks Available' : 'Original EA Players Included'}`;
  if (page === 'automatic-force-win') return `${document.getElementById('force-user-only')?.checked ? 'User Schedule Only' : 'All Eligible Matchups'} · Protected Teams: ${selectSummary('force-skipped', 'None')}`;
  if (page === 'dealbreaker-fixer') return `Rostered players with None${document.getElementById('db-restrict-style')?.checked && document.getElementById('db-fix-style')?.checked ? ' or invalid Playing Style' : ''} · Preserved Dealbreakers: ${selectSummary('db-protected-values', 'None')} · Protected Players: ${selectSummary('db-protected-players', 'None')}`;
  if (page === 'long-snap') return 'All rostered tight ends and offensive linemen · Only Long Snap ratings outside their position range';
  return '';
}
function validateSelectionModes() {
  for (const control of content.querySelectorAll('select[data-explicit-selection]')) {
    const mode = configurationRead(control.closest('[data-team-picker]'), 'selection-mode-' + (control.dataset.configOriginal ?? control.id));
    if (['selected','user'].includes(mode?.value) && !control.selectedOptions.length) return 'Select at least one option, or choose All / None explicitly.';
  }
  return '';
}
function addExplicitSelectionModes(root = content) {
  for (const control of root.querySelectorAll('[data-team-picker] select[multiple]')) {
    if (control.dataset.refinementBound) continue;
    control.dataset.refinementBound = 'true';
    control.dataset.explicitSelection = 'true';
    const shell = control.closest('[data-team-picker]'), skip = /skipped|excluded/.test(control.id), required = (control.dataset.configOriginal ?? control.id) === 'team-search' || (control.dataset.configOriginal ?? control.id) === 'roster-teams';
    const originalId = control.dataset.configOriginal ?? control.id;
    const existingMode = configurationRead(root, 'selection-mode-' + originalId);
    const mode = existingMode ?? document.createElement('select');
    if (!existingMode) { mode.id = 'selection-mode-' + originalId; mode.className = 'input selection-mode'; mode.setAttribute('aria-label', 'Team Selection Mode');
    mode.innerHTML = `<option value="all">All Teams${skip ? ' Protected' : ''}</option><option value="selected">Selected Teams${skip ? ' Protected' : ''}</option>${skip ? '<option value="none">No Teams Protected</option>' : required ? '<option value="none">No Teams Selected</option>' : ''}`;
    mode.value = control.selectedOptions.length ? control.selectedOptions.length === control.options.length ? 'all' : 'selected' : skip || required ? 'none' : 'all';
    shell.prepend(mode);
    }
    const users = [...control.options].filter(option => option.dataset.user === 'true');
    if (!mode.querySelector('[value="user"]')) { const option = new Option('User Teams Selected', 'user'); option.disabled = !users.length; mode.add(option); }
    const matchesUsers = () => users.length > 0 && [...control.options].every(option => option.selected === (option.dataset.user === 'true'));
    mode.addEventListener('change', () => { const chosen=mode.value; if(chosen==='user'&&!users.length){mode.value='selected';control.dispatchEvent(new Event('change',{bubbles:true}));return;} if (chosen !== 'selected') [...control.options].forEach(option => option.selected = chosen === 'all' || chosen === 'user' && option.dataset.user === 'true'); control.dispatchEvent(new Event('change', { bubbles: true })); if (chosen === 'user' && matchesUsers()) mode.value='user'; });
    shell.querySelector('[data-team-none]')?.addEventListener('click', () => { mode.value = skip || required ? 'none' : 'selected'; }, true);
    control.addEventListener('change', () => { if(mode.value==='user' && matchesUsers()) return; if (control.selectedOptions.length) mode.value = control.selectedOptions.length === control.options.length ? 'all' : 'selected'; else mode.value = skip || required ? 'none' : control.options.length ? 'selected' : 'all'; });
  }
}
function extendedPlayerMarkup(prefix, prepared, { teams = false, positions = false } = {}) {
  return `<div class="extra-player-scope">${teams ? teamPicker(prefix + '-teams', 'Teams', prepared.teams ?? [], 'Choose All Teams or a specific selection.') : ''}${positions ? multiSelect(prefix + '-positions', 'Positions', [...(prepared.positions ?? [])].sort(positionCompare).map(value => ({ value, label: localizedPosition(value) })), 'All positions unless restricted.') : ''}${multiSelect(prefix + '-classes', 'Class Years', (prepared.classes ?? []).map(value => ({ value, label: value })), 'All class years unless restricted.')}${redshirtScopeMarkup(prefix + '-redshirt')}${multiSelect(prefix + '-players', 'Individual Players', prepared.players ?? [], 'All eligible players unless restricted. This combines with the other filters.')}</div>`;
}
function extraScope(prefix) { return { teams: selected('#' + prefix + '-teams'), positions: selected('#' + prefix + '-positions'), classes: selected('#' + prefix + '-classes'), redshirtStatuses: redshirtScopeStatuses(document.getElementById(prefix + '-redshirt')?.value), playerRows: selected('#' + prefix + '-players') }; }
let commentaryScopeRequest;
function showPlayerFilterLoading(parent) {
  const node=document.createElement('section');node.className='configuration-entry additional-filter-loading';
  node.innerHTML=`<div><strong>Additional Player Filters</strong>${toolLoading('Reading players and filters…')}</div>`;
  parent.append(node);return node;
}
async function prepareBoostPlayerFilters(prepared) {
  const form=document.getElementById('boost-positions'),parent=form?.closest('.ops-section-body'),button=document.getElementById('preview'),save=state.activeSave?.path;
  if(!parent)return;const loader=showPlayerFilterLoading(parent);button.disabled=true;
  // Let the page and its progress indicator paint before installing selectors.
  await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  if(state.page!=='team-boost'||state.activeSave?.path!==save||!form.isConnected)return;
  try{installExtraScope('boost',prepared);}finally{loader.remove();button.disabled=false;}
}
function ensureCommentaryScope() {
  const save = state.activeSave?.path, page = state.page, form = document.getElementById('freshmen-only');
  if (!form || page !== 'commentary-id') return Promise.resolve(false);
  if (document.getElementById('commentary-classes')) return Promise.resolve(true);
  if (commentaryScopeRequest?.form === form) return commentaryScopeRequest.promise;
  const button = document.getElementById('analyze-commentary');
  button.disabled = true; button.textContent = 'Loading Player Filters…';
  const loader=showPlayerFilterLoading(form.closest('.ops-section-body'));
  const request = { form, promise: null };
  const current = () => state.page === page && state.activeSave?.path === save && document.getElementById('freshmen-only') === form;
  request.promise = (async () => {
    try {
      const prepared = await window.cfbToolkit.prepareTool({ toolId: 'commentary-id', savePath: save, options: { ...commentaryOptionsFromForm(), scopeCatalogOnly: true } });
      if (!current()) return false;
      state.prepared.set('commentary-id-scope|'+save,prepared);
      installExtraScope('commentary', prepared, { teams: true, positions: true });
      return true;
    } catch (error) {
      if (current()) { content.dataset.commentaryScopeError = save; if(typeof showOtherToolLoadingError!=='function'||!showOtherToolLoadingError(error))showError(readableError(error)); }
      return false;
    } finally {
      if (commentaryScopeRequest === request) commentaryScopeRequest = null;
      loader.remove();
      if (current()) { button.disabled = false; button.textContent = document.getElementById('commentary-classes') ? 'Analyze Matches →' : 'Retry Loading Player Filters'; }
    }
  })();
  commentaryScopeRequest = request;
  return request.promise;
}
function installExtraScope(prefix, prepared, options = {}) {
  if (document.getElementById(prefix + '-classes')) return;
  const parent = prefix === 'commentary' ? document.getElementById('freshmen-only')?.closest('.ops-section-body') : document.getElementById('boost-positions')?.closest('.ops-section-body');
  if (!parent) return;
  const saved = state.toolSettings.get(state.page); parent.insertAdjacentHTML('beforeend', extendedPlayerMarkup(prefix, prepared, options)); if (saved) restoreToolSettings();
  const group = parent.querySelector('.extra-player-scope'); bindMultiSelectEnhancements(group); bindTeamPickers(group); addExplicitSelectionModes(group);
  condenseConfiguration(group, { title: 'Additional Player Filters', description: prefix === 'commentary' ? 'All pages work together. Original EA roster players remain protected.' : 'All pages work together and narrow your selected teams and player scope.', summary: () => (options.teams ? ['teams', 'positions', 'classes', 'redshirt', 'players'] : ['classes', 'redshirt', 'players']).map(key => selectSummary(prefix + '-' + key, 'All')).join(' · ') });
}
function positionRangeMarkup() {
  return `<section><h3>Position Adjustment Overrides</h3><p>Leave a group unchecked to use the main minimum/maximum. Negative values lower ratings.</p>${['QB','HB','FB','WR','TE','OL','EDGE','DT','LB','CB','FS','SS','K/P'].map(group => `<div class="position-range-row"><label><input type="checkbox" data-range-enabled="${group}"> ${group}</label><input class="input" type="number" min="-99" max="99" step="1" value="1" id="range-min-${group}" data-range-min="${group}" aria-label="${group} Minimum"><input class="input" type="number" min="-99" max="99" step="1" value="3" id="range-max-${group}" data-range-max="${group}" aria-label="${group} Maximum"></div>`).join('')}</section>`;
}
function bindRangeEditor() {
  if (state.page !== 'team-boost' || document.getElementById('boost-position-ranges')) return;
  const parent = document.getElementById('rating-mode')?.parentElement; if (!parent) return;
  parent.insertAdjacentHTML('beforeend', '<input id="boost-position-ranges" type="hidden" value="{}"><section class="configuration-entry position-adjustment-entry"><div><strong>Position Adjustments</strong><p class="muted" id="boost-range-summary">All positions use the main adjustment range.</p></div><button class="button secondary" type="button" id="configure-boost-ranges">Configure Position Adjustments</button></section><p class="muted">Relevant Ratings favors attributes important to each player’s archetype. Specific Attributes adjusts every checked supported attribute.</p>');
  const input = document.getElementById('boost-position-ranges');
  const sync = () => { const ranges = JSON.parse(input.value); document.getElementById('boost-range-summary').textContent = Object.entries(ranges).map(([group, range]) => `${group}: ${range.minimum}–${range.maximum}`).join(' · ') || 'All positions use the main adjustment range.'; };
  input.addEventListener('change', sync);
  document.getElementById('configure-boost-ranges').onclick = () => {
    const dialog = createConfigurationDialog({ title: 'Position Adjustments', description: 'Optional whole-number range overrides. Other positions keep the main range.' }); if (!dialog) return;
    dialog.querySelector('.configuration-body').innerHTML = positionRangeMarkup(); const draft = JSON.parse(input.value);
    const firstRow=dialog.querySelector('.position-range-row');
    firstRow.insertAdjacentHTML('beforebegin','<div class="position-range-head"><span>Override Position</span><span>Minimum</span><span>Maximum</span></div>');
    dialog.querySelector('.configuration-body h3')?.remove();
    for (const [group, range] of Object.entries(draft)) { dialog.querySelector(`[data-range-enabled="${group}"]`).checked = true; dialog.querySelector(`[data-range-min="${group}"]`).value = range.minimum; dialog.querySelector(`[data-range-max="${group}"]`).value = range.maximum; }
    const values = () => Object.fromEntries([...dialog.querySelectorAll('[data-range-enabled]:checked')].map(control => [control.dataset.rangeEnabled, { minimum: configurationNumber(dialog, `range-min-${control.dataset.rangeEnabled}`), maximum: configurationNumber(dialog, `range-max-${control.dataset.rangeEnabled}`) }]));
    const syncDraft = () => { const bad = Object.values(values()).some(range => !Number.isInteger(range.minimum) || !Number.isInteger(range.maximum) || range.minimum < -99 || range.maximum > 99 || range.minimum > range.maximum); dialog.querySelector('[data-config-save]').disabled = bad; dialog.querySelector('[data-config-error]').hidden = !bad; dialog.querySelector('[data-config-error]').textContent = 'Use whole numbers from -99 to 99, with minimum no greater than maximum.'; };
    dialog.addEventListener('input', syncDraft); dialog.querySelector('[data-config-reset]').onclick = () => { dialog.querySelectorAll('[data-range-enabled]').forEach(control => control.checked = false); syncDraft(); };
    dialog.querySelector('[data-config-save]').onclick = () => { const next=values(),changed=Object.keys(next).length!==Object.keys(draft).length||Object.entries(next).some(([group,range])=>range.minimum!==draft[group]?.minimum||range.maximum!==draft[group]?.maximum); dialog.closeEditor(); if(changed){input.value=JSON.stringify(next);input.dispatchEvent(new Event('change',{bubbles:true}));} }; syncDraft(); dialog.showModal();
  };
}
function overlapNotice() {
  if (state.page !== 'equipment-patcher') return;
  const messages = [];
  if (document.getElementById('fix-socks')?.checked && document.getElementById('fix-unlocked-socks')?.checked) messages.push('Unlocked Sock Styles takes priority: Mid-Sock Replacement is not run while Unlocked Sock Styles is enabled.');
  if (document.getElementById('fix-clear-tattoos')?.checked) messages.push('Clear Tattoos removes tattoos only. Add Tattoos is disabled while this pass is selected.');
  if (document.getElementById('fix-unlocked-tattoos')?.checked) messages.push('Tattoos run after other corrections. Leg tattoos keep the final sock style.');
  if (document.getElementById('fix-visors')?.checked && document.getElementById('fix-oakley-visors')?.checked) messages.push('Hand Out Visors adds missing visors; Brand Existing Visors changes branding without changing tint.');
  if (document.getElementById('fix-unlocked-cutoff-pants')?.checked) messages.push('Cutoff Pants only changes compatible outfits. It uses original pants styles; Standard Pants conversion is opt-in and may exceed position caps.');
  if (document.getElementById('fix-unlocked-lower-jersey')?.checked && document.getElementById('fix-unlocked-cutoff-pants')?.checked) messages.push('Lower Rolled Jersey runs before Cutoff Pants; tucked lowest jerseys do not qualify for cutoff pants.');
  const parent = content.querySelector('[data-affected-scope]'); if (!parent) return;
  let note = parent.querySelector('[data-overlap-note]'); if (!note) { note = document.createElement('p'); note.dataset.overlapNote = ''; parent.append(note); }
  const text = messages.join(' '); if (note.textContent !== text) note.textContent = text; note.hidden = !text;
}
function bindHelpSearch() {
  if (state.page !== 'help' || document.getElementById('help-search')) return;
  const header = content.querySelector('.tool-header'); if (!header) return;
  header.insertAdjacentHTML('afterend', '<div class="help-search-controls"><label>Search Help<input class="input" id="help-search" type="search" placeholder="Search settings, errors, or why a player did not change"></label><label>Tool<select class="input" id="help-tool"><option value="">All Topics</option></select></label></div>');
  const sections = [...content.querySelectorAll('.help-tool')]; const select = document.getElementById('help-tool');
  for (const section of sections) { const title = section.querySelector('h2').textContent; select.add(new Option(title, title)); }
  const search = document.getElementById('help-search'); const filter = () => sections.forEach(section => section.hidden = Boolean(select.value && section.querySelector('h2').textContent !== select.value || !section.textContent.toLowerCase().includes(search.value.toLowerCase())));
  search.oninput = filter; select.onchange = filter;
}
function compactOptionDescriptions() {
  for (const small of content.querySelectorAll('.toggle-card small')) {
    if (small.dataset.readingHelp || small.textContent.length < 260) continue;
    small.dataset.readingHelp = 'true';
    const requirements = [...small.querySelectorAll('.requirement')].map(node => node.outerHTML).join(' ');
    const first = small.textContent.split(/(?<=\.)\s/)[0];
    small.innerHTML = escapeHtml(first) + (requirements ? ' ' + requirements : '');
    // Examples and exceptions remain in the searchable Help and the editors.
  }
}
const helpBeforeRefinements = helpPage;
helpPage = () => {
  const host = document.createElement('div'); host.innerHTML = helpBeforeRefinements();
  const extra = {
    'Configuration Windows': [['How Percentages Differ', 'Replacement choices split a pool and total 100%. Patcher frequencies combine a chance per eligible player with a per-team population limit. Existing items count first. Fill to Frequency skips the roll and fills available spaces; compatibility and protections still apply. Helmet targets describe the eligible population; rounding, protected players, and position overrides can prevent exact totals. Normalizing percentages does not apply a tool.'], ['All, Selected, or None', 'Team selectors explicitly choose All Teams or Selected Teams. Protection lists also offer No Teams Protected. Selected Teams requires at least one checked team. Other empty player filters allow all values, unless labeled selection required; donor, tattoo, and attribute pools use checked choices only.']],
    'Config Presets': [['Export, Import, and Compatibility', 'Export creates a JSON settings file, not a dynasty. Import previews compatibility and saves the preset without loading it. Check Compatibility shows missing teams and unavailable settings. Loading validates names and donor fingerprints; it does not run the tool. Individual locks are tied to their original save.'], ['Save as My Default', 'Your default is stored on this computer and loaded on the first visit to that tool in a fresh app session. Toolkit Defaults remain available through Reset. Use Toolkit Default on Startup removes your personal default without deleting presets.']],
    'Equipment Randomizer': [['Starting a Configuration', 'Choose teams, player filters and any optional equipment or style changes on Choose Options. Configure always includes Donor Settings and shows only your selected extras. Existing defaults work without opening every editor. Donor files are read-only, and no save changes until Apply.'], ['Mixing Example', 'At Cross-Position 10% and Multiple Donors 30%, about 10 of 100 eligible receivers use configured cross-position sources, 30 mix compatible donors, and 60 use one donor. These are exclusive outcomes sharing one 100% budget, not two independent chances. Availability can trigger a normal-pool fallback.'], ['Donor Sources and Brand Substitutions', 'Preview identifies the donor for each copied equipment category. Donor fallback notes explain missing position pools or differing builds. Shoes and gloves use receiver-brand compatibility checks even when universal gear comes from another brand. Reports retain exact before/after gear and source information.'], ['Why Didn’t This Player Change?', 'Check the Player Pool, original EA player protection, active-roster membership, season window, and valid unique equipment row. Previously randomized players are protected by default using shared tracking for this dynasty, including renamed saves and autosaves. Active-save donors keep their gear unless Randomize Donors Too is enabled. A same-result roll may also produce no change. Extra-mod chances add items only when enabled and compatible; they do not guarantee a change to every player.']],
    'Equipment Patcher': [['Starting a Configuration', 'Start on Choose Options to select teams, player filters and the changes you want. Configure shows only your selected options; defaults are ready to use, or open an editor to adjust them. All passes start off unless a saved preset or My Default selects them. Original EA player protection stays on by default.'], ['Accessory and Tape Colors', 'Recolor Accessories can use one shared mix, fixed colors, or independent team percentage distributions. Team accessory defaults match the tape defaults: 95% white and 5% black unless a school has its own override. Match Tape to Player Accessory Color uses the same rolled color for each player, without another roll. Separate tape distributions remain available. Each team row totals 100%.'], ['Lower Rolled Jersey', 'Requires CFB27 Unlocked v0.97+ by Orckestra. Converts Jersey Rolled Low Tucked Undershirt to Jersey Rolled Lowest, and Rolled Jersey Low to Jersey Rolled Lowest Untucked. Frequencies start at 100% except OL and DT at 0%. Each percentage is a chance per eligible player and a per-team maximum. Existing lowest-rolled jerseys count first and are preserved above the cap. Groups are independent; they do not total 100%.'], ['Cutoff Pants', 'Requires CFB27 Unlocked v0.97+ by Orckestra. Uses a 5% frequency at WR, CB, FS and SS by default, with other groups at 0%. This is both a roll chance and a per-team maximum. The player must already have no leg base layer, an undershirt and an allowed untucked/rolled jersey. Other gear is never stripped to make room. Also Replace All Standard Pants is off by default and intentionally bypasses the percentage cap, but never bypasses fit requirements. The pass uses original pants styles, even with Above-Knee Pants enabled, and runs after Lower Rolled Jersey but before tattoos. Preview includes before/limit/after counts and fit exclusions.'], ['Overlapping Passes', 'Unlocked Sock Styles takes priority and prevents Mid-Sock Replacement from running. Tattoos run last but preserve the resulting sock style. Clear Tattoos removes tattoos without altering gear and cannot be combined with Add Tattoos. Add Visors affects missing visors; Brand Existing Visors changes branding, not tint. Repair Only keeps helmets allowed by the effective position mix, but 0% excludes a model and unchecked masks are repaired.'], ['Copy and Inherited Settings', 'Copy to checked groups creates independent overrides; later changes to the original do not update those copies. Groups without overrides display and use the effective All Positions mix/pool. Save the window to commit; Cancel discards copies.'], ['Why Didn’t This Player Change?', 'Confirm the pass is enabled, the player matches every filter, original EA player protection permits changes, and their equipment qualifies. Existing gear counts toward frequency limits first, and a player may miss the chance roll. Fill to Frequency skips that roll. Repair Only is not nationwide balancing. Shared rows stay protected when changing them would affect an excluded player.']],
    'Commentary ID Patcher': [['Player Scope and Original EA Protection', 'Team, position, class, redshirt, and individual-player filters combine with True Freshmen Only. Original EA players are always protected using the built-in identity reference. Changing the NIL flag does not change this protection.'], ['Why Didn’t This Player Change?', 'They may be outside scope, matched to an original EA player, already have the right ID, lack a known match, or have an unapproved similar-sounding suggestion. First-name fallback applies only when an exact last-name match is unavailable.']],
    'Jersey Renumber': [['Player Locks and Custom Rules', 'Player Locks, Retired Numbers, and Team Traditions have separate pages in one window. Locks preserve each selected player’s current number. Highlighted jerseys show the team’s effective retired list; changing a jersey creates a custom list, and Use Toolkit Defaults restores it. Custom traditions award a number to the highest-rated eligible player matching side, position, personality, and upperclassman filters; matching default tradition numbers are replaced. A team retired-number override replaces that team’s entire list, including an explicitly empty list. Number conflicts are explained before Preview.'], ['Why Didn’t This Player Change?', 'Their number may already satisfy the rules, their team may be protected, or a player lock or original EA protection may apply. Retired numbers and stronger traditions can leave fewer available choices. Preview reasons and fallback notes explain allocations.']],
    'Team Boost': [['Additional Player Filters and Position Ranges', 'Class, redshirt, and individual-player filters narrow the selected scope. Position overrides use their own whole-number min/max; unchecked groups use the main range. Room averages still include eligible teammates rather than only the filtered selection. Relevant Ratings uses archetype weights; Specific Attributes adjusts every checked supported rating.'], ['Why Didn’t This Player Change?', 'Check team and player filters, the above/below-average condition, selected supported attributes, and the adjustment range. Ratings are bounded at 0–99, so a positive boost may not change a rating already at 99.']],
    'Dealbreaker Fixer': [['Protected Dealbreakers and Players', 'Checked existing types and players keep their dealbreaker. Assignment reasons show position, class, overall, and playing-time modifiers. None is a dynasty-wide minimum, not a chance to erase existing dealbreakers. If already below that floor, the tool preserves None and does not remove other types just to meet it.'], ['Why Didn’t This Player Change?', 'Players with None can receive an assignment. Playing Style is available to every position by default. With position limits enabled, optional cleanup also rerolls existing Playing Style outside HB/WR/TE. Protected players and the None floor can prevent changes.']],
    'Smart Force Win': [['Projected Favorite vs Forced Winner', 'The projected favorite comes from the matchup model. A proposed forced winner is an assignment the tool would write. Neither is a played-game result. The strongest factors summarize the model advantage; opening the matchup shows the full breakdown.'], ['Leave This Matchup Unchanged', 'Check this on an affected preview matchup to omit its write. Its existing force-win value stays untouched, including any prior assignment. Apply reports distinguish the proposal from the actual approved write.'], ['Why Didn’t This Game Change?', 'Completed/current-week games, protected teams, CPU games in User Schedule Only, close matchups, preserved upset rolls, and the weekly limit can all leave games unchanged. Preview statuses identify the reason.']],
    'NIL Toggle': [['Dynasty-Wide Safety', 'No team/player filters means the entire active roster. Preview asks for confirmation and clearly labels this scope. The flag controls in-game editing only. It does not change the Toolkit’s built-in original EA player protection. The flag is not proof of real-life NIL status.']],
    'Long Snap Rating Fixer': [['Why Didn’t This Player Change?', 'Only eligible tight ends and offensive linemen with out-of-range Long Snap ratings are corrected. Already-valid ratings and other positions stay unchanged.']]
  };
  for (const section of host.querySelectorAll('.help-tool')) {
    const title = section.querySelector('h2').textContent, list = section.querySelector('dl');
    for (const [term, description] of extra[title] ?? []) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = term; dd.textContent = description; list.append(dt, dd); }
    const questions = document.createElement('div'); questions.className = 'help-questions';
    for (const term of list.querySelectorAll('dt')) { const details = document.createElement('details'), summary = document.createElement('summary'); summary.innerHTML = term.innerHTML; details.append(summary, term.nextElementSibling); questions.append(details); }
    list.replaceWith(questions);
  }
  return host.innerHTML;
};
function applyReadingSize() { document.documentElement.dataset.textSize = state.bootstrap?.settings?.textSize ?? 'standard'; }
function bindReadingSize() {
  applyReadingSize(); if (state.page !== 'settings' || document.getElementById('text-size')) return;
  const theme = document.getElementById('theme-select'); if (!theme) return;
  theme.insertAdjacentHTML('afterend', '<label for="text-size">Text Size</label><select class="input" id="text-size"><option value="standard">Standard</option><option value="large">Large</option><option value="extra">Extra Large</option></select>');
  const control = document.getElementById('text-size'); control.value = state.bootstrap.settings.textSize ?? 'standard'; control.onchange = async () => { try { state.bootstrap.settings = await window.cfbToolkit.updateReadingSize(control.value); applyReadingSize(); } catch (error) { toast(readableError(error).message); } };
}
let refinementTimer;
function scheduleRefinements() { clearTimeout(refinementTimer); refinementTimer = setTimeout(refreshRefinements, 50); }
function refreshRefinements() {
  if (!state.bootstrap) return;
  if (state.page === 'dealbreaker-fixer') syncDealbreakerEligibility();
  if (state.page === 'nil-toggle') syncNilTargetChoices();
  addExplicitSelectionModes(); overlapNotice(); bindReadingSize(); bindHelpSearch(); compactOptionDescriptions(); bindRangeEditor(); bindJerseyCustomization(); bindDealbreakerProtection(); bindExtendedPresets();
  if (state.page === 'commentary-id' && document.getElementById('freshmen-only') && content.dataset.commentaryScopeError !== state.activeSave?.path && !document.getElementById('commentary-classes')) ensureCommentaryScope();
  document.querySelectorAll('dialog.configuration-dialog[open]').forEach(dialog => { installPositionCopy(dialog); });
  if(typeof mountRemainingToolFlow==='function')mountRemainingToolFlow();
}
new MutationObserver(scheduleRefinements).observe(document.body, { childList: true, subtree: true });
content.addEventListener('change', scheduleRefinements);
const originalCollectOptions = collectOptions; collectOptions = toolId => { const options = originalCollectOptions(toolId); return toolId === 'team-boost' ? { ...options, ...Object.fromEntries(Object.entries(extraScope('boost')).filter(([key]) => ['classes','redshirtStatuses','playerRows'].includes(key))), positionRanges: readJsonControl('boost-position-ranges', {}) } : options; };
const originalCommentaryOptions = commentaryOptionsFromForm; commentaryOptionsFromForm = () => ({ ...originalCommentaryOptions(), scope: extraScope('commentary') });
for (const name of ['runEquipment','runJersey','runForceWin','runDealbreaker','runTool','analyzeCommentary']) {
  const original = window[name]; if (typeof original !== 'function') continue;
  window[name] = async (...args) => { const error = validateSelectionModes(); if (error && args[1] !== 'apply') { toast(error); return; } if (name === 'runTool' && args[0] === 'nil-toggle' && args[1] === 'preview' && affectedScopeSummary().startsWith('ENTIRE DYNASTY') && !await appConfirm('Change NIL Flags Across the Dynasty?', 'Every eligible rostered player will be included. This changes in-game editing eligibility, not the Toolkit’s built-in original EA roster protection.', 'Build Dynasty Preview')) return; return original(...args); };
}

const originalHistoryPage = historyPage;
  historyPage = async () => {
  const canScope=ToolkitDynastyIdentity.validDynastyId(state.activeSave?.dynastyId);let scope=canScope&&historyFilters.scope==='dynasty'?'dynasty':'all';
  content.innerHTML = '<div class="tool-header"><div><h1>History</h1><p>Revisit saved reviews and reports. The latest 250 runs are retained.</p></div></div><div class="view-toggle history-dynasty-scope" role="group" aria-label="History scope"><button type="button" id="history-all-dynasties">All Dynasties</button><button type="button" id="history-this-dynasty">This Dynasty</button></div><div class="help-search-controls history-filter-controls"><label>Search<input class="input" id="history-search" type="search" placeholder="Tool, save, result, or date"></label><label>Tool<select class="input" id="history-tool"><option value="">All Tools</option></select></label><label>Operation<select class="input" id="history-mode"><option value="">Preview and Apply</option><option value="preview">Preview</option><option value="apply">Apply</option></select></label></div><section class="card" id="history-list"></section><div class="actions"><button class="button secondary" id="history-prev">Previous</button><span id="history-count" role="status"></span><button class="button secondary" id="history-next">Next</button></div><section id="history-detail"></section>';
  const tool = document.getElementById('history-tool'); [...new Map(state.history.map(entry => [entry.toolId, entry.toolName]))].forEach(([id, name]) => tool.add(new Option(name, id)));
  document.getElementById('history-search').value = historyFilters.query; tool.value = historyFilters.tool; document.getElementById('history-mode').value = historyFilters.mode;
  let page = historyFilters.page; const draw = () => { const query = document.getElementById('history-search').value.toLowerCase(), mode = document.getElementById('history-mode').value;
    const scoped=scope==='dynasty'?ToolkitDynastyIdentity.historyForSave(state.history,state.activeSave):state.history;
    content.querySelectorAll('.history-dynasty-scope button').forEach(button=>{const selected=button.id===(scope==='dynasty'?'history-this-dynasty':'history-all-dynasties');button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});document.getElementById('history-this-dynasty').disabled=!canScope;
    const rows = scoped.filter(entry => (!tool.value || entry.toolId === tool.value) && (!mode || entry.mode === mode) && JSON.stringify({ ...entry, timestamp: formatDate(entry.timestamp) }).toLowerCase().includes(query));
    page = Math.min(page, Math.max(0, Math.ceil(rows.length / 20) - 1)); Object.assign(historyFilters, { page, query, tool: tool.value, mode,scope }); document.getElementById('history-list').innerHTML = rows.length ? activityRows(rows.slice(page * 20, (page + 1) * 20)) : '<div class="empty">No matching runs.</div>'; bindHistory();
    document.getElementById('history-count').textContent = `${rows.length ? page * 20 + 1 : 0}–${Math.min(rows.length, (page + 1) * 20)} of ${rows.length}`; document.getElementById('history-prev').disabled = page === 0; document.getElementById('history-next').disabled = (page + 1) * 20 >= rows.length;
  };
  document.getElementById('history-all-dynasties').onclick=()=>{scope='all';page=0;draw();};document.getElementById('history-this-dynasty').onclick=()=>{if(canScope){scope='dynasty';page=0;draw();}};
  document.getElementById('history-search').oninput = () => { page = 0; draw(); }; tool.onchange = document.getElementById('history-mode').onchange = () => { page = 0; draw(); };
  document.getElementById('history-prev').onclick = () => { page--; draw(); }; document.getElementById('history-next').onclick = () => { page++; draw(); }; draw();
};
const defaultsVisited = new Set(), pendingDefaults = new Set();
const jerseyPageBeforePersonalDefault = jerseyPage;
jerseyPage = tool => {
  const configuration = state.bootstrap?.settings?.toolDefaults?.['jersey-renumber'];
  if (configuration && !defaultsVisited.has('jersey-renumber') && !state.toolSettings.has('jersey-renumber')) state.jerseyMode = configuration.jerseyMode === 'no-duplicates' ? 'no-duplicates' : 'standard';
  return jerseyPageBeforePersonalDefault(tool);
};
let personalDefaultEditVersion = 0;
document.addEventListener('input', event => { if (event.isTrusted && (content.contains(event.target) || event.target.closest('dialog.configuration-dialog'))) { personalDefaultEditVersion++; defaultsVisited.add(state.page); pendingDefaults.delete(state.page); } }, true);
document.addEventListener('pointerdown', event => { if (event.isTrusted && event.target.closest('dialog.configuration-dialog')) { personalDefaultEditVersion++; defaultsVisited.add(state.page); pendingDefaults.delete(state.page); } }, true);
const restoreBeforeRefinement = restoreToolSettings;
restoreToolSettings = () => {
  const tool = state.bootstrap?.registry?.tools.find(item => item.id === state.page), configuration = state.bootstrap?.settings?.toolDefaults?.[tool?.id];
  if (tool && configuration && !defaultsVisited.has(tool.id) && (!state.toolSettings.has(tool.id) || pendingDefaults.has(tool.id))) {
    pendingDefaults.add(tool.id);
    const delayed = Object.keys(configuration.values ?? {}).some(id => /^(?:commentary|boost)-(?:classes|redshirt|players)|^boost-position-ranges|^jersey-custom-json|^db-protected-/.test(id) && !document.getElementById(id)) || Object.keys(configuration.teamSelections ?? {}).some(id => !document.getElementById(id));
    if (!delayed) {
      defaultsVisited.add(tool.id); pendingDefaults.delete(tool.id);
      const donor = configuration.values?.['equipment-donor']?.trim();
      if (donor) loadPersonalDonorDefault(tool, configuration, donor);
      else {
        const status = presetCompatibility(configuration);
        if (status.messages.length) toast('Personal default needs review: ' + status.messages[0]);
        else { state.toolSettings.set(tool.id, status.values); content.querySelectorAll('[data-session-restored]').forEach(node => delete node.dataset.sessionRestored); }
      }
    }
  }
  restoreBeforeRefinement();
};
async function loadPersonalDonorDefault(tool, configuration, donor) {
  const save = state.activeSave?.path, form = document.getElementById('equipment-donor'), editVersion = personalDefaultEditVersion;
  try {
    const catalog = await window.cfbToolkit.prepareEquipmentDonors({ savePath: donor });
    if (!form?.isConnected || state.activeSave?.path !== save || state.page !== tool.id || editVersion !== personalDefaultEditVersion) return;
    const expected = configuration.values?.['equipment-donor-fingerprint'];
    if (expected && expected !== catalog.donorFingerprint) throw new Error('The donor file changed. Reload it before using this default.');
    equipmentDonorCatalogs.set(donor, catalog); const status = presetCompatibility(configuration);
    if (status.messages.length) throw new Error(status.messages[0]);
    state.toolSettings.set(tool.id, status.values); render();
  } catch (error) { if (form?.isConnected) toast('Personal default not loaded: ' + readableError(error).message); }
}
content.addEventListener('change', event => {
  if (event.isTrusted) { personalDefaultEditVersion++; defaultsVisited.add(state.page); pendingDefaults.delete(state.page); }
  if (!event.target.id || event.target.dataset.previewFacet || event.target.closest('.config-presets')) return;
  if (/^(?:commentary|boost)-|^db-protected-|^jersey-custom-json|^selection-mode-/.test(event.target.id)) {
    const tool = state.page;
    state.genericPreviews.delete(tool); state.dealbreakerPreviews.delete(tool); state.jerseyPreviews.clear();
    document.querySelectorAll('#apply,#db-apply,#jersey-apply').forEach(button => button.disabled = true);
  }
});
function addConfigurationDepartures() {
  if (!state.page.includes('equipment')) return;
  const parent = content.querySelector('[data-affected-scope]'); if (!parent) return;
  const notes = [], distribution = readJsonControl('helmet-distribution-json', null);
  if (document.getElementById('fix-helmet')?.checked && distribution) {
    const prepared = state.prepared.get(`equipment-patcher|${state.activeSave?.path}`);
    const excluded = (prepared?.helmetModels ?? []).filter(model => !(distribution.global[model.id] > 0)).map(model => model.label);
    if (excluded.length) notes.push('All Positions mix excludes: ' + excluded.join(', '));
    if (Object.keys(distribution.positions ?? {}).length) notes.push('Helmet group overrides: ' + Object.keys(distribution.positions).join(', ') + ' (take priority)');
  }
  if (document.getElementById('fix-unlocked-mouthpieces')?.checked) {
    const disabled = [...content.querySelectorAll('[id^="mouthpiece-enabled-"]')].filter(node => !node.checked).map(node => node.id.replace('mouthpiece-enabled-', '').replace('K-P', 'K/P'));
    if (disabled.length) notes.push('Mouthpieces disabled: ' + disabled.join(', '));
    if (document.getElementById('randomize-existing-mouthpieces')?.checked) notes.push('Existing mouthpieces will be fully rerolled');
  }
  let note = parent.querySelector('[data-config-departures]'); if (!note) { note = document.createElement('details'); note.dataset.configDepartures = ''; parent.append(note); }
  const text = notes.join('\n'); if (note.dataset.summary !== text) { note.dataset.summary = text; note.innerHTML = '<summary>Important Configuration Choices</summary>' + notes.map(value => '<p>' + escapeHtml(value) + '</p>').join(''); }
  note.hidden = !notes.length;
}
const historyFilters = { query: '', tool: '', mode: '', page: 0 };
function presetCompatibility(configuration) {
  configuration={...configuration,values:migrateOriginalEaProtectionSettings({...configuration.values})};
  if(state.page==='roster-generator'){configuration={...configuration,values:{...configuration.values}};delete configuration.values['roster-seed'];if(typeof rosterMigrateTalentValues==='function')rosterMigrateTalentValues(configuration.values,configuration.teamSelections?.['roster-teams']);}
  const messages = [], values = {};
  if (configuration.values?.['fix-clear-tattoos'] && configuration.values?.['fix-unlocked-tattoos']) messages.push('Clear Tattoos and Add Tattoos cannot both be enabled. Choose one tattoo pass before loading this preset.');
  try { const custom = JSON.parse(configuration.values?.['jersey-custom-json'] ?? '{}'); if (custom.lockedRows?.length && custom.lockSourcePath !== state.activeSave?.path) messages.push('Individual jersey locks belong to another save. Re-select those players before loading these settings.'); }
  catch { messages.push('The preset contains invalid jersey number rules.'); }
  for (const [id, labels] of Object.entries(configuration.teamSelections ?? {})) {
    if (id === 'equipment-excluded' && !document.getElementById(id) && document.getElementById('equipment-included')) continue; // Migrated by presetValues.
    const control = document.getElementById(id), available = new Set([...control?.options ?? []].map(option => option.textContent.trim().toLowerCase()));
    const missing = labels.filter(label => !available.has(label.toLowerCase())); if (missing.length) messages.push(`${id}: missing ${missing.slice(0, 3).join(', ')}`);
  }
  for (const [id] of Object.entries(configuration.values ?? {})) if (!document.getElementById(id) && !/^tape-team|^selection-mode/.test(id)) messages.push(`${id}: setting is unavailable here`);
  try { Object.assign(values, presetValues(configuration)); } catch (error) { messages.push(readableError(error).message); }
  return { values, messages };
}

function copyGroupMarkup(key, groups) {
  return `<details class="copy-position-settings"><summary>Copy Current Settings to Other Position Groups</summary><p>Checked groups receive an independent copy. Other groups stay unchanged. Save the configuration window to keep it.</p><div class="compact-choice-picker toggle-grid">${groups.map(group => `<label class="check-row"><input type="checkbox" data-copy-target="${key}" value="${group}"> ${group}</label>`).join('')}</div><button type="button" class="button secondary" data-copy-run="${key}">Copy to Checked Groups</button><p role="status" data-copy-status="${key}"></p></details>`;
}
function installPositionCopy(dialog) {
  const root = dialog.querySelector('.configuration-draft'); if (!root || dialog.querySelector('[data-copy-run]')) return;
  const visors = configurationRead(root, 'visor-frequency-QB'), mouth = configurationRead(root, 'mouthpiece-style-mode');
  if (!visors && !mouth) return;
  const groups = ['QB','HB','FB','WR','TE','OL','EDGE','DT','LB','CB','FS','SS','K/P'], key = visors ? 'visor' : 'mouthpiece';
  root.insertAdjacentHTML('beforeend', `<label>Copy From<select class="input" data-copy-source>${groups.map(group => `<option>${group}</option>`).join('')}</select></label>` + copyGroupMarkup(key, groups));
  root.querySelector(`[data-copy-run="${key}"]`).onclick = () => {
    const source = root.querySelector('[data-copy-source]').value, targets = [...root.querySelectorAll(`[data-copy-target="${key}"]:checked`)].map(input => input.value);
    if (!targets.length) return;
    for (const target of targets) if (visors) { configurationRead(root, 'visor-frequency-' + target.replace('/', '-')).value = configurationRead(root, 'visor-frequency-' + source.replace('/', '-')).value; }
    else {
      for (const style of ['chance','cap',...(mouth.value==='custom'?['standard','pacifier','hanging']:[])]) configurationRead(root, `mouthpiece-${target.replace('/', '-')}-${style}`).value = configurationRead(root, `mouthpiece-${source.replace('/', '-')}-${style}`).value;
      if(mouth.value==='custom')configurationRead(root, 'mouthpiece-enabled-' + target.replace('/', '-')).checked = configurationRead(root, 'mouthpiece-enabled-' + source.replace('/', '-')).checked;
    }
    root.dispatchEvent(new Event('input', { bubbles: true })); root.querySelector(`[data-copy-status="${key}"]`).textContent = `Copied ${source} to ${targets.join(', ')}. Save Settings to keep it.`;
  };
}
function donorProvenanceMarkup(change) {
  const corrections = [...change.brandAssignments ?? [], ...change.brandCorrections ?? []];
  if (!corrections.length && !(change.fallbackNotes ?? []).length) return '';
  return `<details class="randomizer-gear-details"><summary>Compatibility & Fallbacks</summary><dl>${corrections.map(item=>`<dt>${escapeHtml(item.slot)}</dt><dd>${escapeHtml(equipmentDisplayValueForUI(item.oldItem))} → ${escapeHtml(equipmentDisplayValueForUI(item.newItem))}<br>${escapeHtml(item.reason==='Compatible donor item'?'Used a donor item matching this player’s equipment brand.':'Substituted a compatible original or safe base item.')}</dd>`).join('')}</dl>${(change.fallbackNotes??[]).map(note=>`<p>${escapeHtml(note)}</p>`).join('')}</details>`;
}
function equipmentDisplayValueForUI(value) { return String(value ?? 'None'); }
function helmetPopulationMarkup(audit) {
  if (!audit) return '';
  return `<details class="helmet-population-audit"><summary>Helmet Before / Target / After — Positions and Teams</summary><p>${escapeHtml(audit.explanation)}</p><label>View<select class="input" data-helmet-audit-dimension><option value="position">Position Groups</option><option value="team">Teams</option></select></label><div>${audit.groups.map(group => `<section data-helmet-audit-group="${group.dimension}" ${group.dimension === 'team' ? 'hidden' : ''}><h3>${escapeHtml(group.value)} · ${group.cohort.toUpperCase()} · ${group.total} players</h3><table><thead><tr><th>Helmet</th><th>Before</th><th>Target</th><th>After</th></tr></thead><tbody>${group.models.filter(model => model.before || model.after || model.targetPercent).map(model => `<tr><td>${escapeHtml(model.label)}</td><td>${model.before} (${model.beforePercent.toFixed(1)}%)</td><td>${model.targetPercent.toFixed(1)}%</td><td>${model.after} (${model.afterPercent.toFixed(1)}%)</td></tr>`).join('')}</tbody></table></section>`).join('')}</div></details>`;
}
const previewPresentation = new Map();
function rememberRunPresentation(output){
  const key=output.dataset.resultKey;if(!key||!output.querySelector('[data-run-result]'))return;
  previewPresentation.set(key,{scroll:(output.querySelector('.run-result-scroll')??document.querySelector('main'))?.scrollTop??0,filters:[...output.querySelectorAll('input[id],select[id]')].map(node=>[node.id,node.type==='checkbox'?node.checked:node.value]),expanded:[...output.querySelectorAll('details[open] summary')].map(node=>node.textContent)});
}
const originalRenderResult = renderResult;
renderResult = (output, result) => {
  const key = result.planId ?? result.executionId ?? (state.page === 'saved-review' && state.savedReview ? state.savedReview.entry.id : `${result.resultKind}|${result.savePath}|saved`), oldKey = output.dataset.resultKey;
  if(oldKey&&output.dataset.resultMode!==result.mode)previewPresentation.delete(oldKey);else rememberRunPresentation(output);
  output.dataset.resultMode=result.mode;
  output.dataset.previewRequestVersion = String(Number(output.dataset.previewRequestVersion ?? 0) + 1); output.dataset.resultKey = key;
  originalRenderResult(output, result);
  if (result.resultKind === 'equipment-patcher') { (output.querySelector('[data-run-diagnostics]')??output).insertAdjacentHTML('beforeend', helmetPopulationMarkup(result.details?.helmetPopulation) + uniformPopulationMarkup(result.details)); output.querySelector('[data-helmet-audit-dimension]')?.addEventListener('change', event => output.querySelectorAll('[data-helmet-audit-group]').forEach(section => section.hidden = section.dataset.helmetAuditGroup !== event.target.value)); }
  if (result.resultKind === 'automatic-force-win') installMatchupDecisions(output, result);
  const stored = previewPresentation.get(key); if (stored) { for (const [id, value] of stored.filters) { const node = output.querySelector('#' + CSS.escape(id)); if (!node) continue; if (node.type === 'checkbox') node.checked = value; else node.value = value; if (!node.dataset.previewFacet && /^force-(?:schedule|week|team|outcome|mismatch|rivalry)-/.test(id)) node.dispatchEvent(new Event(node.tagName === 'INPUT' && node.type !== 'checkbox' ? 'input' : 'change', { bubbles: true })); } output.querySelectorAll('details').forEach(node => node.open = stored.expanded.includes(node.querySelector('summary')?.textContent)); const main = output.querySelector('.run-result-scroll')??document.querySelector('main'); if (main) main.scrollTop = stored.scroll; }
  while (previewPresentation.size > 30) previewPresentation.delete(previewPresentation.keys().next().value);
};
function installMatchupDecisions(output, result) {
  const omitted = new Set(result.details?.leaveUnchangedRows ?? []);
  for (const [index, row] of previewChanges(result).entries()) {
    const card = output.querySelectorAll('.force-game')[index]; if (!card) continue;
    const factors = (row.strongestFactors ?? []).map(item => `${item.label ?? item.name ?? 'Model factor'} (${Number(item.value).toFixed(1)})`).join(' · ');
    card.insertAdjacentHTML('beforeend', `<p class="force-projected-result"><strong>Projected Favorite: ${escapeHtml(row.favorite)}</strong> · ${row.affected ? `Proposed Forced Winner: ${escapeHtml(row.forcedWinner)}` : 'No new force win'}${factors ? `<br>Strongest Factors: ${escapeHtml(factors)}` : ''}</p>`);
    if (result.mode !== 'preview' || !result.planId || !row.affected) continue;
    card.insertAdjacentHTML('beforeend', `<label class="check-row"><input type="checkbox" data-leave-matchup="${row.row}" ${omitted.has(row.row) ? 'checked' : ''}> Leave This Matchup Unchanged</label>`);
    card.querySelector('[data-leave-matchup]').onchange = event => { if (event.target.checked) omitted.add(row.row); else omitted.delete(row.row); result.details.leaveUnchangedRows = [...omitted]; output.querySelector('.run-primary-metrics').innerHTML=runMetricsMarkup(result); };
  }
}

function bindJerseyCustomization() {
  if (state.page !== 'jersey-renumber' || !document.getElementById('jersey-team-rules') || document.getElementById('jersey-custom-json')) return;
  const prepared = state.prepared.get(`${state.jerseyMode === 'no-duplicates' ? 'jersey-no-duplicates' : 'jersey-renumber'}|${state.activeSave?.path}`) ?? state.prepared.get(`jersey-renumber|${state.activeSave?.path}`);
  if (!prepared?.players) return;
  const parent = document.getElementById('jersey-team-rules').closest('.ops-section-body') ?? document.getElementById('jersey-team-rules').parentElement;
  parent.insertAdjacentHTML('beforeend', '<input type="hidden" id="jersey-custom-json" value="{}"><section class="configuration-entry"><div><strong>Player Locks & Team Number Rules</strong><p id="jersey-custom-summary">Toolkit traditions and retired numbers; no individual locks.</p></div><button type="button" class="button secondary" id="jersey-custom-open">Configure</button></section>');
  const input = document.getElementById('jersey-custom-json'); input.onchange = () => { const config = JSON.parse(input.value); document.getElementById('jersey-custom-summary').textContent = `${config.lockedRows?.length ?? 0} player numbers locked · ${config.customTraditions?.length ?? 0} custom traditions · ${Object.keys(config.customRetired ?? {}).length} retired-number overrides`; }; restoreToolSettings(); input.onchange();
  document.getElementById('jersey-custom-open').onclick = () => openJerseyCustomization(prepared, input);
}
function bindDealbreakerProtection() {
  if (state.page !== 'dealbreaker-fixer' || !document.getElementById('db-fix-style') || document.getElementById('db-protected-values')) return;
  const prepared = state.prepared.get(`dealbreaker-fixer|${state.activeSave?.path}`); if (!prepared) return;
  const parent = document.getElementById('db-fix-style').closest('.ops-section-body'); if (!parent) return;
  parent.insertAdjacentHTML('beforeend', `<div data-db-protection>${multiSelect('db-protected-values', 'Dealbreakers to Preserve', prepared.values ?? [], 'Checked existing values stay unchanged. None is a valid protection choice.')}${multiSelect('db-protected-players', 'Players to Protect', prepared.players ?? [], 'Protected players keep their existing dealbreaker.')}</div>`);
  restoreToolSettings(); const group = parent.querySelector('[data-db-protection]'); bindMultiSelectEnhancements(group); condenseConfiguration(group, { title: 'Protected Dealbreakers & Players', description: 'These selections prevent changes. They do not change the dynasty-wide None minimum.', summary: () => `${selected('#db-protected-values').length} values · ${selected('#db-protected-players').length} players protected` });
}
const originalJerseyOptions = jerseyOptions; jerseyOptions = toolId => ({ ...originalJerseyOptions(toolId), ...readJsonControl('jersey-custom-json', {}) });
const originalDealbreakerOptions = dealbreakerOptions; dealbreakerOptions = () => ({ ...originalDealbreakerOptions(), protectedValues: selected('#db-protected-values'), protectedRows: selected('#db-protected-players') });
function bindExtendedPresets() {
  const panel = content.querySelector('.config-presets'), tool = state.bootstrap.registry.tools.find(item => item.id === state.page);
  if (!panel || !tool || panel.dataset.extended) return; panel.dataset.extended = 'true';
  const buttons = document.createElement('div'); buttons.className = 'actions'; buttons.innerHTML = '<button type="button" class="button secondary" data-preset-export>Export Current Settings</button><button type="button" class="button secondary" data-preset-import>Import Preset</button><button type="button" class="button secondary" data-preset-default>Save as My Default</button><button type="button" class="button secondary" data-preset-reset-default>Use Toolkit Default on Startup</button><button type="button" class="button secondary" data-preset-check>Check Compatibility</button>'; panel.append(buttons);
  const chosen = () => state.bootstrap.settings.toolPresets.find(preset => preset.id === panel.querySelector('#preset-choice').value);
  buttons.querySelector('[data-preset-export]').onclick = async () => { try { const file = await window.cfbToolkit.presetTransfer({ action: 'export', toolId: tool.id, name: panel.querySelector('#preset-name').value || tool.name, configuration: presetConfiguration() }); if (file) toast('Preset exported. No dynasty data was included.'); } catch (error) { toast(readableError(error).message); } };
  buttons.querySelector('[data-preset-check]').onclick = async () => { const preset = chosen(); if (!preset) { toast('Choose a saved preset first.'); return; } const status = presetCompatibility(preset.configuration); await appConfirm('Preset Compatibility', status.messages.length ? status.messages.join('\n') : 'All saved team selections and settings are available in this save. Loading will still validate donor files and percentages.', 'Done'); };
  buttons.querySelector('[data-preset-import]').onclick = async () => { try { const imported = await window.cfbToolkit.presetTransfer({ action: 'read', toolId: tool.id }); if (!imported || !panel.isConnected) return; const status = presetCompatibility(imported.configuration); if (!await appConfirm('Import Preset', `${imported.name}\n${status.messages.length ? 'Compatibility notes:\n' + status.messages.join('\n') : 'Available settings and team names match this save.'}\nThe preset is saved only, not applied. Donor files are checked when loading.`, 'Save Imported Preset')) return; const existing = (state.bootstrap.settings.toolPresets ?? []).find(item => item.toolId === tool.id && item.name.toLowerCase() === imported.name.toLowerCase()); if (existing) throw new Error('A preset already uses this name. Rename it or delete it before importing.'); const saved = await window.cfbToolkit.savePreset({ toolId: tool.id, ...imported }); (state.bootstrap.settings.toolPresets ??= []).push(saved); panel.remove(); addPresetControls(); scheduleRefinements(); toast('Preset imported. Load it when ready.'); } catch (error) { toast(readableError(error).message); } };
  buttons.querySelector('[data-preset-default]').onclick = async () => { try { const configuration = presetConfiguration(); if (!await appConfirm('Save My Default?', 'These settings will be loaded when you first open this tool after starting the app. Unavailable teams or donor files will not be silently substituted.', 'Save My Default')) return; state.bootstrap.settings = await window.cfbToolkit.setToolDefault({ toolId: tool.id, configuration }); toast('Personal default saved'); } catch (error) { toast(readableError(error).message); } };
  buttons.querySelector('[data-preset-reset-default]').onclick = async () => { try { state.bootstrap.settings = await window.cfbToolkit.setToolDefault({ toolId: tool.id, configuration: null }); toast('Fresh app sessions will use Toolkit defaults'); } catch (error) { toast(readableError(error).message); } };
  // Personal defaults are applied by restoreToolSettings before session capture.
}
