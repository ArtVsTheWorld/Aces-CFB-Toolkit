/* One isolated draft, three pages. Switching pages never commits settings. */
function openJerseyCustomization(prepared, input) {
  const original = JSON.parse(input.value), draft = structuredClone(original);
  const teams = prepared.teams.map(team => team.name ?? team.label ?? team.value);
  const personalities = prepared.personalities ?? [];
  const dialog = createConfigurationDialog({ title: 'Player Locks & Team Number Rules', description: 'Configure each page, then save all your jersey settings together. Cancel discards changes on every page.', className: 'jersey-custom-editor', saveLabel: 'Save Jersey Settings' });
  if (!dialog) return;
  draft.lockedRows ??= [];
  if (draft.lockSourcePath && draft.lockSourcePath !== state.activeSave.path) draft.lockedRows = [];
  draft.customRetired ??= {}; draft.customTraditions ??= [];
  const baseline = JSON.stringify({ ...original, lockedRows: original.lockedRows ?? [], customRetired: original.customRetired ?? {}, customTraditions: original.customTraditions ?? [] });
  const pages = [['locks','Player Locks'],['retired','Retired Numbers'],['traditions','Team Traditions']];
  const prefix = `jersey-editor-${configurationSequence}-`;
  const jersey = '<svg class="jersey-number-art" viewBox="0 0 64 64" aria-hidden="true"><path d="M21 5 10 10 2 25l12 7 4-8v34h28V24l4 8 12-7-8-15-11-5-7 7h-8Z"/><path class="jersey-neckline" d="m21 5 7 7h8l7-7"/></svg>';
  const pageChoices = pages.map(([id,label]) => `<option value="${id}">${label}</option>`).join('');
  dialog.querySelector('.configuration-body').innerHTML = `<label class="jersey-page-choice">Settings Page<select class="input" data-jersey-page-select>${pageChoices}</select></label><div class="jersey-editor-layout"><nav class="jersey-editor-nav" role="tablist" aria-label="Jersey Settings Pages" aria-orientation="vertical">${pages.map(([id,label],index)=>`<button class="button secondary jersey-page-tab" type="button" role="tab" id="${prefix}tab-${id}" aria-controls="${prefix}page-${id}" aria-selected="${index===0}" tabindex="${index===0?0:-1}" data-jersey-page-tab="${id}"><small>${index+1}</small><span>${label}</span></button>`).join('')}</nav><div class="jersey-editor-pages">
    <section role="tabpanel" aria-labelledby="${prefix}tab-locks" id="${prefix}page-locks" data-jersey-page="locks"><h3>Player Locks</h3><p>Checked players keep their current jersey number. Selections stay checked when you switch position groups or settings pages.</p>${multiSelect('jersey-lock-players','Locked Players',prepared.players,'Locks apply only to these players in this save.',draft.lockedRows)}</section>
    <section role="tabpanel" aria-labelledby="${prefix}tab-retired" id="${prefix}page-retired" data-jersey-page="retired" hidden><h3>Retired Numbers</h3><p>Highlighted jerseys are retired and unavailable for new assignments when Protect Retired Numbers is enabled. Click a jersey to retire or allow that number.</p><label>Team<select class="input" data-retired-team>${teams.map(team=>`<option>${escapeHtml(team)}</option>`).join('')}</select></label><div class="retired-list-toolbar"><strong data-retired-status role="status"></strong><button class="button secondary compact" type="button" data-retired-default>Use Toolkit Defaults</button></div><div data-retired-grid class="retired-jersey-grid" role="group" aria-label="Retired Jersey Numbers">${Array.from({length:100},(_,number)=>`<label class="jersey-number-choice"><input class="jersey-number-input" type="checkbox" value="${number}" data-retired-number aria-label="Retire number ${number}">${jersey}<span class="jersey-number-value" aria-hidden="true">${number}</span></label>`).join('')}</div></section>
    <section role="tabpanel" aria-labelledby="${prefix}tab-traditions" id="${prefix}page-traditions" data-jersey-page="traditions" hidden><h3>Custom Team Traditions</h3><p>A tradition awards its number to the highest-rated eligible player. Side, position, personality, and upperclassman filters work together; player locks and the mode’s NIL protections still apply.</p><div data-tradition-rows></div><button class="button secondary" type="button" data-tradition-add>Add Tradition</button></section>
  </div></div>`;
  bindMultiSelectEnhancements(dialog);
  const lockSelect = dialog.querySelector('#jersey-lock-players'), teamSelect = dialog.querySelector('[data-retired-team]');
  const defaults = team => prepared.retiredNumbers?.[team] ?? [];
  const retired = team => draft.customRetired[team] ?? defaults(team);
  const renderRetired = () => {
    const team = teamSelect.value, selected = new Set(retired(team)), custom = Object.hasOwn(draft.customRetired, team);
    dialog.querySelector('[data-retired-status]').textContent = `${custom ? 'Custom List' : 'Toolkit Defaults'} · ${selected.size} retired`;
    dialog.querySelector('[data-retired-default]').disabled = !custom;
    for (const control of dialog.querySelectorAll('[data-retired-number]')) {
      control.checked = selected.has(Number(control.value));
      control.setAttribute('aria-label', `Retire number ${control.value} for ${team}`);
    }
  };
  const validate = () => {
    const seen = new Set();
    for (const rule of draft.customTraditions) {
      if (!Number.isInteger(rule.number) || rule.number < 0 || rule.number > 99) return 'Use whole jersey numbers from 0 to 99.';
      const key = `${rule.team}|${rule.number}`;
      if (seen.has(key)) return `${rule.team}: use only one tradition for #${rule.number}.`;
      seen.add(key);
      if (rule.personality && !personalities.some(item=>item.value===rule.personality)) return 'Choose an available personality type or Any Personality.';
      if (document.getElementById('jersey-retired')?.checked && retired(rule.team).includes(rule.number)) return `${rule.team}: #${rule.number} is retired. Choose a different tradition number or update this team’s retired list.`;
    }
    return '';
  };
  const sync = () => {
    const error = validate(), changed = JSON.stringify({...draft,lockedRows:[...lockSelect.selectedOptions].map(option=>option.value)}) !== baseline;
    dialog.querySelector('[data-config-error]').hidden = !error; dialog.querySelector('[data-config-error]').textContent = error;
    dialog.querySelector('[data-config-save]').disabled = Boolean(error);
    dialog.querySelector('[data-config-dirty]').textContent = changed ? 'Unsaved settings · Save all pages together, or Cancel to discard.' : 'Settings stay unchanged until you save. Cancel discards this draft.';
  };
  let currentPage = 'locks';
  const showPage = page => {
    currentPage = page;
    for (const panel of dialog.querySelectorAll('[data-jersey-page]')) panel.hidden = panel.dataset.jerseyPage !== page;
    for (const button of dialog.querySelectorAll('[data-jersey-page-tab]')) { const active = button.dataset.jerseyPageTab===page; button.setAttribute('aria-selected',String(active)); button.tabIndex=active?0:-1; }
    dialog.querySelector('[data-jersey-page-select]').value = page;
    dialog.scrollTop = 0;
  };
  for (const button of dialog.querySelectorAll('[data-jersey-page-tab]')) button.onclick = () => showPage(button.dataset.jerseyPageTab);
  dialog.querySelector('[data-jersey-page-select]').onchange = event => showPage(event.target.value);
  dialog.querySelector('.jersey-editor-nav').onkeydown = event => {
    if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
    event.preventDefault(); const index=pages.findIndex(([id])=>id===currentPage);
    const next=event.key==='Home'?0:event.key==='End'?pages.length-1:(index+(event.key==='ArrowDown'?1:-1)+pages.length)%pages.length;
    showPage(pages[next][0]); dialog.querySelector(`[data-jersey-page-tab="${pages[next][0]}"]`).focus();
  };
  teamSelect.onchange = renderRetired;
  dialog.querySelector('[data-retired-default]').onclick = () => { delete draft.customRetired[teamSelect.value]; renderRetired(); sync(); };
  for (const control of dialog.querySelectorAll('[data-retired-number]')) control.onchange = () => {
    draft.customRetired[teamSelect.value] = [...dialog.querySelectorAll('[data-retired-number]:checked')].map(control=>Number(control.value)); renderRetired(); sync();
  };
  const drawTraditions = () => {
    const rows = dialog.querySelector('[data-tradition-rows]');
    rows.innerHTML = draft.customTraditions.length ? draft.customTraditions.map((rule,index)=>`<section class="jersey-tradition-rule"><header><strong>Tradition ${index+1}</strong><button class="button secondary compact" type="button" data-rule-remove="${index}">Remove</button></header><div class="jersey-tradition-fields"><label>Team<select class="input" data-rule-team="${index}">${teams.map(team=>`<option ${team===rule.team?'selected':''}>${escapeHtml(team)}</option>`).join('')}</select></label><label>Number<input class="input" type="number" min="0" max="99" step="1" value="${rule.number}" data-rule-number="${index}"></label><label>Side<select class="input" data-rule-side="${index}">${['all','offense','defense'].map(side=>`<option value="${side}" ${side===rule.side?'selected':''}>${side==='all'?'All Eligible Players':side==='offense'?'Offense':'Defense'}</option>`).join('')}</select></label><label>Position<select class="input" data-rule-position="${index}"><option value="">Any Eligible Position</option>${POSITION_ORDER.map(position=>`<option value="${position}" ${localizedPosition(rule.positions?.[0])===position?'selected':''}>${position}</option>`).join('')}</select></label><label>Personality Type<select class="input" data-rule-personality="${index}"><option value="">Any Personality</option>${personalities.map(item=>`<option value="${item.value}" ${rule.personality===item.value?'selected':''}>${escapeHtml(item.label)}</option>`).join('')}</select></label><label class="check-row"><input type="checkbox" data-rule-upper="${index}" ${rule.upperclassmenOnly?'checked':''}> Upperclassmen Only</label></div></section>`).join('') : '<p class="muted">No custom traditions. Toolkit traditions still apply when enabled.</p>';
    for (const control of rows.querySelectorAll('input,select')) {
      const update = () => {
        const index = Number(Object.values(control.dataset)[0]), rule = draft.customTraditions[index];
        if (control.dataset.ruleTeam !== undefined) rule.team = control.value;
        else if (control.dataset.ruleNumber !== undefined) rule.number = control.value.trim()==='' ? NaN : Number(control.value);
        else if (control.dataset.ruleSide !== undefined) rule.side = control.value;
        else if (control.dataset.rulePosition !== undefined) rule.positions = control.value ? [({LEDG:'LE',REDG:'RE',SAM:'LOLB',MIKE:'MLB',WILL:'ROLB'})[control.value] ?? control.value] : [];
        else if (control.dataset.rulePersonality !== undefined) rule.personality = control.value;
        else rule.upperclassmenOnly = control.checked;
        sync();
      };
      control.oninput = update; control.onchange = update;
    }
    for (const button of rows.querySelectorAll('[data-rule-remove]')) button.onclick = () => { draft.customTraditions.splice(Number(button.dataset.ruleRemove),1); drawTraditions(); sync(); };
  };
  dialog.querySelector('[data-tradition-add]').onclick = () => { draft.customTraditions.push({team:teams[0],number:0,side:'all',positions:[],personality:'',upperclassmenOnly:false}); drawTraditions(); sync(); };
  lockSelect.addEventListener('change',sync);
  dialog.querySelector('[data-config-reset]').onclick = () => {
    draft.customRetired={}; draft.customTraditions=[]; for(const option of lockSelect.options) option.selected=false;
    lockSelect.dispatchEvent(new Event('change',{bubbles:true})); renderRetired(); drawTraditions(); sync();
  };
  dialog.querySelector('[data-config-save]').onclick = () => {
    if(validate()) { sync(); return; }
    draft.lockedRows = [...lockSelect.selectedOptions].map(option=>option.value);
    draft.lockSourcePath = draft.lockedRows.length ? state.activeSave.path : null;
    draft.lockIdentities = Object.fromEntries(draft.lockedRows.map(row=>{const player=prepared.players.find(player=>player.value===row);return [row,{name:player.name,team:player.team}];}));
    input.value=JSON.stringify(draft); dialog.closeEditor(); input.dispatchEvent(new Event('change',{bubbles:true}));
  };
  renderRetired(); drawTraditions(); sync(); showPage('locks'); dialog.showModal();
}
