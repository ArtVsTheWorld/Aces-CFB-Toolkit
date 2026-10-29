// Isolated Electron integration checks: no user settings or save writes.
const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 await window.webContents.executeJavaScript(`(()=>{
  closeConfigurationDialogs();
  const check=uiCheck,change=(node,value)=>{if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));};
  window.teamDialog=()=>document.querySelector('dialog[open]');
  window.teamRow=name=>[...teamDialog().querySelectorAll('[data-batch-team]')].find(row=>row.querySelector('strong').textContent===name);
  window.openTeams=()=>{document.getElementById('roster-configure-teams').click();return teamDialog();};
  window.editRosterTeam=name=>teamRow(name).querySelector('[data-roster-edit]').click();
  const control=document.getElementById('roster-team-settings'),shared=Object.fromEntries(rosterSettingIds.map(id=>[id,configurationValue(document.getElementById(id))]));
  window.outsideTeam={...shared,'roster-age':'veteran'};control.value=JSON.stringify({Alabama:outsideTeam});control.dispatchEvent(new Event('change',{bubbles:true}));
  check(document.querySelectorAll('#roster-team-overrides button').length===1,'One Configure Teams entry');
  check(!document.getElementById('roster-build-batch')&&!document.getElementById('roster-edit-overrides'),'Old competing entries removed');
  window.teamBaseline=control.value;state.genericPreviews.set('roster-generator',{planId:'preserve-this-preview'});
  let modal=openTeams();check(modal.querySelector('h2').textContent==='Configure Teams','Unified window title');
  for(const input of modal.querySelectorAll('[data-batch-weight]'))check(Number(input.value)===RosterBatch.defaultCaliberWeights[input.dataset.batchWeight],'Default caliber frequency '+input.dataset.batchWeight);
  check([...modal.querySelectorAll('.batch-team-status')].every(n=>n.textContent==='Main-Page Settings'),'Untouched teams inherit');
  modal.querySelector('[data-config-save]').click();check(control.value===teamBaseline,'No-op Save never materializes overrides');check(state.genericPreviews.get('roster-generator')?.planId==='preserve-this-preview','No-op Save preserves preview');
  modal=openTeams();editRosterTeam('LSU');check(document.querySelectorAll('dialog').length===1,'Individual view stays in the same modal');check(modal.querySelector('[data-roster-list-view]').hidden&&!modal.querySelector('[data-roster-editor-view]').hidden,'View switch');
  check(!modal.querySelector('[data-roster-custom]').checked,'Individual view shows inherited state');check(configurationRead(modal,'roster-caliber').disabled,'Inherited controls read-only');
  check([...document.querySelectorAll('#roster-options > .configuration-entry strong')].map(n=>n.textContent).filter(t=>t!=='Team Settings').join('|')==='Roster Caliber|Offensive & Defensive Schemes|Position Strength|Appearance & Names','Shared configuration puts schemes and roster makeup before talent spending');
  check([...modal.querySelectorAll('[data-roster-tab]')].map(n=>n.textContent).join('|')==='Caliber & Age|Schemes|Position Strength|Appearance','Individual settings follow the same configuration order');
  modal.querySelector('[data-roster-tab="2"]').click();check(!modal.querySelector('[data-roster-pane="2"]').hidden&&modal.querySelector('[data-roster-pane="1"]').hidden,'Schemes tab opens schemes and roster makeup, not position strength');
  change(modal.querySelector('[data-roster-custom]'),true);
  for(const [id,value]of [['roster-caliber','startup'],['roster-age','seniors'],['roster-potential','high'],['roster-offense','OFF_OPTION'],['roster-defense','DEF_BASE3_4'],['roster-makeup','scheme'],['roster-skin-tone','hbcu'],['roster-reorder-depth',false]])change(configurationRead(modal,id),value);
  modal.querySelector('[data-roster-tab="1"]').click();const mix=modal.querySelector('[data-roster-spending-preset]'),workspace=modal.querySelector('[data-roster-team-content]');
  for(const preset of RosterTalent.spendingPresets){mix.value=preset.id;mix.dispatchEvent(new Event('input',{bubbles:true}));mix.dispatchEvent(new Event('change',{bubbles:true}));check(JSON.stringify(rosterReadTalent(workspace))===JSON.stringify(RosterTalent.presetShares(rosterTalentCounts(['LSU'],workspace),preset.id)),'Starting Mix accepts native input then change events: '+preset.id);}
  modal.querySelector('[data-roster-step="QB"][data-step="1"]').click();check(modal.querySelector('[data-config-save]').disabled,'Invalid individual budget blocks whole draft');
  modal.querySelector('[data-roster-back]').click();check(modal.querySelector('[data-config-save]').disabled,'Invalid draft still blocks Save after returning to list');
  editRosterTeam('LSU');modal.querySelector('[data-roster-normalize]').click();check(!modal.querySelector('[data-config-save]').disabled,'Normalization repairs individual draft');
  const shares=configurationRead(modal,'roster-talent-shares').value;change(modal.querySelector('[data-roster-edit-team]'),'Navy');check(!modal.querySelector('[data-roster-custom]').checked,'Other team still inherits');change(modal.querySelector('[data-roster-edit-team]'),'LSU');
  check(configurationRead(modal,'roster-talent-shares').value===shares,'Individual settings survive team switching');check(configurationRead(modal,'roster-caliber').value==='startup'&&!configurationRead(modal,'roster-reorder-depth').checked,'Caliber and depth settings preserved');
  for(const [id,value]of [['roster-caliber','startup'],['roster-age','seniors'],['roster-potential','high'],['roster-offense','OFF_OPTION'],['roster-defense','DEF_BASE3_4'],['roster-makeup','scheme'],['roster-skin-tone','hbcu'],['roster-reorder-depth',false]])check(configurationValue(configurationRead(modal,id))===value,'Preserves '+id);
  const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);check(new Set(ids).size===ids.length,'No duplicate canonical/draft IDs');
  modal.querySelector('[data-roster-back]').click();check(teamRow('LSU').querySelector('.batch-team-status').textContent==='Skipped · Customized','Manual edits protected');
  const mode=modal.querySelector('[data-batch-mode]');change(mode,'variety');for(const input of modal.querySelectorAll('[data-batch-weight]'))input.value=input.dataset.batchWeight==='all-time'?'100':'0';modal.querySelector('[data-batch-build]').click();
  check(teamRow('LSU').querySelector('[data-batch-field="roster-caliber"]').value==='startup','Bulk cannot overwrite protected manual edit');check(teamRow('Navy').querySelector('[data-batch-field="roster-caliber"]').value==='all-time','Bulk updates unlocked team');
  change(modal.querySelector('[data-batch-copy-source]'),'LSU');change(teamRow('Navy').querySelector('[data-batch-select]'),true);modal.querySelector('[data-batch-copy]').click();
  editRosterTeam('Navy');check(configurationRead(modal,'roster-skin-tone').value==='hbcu'&&!configurationRead(modal,'roster-reorder-depth').checked,'Copy includes appearance and depth settings');
  modal.querySelector('[data-config-reset]').click();check(!modal.querySelector('[data-roster-custom]').checked,'Use Main-Page Settings removes individual override');modal.querySelector('[data-roster-back]').click();check(teamRow('Navy').querySelector('.batch-team-status').textContent==='Main-Page Settings','Reset reflected in list');
  change(teamRow('Navy').querySelector('[data-batch-row-lock]'),true);check(teamRow('Navy').querySelector('[data-batch-reroll]').disabled,'Protect applies to row bulk action');editRosterTeam('Navy');change(modal.querySelector('[data-roster-custom]'),true);change(configurationRead(modal,'roster-age'),'youth');
  check(control.value===teamBaseline,'No intermediate canonical writes from either view');modal.querySelector('[data-config-cancel]').click();check(control.value===teamBaseline,'Cancel discards bulk and individual edits together');check(state.genericPreviews.get('roster-generator')?.planId==='preserve-this-preview','Cancel preserves preview');
  modal=openTeams();editRosterTeam('LSU');change(modal.querySelector('[data-roster-custom]'),true);change(configurationRead(modal,'roster-age'),'youth');modal.querySelector('[data-roster-back]').click();modal.querySelector('[data-config-save]').click();
  const saved=JSON.parse(control.value);check(saved.LSU['roster-age']==='youth'&&!saved.Navy,'Save stores only customized teams');check(JSON.stringify(saved.Alabama)===JSON.stringify(outsideTeam),'Unselected existing overrides preserved');check(!state.genericPreviews.has('roster-generator'),'Changed Save invalidates preview');
  const preset=presetConfiguration();check(presetValues(preset)['roster-team-settings']===control.value,'Preset roundtrip keeps unified settings');window.teamSaved=control.value;
  modal=openTeams();editRosterTeam('LSU');change(configurationRead(modal,'roster-age'),'seniors');modal.dispatchEvent(new Event('cancel',{cancelable:true}));check(!teamDialog()&&control.value===teamSaved,'Escape discards draft');
  modal=openTeams();modal.querySelector('[data-config-reset]').click();modal.querySelector('[data-config-save]').click();check(!JSON.parse(control.value).LSU&&JSON.stringify(JSON.parse(control.value).Alabama)===JSON.stringify(outsideTeam),'Reset All removes selected overrides but keeps unselected');
  openTeams();editRosterTeam('LSU');change(teamDialog().querySelector('[data-roster-custom]'),true);teamDialog().querySelector('[data-roster-tab="1"]').click();
 })()`);
 for(const theme of ['light','dark'])for(const width of [1500,760,520]){
  window.setContentSize(width,1050);await window.webContents.executeJavaScript(`document.documentElement.dataset.theme=${JSON.stringify(theme)};new Promise(r=>setTimeout(r,100))`);
  const box=await window.webContents.executeJavaScript(`(()=>{const d=teamDialog(),r=d.getBoundingClientRect(),body=d.querySelector('.configuration-body'),footer=d.querySelector('.configuration-footer').getBoundingClientRect(),offense=getComputedStyle(d.querySelector('.roster-position-badge[data-unit="offense"]')),defense=getComputedStyle(d.querySelector('.roster-position-badge[data-unit="defense"]')),specialists=getComputedStyle(d.querySelector('.roster-position-badge[data-unit="specialists"]'));uiCheck(offense.color!==defense.color,'Defense has its own badge color');uiCheck(specialists.backgroundColor==='rgb(17, 17, 17)'&&specialists.color==='rgb(255, 255, 255)','K/P badge is black and readable');return {left:r.left,right:r.right,width:innerWidth,bodyWidth:body.clientWidth,bodyScroll:body.scrollWidth,footerBottom:footer.bottom,height:innerHeight};})()`);
  if(box.left<0||box.right>box.width+1||box.bodyScroll>box.bodyWidth+2||box.footerBottom>box.height)throw Error('Individual team editor overflow '+JSON.stringify(box));
  fs.writeFileSync(path.join(root,'outputs/v225-unified-team-'+theme+'-'+width+'.png'),(await window.webContents.capturePage()).toPNG());
 }
 await window.webContents.executeJavaScript(`teamDialog().querySelector('[data-config-cancel]').click();void 0;`);
 console.log('PASS unified teams: one entry/dialog, shared inheritance, individual tabs, all configuration fields, budget validation across views, locks, bulk/copy/reset, unselected overrides, Cancel/Escape, no-op Save, previews, presets, light/dark responsive editor.');
};
