const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 const execute=source=>window.webContents.executeJavaScript(source);
 await execute(`(async()=>{
  window.quickCheck=(ok,message)=>{if(!ok)throw Error(message)};
  window.quickWait=async predicate=>{for(let i=0;i<1000;i++){if(predicate())return;await new Promise(r=>setTimeout(r,20))}throw Error('UI wait timed out: '+content.textContent.slice(-900))};
  window.quickChange=(node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}))};
  navigate('equipment-quickstart');await quickWait(()=>document.getElementById('quickstart-unlocked'));
  quickCheck(content.querySelectorAll('.standard-config-workspace input[type="checkbox"]').length===4,'Three mods and one player-protection choice are exposed');
  quickCheck(!document.getElementById('quickstart-noDrip'),'No Drip is built in, not configurable');
  for(const key of ['unlocked','raw','gameday'])quickCheck(!document.getElementById('quickstart-'+key).checked,'Mod starts off: '+key);
  quickCheck(document.getElementById('quickstart-clear').disabled,'Clear disabled for empty memory');
  quickCheck(document.querySelector('[data-page="equipment-quickstart"] svg'),'Quickstart has its own sidebar icon');
  document.getElementById('preview').click();await quickWait(()=>state.genericPreviews.has('equipment-quickstart'));
  quickCheck(!document.getElementById('apply').disabled,'Preview enables Apply');
  showStandardPreviewStage(false);document.getElementById('quickstart-unlocked').click();
  quickCheck(document.getElementById('apply').disabled&&!state.genericPreviews.has('equipment-quickstart'),'Changing mods invalidates the preview');
  document.getElementById('quickstart-raw').click();document.getElementById('quickstart-gameday').click();
  const preset=presetConfiguration(),restored=presetValues(preset);
  quickCheck(restored['quickstart-unlocked']&&restored['quickstart-raw']&&restored['quickstart-gameday'],'Presets retain all Quickstart settings but not player memory');
  quickCheck(!Object.keys(restored).some(key=>/memory|tracking/.test(key)),'Memory is not part of a preset');
  document.getElementById('preview').click();await quickWait(()=>state.genericPreviews.has('equipment-quickstart'));
  document.getElementById('apply').click();await quickWait(()=>!state.genericPreviews.has('equipment-quickstart')&&!document.getElementById('preview').disabled);
  quickCheck(document.querySelector('[data-quickstart-count="remembered"]').textContent==='1','Successful Apply refreshes memory counts');
  showStandardPreviewStage(false);document.getElementById('quickstart-clear').click();await quickWait(()=>document.querySelector('dialog.confirmation-editor[open]'));
  document.querySelector('dialog.confirmation-editor [data-config-save]').click();await quickWait(()=>document.querySelector('[data-quickstart-count="remembered"]').textContent==='0');
  quickCheck(document.querySelector('[data-quickstart-count="remembered"]').textContent==='0','Clear updates only this save memory');
  navigate('equipment-patcher');await quickWait(()=>document.getElementById('fix-unlocked-mouthpieces'));document.getElementById('fix-unlocked-mouthpieces').click();
  window.quickMouthOpen=()=>{[...content.querySelectorAll('.configuration-entry')].find(entry=>entry.querySelector('strong').textContent==='Mouthpiece Settings').querySelector('button').click();return document.querySelector('dialog[open]')};
  let d=quickMouthOpen(),field=id=>configurationRead(d,id);
  quickCheck(field('mouthpiece-QB-chance').value==='85'&&field('mouthpiece-QB-cap').value==='85','85/85 defaults');
  quickCheck(!d.querySelector('[data-mouthpiece-custom]').hidden&&d.querySelector('[data-mouthpiece-style-controls]').hidden,'Limits are editable without changing legacy styles');
  quickChange(field('mouthpiece-receiver'),'WR');quickChange(field('mouthpiece-WR-cap'),'40');
  quickChange(field('mouthpiece-WR-cap'),'40.5');quickCheck(d.querySelector('[data-config-save]').disabled,'No fractional percentages');
  quickChange(field('mouthpiece-WR-cap'),'');quickCheck(d.querySelector('[data-config-save]').disabled,'No empty percentages');
  quickChange(field('mouthpiece-WR-cap'),'40');
  quickChange(d.querySelector('[data-copy-source]'),'WR');d.querySelector('[data-copy-target="mouthpiece"][value="HB"]').click();d.querySelector('[data-copy-run]').click();
  quickCheck(field('mouthpiece-HB-cap').value==='40'&&field('mouthpiece-HB-chance').value==='40','Copy includes unified frequency');
  quickCheck(field('mouthpiece-style-mode').value==='legacy','Copying limits does not silently change the style algorithm');
  quickCheck(field('mouthpiece-enabled-HB').checked,'Copying legacy limits does not change hidden style settings');
  d.querySelector('[data-config-save]').click();quickCheck(!document.querySelector('dialog[open]'),'Save closes the draft');
  let options=equipmentOptions('equipment-patcher');quickCheck(options.mouthpieceLimits.WR.populationCap===40&&options.mouthpieceLimits.HB.applicationChance===40&&options.mouthpiecePositions===null,'Canonical options include unified frequency');
  const mouthPreset=presetValues(presetConfiguration());quickCheck(JSON.parse(mouthPreset['mouthpiece-limits-json']).WR.populationCap===40,'Preset retains limits');
  const legacy=presetValues({version:1,values:{'mouthpiece-style-mode':'legacy'},teamSelections:{}});quickCheck(legacy['mouthpiece-WR-cap']==='85'&&legacy['mouthpiece-WR-chance']==='85'&&JSON.parse(legacy['mouthpiece-limits-json']).WR.populationCap===85,'Older presets restore 85/85 rather than keeping unrelated custom limits');
  d=quickMouthOpen();d.querySelector('[data-config-reset]').click();quickCheck(field('mouthpiece-WR-cap').value==='85','Reset restores factory defaults');d.querySelector('[data-config-cancel]').click();
  quickCheck(equipmentOptions('equipment-patcher').mouthpieceLimits.WR.populationCap===40,'Cancel discards reset');
 })()`);
 for(const width of [1480,760,520])for(const theme of ['light','dark']){
  window.setContentSize(width,width===1480?1000:780);
  await execute(`(async()=>{closeConfigurationDialogs();document.documentElement.dataset.theme=${JSON.stringify(theme)};navigate('equipment-quickstart');await quickWait(()=>document.getElementById('quickstart-unlocked'));await new Promise(r=>setTimeout(r,80));quickCheck(content.scrollWidth<=content.clientWidth+2,'Quickstart fits width '+innerWidth);navigate('equipment-patcher');await quickWait(()=>document.getElementById('fix-unlocked-mouthpieces'));quickMouthOpen();await new Promise(r=>setTimeout(r,80));const d=document.querySelector('dialog[open]'),body=d.querySelector('.configuration-body'),r=d.getBoundingClientRect();quickCheck(r.left>=0&&r.right<=innerWidth+1&&body.scrollWidth<=body.clientWidth+2,'Mouthpiece modal fits '+innerWidth);for(const icon of d.querySelectorAll('.model-help-button')){if(!icon.getBoundingClientRect().width)continue;quickCheck(icon.closest('.field-caption,strong,h2,h3,label'),'Info is anchored to its label')}document.querySelector('dialog[open]').querySelector('[data-config-cancel]').click()})()`);
  if(width===1480){
   await execute(`(async()=>{navigate('equipment-quickstart');await quickWait(()=>document.getElementById('quickstart-unlocked'));await new Promise(r=>setTimeout(r,100))})()`);
   fs.writeFileSync(path.join(root,'outputs/quickstart-ui-'+theme+'.png'),(await window.webContents.capturePage()).toPNG());
   await execute(`(async()=>{navigate('equipment-patcher');await quickWait(()=>document.getElementById('fix-unlocked-mouthpieces'));quickMouthOpen();await new Promise(r=>setTimeout(r,100))})()`);
   fs.writeFileSync(path.join(root,'outputs/mouthpiece-limits-ui-'+theme+'.png'),(await window.webContents.capturePage()).toPNG());
   await execute(`closeConfigurationDialogs();void 0`);
  }
 }
 console.log('PASS Quickstart navigation, defaults, Preview/Apply wiring, tracking refresh/clear, presets, mouthpiece frequency/copy/validation/Reset/Cancel and light/dark responsive layout.');
};
