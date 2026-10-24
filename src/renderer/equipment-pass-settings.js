/* These views edit the existing canonical controls. Global edits are explicit
 * bulk edits, not a second settings model or a change to save-writing logic. */
const equipmentPassGroups=['QB','HB','FB','WR','TE','OL','EDGE','DT','LB','CB','FS','SS','K/P'];
function installEquipmentFrequencySettings(){
  const get=id=>document.getElementById(id);
  if(state.page==='freshman-equipment'){
    const host=content.querySelector('.player-filter-group');
    if(host&&!get('equipment-protect-previous'))host.insertAdjacentHTML('beforeend',`<label class="toggle-card compact-toggle"><input type="checkbox" id="equipment-protect-previous" checked><span>Protect Previously Randomized Players<small>Skip players remembered by Randomizer or Quickstart for this dynasty, including renamed saves and autosaves. Successful Apply runs update memory; Preview does not. Runs before this feature was added cannot be detected.</small></span></label><label class="toggle-card compact-toggle"><input type="checkbox" id="equipment-randomize-donors"><span>Randomize Donors Too<small>Allow selected/top donors to receive new equipment. Their original outfits remain the donor source for this run. Other player protections still apply.</small></span></label>`);
    return;
  }
  for(const [key,id]of [['visors','visor-settings-field'],['mouthpieces','unlocked-mouthpiece-color-field'],['tattoos','unlocked-tattoo-field'],['lowerJersey','lower-uniform-settings'],['cutoffPants','cutoff-uniform-settings']]){
    const host=get(id);if(host&&!get('frequency-fill-'+key))host.insertAdjacentHTML('beforeend',`<label class="toggle-card compact-toggle frequency-fill-setting"><input type="checkbox" id="frequency-fill-${key}"><span>Fill to Frequency ${modelHelpButton('Fill to Frequency','Off: each eligible player gets a chance roll, up to the per-team frequency limit. On: skip the roll and add items until that limit or eligible players run out. Existing items count first. Players are shuffled; compatibility and protection still apply. This setting covers every position group in this pass.')}</span></label>`);
  }
  const tattoo=get('unlocked-tattoo-field');
  if(tattoo&&!get('tattoo-placement')){
    tattoo.insertAdjacentHTML('beforeend',`<section id="tattoo-placement" class="configuration-stack"><h3>Tattoo Placement ${modelHelpButton('Tattoo Placement','These choices apply after a player passes the tattoo frequency roll. Available designs limit possible placements. Arm Only, Leg Only and Arms & Legs must total 100%.')}</h3><div class="probability-grid three">${[['arm','Arm Only',80],['leg','Leg Only',12],['both','Arms & Legs',8]].map(([key,label,value])=>percentageControl('tattoo-chance-'+key,label,value)).join('')}</div><h3>Arm Pairing</h3><div class="probability-grid three">${[['doubleArm','Both Arms',40,'Chance of tattooing both arms when an arm tattoo is selected.'],['differentArms','Different Designs',35,'When both arms are tattooed, chance to use different designs.'],['leftArm','Left Arm Preference',50,'When one arm is tattooed, chance to choose the left rather than right arm.']].map(([key,label,value,help])=>percentageControl('tattoo-chance-'+key,label,value,help)).join('')}</div></section>`);
  }
  const cap=get('unlocked-tattoo-cap');if(cap){const label=document.querySelector('label[for="unlocked-tattoo-cap"]');if(label)label.innerHTML='Tattoo Frequency '+modelHelpButton('Tattoo Frequency','Chance per eligible player and maximum tattoo share per team. Existing tattoos count toward the limit. Fill to Frequency skips the chance roll.');}
}
function equipmentFrequencyReviewRows(){
  const rows=[];
  for(const [key,toggle,label]of [['visors','fix-visors','Visors'],['mouthpieces','fix-unlocked-mouthpieces','Mouthpieces'],['tattoos','fix-unlocked-tattoos','Tattoos'],['lowerJersey','fix-unlocked-lower-jersey','Lower Rolled Jersey'],['cutoffPants','fix-unlocked-cutoff-pants','Cutoff Pants']])if(document.getElementById(toggle)?.checked)rows.push([label+' Application',document.getElementById('frequency-fill-'+key)?.checked?'Fill to Frequency':'Chance roll + per-team limit']);
  if(document.getElementById('fix-unlocked-tattoos')?.checked){
    const read=key=>document.getElementById('tattoo-chance-'+key)?.value;
    rows.push(['Tattoo Placement',read('arm')+'% arm only · '+read('leg')+'% leg only · '+read('both')+'% arms & legs'],['Tattoo Arm Pairing',read('doubleArm')+'% both arms · '+read('differentArms')+'% different designs · '+read('leftArm')+'% left when single']);
  }
  return rows;
}
function equipmentGlobalPanel(root, fields, groups=equipmentPassGroups) {
  const panel=document.createElement('section');panel.className='equipment-global-panel';
  panel.innerHTML='<p>Change a value here to apply it to every position group. “Varies” means the current position settings differ; opening this page does not change them.</p><div class="equipment-global-grid"></div>';
  const grid=panel.querySelector('.equipment-global-grid'),mirrors=[];
  for(const field of fields){
    const label=document.createElement('label');label.dataset.globalSetting=field.key;
    label.innerHTML=field.checkbox?`<input type="checkbox"><span>${escapeHtml(field.label)}</span>`:`<span class="field-caption">${escapeHtml(field.label)} ${field.help===false?'':modelHelpButton(field.label,field.help??'Whole percentages from 0 through 100. A global change updates this setting for every position group; other settings stay unchanged.')}</span><div class="input-suffix"><input type="number" class="input" min="0" max="100" step="1" placeholder="Varies"><span>%</span></div>`;
    if(field.checkbox)label.classList.add('global-enabled');
    const input=label.querySelector('input');input.dataset.globalKey=field.key;
    input.addEventListener('input',()=>{
      for(const group of groups){const control=configurationRead(root,field.id(group));if(control){if(field.checkbox)control.checked=input.checked;else control.value=input.value;}}
    });
    grid.append(label);mirrors.push({field,input,label});
  }
  panel.sync=()=>{
    for(const {field,input,label}of mirrors){
      const controls=groups.map(group=>configurationRead(root,field.id(group))).filter(Boolean),values=controls.map(control=>field.checkbox?control.checked:control.value),same=values.length&&values.every(value=>value===values[0]);
      if(field.checkbox){input.indeterminate=!same;input.checked=same&&values[0];}
      else input.value=same?values[0]:'';
      label.hidden=Boolean(field.customStyle)&&configurationRead(root,'mouthpiece-style-mode')?.value!=='custom';
      input.setAttribute('aria-label',field.label+' for all position groups');
    }
  };
  (root.equipmentGlobalPanels??=[]).push(panel);panel.sync();return panel;
}
function syncEquipmentPassSettings(root){for(const panel of root.equipmentGlobalPanels??[])panel.sync();}
function equipmentSettingsCard(title, help, nodes) {
  const section=document.createElement('section');section.className='equipment-settings-card';
  section.innerHTML=`<h3>${escapeHtml(title)}${help?' '+modelHelpButton(title,help):''}</h3><div class="equipment-settings-card-body"></div>`;
  section.lastElementChild.append(...nodes.filter(Boolean));return section;
}
function organizeMouthpieceEditor(dialog,root,copyNodes){
  dialog.classList.add('mouthpiece-editor');
  const read=id=>configurationRead(root,id),mode=read('mouthpiece-style-mode'),section=mode.closest('section');
  for(const option of mode.options)option.textContent=option.value==='legacy'?'Current Defaults':'Custom Style Mix';
  section.querySelector(':scope>h3')?.remove();
  const selector=read('mouthpiece-receiver').closest('.configuration-field'),groups=section.querySelector('[data-mouthpiece-custom]');
  const positions=document.createElement('div');positions.className='mouthpiece-position-view';
  positions.append(groups);
  const copy=copyNodes(),source=copy[0]?.querySelector('select'),details=copy[1];
  if(details){
    // The selected position is already the source. Keep the canonical copy
    // machinery but remove its duplicate selector from the visible interface.
    copy[0].hidden=true;positions.append(...copy);
    const receiver=selector.querySelector('select');
    const syncCopy=()=>{source.value=receiver.value;details.querySelector('summary').textContent='Copy '+source.value+' Settings to Other Positions';};
    receiver.addEventListener('change',syncCopy);syncCopy();
  }
  const fields=[

    {key:'cap',label:'Mouthpiece Frequency',id:g=>'mouthpiece-'+g.replace('/','-')+'-cap',help:'Chance per eligible player and maximum share for each team’s position group. Existing mouthpieces count toward the limit. Fill to Frequency skips the chance roll.'},
    {key:'enabled',label:'Enable Mouthpieces for All Positions',checkbox:true,customStyle:true,id:g=>'mouthpiece-enabled-'+g.replace('/','-')},
    ...['standard','pacifier','hanging'].map(style=>({key:style,label:style[0].toUpperCase()+style.slice(1),help:false,customStyle:true,id:g=>'mouthpiece-'+g.replace('/','-')+'-'+style}))
  ];
  const global=equipmentGlobalPanel(root,fields);global.classList.add('mouthpiece-global-view');
  global.querySelector('p').textContent='Edits here update every position group. “Varies” means groups currently have different settings.';
  const grid=global.querySelector('.equipment-global-grid'),field=key=>grid.querySelector('[data-global-setting="'+key+'"]');
  const limits=document.createElement('div');limits.className='mouthpiece-limit-grid';limits.append(field('cap'));
  const enabled=field('enabled'),enabledStatus=document.createElement('span');enabledStatus.className='mouthpiece-enabled-status';enabledStatus.setAttribute('aria-live','polite');enabled.append(enabledStatus);
  const application=equipmentSettingsCard('Application', '', [enabled,limits]);
  const styles=document.createElement('div');styles.className='mouthpiece-style-grid';styles.append(...['standard','pacifier','hanging'].map(field));
  const total=document.createElement('div');total.className='percentage-total global-style-total';total.innerHTML='<strong aria-live="polite"></strong><button type="button" class="button secondary">Normalize to 100%</button>';
  const styleCard=equipmentSettingsCard('Style Mix','Of the mouthpieces added or rerolled, choose the share of each style. These three values must total 100%. Standard and Pacifier cannot be worn with a balaclava.',[styles,total]);
  grid.remove();global.append(application,styleCard);
  total.querySelector('button').onclick=()=>{for(const group of equipmentPassGroups)balanceWholeInputs(['standard','pacifier','hanging'].map(style=>read('mouthpiece-'+group.replace('/','-')+'-'+style)));read('mouthpiece-positions-json').dispatchEvent(new Event('input',{bubbles:true}));};
  const syncGlobal=global.sync;global.sync=()=>{
    syncGlobal();const custom=mode.value==='custom';styleCard.hidden=!custom;
    const count=equipmentPassGroups.filter(g=>read('mouthpiece-enabled-'+g.replace('/','-')).checked).length;
    enabledStatus.textContent=count+' of '+equipmentPassGroups.length+' groups enabled';
    const values=[...styles.querySelectorAll('input')].map(input=>input.value);
    total.querySelector('strong').textContent=values.every(v=>v!=='')?'Style Total: '+values.reduce((s,v)=>s+Number(v),0)+'%':'Different mixes by position';
    total.querySelector('button').textContent=values.some(v=>v==='')?'Normalize Each Position':'Normalize to 100%';
    total.dataset.valid=String(values.every(v=>v!=='')&&values.reduce((s,v)=>s+Number(v),0)===100);
  };
  for(const group of groups.children){
    const limits=group.querySelector('.probability-grid.two'),styleControls=group.querySelector('[data-mouthpiece-style-controls]'),enabled=styleControls.querySelector('label.toggle-card'),styleGrid=styleControls.querySelector('.probability-grid.three'),total=styleControls.querySelector('.percentage-total');
    limits.className='mouthpiece-limit-grid';const chance=limits.querySelector('[id$="-chance"]');if(chance){const old=chance.closest('.input-suffix').parentElement;chance.type='hidden';group.append(chance);old.remove();}const cap=limits.querySelector('[id$="-cap"]');if(cap){const label=cap.closest('.input-suffix').parentElement.querySelector('label');label.innerHTML='Mouthpiece Frequency '+modelHelpButton('Mouthpiece Frequency','Chance per eligible player and maximum share for this team’s position group. Existing mouthpieces count toward the limit.');}styleGrid.className='mouthpiece-style-grid';
    enabled.querySelector('span').textContent='Enable Mouthpieces for '+group.dataset.mouthpieceGroup;
    // The enable switch stays alongside its group's application limits; only
    // the style mix is in the second card. Existing sync still owns visibility.
    const application=equipmentSettingsCard('Application','',[enabled,limits]);
    const style=equipmentSettingsCard('Style Mix','Shares of Standard, Pacifier and Hanging must total 100%. Branded frequency only applies to Hanging in Custom Style Mix.',[styleGrid,total]);
    styleControls.append(style);group.prepend(application);
    const sync=()=>{enabled.hidden=mode.value!=='custom';};mode.addEventListener('change',sync);sync();
  }
  const scope=document.createElement('section');scope.className='mouthpiece-scope';equipmentScopeViews(scope,global,positions);section.append(scope);
  const scopeBar=document.createElement('div'),selectorWrap=document.createElement('div'),nav=scope.querySelector('.equipment-global-scope');
  scopeBar.className='mouthpiece-scope-bar';selectorWrap.append(selector);selectorWrap.hidden=true;nav.before(scopeBar);scopeBar.append(nav,selectorWrap);
  nav.addEventListener('click',event=>{const button=event.target.closest('[data-equipment-scope]');if(button)selectorWrap.hidden=button.dataset.equipmentScope!=='positions';});
  const legacy=document.createElement('p');legacy.className='mouthpiece-legacy-note';legacy.dataset.uiNote='';legacy.textContent='Current Defaults leaves QB and K/P off. Choose Custom Style Mix to enable them or choose your own styles.';section.append(legacy);
  const sync=global.sync;global.sync=()=>{sync();legacy.hidden=mode.value==='custom';for(const group of groups.children)group.querySelector('.toggle-card').hidden=mode.value!=='custom';};
  const colors=read('unlocked-mouthpiece-colors'),colorLabel=colors.previousElementSibling,colorHelp=colors.nextElementSibling;
  const colorField=document.createElement('div');colorField.className='configuration-field';colorField.append(...[colorLabel,colors,colorHelp].filter(Boolean));
  const brand=read('mouthpiece-branded-frequency').closest('.input-suffix').parentElement,reroll=read('randomize-existing-mouthpieces').closest('.toggle-card');brand.classList.add('mouthpiece-brand-field');
  addConfigurationPages(dialog,root,[{title:'Application & Styles',nodes:[section]},{title:'Colors & Existing Gear',nodes:[equipmentSettingsCard('Colors & Branding','',[colorField,brand]),equipmentSettingsCard('Existing Mouthpieces','Keep existing mouthpieces unless you want to reroll their styles. Population caps limit new additions, not replacements.',[reroll])]}]);
  dialog.querySelector('.configuration-description').textContent='Set who receives a mouthpiece, how often, and which styles to use.';
}
function equipmentScopeViews(host, global, positions) {
  const nav=document.createElement('div');nav.className='equipment-global-scope';nav.setAttribute('role','group');nav.setAttribute('aria-label','Edit position scope');
  for(const [key,label]of [['global','All Positions'],['positions','By Position']]){
    const button=document.createElement('button');button.type='button';button.className='button secondary';button.textContent=label;button.dataset.equipmentScope=key;
    button.onclick=()=>{global.hidden=key!=='global';positions.hidden=key!=='positions';for(const item of nav.children){const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));}host.closest('dialog')?.dispatchEvent(new Event('toolkit-hide-help'));};nav.append(button);
  }
  host.append(nav,global,positions);nav.firstElementChild.click();
}
function organizePatcherSettings(dialog, root){
  if(state.page!=='equipment-patcher'||dialog.dataset.equipmentPaged)return;
  dialog.dataset.equipmentPaged='true';dialog.classList.add('equipment-pass-editor');
  const read=id=>configurationRead(root,id),page=(title,nodes)=>({title,nodes:nodes.filter(Boolean)});
  const copyNodes=()=>[root.querySelector('[data-copy-source]')?.closest('label'),root.querySelector('.copy-position-settings')].filter(Boolean);
  if(read('visor-frequency-QB')){
    const host=read('visor-settings-field'),grid=host.querySelector('.probability-grid'),global=equipmentGlobalPanel(root,[{key:'visor',label:'Visor Frequency (%)',id:group=>'visor-frequency-'+group.replace('/','-'),help:'Chance to add a clear visor and maximum visor share for each team’s position group. Existing visors stay unchanged. The same percentage is applied independently to every group.'}]);
    addConfigurationPages(dialog,host,[page('All Positions',[global]),page('By Position',[...host.children,...copyNodes()])]);
    if(grid)grid.dataset.positionGrid='visors';
  }else if(read('mouthpiece-style-mode')){
    organizeMouthpieceEditor(dialog,root,copyNodes);
  }else if(read('lower-uniform-cap-QB')||read('cutoff-uniform-cap-QB')){
    const kind=read('lower-uniform-cap-QB')?'lower':'cutoff',host=read(kind+'-uniform-settings'),grid=host.querySelector('.probability-grid'),title=read(kind+'-uniform-cap-title'),help=title.nextElementSibling;
    const global=equipmentGlobalPanel(root,[{key:'cap',label:'Frequency (%)',id:group=>kind+'-uniform-cap-'+group.replace('/','-'),help:'Chance per eligible player and maximum share for each team’s position group. Existing styles count first. Fill to Frequency skips the chance roll. Compatibility and protection still apply.'}]);
    const rules=[...host.children].filter(node=>![grid,title,help].includes(node));
    addConfigurationPages(dialog,host,[page('All Positions',[global]),page('By Position',[title,help,grid]),page('Fit & Rules',rules)]);
  }else if(read('unlocked-tattoo-cap')){
    const host=read('unlocked-tattoo-field'),cap=read('unlocked-tattoo-cap').closest('.configuration-field'),pool=read('unlocked-tattoo-pool').closest('[data-option-picker],.team-picker');
    addConfigurationPages(dialog,host,[page('Frequency',[cap]),page('Placement',[read('tattoo-placement')]),page('Tattoo Designs',[pool])]);
  }else if(read('unlocked-color-theme')){
    const host=read('unlocked-color-field'),mode=read('tape-color-mode'),label=mode.previousElementSibling,nodes=[...host.children],index=nodes.indexOf(label);
    if(index>=0)addConfigurationPages(dialog,host,[page('Accessory Colors',nodes.slice(0,index)),page('Tape Colors',nodes.slice(index))]);
  }else if(read('undershirt-color')){
    const custom=root.querySelector('[data-undershirt-custom]'),builds=[...custom.children];
    addConfigurationPages(dialog,custom,[page('Other Builds',[builds[0]]),page('Muscular / Standard',[builds[1]])]);
  }
  const fill=root.querySelector('[id^="frequency-fill-"],[data-config-original^="frequency-fill-"]')?.closest('label');if(fill){fill.classList.add('frequency-fill-setting');const tabs=dialog.querySelector('.configuration-page-tabs');if(tabs){const row=document.createElement('div');row.className='frequency-fill-row';tabs.before(row);row.append(fill);}}
  root.querySelectorAll('.configuration-draft>div:empty').forEach(node=>node.hidden=true);
  syncEquipmentPassSettings(root);bindModelHelp(dialog);
}
function paginateHelmetEditor(dialog){
  const body=dialog.querySelector('.configuration-body');dialog.classList.add('equipment-pass-editor');
  const action=body.querySelector('.helmet-action-choices'),note=body.querySelector('[data-helmet-zero-note]'),mix=body.querySelector('.helmet-editor-toolbar'),custom=body.querySelector('[data-custom-helmet-settings]'),help=body.querySelector('.helmet-repair-help'),masks=body.querySelector('.facemask-pool-section');
  const remaining=[...body.children].filter(node=>![action,note,mix,custom,help,masks].includes(node));
  addConfigurationPages(dialog,body,[{title:'Repair or Balance',nodes:[action,note,...remaining]},{title:'Helmet Mix',nodes:[mix,custom].filter(Boolean)},{title:'Facemask Pools',nodes:[masks]}]);
  for(const caption of body.querySelectorAll('legend,h3,label')){
    const text=[...caption.childNodes].find(node=>node.nodeType===3&&/^\s*[123]\.\s/.test(node.textContent));
    if(text)text.textContent=text.textContent.replace(/^\s*[123]\.\s*/,'');
  }
  bindModelHelp(dialog);
}
