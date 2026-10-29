const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 await window.webContents.executeJavaScript(`(async()=>{
  const check=(ok,message)=>{if(!ok)throw Error(message)},wait=async f=>{for(let i=0;i<1000;i++){if(f())return;await new Promise(r=>setTimeout(r,25));}throw Error('Cutoff leg-layer UI timeout');};
  await wait(()=>state.bootstrap);navigate('equipment-patcher');await wait(()=>content.querySelector('[data-patcher-flow]')?.patcherCards&&document.getElementById('preset-name'));
  const canonical=()=>document.getElementById('cutoff-allow-leg-layers');
  const open=()=>{if(!document.getElementById('fix-unlocked-cutoff-pants').checked)document.getElementById('fix-unlocked-cutoff-pants').click();document.getElementById('equipment-step-next').click();content.querySelector('[data-patcher-setting="fix-unlocked-cutoff-pants"] [data-config-open]').click();const d=document.querySelector('dialog[open]');[...d.querySelectorAll('[role=tab]')].find(n=>n.textContent.includes('Fit & Rules')).click();return d;};
  check(!canonical().checked&&!equipmentOptions('equipment-patcher').allowCutoffLegLayers,'Default override off');
  let d=open();check(d.querySelector('[data-cutoff-leg-warning]').hidden,'Warning hidden by default');configurationRead(d,'cutoff-allow-leg-layers').click();check(!d.querySelector('[data-cutoff-leg-warning]').hidden,'Warning shown when enabled');d.querySelector('[data-config-cancel]').click();check(!canonical().checked,'Cancel discards enabled draft');
  d=open();configurationRead(d,'cutoff-allow-leg-layers').click();d.querySelector('[data-config-save]').click();check(equipmentOptions('equipment-patcher').allowCutoffLegLayers,'Save serializes override');
  const preset=presetConfiguration();check(preset.values['cutoff-allow-leg-layers']===true,'Preset retains true');navigate('home');navigate('equipment-patcher');await wait(()=>canonical());check(canonical().checked,'Navigation retains true');
  d=open();d.querySelector('[data-config-reset]').click();check(!configurationRead(d,'cutoff-allow-leg-layers').checked&&d.querySelector('[data-cutoff-leg-warning]').hidden,'Reset clears draft and warning');d.querySelector('[data-config-cancel]').click();check(canonical().checked,'Cancel Reset retains saved true');
  d=open();d.querySelector('[data-config-reset]').click();d.querySelector('[data-config-save]').click();check(!equipmentOptions('equipment-patcher').allowCutoffLegLayers,'Save Reset restores off');
  const legacy=structuredClone(preset);delete legacy.values['cutoff-allow-leg-layers'];state.toolSettings.set('equipment-patcher',presetValues(legacy));render();await wait(()=>canonical());check(!canonical().checked,'Legacy preset defaults off');window.cutoffLegUiOpen=open;
 })()`);
 const dir=path.join(root,'outputs/v246-cutoff-leg-layers-ui');fs.mkdirSync(dir,{recursive:true});
 for(const [theme,width]of [['dark',1480],['light',520]]){
  window.setSize(width,1000);await window.webContents.executeJavaScript(`(()=>{closeConfigurationDialogs();document.documentElement.dataset.theme='${theme}';applyAccentColor({...state.bootstrap.settings,theme:'${theme}'});const d=cutoffLegUiOpen();configurationRead(d,'cutoff-allow-leg-layers').click();})()`);await new Promise(r=>setTimeout(r,180));
  await window.webContents.executeJavaScript(`(()=>{const d=document.querySelector('dialog[open]'),body=d.querySelector('.configuration-body');if(body.scrollWidth>body.clientWidth+1)throw Error('Cutoff dialog horizontal overflow');const warning=d.querySelector('[data-cutoff-leg-warning]'),probe=document.createElement('span');probe.style.color='var(--danger)';document.body.append(probe);const red=getComputedStyle(probe).color;probe.remove();if(getComputedStyle(warning).color!==red||getComputedStyle(warning).borderLeftColor!==red)throw Error('Clipping warning must use danger red in both themes');configurationRead(d,'cutoff-allow-leg-layers').scrollIntoView({block:'center',behavior:'instant'});})()`);await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,theme+'.png'),(await window.webContents.capturePage()).toPNG());
 }
 await window.webContents.executeJavaScript(`(async()=>{
  closeConfigurationDialogs();navigate('freshman-equipment');for(let i=0;i<1000&&!content.querySelector('[data-randomizer-flow]')?.randomizerCards;i++)await new Promise(r=>setTimeout(r,25));
  const check=(ok,msg)=>{if(!ok)throw Error(msg)},prepared=state.prepared.get('freshman-equipment|'+state.activeSave.path);check(prepared,'Randomizer prepared');openModPoolEditor('unlocked',prepared);
  const d=document.querySelector('dialog.mod-pool-editor[open]'),category=d.querySelector('[data-pool-category]'),select=value=>{category.value=value;category.dispatchEvent(new Event('change',{bubbles:true}));};
  select('spats');check(d.querySelector('[data-pool-chance]').value==='5','Spats chance 5%');check(d.querySelectorAll('[data-pool-item]:checked').length===4,'Four matching spat colors selected');
  select('balaclavas');check(d.querySelector('[data-pool-chance]').value==='5','Balaclavas chance 5%');select('elbowGear');
  const pads=[...d.querySelectorAll('[data-pool-item]')].filter(n=>/^ElbowGear_(elbowBrace|elbowpad)/i.test(n.dataset.poolItem));check(pads.length>=7&&pads.every(n=>!n.checked),'Braces and pads unchecked');check([...d.querySelectorAll('[data-pool-item]:checked')].some(n=>/elbowSweatband/i.test(n.dataset.poolItem)),'Bands remain selected');pads[0].click();d.querySelector('[data-config-save]').click();
  check(modPoolOptions().unlocked.elbowGear.items.includes(pads[0].dataset.poolItem),'Explicit elbow selection retained');closeConfigurationDialogs();
 })()`);await new Promise(r=>setTimeout(r,120));console.log('PASS Cutoff leg-layer default, conditional warning, Save/Cancel/Reset/navigation/presets, responsive light/dark UI and visible Spats/balaclava/elbow pool defaults');
};
