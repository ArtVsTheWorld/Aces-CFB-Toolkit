const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 const execute=source=>window.webContents.executeJavaScript(source);
 await execute(`(async()=>{
  window.passCheck=(ok,message)=>{if(!ok){console.error(message);throw Error(message)}};
  window.passWait=async predicate=>{for(let i=0;i<1000;i++){if(predicate())return;await new Promise(r=>setTimeout(r,20))}throw Error('Patcher pages timed out: '+content.textContent.slice(-500))};
  window.passChange=(node,value)=>{passCheck(node,'Control exists');node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}))};
  window.passOpen=title=>{const entry=[...content.querySelectorAll('.configuration-entry')].find(e=>e.querySelector('strong').textContent===title);passCheck(entry&&!entry.hidden,'Visible entry '+title);entry.querySelector('button').click();const d=document.querySelector('dialog[open]');passCheck(d,'Opened '+title);return d};
  window.passTab=(d,title)=>{const button=[...d.querySelectorAll('[role="tab"]')].find(n=>n.textContent===title);passCheck(button,'Tab '+title);button.click();passCheck(button.getAttribute('aria-selected')==='true','Tab selected '+title)};
  window.passSave=d=>{const button=d.querySelector('[data-config-save]');passCheck(!button.disabled,'Valid draft '+d.querySelector('[data-config-error]').textContent);button.click();passCheck(!document.querySelector('dialog[open]'),'Save closes')};
  navigate('equipment-patcher');await passWait(()=>document.getElementById('fix-unlocked-mouthpieces'));
  for(const id of ['fix-visors','fix-rolled','fix-unlocked-mouthpieces','fix-unlocked-lower-jersey','fix-unlocked-cutoff-pants','fix-unlocked-tattoos','fix-unlocked-recolor'])if(!document.getElementById(id).checked)document.getElementById(id).click();
  let d=passOpen('Visor Frequency'),read=id=>configurationRead(d,id);
  passCheck(d.querySelector('[role="tab"]').textContent==='All Positions','Visors start globally');
  passChange(d.querySelector('[data-global-key="visor"]'),'25');
  passCheck(equipmentPassGroups.every(g=>read('visor-frequency-'+g.replace('/','-')).value==='25'),'Global visor updates every group');
  passTab(d,'By Position');passChange(read('visor-frequency-QB'),'15');passTab(d,'All Positions');
  passCheck(d.querySelector('[data-global-key="visor"]').value===''&&!d.querySelector('[data-config-save]').disabled,'Mixed visor values remain valid');passSave(d);
  passCheck(equipmentOptions('equipment-patcher').visorFrequencies.QB===15,'Saved visor override');
  d=passOpen('Mouthpiece Settings');passChange(read('mouthpiece-style-mode'),'custom');
  passCheck(read('mouthpiece-style-mode').selectedOptions[0].textContent==='Custom Style Mix','Custom style label stays attached to its value after dropdown sorting');
  for(const [key,value]of Object.entries({cap:35,standard:0,pacifier:0,hanging:100}))passChange(d.querySelector('[data-global-key="'+key+'"]'),String(value));
  d.querySelector('[data-global-key="enabled"]').click();
  passCheck(equipmentPassGroups.every(g=>read('mouthpiece-'+g.replace('/','-')+'-chance').value==='35'&&read('mouthpiece-'+g.replace('/','-')+'-cap').value==='35'&&read('mouthpiece-hanging-'+g.replace('/','-'))===null),'Mouthpiece global canonical limits');
  passTab(d,'Colors & Existing Gear');passChange(read('mouthpiece-branded-frequency'),'50');
  read('randomize-existing-mouthpieces').click();passSave(d);
  let options=equipmentOptions('equipment-patcher');passCheck(options.mouthpieceLimits.WR.applicationChance===35&&options.mouthpieceLimits['K/P'].populationCap===35&&options.rerollExistingMouthpieces,'Mouthpiece globals save');
  d=passOpen('Mouthpiece Settings');passChange(d.querySelector('[data-global-key="standard"]'),'20');passTab(d,'Colors & Existing Gear');passCheck(d.querySelector('[data-config-save]').disabled,'Invalid hidden style totals block Save');passTab(d,'Application & Styles');d.querySelector('.global-style-total button').click();passCheck(!d.querySelector('[data-config-save]').disabled&&d.querySelector('.global-style-total strong').textContent==='Style Total: 100%','Global Normalize repairs all style totals');d.querySelector('[data-config-cancel]').click();
  for(const [title,kind]of [['Lower Rolled Jersey Frequency','lower'],['Cutoff Pants Settings','cutoff']]){
   d=passOpen(title);passChange(d.querySelector('[data-global-key="cap"]'),'50');passTab(d,'By Position');passChange(read(kind+'-uniform-cap-QB'),'80');passTab(d,'All Positions');passCheck(d.querySelector('[data-global-key="cap"]').value==='','Mixed uniform caps indicated');passTab(d,'Fit & Rules');
   if(kind==='cutoff')read('cutoff-replace-standard').click();passSave(d);
   d=passOpen(title);d.querySelector('[data-config-reset]').click();d.querySelector('[data-config-cancel]').click();passCheck(document.getElementById(kind+'-uniform-cap-QB').value==='80','Cancel discards reset');
  }
  d=passOpen('Tattoo Settings');passCheck(read('unlocked-tattoo-cap').getBoundingClientRect().width>0,'Tattoo cap visible');passTab(d,'Tattoo Designs');passCheck(read('unlocked-tattoo-pool').closest('.team-picker').getBoundingClientRect().width>0,'Tattoo pool visible on its page');d.querySelector('[data-config-cancel]').click();
  d=passOpen('Colors & Tape');passTab(d,'Tape Colors');passCheck(read('tape-color-mode').getBoundingClientRect().width>0,'Tape control on tape page');passTab(d,'Accessory Colors');passCheck(read('unlocked-color-theme').getBoundingClientRect().width>0,'Accessory control on accessory page');d.querySelector('[data-config-cancel]').click();
  d=passOpen('Undershirt Settings');passChange(read('undershirt-color'),'custom');passTab(d,'Muscular / Standard');passCheck(read('undershirt-large-white').getBoundingClientRect().width>0,'Build mix visible');d.querySelector('[data-config-cancel]').click();
  document.getElementById('fix-helmet').click();document.getElementById('configure-helmet-mix').click();d=document.querySelector('dialog[open]');
  passTab(d,'Helmet Mix');passChange(d.querySelector('[data-helmet-mode]'),'custom');passChange(d.querySelector('[data-helmet-position]'),'QB');d.querySelector('[data-helmet-inherit]').click();
  passCheck([...d.querySelector('[data-helmet-position]').options].find(o=>o.value==='QB').textContent.includes('Override'),'Helmet override visible');d.querySelector('[data-helmet-global-all]').click();passCheck([...d.querySelector('[data-helmet-position]').options].filter(o=>o.value!=='all').every(o=>o.textContent.includes('Inherited')),'Global helmet action clears overrides');
  passTab(d,'Facemask Pools');passChange(d.querySelector('[data-mask-position]'),'QB');d.querySelector('[data-mask-inherit]').click();d.querySelector('[data-mask-global-all]').click();passCheck([...d.querySelector('[data-mask-position]').options].filter(o=>o.value!=='all').every(o=>o.textContent.includes('Inherited')),'Global facemask action clears helmet-specific overrides');d.querySelector('[data-config-cancel]').click();
  const sample=window.passSourceSample={player:'Source Example',team:'LSU',position:'WR',row:1,currentValue:'Multiple donors',proposedValue:'Equipment',donorUses:[{group:'helmet',donor:{row:2,team:'LSU',position:'WR',firstName:'One',lastName:'Donor'}},{group:'upper',donor:{row:2,team:'LSU',position:'WR',firstName:'One',lastName:'Donor'}},{group:'lower',donor:{row:3,team:'Alabama',position:'WR',firstName:'Second',lastName:'Donor'}}],changes:[],modPoolAdditions:{unlocked:[{displayName:'Irish Jamo Sleeves White'}]},fallbackNotes:[],brandCorrections:[],noDrip:true};
  for(const kind of ['freshman-equipment','equipment-quickstart','equipment-patcher']){const result={resultKind:kind,status:'preview',summary:[],details:{changes:[sample],totalPreviewRows:1}};const node=document.createElement('div');node.innerHTML=equipmentResults(result);bindEquipmentResultView(node,result);const row=node.querySelector('.equipment-preview-row');passCheck(!row.open&&!row.querySelector('.equipment-source'),'Player starts collapsed and lazy '+kind);passCheck(node.querySelectorAll('.equipment-preview-logo').length===1,'Player team logo '+kind);row.open=true;row.dispatchEvent(new Event('toggle'));if(kind!=='equipment-patcher'){passCheck(row.querySelectorAll('.equipment-source').length===3,'Grouped sources inside dropdown '+kind);passCheck(row.textContent.includes('Helmet & face')&&row.textContent.includes('Upper body'),'Source category labels '+kind)}}
 })()`);
 await require('./v230-tooltip-interaction.cjs')(window);
 for(const width of [1480,760,520])for(const theme of ['light','dark']){
  window.setContentSize(width,width===1480?1000:780);
  await execute(`(()=>{document.documentElement.dataset.theme=${JSON.stringify(theme)};const d=passOpen('Mouthpiece Settings');passChange(configurationRead(d,'mouthpiece-style-mode'),'custom');d.querySelector('[data-equipment-scope="positions"]').click();const body=d.querySelector('.configuration-body');passCheck(body.scrollWidth<=body.clientWidth+2,'Per-position custom mouthpiece fits '+innerWidth);passChange(configurationRead(d,'mouthpiece-receiver'),'WR');passCheck(d.querySelector('.mouthpiece-position-view details summary').textContent.includes('WR'),'Selected position is copy source');d.querySelector('[data-config-cancel]').click();})()`);
  await execute(`(async()=>{document.documentElement.dataset.theme=${JSON.stringify(theme)};for(const title of ['Visor Frequency','Mouthpiece Settings','Lower Rolled Jersey Frequency','Cutoff Pants Settings','Tattoo Settings','Colors & Tape','Undershirt Settings']){const d=passOpen(title);for(const tab of d.querySelectorAll('[role="tab"]')){tab.click();await new Promise(r=>setTimeout(r,20));const body=d.querySelector('.configuration-body'),rect=d.getBoundingClientRect();passCheck(rect.left>=0&&rect.right<=innerWidth+1&&body.scrollWidth<=body.clientWidth+2,title+' fits '+innerWidth+' '+tab.textContent);for(const icon of d.querySelectorAll('.model-help-button'))if(icon.getBoundingClientRect().width)passCheck(icon.closest('.field-caption,strong,h2,h3,label'),'Anchored info in '+title)}d.querySelector('[data-config-cancel]').click()}})()`);
  if(width===1480){
   await execute(`(async()=>{passOpen('Mouthpiece Settings');await new Promise(r=>setTimeout(r,160))})()`);
   fs.writeFileSync(path.join(root,'outputs/equipment-pages-'+theme+'.png'),(await window.webContents.capturePage()).toPNG());
   await execute(`closeConfigurationDialogs();void 0`);
  }
 }
 window.setContentSize(1480,1000);
 await execute(`(async()=>{closeConfigurationDialogs();const result={resultKind:'equipment-quickstart',details:{changes:[passSourceSample],totalPreviewRows:1}};content.innerHTML='<h1>Equipment Quickstart — Preview</h1>'+equipmentResults(result);bindEquipmentResultView(content,result);state.equipmentView='cards';content.querySelector('.equipment-card-list').hidden=false;content.querySelector('.equipment-table-view').hidden=true;await new Promise(r=>setTimeout(r,160))})()`);
 fs.writeFileSync(path.join(root,'outputs/equipment-sources-ui.png'),(await window.webContents.capturePage()).toPNG());
 console.log('PASS Patcher pages, global edits, overrides, hidden validation, Save/Cancel/Reset, grouped sources, and responsive light/dark layouts.');
};
