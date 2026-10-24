function quickstartFormOptions() {
  return Object.fromEntries(['unlocked','raw','gameday'].map(key => [key, document.getElementById('quickstart-'+key).checked]));
}
function updateQuickstartCounts(prepared) {
  for (const key of ['newPlayers','remembered','protectedPlayers']) {
    const element = document.querySelector('[data-quickstart-count="'+key+'"]');
    if (element) element.textContent = Number(prepared[key]).toLocaleString();
  }
  const clear = document.getElementById('quickstart-clear');
  if (clear) clear.disabled = prepared.remembered === 0;
}
async function refreshQuickstartCounts() {
  const savePath = state.activeSave?.path;
  try {
    const prepared = await window.cfbToolkit.prepareTool({toolId:'equipment-quickstart',savePath});
    if (state.page==='equipment-quickstart' && state.activeSave?.path===savePath) updateQuickstartCounts(prepared);
  } catch { /* A completed write must not be presented as failed if the status refresh fails. */ }
}
async function equipmentQuickstartPage(tool) {
  if (!state.activeSave?.exists) { content.innerHTML=toolHeader(tool)+inputCard(); bindCommon(); return; }
  const savePath=state.activeSave.path;
  content.innerHTML=toolHeader(tool)+'<section class="card"><div class="status"><span class="spinner"></span>Checking players and Quickstart memory…</div></section>';
  try {
    const prepared=await window.cfbToolkit.prepareTool({toolId:tool.id,savePath});
    if(state.page!==tool.id || state.activeSave?.path!==savePath)return;
    const mod=(key,label,help)=>`<label class="toggle-card compact-toggle"><input type="checkbox" id="quickstart-${key}"><span>${label} ${modelHelpButton(label,help)}</span></label>`;
    content.innerHTML=toolHeader(tool)+`<div class="standard-config-workspace nil-toggle-workspace quickstart-workspace">
      <section class="ops-section"><header class="ops-section-header"><span class="step-number">1</span><div><h2>Mods You Use</h2><p>Leave these off for an unmodded game.</p></div></header><div class="ops-section-body quickstart-mod-grid">
        ${mod('unlocked','CFB27 Unlocked v0.97+','Requires v0.97 or newer, by Orckestra. Enables its equipment pool, tattoos, mouthpieces, accessory recoloring, lower rolled jerseys, cutoff pants and sock styles, using Patcher defaults. Accessory colors use team percentages; tape matches accessory color.')}
        ${mod('raw','RAW Accessories v3.1.0+','Requires v3.1.0 or newer, by Delonte RAW. Enables its default equipment pool.')}
        ${mod('gameday','GameDay Gear v2.0+','Requires v2.0 or newer, by ElJax YT (Equipment Truck). Enables its default pool and Team Logo / Team Brand clear visors. Other visor tints are preserved.')}
      </div></section>
      <section class="ops-section"><header class="ops-section-header"><span class="step-number">2</span><div><h2>Players in This Dynasty ${modelHelpButton('Quickstart Player Memory','Successful Quickstart and Randomizer runs share player memory for this dynasty on this computer. Renamed saves, manual saves, autosaves and copies keep the same memory. Preview does not mark players.')}</h2><p>Original EA roster players stay unchanged. Previously randomized players are skipped.</p></div></header><div class="ops-section-body configuration-stack">
        <div class="metric-grid"><div class="metric"><strong data-quickstart-count="newPlayers"></strong><small>New players</small></div><div class="metric"><strong data-quickstart-count="remembered"></strong><small>Already equipped</small></div><div class="metric"><strong data-quickstart-count="protectedPlayers"></strong><small>Original EA players protected</small></div></div>
        <div><button type="button" class="button secondary" id="quickstart-clear">Clear This Dynasty’s Memory</button></div>
        <div><strong>Included Corrections ${modelHelpButton('Included Corrections','No Drip is built in. Randomizes untracked players using the top 15 donors, then applies Improve Helmets and Facemasks, Hand Out Visors, Brand Existing Visors, Above-Knee Pants, Rolled-Jersey Undershirts and Equipment Compatibility. Additional Unlocked passes run only when selected. Use Randomizer or Patcher afterward if you want more control; successful Randomizer runs share this dynasty’s player memory with Quickstart.')}</strong><p class="quickstart-included-summary">Randomized gear, No Drip, helmet and visor fixes, uniform adjustments, and compatibility repairs.</p></div>
      </div></section><div class="actions"><button class="button" id="preview">Preview New Players’ Equipment →</button></div>
    </div>${standardPreviewWorkspace('Quickstart Equipment Preview','Review all equipment changes before applying.','apply')}`;
    bindCommon();restoreToolSettings();bindModelHelp(content);updateQuickstartCounts(prepared);bindRun(tool.id);
    document.getElementById('quickstart-clear').onclick=async()=>{
      if(!await appConfirm('Clear Dynasty Equipment Memory?','This clears shared Quickstart and Randomizer tracking for this dynasty, including its other saved copies. It does not undo any equipment changes. Previously completed players can be randomized again on the next run.','Clear Memory','Equipment memory is stored on this computer. Your save stays untouched.'))return;
      if(state.page!==tool.id||state.activeSave?.path!==savePath)return;
      const button=document.getElementById('quickstart-clear');button.disabled=true;
      try {
        await window.cfbToolkit.clearQuickstartMemory();
        if(state.page!==tool.id||state.activeSave?.path!==savePath)return;
        state.genericPreviews.delete(tool.id);document.getElementById('apply').disabled=true;
        await refreshQuickstartCounts();toast('Equipment memory cleared for this dynasty.');
      }catch(error){if(state.page===tool.id&&state.activeSave?.path===savePath){button.disabled=false;toast(readableError(error).message);}}
    };
    const cached=state.genericPreviews.get(tool.id);
    if(cached){renderResult(document.getElementById('run-output'),cached);document.getElementById('apply').disabled=!cached.planId||cached.details.canApply===false;showStandardPreviewStage(true);}
  } catch(error){if(state.page===tool.id&&state.activeSave?.path===savePath)showError(readableError(error));}
}
function quickstartResults(result) {
  return (result.details?.warnings??[]).map(message=>`<div class="notice warning">${escapeHtml(message)}</div>`).join('')+equipmentResults(result);
}
