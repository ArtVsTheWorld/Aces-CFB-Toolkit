const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async(window,root)=>{
 const execute=source=>window.webContents.executeJavaScript(source),out=path.join(root,'outputs/randomizer-ui-redesign');fs.mkdirSync(out,{recursive:true});
 await execute(`(async()=>{
  window.rCheck=(ok,message)=>{if(!ok)throw Error(message)};
  window.rWait=async f=>{for(let i=0;i<1200;i++){if(f()){await new Promise(r=>setTimeout(r,90));return;}await new Promise(r=>setTimeout(r,20));}throw Error('Randomizer flow timed out '+window.rStage+': '+document.getElementById('toast')?.textContent+' '+content.textContent.slice(-500));};
  window.rChange=(n,value)=>{rCheck(n,'Existing control');n.value=value;n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));};
  window.rVisible=n=>!!n&&!n.closest('[hidden]')&&n.getBoundingClientRect().width>0;
  window.rOpen=selector=>{const button=content.querySelector(selector);rCheck(rVisible(button)&&!button.disabled,'Reachable editor '+selector);button.click();const d=document.querySelector('dialog[open]');rCheck(d?.classList.contains('tool-ui-dialog'),'Shared modal '+selector);return d;};
  window.rDonors=()=>rOpen('.randomizer-donor-card [data-config-open]');
  window.rTab=(d,title)=>{const tab=[...d.querySelectorAll('[role=tab]')].find(n=>n.textContent===title);rCheck(tab,'Tab '+title);tab.click();};
  window.rSave=d=>{const save=d.querySelector('[data-config-save]');rCheck(!save.disabled,'Valid settings '+d.querySelector('[data-config-error]').textContent);save.click();rCheck(!document.querySelector('dialog[open]'),'Save closes editor');};
  window.rReset=async()=>{closeConfigurationDialogs();document.getElementById('reset-tool-defaults').click();await rWait(()=>content.querySelector('[data-randomizer-flow]')?.randomizerCards?.length===4);};
  navigate('freshman-equipment');await rWait(()=>content.querySelector('[data-randomizer-flow]')?.randomizerCards?.length===4);
  rCheck(rVisible(content.querySelector('[data-ui-page="0"]'))&&!rVisible(content.querySelector('[data-ui-page="1"]')),'Start on Choose Options');
  rCheck(content.querySelectorAll('.ui-option-row').length===4&&[...content.querySelectorAll('.ui-option-row input')].every(n=>!n.checked&&rVisible(n)),'Four optional extras start off');
  rCheck(!document.getElementById('equipment-step-next').disabled,'Donor equipment works without extras');
  const o=equipmentOptions('freshman-equipment');rCheck(o.top===30&&o.crossPositionPercent===10&&o.multipleDonorPercent===30&&!o.classes.length&&o.redshirtGroup==='all'&&o.protectPreviouslyRandomized&&!o.randomizeDonors,'Original donor/scope defaults');
  window.rBaseline={controls:configurationControls(content).filter(n=>!n.closest('.config-presets')).map(n=>({id:n.id,type:n.type,value:configurationValue(n)})),defaults:o};
 })()`);
 const baselinePath=path.join(root,'outputs/randomizer-ui-before-redesign.json'),current=await execute('rBaseline');
 if(fs.existsSync(baselinePath)){
  const before=JSON.parse(fs.readFileSync(baselinePath)),byId=list=>Object.fromEntries(list.map(n=>[n.id,{type:n.type,value:n.value}]));
  // Account for the authorized default change without modifying the archive.
  const donorCount=before.controls.find(control=>control.id==='equipment-top');
  if(donorCount&&Number(donorCount.value)===15)donorCount.value=typeof donorCount.value==='number'?30:'30';
  for(const defaults of [before.defaults,before.selected])if(defaults?.top===15)defaults.top=30;
  assert.deepEqual(byId(current.controls),byId(before.controls),'Every Randomizer setting and default retained');
  assert.deepEqual(JSON.parse(JSON.stringify(current.defaults)),before.defaults,'Default options unchanged');
  await execute(`for(const id of ['equipment-no-drip','equipment-unlocked','equipment-raw-accessories','equipment-truck'])document.getElementById(id).click();void 0`);
  assert.deepEqual(JSON.parse(JSON.stringify(await execute(`equipmentOptions('freshman-equipment')`))),before.selected,'Selected extras serialize identically');
  console.log('PASS All 28 original Randomizer controls, defaults and selected-extra options match.');
 }
 await execute(`(async()=>{
  await rReset();document.getElementById('equipment-step-next').click();
  rCheck([...content.querySelectorAll('.ui-setting-card')].filter(rVisible).length===1,'Donor Settings alone without extras');
  state.equipmentPreviews.set('freshman-equipment',{planId:'existing-plan'});
  let d=rDonors();rSave(d);rCheck(state.equipmentPreviews.has('freshman-equipment'),'Unchanged donor Save keeps preview');
  d=rDonors();rChange(configurationRead(d,'equipment-top'),'23');rTab(d,'Mixing & Donor Sources');
  rChange(configurationRead(d,'equipment-cross-percent'),'80');rCheck(d.querySelector('[data-config-save]').disabled,'Shared mixing budget enforced');
  rTab(d,'Donor Source & Players');rCheck(d.querySelector('[data-config-save]').disabled,'Hidden invalid mixing blocks Save');
  rChange(configurationRead(d,'equipment-donor-mode'),'selected');rCheck(d.querySelector('[data-config-save]').disabled,'Specific donors require checked players');
  const donors=configurationRead(d,'equipment-donor-players'),chosen=[...donors.options].slice(0,3).map(n=>n.value);rCheck(chosen.length===3,'Reference donors exist');
  [...donors.options].forEach(n=>n.selected=chosen.includes(n.value));donors.dispatchEvent(new Event('change',{bubbles:true}));
  rTab(d,'Mixing & Donor Sources');rChange(configurationRead(d,'equipment-cross-percent'),'15');rChange(configurationRead(d,'equipment-multiple-percent'),'35');
  rChange(d.querySelector('[data-cross-receiver]'),'WR');const source=d.querySelector('[data-cross-source="QB"]');source.click();
  const allowed=JSON.parse(configurationRead(d,'equipment-donor-sources-json').value).WR;rSave(d);
  rCheck(!state.equipmentPreviews.has('freshman-equipment'),'Changed donor settings invalidate preview');
  let o=equipmentOptions('freshman-equipment');rCheck(o.donorMode==='selected'&&o.donorRows.length===3&&o.crossPositionPercent===15&&o.multipleDonorPercent===35&&JSON.stringify(o.donorSources.WR)===JSON.stringify(allowed),'Donor selection and mixing saved');
  const settings=JSON.stringify(o);d=rDonors();d.querySelector('[data-config-reset]').click();d.dispatchEvent(new Event('cancel',{cancelable:true}));rCheck(JSON.stringify(equipmentOptions('freshman-equipment'))===settings,'Cancel/Escape discard donor reset');
  document.getElementById('equipment-step-back').click();
  for(const id of ['equipment-unlocked','equipment-raw-accessories','equipment-truck','equipment-no-drip'])document.getElementById(id).click();
  const info=document.getElementById('equipment-raw-accessories').parentElement.querySelector('.model-help-button');info.click();rCheck(document.getElementById('equipment-raw-accessories').checked,'Info does not change selection');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  document.getElementById('equipment-step-next').click();rCheck([...content.querySelectorAll('.ui-setting-card')].filter(rVisible).length===5,'Only selected extras join donor configuration');
  d=rOpen('[data-mod-pool-open="raw"]');rChange(d.querySelector('[data-pool-category]'),'armSleeves');
  rCheck(d.querySelector('[data-pool-chance]').value==='0'&&!d.querySelector('[data-pool-item]:checked'),'RAW Jamo stays disabled by default');d.querySelector('[data-config-cancel]').click();
  d=rOpen('[data-mod-pool-open="unlocked"]');rChange(d.querySelector('[data-pool-category]'),'elbowGear');
  const biceps=[...d.querySelectorAll('[data-pool-item]')].filter(input=>/^GearBicepBand_/.test(input.dataset.poolItem));rCheck(biceps.length===4&&biceps.every(input=>!input.checked),'All four biceps bands start unchecked');
  biceps[0].click();rCheck(biceps[0].checked,'Biceps bands remain manually selectable');d.querySelector('[data-pool-defaults]').click();rCheck([...d.querySelectorAll('[data-pool-item]')].filter(input=>/^GearBicepBand_/.test(input.dataset.poolItem)).every(input=>!input.checked),'Default Category turns biceps bands back off');d.querySelector('[data-config-cancel]').click();
  for(const [index,origin] of ['unlocked','raw','eljax'].entries()){
   state.equipmentPreviews.set('freshman-equipment',{planId:'existing-plan'});
   const initial=document.getElementById('equipment-mod-pools').value;
   d=rOpen('[data-mod-pool-open="'+origin+'"]');rSave(d);rCheck(document.getElementById('equipment-mod-pools').value===initial&&state.equipmentPreviews.has('freshman-equipment'),'Unchanged pool Save keeps settings/preview '+origin);
   d=rOpen('[data-mod-pool-open="'+origin+'"]');const select=d.querySelector('[data-pool-category]'),category=select.value,alternate=[...select.options].find(n=>n.value!==category).value;
   rChange(d.querySelector('[data-pool-chance]'),'37.5');rChange(select,alternate);rCheck(d.querySelector('[data-config-save]').disabled,'Hidden invalid category blocks Save '+origin);d.querySelector('[data-config-cancel]').click();rCheck(document.getElementById('equipment-mod-pools').value===initial,'Cancel retains pool '+origin);
   d=rOpen('[data-mod-pool-open="'+origin+'"]');rChange(d.querySelector('[data-pool-chance]'),String(37+index));d.querySelector('[data-pool-clear]').click();d.querySelector('[data-pool-item]').click();
   const item=d.querySelector('[data-pool-item]:checked').dataset.poolItem;rChange(d.querySelector('[data-pool-search]'),'zz-no-such-item');rCheck(!d.querySelector('[data-pool-item]'),'Search filters items');rChange(d.querySelector('[data-pool-search]'),'');rCheck(d.querySelector('[data-pool-item]:checked').dataset.poolItem===item,'Search preserves choices');
   rChange(d.querySelector('[data-pool-category]'),alternate);rChange(d.querySelector('[data-pool-category]'),category);rCheck(d.querySelector('[data-pool-chance]').value===String(37+index),'Category retains chance');rSave(d);
   rCheck(!state.equipmentPreviews.has('freshman-equipment'),'Pool change invalidates preview '+origin);rCheck(modPoolOptions()[origin][category].chance===37+index&&modPoolOptions()[origin][category].items.length===1,'Pool saves exact selection '+origin);
  }
  d=rOpen('[data-randomizer-setting="equipment-no-drip"] [data-config-open]');rChange(configurationRead(d,'equipment-no-drip-skill'),'12');rSave(d);
  document.getElementById('equipment-step-back').click();document.getElementById('equipment-no-drip').click();document.getElementById('equipment-no-drip').click();document.getElementById('equipment-step-next').click();rCheck(equipmentOptions('freshman-equipment').noDripPercentages.skill===12,'Disabled extras keep settings');
  window.rSaved=JSON.stringify(equipmentOptions('freshman-equipment'));navigate('home');navigate('freshman-equipment');await rWait(()=>content.querySelector('[data-randomizer-flow]')?.randomizerCards?.length===4);
  rCheck(JSON.stringify(equipmentOptions('freshman-equipment'))===rSaved,'All settings survive navigation');
  const presets=content.querySelector('.config-presets');presets.open=true;window.rStage='save preset';rChange(document.getElementById('preset-name'),'Randomizer UI Check');document.getElementById('preset-save').click();await rWait(()=>state.bootstrap.settings.toolPresets.some(n=>n.name==='Randomizer UI Check'));
  window.rPreset=state.bootstrap.settings.toolPresets.find(n=>n.name==='Randomizer UI Check');await rReset();
  window.rStage='load preset';content.querySelector('.config-presets').open=true;rChange(document.getElementById('preset-choice'),rPreset.id);document.getElementById('preset-load').click();await rWait(()=>document.querySelector('dialog.confirmation-editor[open]'));document.querySelector('dialog[open] [data-config-save]').click();await rWait(()=>equipmentOptions('freshman-equipment').noDripPercentages.skill===12);
  rCheck(JSON.stringify(equipmentOptions('freshman-equipment'))===rSaved,'Saved preset restores donors, mixing, pools and style');content.querySelector('.config-presets').open=false;
 })()`);
 console.log('PASS Donors, mixed chance budget, source groups, all mod pools, RAW Jamo defaults, isolated drafts, navigation and preset load.');
 for(const width of [2296,1480,1100,760,520])for(const theme of ['light','dark']){
  window.setContentSize(width,width>1480?1090:width===1480?1000:850);
  await execute(`document.documentElement.dataset.theme=${JSON.stringify(theme)};applyAccentColor({...state.bootstrap.settings,accentColor:null});setRandomizerStep(0);void 0`);
  await execute('new Promise(r=>setTimeout(r,100))');
  const audit=()=>execute(`(()=>{const main=document.querySelector('main'),pages=content.querySelector('.ui-flow-pages'),actions=content.querySelector('.ui-flow-actions');rCheck(main.scrollWidth<=main.clientWidth+2,'Workspace fits '+innerWidth);rCheck(pages.getBoundingClientRect().bottom<=actions.getBoundingClientRect().top&&pages.clientHeight>100,'Actions reserve space');for(const n of [...content.querySelectorAll('.ui-option-row,.ui-setting-card,.ui-flow-actions')].filter(rVisible)){const b=n.getBoundingClientRect();rCheck(b.left>=0&&b.right<=innerWidth+1&&n.scrollWidth<=n.clientWidth+2,'Layout bounds '+innerWidth+' '+n.className);}})()`);
  await audit();if(width===1480||width===760)fs.writeFileSync(path.join(out,`choose-${width}-${theme}.png`),(await window.webContents.capturePage()).toPNG());
  await execute('setRandomizerStep(1);void 0');await audit();
  if(width>760)await execute(`(()=>{for(const c of [...content.querySelectorAll('.ui-setting-card')].filter(rVisible)){const button=c.querySelector('[data-config-open],[data-mod-pool-open]'),a=c.getBoundingClientRect(),b=button.getBoundingClientRect();rCheck(Math.abs(a.right-b.right-17)<2&&Math.abs(a.bottom-b.bottom-17)<2,'Consistent Configure position');}})()`);
  if(width===1480||width===760)fs.writeFileSync(path.join(out,`configure-${width}-${theme}.png`),(await window.webContents.capturePage()).toPNG());
  await execute(`(async()=>{for(const selector of ['.randomizer-donor-card [data-config-open]','[data-mod-pool-open="raw"]']){const d=rOpen(selector);for(const tab of d.querySelectorAll('[role=tab]'))tab.click();const b=d.getBoundingClientRect(),body=d.querySelector('.configuration-body');rCheck(b.left>=0&&b.right<=innerWidth+1&&b.top>=0&&b.bottom<=innerHeight+1&&body.scrollWidth<=body.clientWidth+2,'Modal fits '+innerWidth);d.querySelector('[data-config-cancel]').click();}})()`);
 }
 window.setContentSize(1480,1000);window.webContents.setZoomFactor(1.5);
 await execute(`document.documentElement.dataset.textSize='extra';setRandomizerStep(0);void 0`);await execute('new Promise(r=>setTimeout(r,120))');
 await auditZoom();
 async function auditZoom(){await execute(`rCheck(document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth+2,'150% zoom/large text fits');void 0`);}
 window.webContents.setZoomFactor(1);
 await execute(`(async()=>{
  document.documentElement.dataset.textSize='standard';setRandomizerStep(1);document.getElementById('equipment-preview').click();
  const progress=document.getElementById('equipment-wizard-status').getBoundingClientRect(),actions=content.querySelector('.ui-flow-actions').getBoundingClientRect();rCheck(progress.height>0&&progress.bottom<=actions.top,'Progress visible above actions');
  await rWait(()=>state.equipmentPreviews.has('freshman-equipment'));rCheck(rVisible(document.getElementById('equipment-preview-workspace')),'Existing preview opens');
  document.getElementById('equipment-edit-settings').click();rCheck(rVisible(content.querySelector('[data-ui-page="1"]')),'Edit returns to Configure');
  let d=rDonors();rChange(configurationRead(d,'equipment-cross-percent'),'16');rSave(d);rCheck(!state.equipmentPreviews.has('freshman-equipment')&&document.getElementById('equipment-apply').disabled,'Changes block stale Apply');
  document.getElementById('equipment-preview').click();await rWait(()=>state.equipmentPreviews.has('freshman-equipment'));document.getElementById('equipment-apply').click();await rWait(()=>!state.equipmentPreviews.has('freshman-equipment'));
 })()`);
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({controls:current.controls.length,optionalFeatures:4,widths:[2296,1480,1100,760,520],themes:['light','dark'],zoom:1.5,passed:true},null,2)+'\n');
 console.log('PASS Randomizer Choose/Configure, consistent actions, both themes, large text, five widths, preserved Preview/Apply and stale-result guards.');
};
