// Actual renderer coverage; isolated userData and read-only save fixtures.
const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 const execute=source=>window.webContents.executeJavaScript(source);
 window.setContentSize(1480,1000);
 await execute(`(async()=>{
  window.scopeFixCheck=(value,message)=>{if(!value)throw Error(message)};
  window.scopeFixWait=async predicate=>{for(let i=0;i<1000;i++){if(predicate()){await new Promise(r=>setTimeout(r,40));return}await new Promise(r=>setTimeout(r,40))}throw Error('Scope/Force Win UI timed out: '+state.page)};
  window.scopeFixChange=(control,value)=>{control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}))};
  closeConfigurationDialogs();navigate('nil-toggle');await scopeFixWait(()=>document.getElementById('nil-redshirts'));
  for(const [value,label]of [['all','All Players'],['true','True'],['redshirt','Redshirt']]){
   const entry=[...content.querySelectorAll('.configuration-entry')].find(e=>e.querySelector('strong')?.textContent==='Player Scope');entry.querySelector('button').click();
   const d=document.querySelector('dialog[open]');[...d.querySelectorAll('[role=tab]')].find(t=>t.textContent==='Class & Redshirt').click();scopeFixChange(configurationRead(d,'nil-redshirts'),value);d.querySelector('[data-config-save]').click();
   scopeFixCheck(entry.querySelector('[data-config-summary]').textContent.includes('Redshirt Scope: '+label),'Player Scope names '+label);
   scopeFixCheck(!/\\b1 redshirts\\b/i.test(entry.textContent),'Player Scope never counts the single-select');
   scopeFixCheck(selectSummary('nil-redshirts')==='Redshirt Scope: '+label,'Shared scope summary agrees');
  }
  navigate('automatic-force-win');await scopeFixWait(()=>document.getElementById('force-user-only'));
  scopeFixChange(document.getElementById('force-action'),'evaluate');showForceWinStage('config');
  scopeFixChange(document.getElementById('force-profile'),'custom');
  window.auditForceCheckboxes=()=>{
   condenseOptionHelp();
   for(const id of ['force-user-only','force-fcs']){
    const input=document.getElementById(id),label=input.closest('label'),caption=label.querySelector('.field-caption'),icon=label.querySelector('.model-help-button');
    scopeFixCheck(caption&&icon,'Checkbox retains its caption and help '+id);
    const a=input.getBoundingClientRect(),b=caption.getBoundingClientRect(),c=icon.getBoundingClientRect();
    scopeFixCheck(a.width===16&&a.height===16,'Checkbox uses consistent dimensions '+id+' '+JSON.stringify({width:a.width,height:a.height}));
    scopeFixCheck(Math.abs(a.top+a.height/2-b.top-b.height/2)<2,'Checkbox centered on caption '+id);
    scopeFixCheck(Math.abs(c.top+c.height/2-b.top-b.height/2)<2,'Info centered on caption '+id);
    scopeFixCheck(Math.abs(a.right+9-b.left)<2,'Checkbox/caption gap '+id);
    const before=input.checked;icon.click();scopeFixCheck(input.checked===before,'Help never toggles '+id);icon.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   }
  };
  window.auditModelPresetAlignment=()=>{
   condenseOptionHelp();
   const d=document.querySelector('dialog[open]'),select=d.querySelector('[data-model-preset]'),button=d.querySelector('[data-load-model-preset]'),label=select.closest('label');
   scopeFixCheck(d.querySelector('#model-week-limit').previousElementSibling.querySelectorAll('.model-help-button').length===1,'Weekly limit has one help icon, not a duplicate');
   const a=select.getBoundingClientRect(),b=button.getBoundingClientRect(),c=label.getBoundingClientRect();
   if(innerWidth>520){scopeFixCheck(Math.abs(a.bottom-b.bottom)<2,'Starting Preset and Load button bottom-align');scopeFixCheck(Math.abs(a.top-b.top)<2,'Starting Preset and Load button top-align');scopeFixCheck(b.left>=c.right+8,'Preset action has space beside the field')}
   else scopeFixCheck(b.top>=a.bottom+8,'Narrow preset action stacks below the dropdown');
   const body=d.querySelector('.configuration-body');scopeFixCheck(body.scrollWidth<=body.clientWidth+2,'Preset toolbar does not overflow');
  };
 })()`);
 for(const theme of ['light','dark'])for(const width of [1480,760,520]){
  window.setContentSize(width,width===1480?1000:780);
  await execute(`closeConfigurationDialogs();document.documentElement.dataset.theme=${JSON.stringify(theme)};showForceWinStage('config');new Promise(r=>setTimeout(r,70));`);
  await execute(`auditForceCheckboxes();document.getElementById('force-user-only').scrollIntoView({block:'center'});void 0;`);
  if(width===1480)fs.writeFileSync(path.join(root,`outputs/v225-force-checkboxes-${theme}.png`),(await window.webContents.capturePage()).toPNG());
  await execute(`document.getElementById('configure-custom-model').click();new Promise(r=>setTimeout(r,70));`);
  await execute(`auditModelPresetAlignment();void 0;`);
  fs.writeFileSync(path.join(root,`outputs/v225-force-preset-${theme}-${width}.png`),(await window.webContents.capturePage()).toPNG());
  await execute(`(()=>{
   const d=document.querySelector('dialog[open]'),select=d.querySelector('[data-model-preset]'),profile=[...select.options].find(o=>o.value!=='balanced').value;
   scopeFixChange(select,profile);d.querySelector('[data-load-model-preset]').click();scopeFixCheck(d.querySelector('[data-model-preset]').value===profile,'Load Starting Preset still loads the chosen draft');
   scopeFixCheck(!d.querySelector('[data-config-save]').disabled,'Loaded preset validates');auditModelPresetAlignment();d.querySelector('[data-config-cancel]').click();
  })()`);
 }
 console.log('PASS scope/Force Win: actual All/True/Redshirt summaries, centered checkbox/caption/help rows, aligned Starting Preset controls, working preset load/Cancel, light/dark 1480/760/520.');
};
