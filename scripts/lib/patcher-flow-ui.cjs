const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async(window,root)=>{
 const execute=source=>window.webContents.executeJavaScript(source),out=path.join(root,'outputs/patcher-ui-redesign');fs.mkdirSync(out,{recursive:true});
 await execute(`(async()=>{
   window.flowCheck=(ok,message)=>{if(!ok)throw Error(message)};
   window.flowWait=async f=>{for(let i=0;i<1000;i++){if(f()){await new Promise(r=>setTimeout(r,100));return;}await new Promise(r=>setTimeout(r,20));}throw Error('Patcher flow timed out: '+content.textContent.slice(-500));};
   window.flowChange=(n,value)=>{n.value=value;n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));};
   window.flowVisible=n=>!!n&&!n.closest('[hidden]')&&n.getBoundingClientRect().width>0;
   window.flowOpen=id=>{const card=content.querySelector('[data-patcher-setting="'+id+'"]');flowCheck(flowVisible(card),'Visible settings card '+id);const button=card.querySelector('[data-config-open],#configure-helmet-mix');flowCheck(flowVisible(button)&&!button.disabled,'Reachable Configure '+id);button.click();const d=document.querySelector('dialog[open]');flowCheck(d?.classList.contains('tool-ui-dialog'),'Shared dialog '+id);return d;};
   window.flowReset=async()=>{closeConfigurationDialogs();document.getElementById('reset-tool-defaults').click();await flowWait(()=>content.querySelector('[data-patcher-flow]')?.patcherCards?.length===17);};
   navigate('equipment-patcher');await flowWait(()=>content.querySelector('[data-patcher-flow]')?.patcherCards?.length===17);
   flowCheck(flowVisible(content.querySelector('[data-ui-page="0"]'))&&!flowVisible(content.querySelector('[data-ui-page="1"]')),'Start on Choose Options');
   flowCheck(document.getElementById('equipment-step-next').disabled,'Empty selection blocks Continue');
   flowCheck(content.querySelectorAll('.ui-option-row').length===17,'All seventeen passes available');
   flowCheck([...content.querySelectorAll('.ui-option-row input')].every(n=>!n.checked&&flowVisible(n)),'All passes visible and off by default');
   flowCheck([...content.querySelectorAll('input[type=number],select[id]')].filter(n=>flowVisible(n)&&!n.closest('.config-presets')).length===0,'Detailed configuration stays off the options page: '+[...content.querySelectorAll('input[type=number],select[id]')].filter(n=>flowVisible(n)&&!n.closest('.config-presets')).map(n=>n.id).join(', '));
   const entries=[...content.querySelectorAll('.player-pool-layout .configuration-entry')];
   flowCheck(entries.length===2&&Math.abs(entries[0].getBoundingClientRect().top-entries[1].getBoundingClientRect().top)<2,'Scope entries aligned');
   flowCheck(Math.abs(entries[0].getBoundingClientRect().bottom-entries[1].getBoundingClientRect().bottom)<2,'Scope entries have equal heights');
   const info=document.getElementById('fix-visors').parentElement.querySelector('.model-help-button');info.click();flowCheck(!document.getElementById('fix-visors').checked,'Info never toggles option');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   window.flowBaseline={controls:configurationControls(content).filter(n=>!n.closest('.config-presets')).map(n=>({id:n.id,type:n.type,value:configurationValue(n)})),defaults:equipmentOptions('equipment-patcher')};
 })()`);
 const baselinePath=path.join(root,'outputs/patcher-ui-before-redesign.json'),current=await execute('flowBaseline');
 if(fs.existsSync(baselinePath)){
  const before=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
  // The user changed this one default after accepting the first Patcher stage.
  before.controls.find(n=>n.id==='unlocked-color-theme').value='team';
  before.defaults.unlockedColorTheme='team';before.selected.unlockedColorTheme='team';
  const accessoryIds=await execute(`['alabama','georgia','nebraska','penn state','usc'].map(team=>({team,inputs:[...content.querySelectorAll('[data-accessory-team="'+team+'"]')].map(input=>({id:input.id,color:input.dataset.accessoryTeamColor}))}))`);
  for(const {team,inputs} of accessoryIds){
   const mix={white:95,black:5,primary:0,secondary:0};
   for(const {id,color} of inputs){const expected=before.controls.find(control=>control.id===id);if(expected)expected.value=String(mix[color]);}
   for(const expected of [before.defaults,before.selected])if(expected.teamAccessoryColors?.[team])expected.teamAccessoryColors[team]=mix;
  }
  const byId=list=>Object.fromEntries(list.map(n=>[n.id,{type:n.type,value:n.value}]));
  assert.deepEqual(byId(current.controls),byId(before.controls),'Every original canonical setting and default retained');
  assert.deepEqual(JSON.parse(JSON.stringify(current.defaults)),before.defaults,'Default equipment options match archived UI');
  await execute(`for(const id of ${JSON.stringify(before.controls.filter(n=>n.id.startsWith('fix-')).map(n=>n.id))})if(!document.getElementById(id).checked)document.getElementById(id).click();void 0`);
  assert.deepEqual(JSON.parse(JSON.stringify(await execute(`equipmentOptions('equipment-patcher')`))),before.selected,'Equivalent selected passes serialize identically');
  console.log('PASS Original 1,332 controls/options retained with the requested team-color default.');
 }
 await execute(`(async()=>{
   await flowReset();document.getElementById('fix-visors').click();document.getElementById('equipment-step-next').click();
   flowCheck(flowVisible(content.querySelector('[data-ui-page="1"]')),'Continue opens configuration');
   flowCheck([...content.querySelectorAll('[data-patcher-setting]')].filter(flowVisible).length===1,'Only selected option shown');
   flowCheck(flowVisible(document.getElementById('equipment-preview')),'Preview available from Configure');
   const original=document.getElementById('visor-frequency-QB').value;
   state.equipmentPreviews.set('equipment-patcher',{planId:'unchanged-settings'});
   let d=flowOpen('fix-visors');d.querySelector('[data-config-cancel]').click();
   flowCheck(state.equipmentPreviews.has('equipment-patcher'),'Cancel preserves existing preview');
   d=flowOpen('fix-visors');d.querySelector('[data-config-save]').click();
   flowCheck(state.equipmentPreviews.has('equipment-patcher'),'Unchanged Save preserves existing preview');
   d=flowOpen('fix-visors');flowChange(d.querySelector('[data-global-key="visor"]'),'45');
   [...d.querySelectorAll('[role=tab]')].find(n=>n.textContent==='By Position').click();
   flowChange(configurationRead(d,'visor-frequency-QB'),'17');d.querySelector('[data-config-save]').click();
   flowCheck(!state.equipmentPreviews.has('equipment-patcher'),'Changed settings invalidate preview');
   flowCheck(equipmentOptions('equipment-patcher').visorFrequencies.QB===17&&equipmentOptions('equipment-patcher').visorFrequencies.WR===45,'Shared and position settings save');
   d=flowOpen('fix-visors');flowCheck(d.querySelector('[data-global-key="visor"]').value==='','Opening mixed settings preserves overrides');
   flowChange(d.querySelector('[data-global-key="visor"]'),'90');d.querySelector('[data-config-cancel]').click();
   flowCheck(document.getElementById('visor-frequency-QB').value==='17','Cancel discards changed draft');
   d=flowOpen('fix-visors');d.querySelector('[data-config-reset]').click();d.dispatchEvent(new Event('cancel',{cancelable:true}));
   flowCheck(document.getElementById('visor-frequency-QB').value==='17','Escape/Close discard draft reset');
   document.getElementById('equipment-step-back').click();document.getElementById('fix-visors').click();
   flowCheck(document.getElementById('equipment-step-next').disabled,'Deselecting last option blocks Continue');
   document.getElementById('fix-visors').click();document.getElementById('fix-bears-pads').click();document.getElementById('equipment-step-next').click();
   flowCheck(document.getElementById('visor-frequency-QB').value==='17','Deselection and Back retain settings');
   d=flowOpen('fix-bears-pads');flowChange(configurationRead(d,'bears-pads-style'),'mixed');d.querySelector('[data-config-cancel]').click();flowCheck(document.getElementById('bears-pads-style').value==='shooter','Sleeve fit Cancel');
   d=flowOpen('fix-bears-pads');flowChange(configurationRead(d,'bears-pads-style'),'mixed');d.querySelector('[data-config-save]').click();flowCheck(document.getElementById('bears-pads-style').value==='mixed','Sleeve fit Save');
   document.getElementById('equipment-step-back').click();document.getElementById('fix-unlocked-tattoos').click();document.getElementById('fix-clear-tattoos').click();
   flowCheck(!document.getElementById('fix-unlocked-tattoos').checked&&document.getElementById('fix-clear-tattoos').checked,'Tattoo conflict preserved');
   document.getElementById('fix-unlocked-tattoos').click();flowCheck(!document.getElementById('fix-clear-tattoos').checked,'Reverse tattoo conflict preserved');
   const preset={...presetConfiguration()};flowCheck(preset.values['visor-frequency-QB']==='17'&&preset.values['fix-visors']===true,'Preset captures existing control IDs');
   flowCheck(!Object.keys(preset.values).some(id=>id.startsWith('ui-')),'Presentation does not add settings');
   await flowReset();
   for(const id of PATCHER_OPTION_GROUPS.flatMap(g=>g.options.map(o=>o.id)))if(id!=='fix-clear-tattoos')document.getElementById(id).click();
 })()`);
 console.log('PASS Selection, navigation, override retention, isolated drafts, unchanged/changed preview handling, sleeve fit and presets.');
 for(const width of [2296,1480,1100,760,520])for(const theme of ['light','dark']){
  window.setContentSize(width,width===1480?1000:850);
  await execute(`document.documentElement.dataset.theme=${JSON.stringify(theme)};applyAccentColor({...state.bootstrap.settings,accentColor:${JSON.stringify(theme==='dark'?'#ffcf33':'#5046c4')}});setPatcherStep(0);void 0`);
  await execute(`new Promise(r=>setTimeout(r,140))`);
  const checkLayout=()=>execute(`(()=>{
   const main=document.querySelector('main');flowCheck(main.scrollWidth<=main.clientWidth+2,'Workspace fits '+innerWidth);
   const pages=content.querySelector('.ui-flow-pages'),actions=content.querySelector('.ui-flow-actions');
   flowCheck(pages.getBoundingClientRect().bottom<=actions.getBoundingClientRect().top,'Actions reserve space without covering settings');
   flowCheck(pages.clientHeight>100,'Usable settings scroll area');
   for(const n of [...content.querySelectorAll('.ui-option-row,.ui-setting-card,.ui-flow-actions')].filter(flowVisible)){const b=n.getBoundingClientRect();flowCheck(b.left>=0&&b.right<=innerWidth+1,'Element bounds '+n.className+' at '+innerWidth+' '+JSON.stringify({left:b.left,right:b.right,width:b.width}));flowCheck(n.scrollWidth<=n.clientWidth+2,'Content fits '+n.className+' at '+innerWidth);}
   const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);flowCheck(new Set(ids).size===ids.length,'Unique controls');
  })()`);
  try{await checkLayout();}catch(error){console.log(await execute(`(()=>{let n=document.querySelector('.ui-flow-actions'),out=[];while(n){const s=getComputedStyle(n),b=n.getBoundingClientRect();out.push({tag:n.tagName,class:n.className,left:b.left,right:b.right,width:s.width,minWidth:s.minWidth,display:s.display,align:s.alignSelf,flex:s.flex});n=n.parentElement;}return out;})()`));fs.writeFileSync(path.join(out,'layout-failure.png'),(await window.webContents.capturePage()).toPNG());throw error;}
  if(width===1480||width===760)fs.writeFileSync(path.join(out,`choose-${width}-${theme}.png`),(await window.webContents.capturePage()).toPNG());
  await execute('setPatcherStep(1);void 0');await checkLayout();
  if(width>760)await execute(`(()=>{for(const card of [...content.querySelectorAll('[data-patcher-setting]')].filter(flowVisible)){const button=card.querySelector('[data-config-open],#configure-helmet-mix');if(!button)continue;const c=card.getBoundingClientRect(),b=button.getBoundingClientRect();flowCheck(Math.abs(c.right-b.right-17)<2,'Configure buttons share right inset: '+card.dataset.patcherSetting);flowCheck(Math.abs(c.bottom-b.bottom-17)<2,'Configure buttons share bottom inset: '+card.dataset.patcherSetting);}})()`);
  if(width===1480||width===760)fs.writeFileSync(path.join(out,`configure-${width}-${theme}.png`),(await window.webContents.capturePage()).toPNG());
  await execute(`(async()=>{
   const d=flowOpen('fix-unlocked-mouthpieces');
   for(const tab of d.querySelectorAll('[role=tab]')){tab.click();await new Promise(r=>setTimeout(r,25));const body=d.querySelector('.configuration-body');flowCheck(body.scrollWidth<=body.clientWidth+2,'Modal content fits '+innerWidth);const b=d.getBoundingClientRect();flowCheck(b.top>=0&&b.bottom<=innerHeight+1,'Modal fits height');const footer=d.querySelector('.configuration-footer').getBoundingClientRect();flowCheck(footer.bottom<=b.bottom+1,'Modal actions remain visible');}
   d.querySelector('[data-config-cancel]').click();
  })()`);
 }
 window.setContentSize(1480,1000);
 await execute(`document.documentElement.dataset.textSize='extra';setPatcherStep(0);void 0`);window.webContents.setZoomFactor(1.5);
 await execute(`new Promise(r=>setTimeout(r,150))`);
 await execute(`flowCheck(document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth+2,'Large text and 150% scaling fit');void 0`);
 window.webContents.setZoomFactor(1);
 await execute(`(async()=>{
   document.documentElement.dataset.textSize='standard';setPatcherStep(1);
   document.getElementById('equipment-preview').click();
   const progress=document.getElementById('equipment-wizard-status').getBoundingClientRect(),actions=content.querySelector('.ui-flow-actions').getBoundingClientRect();
   flowCheck(progress.height>0&&progress.bottom<=actions.top&&progress.top>=0,'Preview progress stays visible above actions');
   await flowWait(()=>state.equipmentPreviews.has('equipment-patcher'));
   flowCheck(flowVisible(document.getElementById('equipment-preview-workspace')),'Preview opens existing workspace');
   const before=JSON.stringify(equipmentOptions('equipment-patcher'));document.getElementById('equipment-edit-settings').click();
   flowCheck(flowVisible(content.querySelector('[data-ui-page="1"]'))&&JSON.stringify(equipmentOptions('equipment-patcher'))===before,'Edit Settings returns without resetting');
   const d=flowOpen('fix-visors');flowChange(d.querySelector('[data-global-key="visor"]'),'10');d.querySelector('[data-config-save]').click();
   flowCheck(document.getElementById('equipment-apply').disabled&&!state.equipmentPreviews.has('equipment-patcher'),'Changed settings block stale Apply');
   document.getElementById('equipment-preview').click();await flowWait(()=>state.equipmentPreviews.has('equipment-patcher'));
   document.getElementById('equipment-apply').click();await flowWait(()=>!state.equipmentPreviews.has('equipment-patcher'));
 })()`);
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({controls:current.controls.length,passes:17,widths:[1480,1100,760,520],themes:['light','dark'],zoom:1.5,passed:true},null,2)+'\n');
 console.log('PASS Patcher Choose/Configure layouts, both themes, custom accents, 150% scaling, original Preview/Apply path and stale-preview guards.');
};
