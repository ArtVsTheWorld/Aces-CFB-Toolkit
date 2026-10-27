function quickstartFormOptions() {
  return {...Object.fromEntries(['unlocked','raw','gameday'].map(key => [key, document.getElementById('quickstart-'+key).checked])),protectOriginalEaPlayers:document.getElementById('quickstart-protect-ea').checked};
}
function equipmentMemoryMarkup(id,count){return `<div class="tool-memory-row"><div><strong>Player Memory ${modelHelpButton('Dynasty Equipment Memory','Quickstart and Randomizer share player memory for this dynasty and its saved copies on this computer. Clearing it lets previously equipped players be randomized again. It does not undo equipment changes.')}</strong><span data-equipment-memory-count>${count==null?'Shared by Quickstart and Randomizer':Number(count).toLocaleString()+' players remembered'}</span></div><button type="button" class="button secondary" id="${id}" ${count===0?'disabled':''}>Clear Dynasty Memory</button></div>`;}
async function clearDynastyEquipmentMemory(button,refresh){
  const savePath=state.activeSave?.path,page=state.page;
  if(!await appConfirm('Clear Dynasty Equipment Memory?','This clears shared Quickstart and Randomizer tracking for this dynasty, including its saved copies. It does not undo equipment changes. Previously equipped players can be randomized again.','Clear Memory','Equipment memory is stored on this computer. Your save stays untouched.'))return;
  if(state.page!==page||state.activeSave?.path!==savePath||!button.isConnected)return;
  button.disabled=true;
  try{await window.cfbToolkit.clearQuickstartMemory();if(state.page!==page||state.activeSave?.path!==savePath)return;
    state.equipmentPreviews.delete('freshman-equipment');state.genericPreviews.delete('equipment-quickstart');
    for(const tool of ['freshman-equipment','equipment-quickstart']){const prepared=state.prepared.get(tool+'|'+savePath);if(prepared)prepared.equipmentMemoryCount=0;state.prepared.delete(tool+'|'+savePath);}
    document.querySelectorAll('#apply,#equipment-apply').forEach(node=>node.disabled=true);await refresh?.();toast('Equipment memory cleared for this dynasty.');
  }catch(error){if(state.page===page&&state.activeSave?.path===savePath){button.disabled=false;toast(readableError(error).message);}}
}
function updateQuickstartCounts(prepared) {
  for (const key of ['newPlayers','remembered','protectedPlayers']) {
    const element = document.querySelector('[data-quickstart-count="'+key+'"]');
    if (element) element.textContent = Number(prepared[key]).toLocaleString();
  }
  const clear = document.getElementById('quickstart-clear');
  if (clear) clear.disabled = (prepared.rememberedTotal??prepared.remembered) === 0;
  const count=content.querySelector('[data-equipment-memory-count]');if(count)count.textContent=Number(prepared.rememberedTotal??prepared.remembered).toLocaleString()+' players remembered';
}
let quickstartCountsRequest=0;
async function refreshQuickstartCounts() {
  const savePath = state.activeSave?.path,request=++quickstartCountsRequest,protectOriginalEaPlayers=document.getElementById('quickstart-protect-ea')?.checked!==false;
  try {
    const prepared = await window.cfbToolkit.prepareTool({toolId:'equipment-quickstart',savePath,options:{protectOriginalEaPlayers}});
    if (request===quickstartCountsRequest&&state.page==='equipment-quickstart' && state.activeSave?.path===savePath) updateQuickstartCounts(prepared);
  } catch { /* A completed write must not be presented as failed if the status refresh fails. */ }
}
async function equipmentQuickstartPage(tool) {
  if (!state.activeSave?.exists) { content.innerHTML=toolHeader(tool)+inputCard(); bindCommon(); return; }
  const savePath=state.activeSave.path;
  content.innerHTML=toolHeader(tool)+`<section class="card">${toolLoading('Checking players and Quickstart memory…')}</section>`;
  try {
    const prepared=await window.cfbToolkit.prepareTool({toolId:tool.id,savePath,options:{protectOriginalEaPlayers:state.toolSettings.get(tool.id)?.['quickstart-protect-ea']!==false}});
    if(state.page!==tool.id || state.activeSave?.path!==savePath)return;
    const mod=(key,label,help)=>`<label class="toggle-card compact-toggle"><input type="checkbox" id="quickstart-${key}"><span>${label} ${modelHelpButton(label,help)}</span></label>`;
    content.innerHTML=toolHeader(tool)+`<div class="standard-config-workspace nil-toggle-workspace quickstart-workspace">
      <section class="ops-section"><header class="ops-section-header"><span class="step-number">1</span><div><h2>Mods You Use</h2><p>Leave these off for an unmodded game.</p></div></header><div class="ops-section-body quickstart-mod-grid">
        ${mod('unlocked','CFB27 Unlocked v0.97+','Requires v0.97 or newer, by Orckestra. Enables its equipment pool, tattoos, mouthpieces, accessory recoloring, lower rolled jerseys, cutoff pants and sock styles, using Patcher defaults. Accessory colors use team percentages; tape matches accessory color.')}
        ${mod('raw','RAW Accessories v3.1.4+','Requires v3.1.4 or newer, by Delonte RAW. Enables its default equipment pool.')}
        ${mod('gameday','GameDay Gear v2.0+','Requires v2.0 or newer, by ElJax YT (Equipment Truck). Enables its default pool and Team Logo / Team Brand clear visors. Other visor tints are preserved.')}
      </div></section>
      <section class="ops-section"><header class="ops-section-header"><span class="step-number">2</span><div><h2>Players in This Dynasty ${modelHelpButton('Quickstart Player Memory','Successful Quickstart and Randomizer runs share player memory for this dynasty on this computer. Renamed saves, manual saves, autosaves and copies keep the same memory. Preview does not mark players.')}</h2><p>Previously equipped players are skipped. Choose whether original EA players stay unchanged.</p></div></header><div class="ops-section-body configuration-stack">
        <label class="toggle-card"><input type="checkbox" id="quickstart-protect-ea" checked><span>Protect Original EA Roster Players</span></label><div class="metric-grid"><div class="metric"><strong data-quickstart-count="newPlayers"></strong><small>New players</small></div><div class="metric"><strong data-quickstart-count="remembered"></strong><small>Already equipped</small></div><div class="metric"><strong data-quickstart-count="protectedPlayers"></strong><small>Original EA players protected</small></div></div>
        ${equipmentMemoryMarkup('quickstart-clear',prepared.rememberedTotal??prepared.remembered)}
        <div><strong>Included Corrections ${modelHelpButton('Included Corrections','Randomizes untracked players using the top 30 donors, then applies Improve Helmets and Facemasks, Hand Out Visors, Brand Existing Visors, Above-Knee Pants, Rolled-Jersey Undershirts and Equipment Compatibility. Additional Unlocked passes run only when selected. Use Randomizer or Patcher afterward if you want more control; successful Randomizer runs share this dynasty’s player memory with Quickstart.')}</strong><p class="quickstart-included-summary">Randomized gear, helmet and visor fixes, uniform adjustments, and compatibility repairs.</p></div>
      </div></section><div class="actions"><button class="button" id="preview">Preview New Players’ Equipment →</button></div>
    </div>${standardPreviewWorkspace('Quickstart Equipment Preview','Review all equipment changes before applying.','apply')}`;
    bindCommon();restoreToolSettings();bindModelHelp(content);updateQuickstartCounts(prepared);bindRun(tool.id);
    document.getElementById('quickstart-protect-ea').addEventListener('change',refreshQuickstartCounts);
    document.getElementById('quickstart-clear').onclick=()=>clearDynastyEquipmentMemory(document.getElementById('quickstart-clear'),refreshQuickstartCounts);
    const cached=state.genericPreviews.get(tool.id);
    if(cached){renderResult(document.getElementById('run-output'),cached);document.getElementById('apply').disabled=!cached.planId||cached.details.canApply===false;showStandardPreviewStage(true);}
  } catch(error){if(state.page===tool.id&&state.activeSave?.path===savePath)showError(readableError(error));}
}
function quickstartResults(result) {
  return equipmentResults(result);
}
