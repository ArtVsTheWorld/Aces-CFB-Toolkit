const equipmentDonorCatalogs = new Map();
function crossDonorSummary() { const config = readJsonControl('equipment-cross-groups-json', {}); return Object.entries(config).map(([group, sources]) => `${group}: ${sources.join('/') || 'Off'}`).join(' · '); }
function mouthpiecePositionSummary() { const config = readJsonControl('mouthpiece-positions-json', null); return config ? Object.entries(config).map(([group, mix]) => `${group}: ${mix.enabled ? `${mix.standard}/${mix.pacifier}/${mix.hanging}` : 'Off'}`).join(' · ') + ' (Standard/Pacifier/Hanging)' : 'Current Defaults — QB and K/P disabled; brand first'; }
function crossDonorMarkup(prepared) {
  return `<section class="percentage-section"><h3>Cross-Position Sources</h3><p class="muted">Choose a receiving position, then check the other groups it may copy from when Cross-Position Mixing triggers. Empty means no cross-position mixing for that group. Safeties combine FS and SS; normal donor and brand protections still apply.</p><input id="equipment-cross-groups-json" type="hidden" value="${escapeHtml(JSON.stringify(prepared.defaultCrossDonorGroups))}"><label>Receiving Position<select data-cross-receiver>${prepared.crossDonorGroups.map(group => `<option>${group}</option>`).join('')}</select></label><div class="toggle-grid" data-cross-sources>${prepared.crossDonorGroups.map(group => `<label class="toggle-card compact-toggle"><input type="checkbox" data-cross-source="${group}"><span>${group}</span></label>`).join('')}</div><p class="muted" data-cross-summary></p></section>`;
}
function mouthpiecePositionMarkup(prepared) {
  return `<section class="percentage-section"><h3>Position Settings</h3><p class="muted">Disable a group to leave its mouthpieces unchanged. Standard / Pacifier / Hanging must total 100%. Balaclavas allow only Hanging: if its weight is 0%, no mouthpiece is added and incompatible existing ones are cleared.</p><input id="mouthpiece-positions-json" type="hidden" value="null"><label>Mouthpiece Style Mix<select id="mouthpiece-style-mode"><option value="legacy">Current Defaults — Brand First</option><option value="custom">Custom by Position — Style First</option></select></label><p class="muted">Current Defaults keeps the existing distribution. In Custom, style is chosen first; branded frequency applies only to Hanging, because the verified branded pool has no Standard or Pacifier models.</p><label data-mouthpiece-position-label hidden>Position Group<select data-mouthpiece-receiver>${Object.keys(prepared.defaultMouthpiecePositions).map(group => `<option>${group}</option>`).join("")}</select></label><div data-mouthpiece-custom hidden>${Object.entries(prepared.defaultMouthpiecePositions).map(([group, mix]) => `<section class="percentage-section" data-mouthpiece-group="${group}"><label class="toggle-card compact-toggle"><input type="checkbox" id="mouthpiece-enabled-${group.replace('/', '-')}" ${mix.enabled ? 'checked' : ''} data-mouthpiece-enabled><span>${group} — Allow Mouthpieces</span></label><div class="probability-grid three">${['standard', 'pacifier', 'hanging'].map(style => percentageControl(`mouthpiece-${group.replace('/', '-')}-${style}`, style[0].toUpperCase() + style.slice(1), mix[style])).join('')}</div><div class="percentage-total"><strong data-mouthpiece-total></strong><button type="button" class="button secondary" data-mouthpiece-balance>Balance to 100%</button></div></section>`).join('')}</div></section>`;
}
function syncDonorMouthpieceDraft(root) {
  const cross = configurationRead(root, 'equipment-cross-groups-json'), receiver = root.querySelector('[data-cross-receiver]');
  if (cross && receiver) {
    const config = JSON.parse(cross.value), group = receiver.value;
    for (const input of root.querySelectorAll('[data-cross-source]')) {
      input.disabled = input.dataset.crossSource === group; input.checked = config[group].includes(input.dataset.crossSource);
      if (!input.dataset.bound) { input.dataset.bound = 'true'; input.addEventListener('input', () => { const next = JSON.parse(cross.value); next[receiver.value] = [...root.querySelectorAll('[data-cross-source]:checked')].map(node => node.dataset.crossSource); cross.value = JSON.stringify(next); cross.dispatchEvent(new Event('input', { bubbles: true })); }); }
    }
    root.querySelector('[data-cross-summary]').textContent = `${group} may pull from: ${config[group].join(', ') || 'No other groups'}`;
    if (!receiver.dataset.bound) { receiver.dataset.bound = 'true'; receiver.addEventListener('change', () => syncDonorMouthpieceDraft(root)); }
  }
  const mode = configurationRead(root, 'mouthpiece-style-mode'), saved = configurationRead(root, 'mouthpiece-positions-json');
  if (mode && saved) {
    root.querySelector('[data-mouthpiece-custom]').hidden = mode.value !== 'custom';
    const receiver = root.querySelector('[data-mouthpiece-receiver]'); root.querySelector('[data-mouthpiece-position-label]').hidden = mode.value !== 'custom';
    if (!receiver.dataset.bound) { receiver.dataset.bound = 'true'; receiver.addEventListener('change', () => syncDonorMouthpieceDraft(root)); }
    const config = {};
    root.querySelectorAll('[data-mouthpiece-group]').forEach(section => {
      section.hidden = section.dataset.mouthpieceGroup !== receiver.value;
      const group = section.dataset.mouthpieceGroup, inputs = ['standard', 'pacifier', 'hanging'].map(style => configurationRead(root, `mouthpiece-${group.replace('/', '-')}-${style}`));
      config[group] = { enabled: section.querySelector('[data-mouthpiece-enabled]').checked, ...Object.fromEntries(inputs.map((input, index) => [['standard', 'pacifier', 'hanging'][index], Number(input.value)])) };
      section.querySelector('[data-mouthpiece-total]').textContent = `Total: ${inputs.reduce((a, input) => a + Number(input.value), 0)}%`;
      const balance = section.querySelector('[data-mouthpiece-balance]'); if (!balance.dataset.bound) { balance.dataset.bound = 'true'; balance.addEventListener('click', () => { balanceWholeInputs(inputs); inputs[0].dispatchEvent(new Event('input', { bubbles: true })); }); }
    });
    saved.value = JSON.stringify(mode.value === 'custom' ? config : null);
  }
}
function validateDonorMouthpieceDraft(root) {
  const value = configurationRead(root, 'mouthpiece-positions-json');
  if (value?.value !== 'null' && value) for (const [group, mix] of Object.entries(JSON.parse(value.value))) {
    const weights = [mix.standard, mix.pacifier, mix.hanging];
    if (weights.some(number => !Number.isInteger(number) || number < 0 || number > 100) || weights.reduce((a, b) => a + b, 0) !== 100) return `${group}: mouthpiece styles must total 100% in whole numbers. Use Balance to 100%.`;
  }
  if (root.dataset.donorLoading === 'true') return 'Reading the donor file. Please wait.';
  const file = configurationRead(root, 'equipment-donor'), hash = configurationRead(root, 'equipment-donor-fingerprint');
  if (file && !file.value.trim() && hash?.value) return 'Use Active to switch back to the active save and clear donor-file selections.';
  if (file?.value.trim() && (!hash?.value || file.value.trim() !== hash.dataset.sourcePath)) return 'Load the donor file before saving these settings.';
  return '';
}
function replaceDonorPicker(root, prepared, selected = []) {
  const old = configurationRead(root, 'equipment-donor-players'), shell = old.closest('[data-option-picker]'), draft = Boolean(old.dataset.configOriginal), prefix = draft ? old.id.slice(0, -'equipment-donor-players'.length) : '';
  const holder = document.createElement('div'); holder.innerHTML = checkboxPicker('equipment-donor-players', 'Donor Players', prepared.donorPlayers, 'Eligible roster sophomores, juniors, and seniors in this source. Only checked players supply equipment.', selected);
  const picker = holder.firstElementChild;
  if (draft) for (const node of picker.querySelectorAll('[id],[for],[data-option-picker],[data-multi-label-for]')) {
    if (node.id) { node.dataset.configOriginal = node.id; node.id = prefix + node.id; }
    for (const attr of ['for', 'data-option-picker', 'data-multi-label-for']) if (node.hasAttribute(attr)) node.setAttribute(attr, prefix + node.getAttribute(attr));
  }
  if (draft) picker.dataset.optionPicker = prefix + 'equipment-donor-players';
  shell.replaceWith(picker); bindMultiSelectEnhancements(root);
  if (!draft) picker.querySelector('select[multiple]').addEventListener('change', () => { invalidateEquipment(state.page); const active = state.prepared.get(`freshman-equipment|${state.activeSave.path}`); if (active) updateEquipmentReview(state.page, active); });
}
async function loadDonorSelection(root, filePath, { keepSelection = false } = {}) {
  const file = configurationRead(root, 'equipment-donor'), fingerprint = configurationRead(root, 'equipment-donor-fingerprint'), status = configurationRead(root, 'equipment-donor-status');
  const active = state.prepared.get(`freshman-equipment|${state.activeSave.path}`);
  status.textContent = 'Reading donor players and equipment…';
  const request = String((Number(root.dataset.donorRequest) || 0) + 1); root.dataset.donorRequest = request; root.dataset.donorLoading = 'true';
  let prepared;
  try { prepared = filePath ? await window.cfbToolkit.prepareEquipmentDonors({ savePath: filePath }) : { donorPlayers: active.donorPlayers, donorKind: 'active', donorFingerprint: '' }; }
  finally { if (root.dataset.donorRequest === request) root.dataset.donorLoading = 'false'; }
  if (!file.isConnected || root.dataset.donorRequest !== request) return;
  const unchanged = keepSelection && fingerprint.value === prepared.donorFingerprint && fingerprint.dataset.sourcePath === filePath;
  const selected = unchanged ? [...configurationRead(root, 'equipment-donor-players').selectedOptions].map(option => option.value) : [];
  replaceDonorPicker(root, prepared, selected); file.value = filePath; fingerprint.value = prepared.donorFingerprint; fingerprint.dataset.sourcePath = filePath;
  equipmentDonorCatalogs.set(filePath || state.activeSave.path, prepared);
  status.textContent = `${prepared.donorPlayers.length.toLocaleString()} eligible donors · ${prepared.donorKind === 'active' ? 'Active Dynasty' : prepared.donorKind === 'roster' ? 'Roster file (read-only)' : 'Donor save (read-only)'}${prepared.warnings?.length ? ` · ${prepared.warnings.length} unusable records excluded` : ''}${keepSelection && !unchanged ? ' · Source changed; choose donors again' : ''}`;
  return prepared;
}
async function restoreDonorSelection(savedSettings = {}) {
  const file = document.getElementById('equipment-donor'), hash = document.getElementById('equipment-donor-fingerprint');
  if (!file?.value.trim()) return;
  const path = file.value.trim(), cached = equipmentDonorCatalogs.get(path), selected = savedSettings['equipment-donor-players'] ?? [];
  if (cached && hash.value === cached.donorFingerprint) { replaceDonorPicker(content, cached, selected); hash.dataset.sourcePath = path; document.getElementById('equipment-donor-status').textContent = `${cached.donorPlayers.length.toLocaleString()} eligible donors · ${cached.donorKind} file (read-only)`; return; }
  try { const expected = hash.value; const loaded = await loadDonorSelection(content, path); if (!loaded) return; if (expected === loaded.donorFingerprint) { replaceDonorPicker(content, loaded, selected); } else { invalidateEquipment(state.page); toast('Donor file changed; choose donors again.'); } captureToolSettings(); }
  catch (error) { if (file.isConnected) { document.getElementById('equipment-donor-status').textContent = readableError(error).message; hash.value = ''; } }
}
