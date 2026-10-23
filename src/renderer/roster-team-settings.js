// One draft window, with per-team tabs; no nested configuration dialogs.
const rosterSettingIds=['roster-caliber','roster-age','roster-potential','roster-talent-shares','roster-talent-mix','roster-talent-counts','roster-offense','roster-defense','roster-skin-tone','roster-reorder-depth','roster-makeup'];
function rosterValuesToOptions(values){return {preset:values['roster-caliber'],rosterAge:values['roster-age'],rosterPotential:values['roster-potential'],talentShares:values['roster-talent-shares']?JSON.parse(values['roster-talent-shares']):null,talentMix:values['roster-talent-mix']??(values['roster-talent-shares']?'custom':'balanced'),offensiveScheme:values['roster-offense'],defensiveScheme:values['roster-defense'],skinTonePreset:values['roster-skin-tone'],reorderDepthChart:values['roster-reorder-depth']!==false,rosterMakeup:values['roster-makeup']??'preserve'};}
function rosterAffectedSummary(){if(!document.getElementById('roster-caliber'))return 'Reading roster settings…';const options=rosterGeneratorOptions(),prepared=state.prepared.get(`roster-generator|${state.activeSave?.path}`),names=options.teams;return `${names.slice(0,3).join(', ')}${names.length>3?' +'+(names.length-3)+' more':''} · Every rostered player, including original EA roster players · `+names.slice(0,3).map(name=>{const config=options.teamConfigurations[name]??options;return `${name}: ${prepared?.presets.find(p=>p.id===config.preset)?.name??config.preset} · ${config.rosterAge} age · ${config.rosterPotential} potential${options.teamConfigurations[name]?' (Custom)':''}`;}).join(' | ');}
// Mount the full editor inside Configure Teams; it never opens a second dialog
// or writes canonical controls. The owner commits the shared draft once on Save.
function mountRosterTeamEditor({host,teams,shared,getOverride,setOverride,isProtected,onChange,onBack}){
  // Keep pane identifiers stable while presenting schemes/makeup before talent spending.
  const sections=[['roster-build-config','Caliber & Age',0],['roster-scheme-config','Schemes',2],['roster-strength-config','Position Strength',1],['roster-appearance-config','Appearance',3]];
  host.innerHTML=`<div class="roster-team-editor-toolbar"><button type="button" class="button secondary" data-roster-back>← Back to Team List</button><label>Individual Team<select data-roster-edit-team>${teams.map(team=>`<option>${escapeHtml(team.name)}</option>`).join('')}</select></label></div><div class="roster-team-editor-heading"><img data-roster-editor-logo alt=""><div><h3 data-roster-editor-title></h3><p data-roster-editor-status></p></div></div><label class="toggle-card"><input type="checkbox" data-roster-custom><span>Use Individual Settings<small>Turn off to use the main-page settings. Manual edits are protected from bulk changes.</small></span></label><nav class="roster-team-tabs" aria-label="Individual team settings">${sections.map(([,label,i])=>`<button type="button" class="button secondary" data-roster-tab="${i}" aria-pressed="${i===0}">${label}</button>`).join('')}</nav><div data-roster-team-content></div>`;
  const workspace=host.querySelector('[data-roster-team-content]'),teamSelect=host.querySelector('[data-roster-edit-team]'),custom=host.querySelector('[data-roster-custom]');
  let current=null,dirty=false;
  sections.forEach(([id,,i])=>{
    const pane=document.getElementById(id).cloneNode(true),ids=new Map();pane.dataset.rosterPane=String(i);pane.hidden=i!==0;
    for(const element of [pane,...pane.querySelectorAll('[id]')]){const original=element.id;element.dataset.configOriginal=original;element.id='team-draft-'+configurationSequence+'-'+original;ids.set(original,element.id);}
    for(const element of pane.querySelectorAll('[for],[aria-labelledby],[aria-describedby],[aria-controls]'))for(const attribute of ['for','aria-labelledby','aria-describedby','aria-controls'])if(element.hasAttribute(attribute))element.setAttribute(attribute,element.getAttribute(attribute).split(/\s+/).map(id=>ids.get(id)??id).join(' '));
    workspace.append(pane);
  });
  const values=()=>Object.fromEntries(rosterSettingIds.map(id=>[id,configurationValue(configurationRead(workspace,id))]));
  const status=()=>{host.querySelector('[data-roster-editor-status]').textContent=(getOverride(current)?'Customized':'Uses Shared Settings')+' · '+(isProtected(current)?'Protected from Bulk Changes':'Available for Bulk Changes');};
  const store=()=>{
    if(!current||!dirty)return;
    if(custom.checked){const next={...getOverride(current),...values()};delete next.batchSpending;setOverride(current,next);}else setOverride(current,null);
    dirty=false;status();
  };
  const load=()=>{
    const team=teams.find(team=>team.name===current),v={...shared,...getOverride(current)};workspace.dataset.rosterTeam=current;teamSelect.value=current;
    rosterSettingIds.forEach(id=>setConfigurationValue(configurationRead(workspace,id),v[id]));custom.checked=!!getOverride(current);
    workspace.querySelectorAll('input,select').forEach(input=>input.disabled=!custom.checked);syncRosterGeneratorDraft(workspace);
    if(!custom.checked)workspace.querySelectorAll('input,select').forEach(input=>input.disabled=true);
    host.querySelector('[data-roster-editor-title]').textContent=current;const logo=host.querySelector('[data-roster-editor-logo]');logo.dataset.teamLogo='';logo.src=forceLogoUrl(team.name);bindTeamLogoFallbacks(host);sortToolkitDropdowns(host);status();
  };
  const open=name=>{store();current=name;dirty=false;load();};
  teamSelect.addEventListener('change',()=>{open(teamSelect.value);onChange();});
  custom.addEventListener('change',()=>{dirty=true;store();load();onChange();});
  const changed=()=>{if(!current||!custom.checked)return;dirty=true;syncRosterGeneratorDraft(workspace);store();onChange();};
  workspace.addEventListener('input',changed);workspace.addEventListener('change',changed);
  host.querySelectorAll('[data-roster-tab]').forEach(button=>button.addEventListener('click',()=>{host.querySelectorAll('[data-roster-tab]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});workspace.querySelectorAll('[data-roster-pane]').forEach(pane=>pane.hidden=pane.dataset.rosterPane!==button.dataset.rosterTab);}));host.querySelector('[data-roster-tab]').classList.add('active');
  host.querySelector('[data-roster-back]').addEventListener('click',()=>{store();onBack(current);});
  return {open,flush:store,reset:()=>{if(!current)return;setOverride(current,null);dirty=false;load();onChange();},get current(){return current;}};
}
