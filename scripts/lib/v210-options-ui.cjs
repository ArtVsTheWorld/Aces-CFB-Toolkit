const fs=require('node:fs'),path=require('node:path');
module.exports=async function(window,output){
  const counts=await window.webContents.executeJavaScript(`(async()=>{
    const check=(v,m)=>{if(!v)throw Error(m);},delay=()=>new Promise(r=>setTimeout(r,60));
    const wait=async p=>{for(let i=0;i<500&&!p();i++)await delay();check(p(),'v21 help UI timed out: '+state.page);};
    const counts={};
    for(const [page,selector] of [['equipment-patcher','#fix-helmet'],['freshman-equipment','#equipment-donor-mode'],['commentary-id','#phonetic'],['jersey-renumber','#jersey-skipped'],['team-boost','#rating-mode'],['nil-toggle','#nil-target'],['dealbreaker-fixer','#db-fix-style'],['automatic-force-win','#force-action'],['long-snap','#preview'],['roster-generator','#roster-caliber'],['settings','#theme-select']]){
      navigate(page);await wait(()=>document.querySelector(selector));await delay();condenseOptionHelp();
      if(page==='automatic-force-win') { showForceWinStage('config');const action=document.getElementById('force-action');action.value='evaluate';action.dispatchEvent(new Event('change',{bubbles:true}));await delay();condenseOptionHelp(); }
      if(page.includes('equipment')) showEquipmentPreviewWorkspace(false);
      showStandardPreviewStage(false);
      const buttons=[...content.querySelectorAll('.option-info')].filter(b=>!b.closest('[hidden]'));
      counts[page]=buttons.length;check(buttons.length>0,'Inline help on '+page);
      for(const size of ['standard','large','extra']){document.documentElement.dataset.textSize=size;for(const button of buttons){if(!button.getClientRects().length)continue;const r=button.getBoundingClientRect();check(Math.abs(r.width-16)<.1&&Math.abs(r.height-16)<.1,'Info stays square at '+page+'/'+size+': '+r.width+'x'+r.height);check(button.querySelector('svg[aria-hidden="true"]'),'Info uses a font-independent SVG');}}document.documentElement.dataset.textSize='standard';
      check(!content.textContent.includes('TOOL v'),'No separate tool badge on '+page);
      const b=buttons[0];b.focus();b.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
      const tip=document.getElementById(b.getAttribute('aria-describedby'));check(tip&&!tip.hidden&&tip.textContent.trim(),'Focus-accessible help on '+page);
      b.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));check(tip.hidden,'Escape dismisses help on '+page);
      const before=content.querySelectorAll('.option-info').length;condenseOptionHelp();check(content.querySelectorAll('.option-info').length===before,'Idempotent presentation on '+page);
    }
    navigate('equipment-patcher');await wait(()=>document.getElementById('fix-helmet'));await delay();
    const toggle=document.getElementById('fix-helmet'),help=toggle.closest('.toggle-card').querySelector('.option-info'),old=toggle.checked;
    help.click();check(toggle.checked===old,'Info click cannot change its surrounding checkbox');
    const tip=document.getElementById(help.getAttribute('aria-describedby'));check(!tip.hidden,'Click shows help');
    check([...document.querySelectorAll('.toggle-card .requirement')].some(node=>!node.closest('[hidden]')&&node.textContent.includes('Unlocked')),'Mod requirement remains visible');
    if(!toggle.checked)toggle.click();document.getElementById('configure-helmet-mix').click();await delay();
    let d=document.querySelector('dialog[open]');const modalHelp=d.querySelector('.option-info');check(modalHelp,'Modal descriptions are condensed too');modalHelp.focus();modalHelp.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
    check(document.getElementById(modalHelp.getAttribute('aria-describedby')).closest('dialog')===d,'Help is in the modal top layer');
    modalHelp.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));check(d.open,'Escape closes help before the editor');
    d.closeEditor();
    navigate('freshman-equipment');await wait(()=>document.getElementById('equipment-unlocked'));await delay();
    const mod=document.getElementById('equipment-unlocked');if(!mod.checked)mod.click();document.querySelector('[data-mod-pool-open="unlocked"]').click();await delay();d=document.querySelector('dialog[open]');
    const category=d.querySelector('[data-pool-category]');category.value='undershirts';category.dispatchEvent(new Event('change',{bubbles:true}));check(d.querySelector('[data-pool-chance]').value==='0','Jamo starts disabled in the actual pool editor');
    category.value='wristTape';category.dispatchEvent(new Event('change',{bubbles:true}));check(d.querySelector('[data-pool-item]').closest('label').textContent.includes('Taped Wrist with Cross'),'Cross tape appears under Unlocked');d.closeEditor();
    return counts;
  })()`);
  console.log('v21 info-icon coverage:',JSON.stringify(counts));
  for(const theme of ['light','dark']){
    window.setSize(1480,1000);await window.webContents.executeJavaScript(`closeConfigurationDialogs();document.documentElement.dataset.theme=${JSON.stringify(theme)};navigate('equipment-patcher');`);await new Promise(r=>setTimeout(r,250));
    fs.writeFileSync(path.join(output,'v210-options-'+theme+'.png'),(await window.webContents.capturePage()).toPNG());
  }
  window.setSize(520,740);
  for(let attempt=0;attempt<50&&await window.webContents.executeJavaScript('innerWidth')!==520;attempt++) await new Promise(r=>setTimeout(r,30));
  await new Promise(r=>setTimeout(r,180));
  await window.webContents.executeJavaScript(`(()=>{const b=document.getElementById('fix-helmet').closest('.toggle-card').querySelector('.option-info');b.scrollIntoView({block:'center',behavior:'instant'});b.focus({preventScroll:true});b.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));const t=document.getElementById(b.getAttribute('aria-describedby')),r=t.getBoundingClientRect();if(t.hidden||r.width===0||r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight)throw Error('Narrow-window help overflow');})()`);
  fs.writeFileSync(path.join(output,'v210-help-narrow.png'),(await window.webContents.capturePage()).toPNG());
};
