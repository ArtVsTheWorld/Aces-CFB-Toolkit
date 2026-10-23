// Reuses the isolated all-tool harness; no user save writes.
module.exports=async(window,root)=>{
 const result=await window.webContents.executeJavaScript(`(async()=>{
  const check=(ok,message)=>{if(!ok)throw Error(message)},pause=ms=>new Promise(r=>setTimeout(r,ms??100)),wait=async test=>{for(let i=0;i<900;i++){if(test()){await pause();return;}await pause(40);}throw Error('Audit wait: '+state.page+' '+content.textContent.slice(-400));};
  window.alignmentAudit={pages:[],modals:[],dropdowns:0,icons:0,spacingWarnings:[]};
  const visible=node=>node.getBoundingClientRect().height>0&&!node.closest('[hidden]');
  const audit=(root,label)=>{
   sortToolkitDropdowns(root);check(!document.querySelector('[data-affected-scope],.scope-impact,.dialog-section-links'),label+': removed impact/jump UI');
   for(const select of root.querySelectorAll('select')){
    alignmentAudit.dropdowns++;
    if(select.multiple&&/positions/.test(select.dataset.configOriginal??select.id)){const values=[...select.options].map(o=>o.value);check(values.every((v,i)=>!i||positionCompare(values[i-1],v)<=0),label+': position order '+select.id);}
    if(select.multiple&&/classes/.test(select.dataset.configOriginal??select.id)){const values=[...select.options].map(o=>o.textContent);check(values.every((v,i)=>!i||classYearCompare(values[i-1],v)<=0),label+': year order '+select.id);}
   }
   for(const icon of root.querySelectorAll('.model-help-button')){if(!visible(icon))continue;alignmentAudit.icons++;const r=icon.getBoundingClientRect();check(Math.abs(r.width-r.height)<1,label+': circular icon');const caption=icon.closest('.field-caption,strong,h2,h3,h4,label,.model-slider-caption');if(icon.classList.contains('option-info'))check(caption&&caption.textContent.trim()&&!caption.querySelector('input,select,textarea'),label+': no floating help icon');if(caption){const c=caption.getBoundingClientRect();if(Math.abs(r.top+r.height/2-c.top-c.height/2)>4)alignmentAudit.spacingWarnings.push(label+': help icon '+icon.getAttribute('aria-label'));}}
   for(const caption of root.querySelectorAll('label[for]')){if(!visible(caption))continue;const input=document.getElementById(caption.htmlFor);if(!input||!visible(input)||caption.contains(input))continue;const a=caption.getBoundingClientRect(),b=input.getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>40&&b.top>=a.bottom&&b.top-a.bottom<4)alignmentAudit.spacingWarnings.push(label+': label gap '+caption.textContent.trim());}
  };
  closeConfigurationDialogs();
  for(const tool of state.bootstrap.registry.tools.filter(tool=>tool.status==='available')){
   navigate(tool.id);await wait(()=>!content.querySelector('.spinner')&&content.querySelector('h1'));await pause(180);audit(content,tool.name);alignmentAudit.pages.push(tool.id);
   for(const button of [...content.querySelectorAll('[data-config-open]')].filter(visible)){
    button.click();const modal=document.querySelector('dialog[open]');if(!modal)continue;await pause();audit(modal,tool.name+' / '+modal.querySelector('h2').textContent);alignmentAudit.modals.push(tool.id+': '+modal.querySelector('h2').textContent);modal.querySelector('[data-config-cancel]').click();
   }
  }
  for(const page of ['home','settings','help','about','history','reports','season-lines']){navigate(page);await pause(180);audit(content,page);alignmentAudit.pages.push(page);}
  navigate('roster-generator');await wait(()=>document.getElementById('roster-configure-teams'));const prepared=rosterPrepared(),teams=document.getElementById('roster-teams');for(const o of teams.options)o.selected=prepared.teams.slice(0,18).some(t=>t.name===o.value);teams.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('roster-configure-teams').click();
  const modal=document.querySelector('dialog'),mode=modal.querySelector('[data-batch-mode]');mode.value='variety';mode.dispatchEvent(new Event('change'));modal.querySelector('[data-batch-pools]').open=true;await pause();audit(modal,'Team Mix');check(modal.querySelectorAll('[data-team-logo]').length===18,'All teams have logos');check(modal.querySelectorAll('.batch-panel').length===4,'Three stages and one advanced panel');
  const before=rosterGeneratorOptions();modal.querySelector('[data-batch-search]').value='air';modal.querySelector('[data-batch-search]').dispatchEvent(new Event('input'));check([...modal.querySelectorAll('[data-batch-team]')].filter(row=>!row.hidden).length>0,'Team search');modal.querySelector('[data-config-cancel]').click();check(JSON.stringify(before)===JSON.stringify(rosterGeneratorOptions()),'Team Mix cancel isolated');document.getElementById('roster-configure-teams').click();
  check(alignmentAudit.spacingWarnings.length===0,'Alignment issues: '+alignmentAudit.spacingWarnings.join('; '));return alignmentAudit;
 })()`);
 const fs=require('node:fs'),path=require('node:path');fs.writeFileSync(path.join(root,'outputs/v225-alignment-audit.json'),JSON.stringify(result,null,2));
 for(const theme of ['light','dark'])for(const width of [1480,760,520]){
  window.setContentSize(width,1000);await window.webContents.executeJavaScript(`document.documentElement.dataset.theme=${JSON.stringify(theme)};new Promise(r=>setTimeout(r,120))`);
  const dimensions=await window.webContents.executeJavaScript(`(()=>{const d=document.querySelector('dialog'),r=d.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,scroll:d.scrollWidth,client:d.clientWidth};})()`);if(dimensions.left<0||dimensions.right>dimensions.width+1||dimensions.scroll>dimensions.client+1)throw Error('Team Mix overflow '+JSON.stringify(dimensions));
  fs.writeFileSync(path.join(root,'outputs/v225-polished-mix-'+theme+'-'+width+'.png'),(await window.webContents.capturePage()).toPNG());
 }
 await window.webContents.executeJavaScript(`(()=>{
  const check=(ok,message)=>{if(!ok)throw Error(message)};
  closeConfigurationDialogs();
  const teams=document.getElementById('roster-teams');for(const option of teams.options)option.selected=true;teams.dispatchEvent(new Event('change',{bubbles:true}));
  document.getElementById('roster-age').value='youth';document.getElementById('roster-age').dispatchEvent(new Event('change',{bubbles:true}));
  document.getElementById('roster-configure-teams').click();const modal=document.querySelector('dialog[open]'),mode=modal.querySelector('[data-batch-mode]');
  check(modal.querySelector('[data-batch-build]').textContent==='Apply Identity Settings to Unlocked Teams','Identity action does not promise a reroll');
  check([...modal.querySelectorAll('[data-batch-reroll]')].every(b=>b.textContent==='Apply Identity'),'Identity row actions use Apply');
  check(modal.querySelector('.roster-batch-table thead th:last-child').textContent==='Actions','Edit and bulk actions share one column');
  check(modal.textContent.includes('current main-page Roster Generator settings'),'Shared settings source explicit');
  for(const approach of ['variety','shuffle']){mode.value=approach;mode.dispatchEvent(new Event('change'));check(modal.querySelector('[data-batch-build]').textContent==='Create / Reroll Unlocked Teams',approach+' bulk label');check([...modal.querySelectorAll('[data-batch-reroll]')].every(b=>b.textContent==='Reroll'),approach+' row labels');}
  mode.value='identity';mode.dispatchEvent(new Event('change'));modal.querySelector('[data-batch-lock="age"]').checked=true;modal.querySelector('[data-batch-build]').click();
  check([...modal.querySelectorAll('[data-batch-field="roster-age"]')].every(input=>input.value==='youth'),'Checked age uses main-page settings, not identity Standard');
  check(!modal.querySelector('[data-config-save]').disabled,'All-team identity mix validates');modal.querySelector('[data-config-save]').click();
  const configs=JSON.parse(document.getElementById('roster-team-settings').value);check(Object.keys(configs).length===teams.options.length,'All selected team configurations saved');
  const summary=document.querySelector('[data-roster-override-summary]').textContent;check(summary.includes('+'+(teams.options.length-2)+' more')&&summary.length<180,'All-team summary stays concise');
  const panel=document.querySelector('.config-presets');check(!panel.closest('.configuration-entry'),'Presets are not inserted into Individual Team Settings');check(!document.getElementById('reset-tool-defaults').closest('.configuration-entry'),'Tool Reset is in the main action bar');panel.open=true;const choice=panel.querySelector('#preset-choice');choice.append(new Option('Very Long Preset Name '.repeat(4).slice(0,80),'long-layout-test'));choice.value='long-layout-test';panel.querySelector('#preset-name').value='A'.repeat(80);
  return true;
 })()`);
 for(const theme of ['light','dark'])for(const width of [1480,760,520]){
  window.setContentSize(width,1000);await window.webContents.executeJavaScript(`document.documentElement.dataset.theme=${JSON.stringify(theme)};new Promise(r=>setTimeout(r,120))`);
  const layout=await window.webContents.executeJavaScript(`(()=>{const root=document.querySelector('#content')??content,r=root.getBoundingClientRect(),nodes=[...root.querySelectorAll('#roster-team-overrides,.config-presets,.config-presets input,.config-presets select,.config-presets button')].filter(n=>n.getBoundingClientRect().height>0);return {viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,overflow:nodes.filter(n=>{const b=n.getBoundingClientRect();return b.left<Math.max(0,r.left)-1||b.right>Math.min(innerWidth,r.right)+1;}).map(n=>n.id||n.className)};})()`);
  if(layout.overflow.length||layout.pageWidth>layout.viewport+1)throw Error('Main-page team/preset overflow '+JSON.stringify(layout));
  if(width===1480||width===520)fs.writeFileSync(path.join(root,'outputs/v225-team-presets-'+theme+'-'+width+'.png'),(await window.webContents.capturePage()).toPNG());
 }
 return 'PASS alignment: '+result.pages.length+' pages, '+result.modals.length+' editors, '+result.dropdowns+' dropdowns, '+result.icons+' visible help icons; Team Mix approach labels, main-page inheritance, all-team summaries and long presets; light/dark 1480/760/520.';
};
