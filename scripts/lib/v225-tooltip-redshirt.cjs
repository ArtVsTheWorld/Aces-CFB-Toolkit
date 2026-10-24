// Read-only renderer checks for caption-owned help, spacing and grouped scopes.
const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 const execute=async source=>{try{return await window.webContents.executeJavaScript(source);}catch(error){console.error('Tooltip/redshirt stage:',await window.webContents.executeJavaScript(`({stage:window.tooltipTestStage,page:state.page,dialog:document.querySelector('dialog[open]')?.querySelector('h2')?.textContent})`));throw error;}};
 window.setContentSize(1480,1000);
 await execute(`(async()=>{
  closeConfigurationDialogs();
  const check=polishCheck;
  for(const [tool,ready,editor,id]of [['commentary-id','commentary-classes','Additional Player Filters','commentary-redshirt'],['team-boost','boost-classes','Additional Player Filters','boost-redshirt'],['nil-toggle','nil-target','Player Scope','nil-redshirts']]){
   navigate(tool);await polishWait(()=>document.getElementById(ready));
   for(const mode of ['all','true','redshirt']){
    const d=polishOpen(editor);polishTab('Class & Redshirt');const control=configurationRead(d,id);
    check(!control.multiple&&[...control.options].map(o=>o.textContent).join('|')==='All Players|True|Redshirt',tool+' uses the same redshirt dropdown');
    polishChange(control,mode);d.querySelector('[data-config-save]').click();
    const options=tool==='commentary-id'?commentaryOptionsFromForm().scope:collectOptions(tool),expected={all:[],true:['Eligible','Current'],redshirt:['Previous']}[mode];
    check(JSON.stringify(options.redshirtStatuses)===JSON.stringify(expected),tool+' submits '+mode+' scope correctly');
    check(presetConfiguration().values[id]===mode,tool+' saves a grouped scope in presets');
   }
   const d=polishOpen(editor);polishTab('Class & Redshirt');polishChange(configurationRead(d,id),'all');d.querySelector('[data-config-cancel]').click();check(document.getElementById(id).value==='redshirt','Scope Cancel preserves saved choice');
  }
  window.tooltipTestStage='NIL centering';const nil=document.querySelector('.nil-toggle-workspace').getBoundingClientRect(),main=content.getBoundingClientRect();check(Math.abs(nil.left+nil.width/2-main.left-main.width/2)<2&&nil.width<=920,'NIL Toggle centered at the same tool-column width');
  navigate('dealbreaker-fixer');await polishWait(()=>document.getElementById('db-restrict-style'));polishChange(document.getElementById('db-restrict-style'),false);
  const field=document.getElementById('db-fix-style-field');check(!field.hidden&&document.getElementById('db-fix-style').disabled&&Number(getComputedStyle(field).opacity)<=.55,'Dependent cleanup is visible and greyed out');
  polishChange(document.getElementById('db-restrict-style'),true);check(!document.getElementById('db-fix-style').disabled,'Position limit enables cleanup');polishChange(document.getElementById('db-fix-style'),true);polishChange(document.getElementById('db-restrict-style'),false);check(!dealbreakerOptions().fixInvalidPlayingStyle,'Disabled cleanup never reaches backend options');
  navigate('equipment-patcher');await polishWait(()=>document.getElementById('fix-unlocked-cutoff-pants'));for(const id of ['fix-unlocked-cutoff-pants','fix-unlocked-mouthpieces','fix-unlocked-tattoos'])if(!document.getElementById(id).checked)document.getElementById(id).click();
  window.auditOptionCaptions=()=>{
   const d=polishDialog();condenseOptionHelp();
   for(const icon of d.querySelectorAll('.option-info')){
    if(icon.closest('[hidden]'))continue;const r=icon.getBoundingClientRect();if(!r.width||!r.height)continue;
    const caption=icon.closest('.field-caption,strong,h2,h3,h4,label,.model-slider-caption');check(caption,'Help icon must belong to a caption: '+icon.dataset.modelHelp);
    const c=caption.getBoundingClientRect();check(Math.abs(r.top+r.height/2-c.top-c.height/2)<=4,'Help is aligned with its caption: '+icon.getAttribute('aria-label'));
    check(!caption.matches('label')||!caption.querySelector('select,input,textarea'),'Wrapping-field help must be beside its title, not after its control');
   }
  };
  window.checkAnchoredHelp=(text,controlId)=>{
   const d=polishDialog(),icon=[...d.querySelectorAll('[data-model-help]')].find(button=>button.dataset.modelHelp.includes(text));check(icon,'Missing help '+text);
   const control=configurationRead(d,controlId),caption=control.closest('label')??[...d.querySelectorAll('label[for]')].find(label=>label.htmlFor===control.id);check(caption?.contains(icon),'Help belongs to '+controlId);
   const before=control.type==='checkbox'?control.checked:control.value;icon.click();check((control.type==='checkbox'?control.checked:control.value)===before,'Help never toggles its setting');
   check([...d.querySelectorAll('.model-help-tooltip')].some(t=>!t.hidden&&t.textContent.includes(text)),'Tooltip opens');icon.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));check(d.open,'Escape closes help, not the settings window');
  };
  window.polishSettingsPage=(d,title)=>{const tab=[...d.querySelectorAll('[role="tab"]')].find(button=>button.textContent===title);check(tab,'Settings page '+title);tab.click();};
  window.tooltipTestStage='Cutoff Pants';let d=polishOpen('Cutoff Pants Settings');polishSettingsPage(d,'Fit & Rules');condenseOptionHelp();checkAnchoredHelp('When Above-Knee Pants','cutoff-replace-standard');check(configurationRead(d,'cutoff-replace-standard').closest('label').getBoundingClientRect().height<58,'Cutoff toggle fits its content');auditOptionCaptions();d.closeEditor();
  window.tooltipTestStage='Mouthpieces';d=polishOpen('Mouthpiece Settings');condenseOptionHelp();checkAnchoredHelp('Current Defaults keeps','mouthpiece-style-mode');auditOptionCaptions();polishSettingsPage(d,'Colors & Existing Gear');check(configurationRead(d,'randomize-existing-mouthpieces').closest('label').getBoundingClientRect().height<58,'Reroll toggle fits its content');auditOptionCaptions();
  const loose=document.createElement('div');loose.innerHTML='<p class="muted">An explanation without any associated setting must stay readable.</p>';d.querySelector('.configuration-body').append(loose);condenseOptionHelp();check(!loose.querySelector('p').hidden&&!loose.querySelector('button'),'Unanchored explanation stays inline, never becomes a floating icon');d.closeEditor();
  window.tooltipTestStage='Tattoos';d=polishOpen('Tattoo Settings');condenseOptionHelp();const cap=configurationRead(d,'unlocked-tattoo-cap'),pool=configurationRead(d,'unlocked-tattoo-pool').closest('.team-picker');check(cap.getBoundingClientRect().height>0&&pool.getBoundingClientRect().height===0,'Frequency page keeps the design list separate');auditOptionCaptions();polishSettingsPage(d,'Tattoo Designs');check(pool.getBoundingClientRect().height>0&&cap.getBoundingClientRect().height===0,'Tattoo Designs has its own page');auditOptionCaptions();d.closeEditor();
 })()`);
 for(const theme of ['light','dark'])for(const width of [1480,760,520]){
  window.setContentSize(width,width===1480?1050:780);
  await execute(`closeConfigurationDialogs();document.documentElement.dataset.theme=${JSON.stringify(theme)};void 0;`);
  for(const [title,slug]of [['Cutoff Pants Settings','cutoff'],['Mouthpiece Settings','mouthpieces'],['Tattoo Settings','tattoos']]){
   await execute(`polishOpen(${JSON.stringify(title)});new Promise(r=>setTimeout(r,80));`);
   const layout=await execute(`(()=>{auditOptionCaptions();const d=polishDialog(),r=d.getBoundingClientRect(),b=d.querySelector('.configuration-body'),body=b.getBoundingClientRect(),footer=d.querySelector('.configuration-footer').getBoundingClientRect();return{left:r.left,right:r.right,width:innerWidth,bottom:r.bottom,height:innerHeight,scroll:b.scrollWidth,client:b.clientWidth,bodyBottom:body.bottom,footerTop:footer.top}})()`);
   if(layout.left<0||layout.right>layout.width+1||layout.bottom>layout.height+1||layout.scroll>layout.client+2||layout.bodyBottom>layout.footerTop+1)throw Error('Settings overlap/overflow '+title+' '+theme+' '+width+' '+JSON.stringify(layout));
   if(width===1480||width===520)fs.writeFileSync(path.join(root,`outputs/v225-tooltip-${slug}-${theme}-${width}.png`),(await window.webContents.capturePage()).toPNG());
   await execute(`polishDialog().closeEditor();void 0;`);
  }
 }
 console.log('PASS redshirt/help: consistent grouped filtering, correct scope submission/presets/Cancel, centered NIL column, disabled dependent cleanup, caption-owned hover/click/Escape tooltips, compact toggles, tattoo spacing, and light/dark 1480/760/520 modal geometry.');
};
