/* Roster Generator shares the app's configuration, preview and preset controls. */
async function rosterGeneratorPage(tool) {
  if (!state.activeSave?.exists) { content.innerHTML = `${toolHeader(tool)}${inputCard()}`; bindCommon(); return; }
  const savePath = state.activeSave.path;
  content.innerHTML = `${toolHeader(tool)}<section class="card"><div class="status"><span class="spinner"></span>Reading rosters…</div></section>`;
  try {
    const key = `${tool.id}|${savePath}`;
    let prepared = state.prepared.get(key);
    if (!prepared) { prepared = await window.cfbToolkit.prepareTool({ toolId: tool.id, savePath }); state.prepared.set(key, prepared); }
    if (state.page !== tool.id || state.activeSave?.path !== savePath) return;
    const options = items => items.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');
    content.innerHTML = `${toolHeader(tool)}<div class="standard-config-workspace roster-generator-workspace">
      <section class="ops-section"><header class="ops-section-header"><span class="step-number">1</span><div><h2>Build Your Roster</h2><p>Choose teams, a talent level and how to spread that talent.</p></div></header>
      <div class="ops-section-body roster-generator-config-grid">
        <div>${teamPicker('roster-teams', 'Teams to Regenerate', prepared.teams, 'Select one or more teams. Each team gets its own new roster.')}
          <div class="notice"><strong>What changes?</strong><p>Names, faces, size, equipment, class years, ratings, development, abilities, skill caps and playing styles.</p><p>Long-snap and dealbreaker fixes run automatically. Numbers are assigned last using Standard Jersey Renumber, without team traditions or retired-number rules.</p><p>Players also receive fictional backstories, saved in Toolkit reviews and reports.</p><p>Each Preview creates a new roster. Apply writes the roster you reviewed and creates a backup first.</p></div>
        </div>
        <fieldset id="roster-options" disabled aria-describedby="roster-team-required"><legend class="roster-detail-owner">Roster Configuration</legend>
          <div id="roster-build-config"><label for="roster-caliber">Roster Caliber</label><select id="roster-caliber">${prepared.presets.map(preset => `<option value="${escapeHtml(preset.id)}" ${preset.id === 'building-blocks' ? 'selected' : ''}>${escapeHtml(preset.name)} · ${preset.targetAverage} average OVR</option>`).join('')}</select><p class="muted" data-roster-preset-description></p><p class="muted">Average player rating, not the game's team rating. This does not change age or potential.</p><label for="roster-age">Roster Age</label><select id="roster-age">${options(prepared.agePresets)}</select><p class="muted" data-roster-age-description></p><label for="roster-potential">Roster Potential</label><select id="roster-potential">${options(prepared.potentialPresets)}</select><p class="muted" data-roster-potential-description></p></div>
          <div id="roster-strength-config"><input type="hidden" id="roster-talent-shares" value=""><p>Adjust each group independently. Shares must total 100% before saving, so adding talent to one group means taking it from another.</p><p class="roster-talent-total"><strong data-roster-talent-total>100% allocated</strong><span>The preset’s average OVR stays the same.</span></p><div class="roster-strength-grid">${RosterTalent.groups.map(group => `<div class="roster-strength-row"><span>${group}<small>${({QB:'Highest',EDGE:'Elite',OL:'Elite',CB:'Very High',WR:'Very High',DT:'High',LB:'High',HB:'High',SS:'Moderate',FS:'Moderate',TE:'Moderate','K/P':'Low',FB:'Lowest'})[group]}</small></span><input type="range" min="0" max="100" step="1" value="0" data-roster-talent="${group}" aria-label="${group} share of talent budget"><output data-roster-talent-value="${group}">0%</output></div>`).join('')}</div><p data-roster-talent-status role="status" aria-live="polite"></p><p class="muted">Percentages describe talent shares, not player ratings. Defaults account for roster size and position importance. Preview shows the rating targets and results.</p></div>
          <div id="roster-scheme-config"><label for="roster-offense">Offensive Scheme</label><select id="roster-offense">${options(prepared.offensiveSchemes)}</select><p class="muted" data-roster-offense-description></p><label for="roster-defense">Defensive Scheme</label><select id="roster-defense">${options(prepared.defensiveSchemes)}</select><p class="muted" data-roster-defense-description></p><p class="muted">Schemes make fitting archetypes more likely. Other archetypes can still appear. Randomized keeps the usual mix.</p></div>
          <div id="roster-appearance-config"><label for="roster-skin-tone">Skin-Tone Mix</label><select id="roster-skin-tone">${options(prepared.tonePresets)}</select><p class="muted" data-roster-tone-description></p></div>
        </fieldset>
      </div></section><p class="notice" id="roster-team-required" role="status">Select at least one team to configure or generate a roster.</p><div class="actions"><button class="button" id="preview">Generate Roster Preview →</button></div>
      </div>${standardPreviewWorkspace('New Roster Review', 'Review your new players. Apply uses this exact roster without rerolling.', 'apply', 'Back Up & Regenerate Rosters')}`;
    bindCommon(); const savedSettings=state.toolSettings.get(tool.id);if(savedSettings)rosterMigrateTalentValues(savedSettings);restoreToolSettings();
    if(typeof addExplicitSelectionModes==='function')addExplicitSelectionModes(content);
    condenseConfiguration(document.getElementById('roster-build-config'), {title:'Roster Caliber',description:'Set current talent, age and future potential separately.',summary:root=>`${configurationLabel(root,'roster-caliber')} · ${configurationLabel(root,'roster-age')} · ${configurationLabel(root,'roster-potential')}`});
    condenseConfiguration(document.getElementById('roster-strength-config'), {title:'Position Strength',description:'Set each talent share freely, then bring the total to 100%.',defaults:{'roster-talent-shares':''},summary:root=>configurationRead(root,'roster-talent-shares').value?'Custom talent shares · 100% allocated':'Balanced by position importance and roster size',validate:root=>{try{return RosterTalent.allocationError(rosterReadTalent(root));}catch{return 'Reset this talent mix or choose valid talent shares.';}}});
    condenseConfiguration(document.getElementById('roster-scheme-config'), {title:'Offensive & Defensive Schemes',description:'Favor players who fit your style of football.',summary:root=>`${configurationLabel(root,'roster-offense')} offense · ${configurationLabel(root,'roster-defense')} defense`});
    condenseConfiguration(document.getElementById('roster-appearance-config'), {title:'Appearance & Names',description:'Choose the skin-tone mix for your fictional roster.',summary:root=>configurationLabel(root,'roster-skin-tone')});
    syncRosterGeneratorDraft(content);
    content.addEventListener('change',()=>syncRosterGeneratorDraft(content));
    bindRun(tool.id);
    const cached=state.genericPreviews.get(tool.id);
    if(cached){renderResult(document.querySelector('#run-output'),cached);document.querySelector('#apply').disabled=!cached.planId||cached.details.canApply===false;showStandardPreviewStage(true);}
    syncRosterGeneratorAccess();
  } catch(error) { if(state.page===tool.id&&state.activeSave?.path===savePath)showError(readableError(error)); }
}
function rosterGeneratorOptions() {
  let talentShares;try{talentShares=rosterReadTalent(content);}catch{talentShares={invalid:true};}
  return {teams:selected('#roster-teams'),preset:document.getElementById('roster-caliber').value,talentShares,rosterAge:document.getElementById('roster-age').value,rosterPotential:document.getElementById('roster-potential').value,offensiveScheme:document.getElementById('roster-offense').value,defensiveScheme:document.getElementById('roster-defense').value,skinTonePreset:document.getElementById('roster-skin-tone').value};
}
function rosterTalentCounts(names) {
  const prepared=state.prepared.get(`roster-generator|${state.activeSave?.path}`),chosen=names??selected('#roster-teams'),teams=prepared?.teams.filter(team=>chosen.includes(team.name)),counts={};
  for(const team of teams??[])for(const [group,n]of Object.entries(team.positionCounts??{}))counts[group]=(counts[group]??0)+n;
  return counts;
}
function rosterReadTalent(root){const control=configurationRead(root,'roster-talent-shares');return control?.value.trim()?JSON.parse(control.value):null;}
function rosterMigrateTalentValues(values,names){
  delete values['roster-talent-locks'];
  if(values['roster-caliber']==='future'){values['roster-caliber']='fcs';values['roster-age']??='youth';}
  if(values['roster-caliber']==='seniors'){values['roster-caliber']='building-blocks';values['roster-age']??='seniors';}
  const legacy=Object.keys(values).filter(key=>key.startsWith('roster-strength-'));
  if(legacy.length&&!values['roster-talent-shares']){const strength=Object.fromEntries(legacy.map(key=>[key.slice('roster-strength-'.length).replace('K-P','K/P'),Number(values[key])||0]));if(Object.values(strength).some(Boolean))values['roster-talent-shares']=JSON.stringify(RosterTalent.fromLegacy(rosterTalentCounts(names),strength));}
  legacy.forEach(key=>delete values[key]);return values;
}
function syncRosterGeneratorAccess() {
  const teams=document.getElementById('roster-teams');if(state.page!=='roster-generator'||!teams)return;
  const ready=teams.selectedOptions.length>0,options=document.getElementById('roster-options'),notice=document.getElementById('roster-team-required'),preview=document.getElementById('preview');
  if(options)options.disabled=!ready;if(notice)notice.hidden=ready;
  if(preview){if(!ready){preview.disabled=true;preview.dataset.rosterTeamGate='true';}else if(preview.dataset.rosterTeamGate){delete preview.dataset.rosterTeamGate;preview.disabled=false;}}
  if(!ready){state.genericPreviews.delete('roster-generator');const apply=document.getElementById('apply');if(apply)apply.disabled=true;}
  const presets=content.querySelector('.config-presets');if(presets)presets.hidden=!ready;
  const reset=document.getElementById('reset-tool-defaults');if(reset)reset.disabled=!ready;
}
const rosterTalentBound=new WeakSet();
function syncRosterTalent(root){
  const control=configurationRead(root,'roster-talent-shares');if(!control)return;
  let shares;try{shares=rosterReadTalent(root)??RosterTalent.baseline(rosterTalentCounts());}catch{return;}
  const counts=rosterTalentCounts(),defaults=RosterTalent.baseline(counts);
  root.querySelectorAll('[data-roster-talent]').forEach(input=>{
    const group=input.dataset.rosterTalent,output=root.querySelector(`[data-roster-talent-value="${group}"]`),value=shares[group]??0,difference=value-defaults[group];
    input.value=value;input.disabled=!(counts[group]>0);input.title=`Default ${defaults[group]}% · ${counts[group]??0} players`;input.setAttribute('aria-valuetext',`${value}% of talent budget`);
    if(output){output.textContent=`${value}%${difference?' ('+(difference>0?'+':'')+difference+')':''}`;output.className=difference>0?'rating-increase':difference<0?'rating-decrease':'';}
    if(!rosterTalentBound.has(input)){rosterTalentBound.add(input);input.addEventListener('input',()=>{const current=rosterReadTalent(root)??RosterTalent.baseline(rosterTalentCounts());control.value=JSON.stringify(RosterTalent.editShare(current,group,Number(input.value),rosterTalentCounts()));syncRosterTalent(root);});}
  });
  const allocated=Object.values(shares).reduce((a,b)=>a+b,0),total=root.querySelector('[data-roster-talent-total]'),status=root.querySelector('[data-roster-talent-status]');
  if(total){total.textContent=allocated+'% allocated';total.className=allocated===100?'rating-increase':'rating-decrease';}
  if(status)status.textContent=allocated===100?'100% allocated — ready to save.':allocated<100?`Allocate ${100-allocated}% more to reach 100%.`:`Remove ${allocated-100}% to reach 100%.`;
}
function syncRosterGeneratorDraft(root) {
  const prepared=state.prepared.get(`roster-generator|${state.activeSave?.path}`);
  const caliber=configurationRead(root,'roster-caliber'),description=root.querySelector('[data-roster-preset-description]');
  if(caliber&&description)description.textContent=prepared?.presets.find(preset=>preset.id===caliber.value)?.description??'';
  const tone=configurationRead(root,'roster-skin-tone'),toneDescription=root.querySelector('[data-roster-tone-description]');
  if(tone&&toneDescription)toneDescription.textContent=prepared?.tonePresets.find(preset=>preset.id===tone.value)?.description??'';
  for(const [id,descriptionKey,items] of [['roster-age','roster-age',prepared?.agePresets],['roster-potential','roster-potential',prepared?.potentialPresets],['roster-offense','roster-offense',prepared?.offensiveSchemes],['roster-defense','roster-defense',prepared?.defensiveSchemes]]){const control=configurationRead(root,id),description=root.querySelector(`[data-${descriptionKey}-description]`);if(control&&description)description.textContent=items?.find(item=>item.id===control.value)?.description??'';}
  syncRosterTalent(root);
  if(root===content)syncRosterGeneratorAccess();
}
function rosterGeneratorResults(result) {
  const rows = previewChanges(result), view = state.genericResultViews.get('roster-generator') ?? 'cards';
  const pretty = value => String(value ?? '').replace(/^College_/, '').replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  const change = (label, before, after) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(pretty(before))} → <strong>${escapeHtml(pretty(after))}</strong></dd></div>`;
  const cards = rows.map(row => {
    const before = row.before, after = row.fields;
    return `<article class="roster-player-card"><header><img data-team-logo src="${forceLogoUrl(row.team)}" alt=""><div><strong>#${after.JerseyNum} ${escapeHtml(row.player)}</strong><span>${escapeHtml(row.team)} · ${escapeHtml(row.position)} · ${after.RedshirtStatus === 'Previous' ? 'RS ' : ''}${escapeHtml(after.SchoolYear)}</span></div><div class="roster-overall ${after.OverallRating > before.OverallRating ? 'rating-increase' : after.OverallRating < before.OverallRating ? 'rating-decrease' : ''}">${before.OverallRating} → ${after.OverallRating}<small>Player OVR</small></div></header><span class="roster-athletic-profile">${escapeHtml(row.provenance.athleticName??'Balanced')}${row.provenance.outlierSize?' · '+escapeHtml(row.provenance.outlierSize==='small'?'Unusually Small':'Unusually Large'):''}</span>${row.backstory?`<section class="roster-backstory"><h3>${escapeHtml(row.backstory.title)}</h3><p>${escapeHtml(row.backstory.text)}</p></section>`:''}<p class="muted">Replaces #${before.JerseyNum} ${escapeHtml(row.oldPlayer)}</p>${row.measurements ? `<p>${escapeHtml(row.measurements.after.height)} · ${escapeHtml(row.measurements.after.weight)}</p>` : ''}<dl>${change('Archetype', before.PlayerType, after.PlayerType)}${change('Development', before.TraitDevelopment, after.TraitDevelopment)}${change('Class', before.SchoolYear, after.SchoolYear)}${change('Redshirt', before.RedshirtStatus, after.RedshirtStatus)}</dl><details data-roster-details="fields" data-roster-row="${row.row}"><summary>Ratings & Player Details<span class="roster-detail-owner"> for ${escapeHtml(row.player)}</span></summary><div data-roster-detail-body></div></details><details data-roster-details="equipment" data-roster-row="${row.row}"><summary>Equipment & Adjustments<span class="roster-detail-owner"> for ${escapeHtml(row.player)}</span></summary><div data-roster-detail-body></div></details></article>`;
  }).join('');
  const table = `<div class="preview-scroll"><table><thead><tr><th>Team</th><th>Position</th><th>Original Player</th><th>Generated Player</th><th>Class</th><th>Archetype</th><th>Athleticism</th><th>Backstory</th><th>Development</th><th>Size</th><th>OVR</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escapeHtml(row.team)}</td><td>${escapeHtml(row.position)}</td><td>#${row.before.JerseyNum} ${escapeHtml(row.oldPlayer)}</td><td>#${row.fields.JerseyNum} ${escapeHtml(row.player)}</td><td>${row.fields.RedshirtStatus === 'Previous' ? 'RS ' : ''}${escapeHtml(row.classYear)}</td><td>${escapeHtml(pretty(row.fields.PlayerType))}</td><td>${escapeHtml(row.provenance.athleticName??'Balanced')}</td><td class="roster-backstory-cell">${row.backstory?`<strong>${escapeHtml(row.backstory.title)}</strong><p>${escapeHtml(row.backstory.text)}</p>`:'—'}</td><td>${escapeHtml(pretty(row.fields.TraitDevelopment))}</td><td>${escapeHtml(row.measurements?.after.height??'—')}<br>${escapeHtml(row.measurements?.after.weight??'—')}</td><td>${row.before.OverallRating} → ${row.overall}</td></tr>`).join('')}</tbody></table></div>`;
  return `${result.details.blocking?.length ? `<div class="notice error"><strong>Apply is blocked — save unchanged</strong><ul>${result.details.blocking.map(item => `<li>${escapeHtml(item.team)}${item.row !== undefined ? ` · Player row ${item.row}` : ''}: ${escapeHtml(item.reason)}</li>`).join('')}</ul></div>` : ''}<div class="roster-team-summary">${(result.details.teams ?? []).map(team => `<div><strong>${escapeHtml(team.team)}</strong><span>${team.players} players · Average OVR ${team.oldAverage.toFixed(2)} → ${team.newAverage.toFixed(2)}</span><small>${team.targetAchieved ? 'Target average reached' : 'Target not reached — Apply blocked'} · Position counts preserved</small><small>${Object.entries(team.classRedshirtCounts??{}).map(([label,count])=>`${(label.split('|')[1]==='Previous'?'RS ':'')+label.split('|')[0]}: ${count}`).join(' · ')}</small><small>${Object.entries(team.developmentCounts??{}).map(([label,count])=>`${pretty(label)}: ${count}`).join(' · ')}</small>${team.positionStrength?`<details><summary>Talent by Position Group</summary><div class="roster-budget-table"><table><thead><tr><th>Group</th><th>Players</th><th>Target OVR</th><th>Actual OVR</th></tr></thead><tbody>${Object.entries(team.positionStrength).map(([group,item])=>`<tr><td>${escapeHtml(group)}</td><td>${item.players}</td><td>${item.target.toFixed(1)}</td><td>${item.actual.toFixed(1)}</td></tr>`).join('')}</tbody></table></div><p class="muted">Group targets share one team talent budget. Valid player profiles and rounding can cause small differences.</p></details>`:''}</div>`).join('')}</div><div class="notice"><strong>Before You Apply</strong><ul>${(result.details.warnings ?? []).map(note => `<li>${escapeHtml(note)}</li>`).join('')}</ul></div><div class="review-toolbar"><input class="input" id="roster-result-filter" placeholder="Search original or generated names, equipment, or attributes…"></div><div class="equipment-result-switch"><strong>${result.details.totalSearchMatches ?? result.details.totalPreviewRows} generated players</strong><div class="view-toggle" role="group" aria-label="Roster review view"><button data-generic-view="cards" class="${view === 'cards' ? 'active' : ''}">Cards</button><button data-generic-view="table" class="${view === 'table' ? 'active' : ''}">Table</button></div></div><div class="generic-player-card-list roster-player-grid" ${view === 'cards' ? '' : 'hidden'}>${cards || '<div class="empty">No players match these filters.</div>'}</div><div class="generic-player-table-view" ${view === 'table' ? '' : 'hidden'}>${table}</div>`;
}
function bindRosterGeneratorDetails(root,result) {
  const rows=new Map(previewChanges(result).map(row=>[String(row.row),row]));
  const pretty=value=>String(value??'').replace(/^College_/,'').replaceAll('_',' ').replace(/([a-z])([A-Z])/g,'$1 $2');
  root.querySelectorAll('[data-roster-details]').forEach(details=>details.addEventListener('toggle',()=>{
    if(!details.open||details.dataset.loaded)return;
    const row=rows.get(details.dataset.rosterRow);if(!row)return;
    const body=details.querySelector('[data-roster-detail-body]');
    if(details.dataset.rosterDetails==='fields')body.innerHTML=`<dl class="roster-field-changes">${Object.entries(row.fields).filter(([field])=>!['FirstName','LastName','PLYR_ASSETNAME'].includes(field)).map(([field,value])=>`<div><dt>${escapeHtml(pretty(field))}</dt><dd>${escapeHtml(field==='Height'?row.measurements?.before.height??pretty(row.before[field]):field==='Weight'?row.measurements?.before.weight??pretty(row.before[field]):pretty(row.before[field]))} → <strong>${escapeHtml(field==='Height'?row.measurements?.after.height??pretty(value):field==='Weight'?row.measurements?.after.weight??pretty(value):pretty(value))}</strong></dd></div>`).join('')}</dl><p class="muted">${escapeHtml(row.provenance.calibration?`Ratings adjusted to fit the selected roster strength.`:'Uses a complete player profile from the example rosters.')}</p>`;
    else body.innerHTML=`<ul>${row.equipment.map(item=>`<li><strong>${escapeHtml(pretty(item.slot))}:</strong> ${escapeHtml(item.name)}</li>`).join('')}</ul><p class="muted">${escapeHtml(row.fallbacks.join(' ')||(row.appearanceAudit.randomizer?'Equipment Randomizer · Active save · Top 20 donors per position.':'Uses equipment and appearance from a player at the same position.'))}</p><small>Football: ${escapeHtml(row.provenance.football)} · Appearance: ${escapeHtml(row.provenance.appearance)} · Style: ${escapeHtml(row.provenance.style)}</small>`;
    details.dataset.loaded='true';
  }));
}
