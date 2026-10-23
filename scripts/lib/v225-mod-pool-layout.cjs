// Exercise authored help as well as generated help; do not run or write saves.
const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 const execute=source=>window.webContents.executeJavaScript(source);
 window.setContentSize(1480,1000);
 await execute(`(async()=>{
  window.poolLayoutCheck=(ok,message)=>{if(!ok)throw Error(message)};
  window.poolLayoutChange=(node,value)=>{node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}))};
  closeConfigurationDialogs();navigate('freshman-equipment');
  for(let i=0;!document.getElementById('equipment-mod-pools');i++){if(i>1000)throw Error('Randomizer did not load');await new Promise(r=>setTimeout(r,30))}
  window.poolLayoutOpen=origin=>{const toggle=document.getElementById({unlocked:'equipment-unlocked',raw:'equipment-raw-accessories',eljax:'equipment-truck'}[origin]);if(!toggle.checked)toggle.click();document.querySelector('[data-mod-pool-open="'+origin+'"]').click();return document.querySelector('dialog.mod-pool-editor[open]')};
  window.poolLayoutAudit=()=>{
   const d=document.querySelector('dialog.mod-pool-editor[open]'),check=poolLayoutCheck,body=d.querySelector('.configuration-body'),select=d.querySelector('[data-pool-category]'),chance=d.querySelector('[data-pool-chance]'),icon=d.querySelector('[data-pool-help]'),caption=icon.closest('.field-caption');
   check(caption&&caption.querySelector('label')?.htmlFor===select.id,'Category help belongs to the actual field caption');
   check(!caption.querySelector('select,input'),'Help cannot sit in a vertical field/control wrapper');
   const title=caption.querySelector('label').getBoundingClientRect(),help=icon.getBoundingClientRect();check(Math.abs(help.top+help.height/2-title.top-title.height/2)<2,'Help vertically aligned with category label');
   check(help.left>=title.right+4&&help.left<title.right+12,'Help sits immediately beside its label');
   check(select.labels.length===1&&chance.labels.length===1,'Category and chance have explicit accessible labels');
   const a=select.getBoundingClientRect(),b=chance.getBoundingClientRect();
   if(innerWidth>640){check(Math.abs(a.top-b.top)<2&&Math.abs(a.bottom-b.bottom)<2,'Category/chance controls align in one row')}
   else check(b.top>=a.bottom+8,'Narrow fields stack with breathing room');
   const items=[...d.querySelectorAll('.mod-pool-item')];for(const row of items){const style=getComputedStyle(row),input=row.querySelector('input'),text=row.querySelector('span'),r=input.getBoundingClientRect(),t=text.getBoundingClientRect();check(style.marginTop==='0px'&&style.marginBottom==='0px','Pool rows must not inherit label margins');check(Math.abs(r.top+r.height/2-t.top-t.height/2)<2,'Item checkbox/text align');check(row.scrollWidth<=row.clientWidth+1,'Item name fits or wraps')}
   const first=items[0]?.getBoundingClientRect(),next=items.find(row=>row.getBoundingClientRect().top>(first?.top??0)+2)?.getBoundingClientRect();if(next)check(next.top-first.bottom>=7&&next.top-first.bottom<=9,'Item rows use an even eight-pixel gap');
   const list=d.querySelector('[data-pool-items]');check(getComputedStyle(list).overflowY==='visible','Only modal contents scroll, not a nested item list');
   const r=d.getBoundingClientRect(),content=body.getBoundingClientRect(),header=d.querySelector('.configuration-header').getBoundingClientRect(),footer=d.querySelector('.configuration-footer').getBoundingClientRect();
   check(r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,'Pool window stays in viewport');check(body.scrollWidth<=body.clientWidth+2,'Pool has no horizontal overflow');check(content.top>=header.bottom-1&&content.bottom<=footer.top+1,'Scrolling content never overlaps fixed header/footer');
   const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);check(new Set(ids).size===ids.length,'Pool field IDs stay unique');
  };
  for(const origin of ['unlocked','raw','eljax']){
   const before=document.getElementById('equipment-mod-pools').value,d=poolLayoutOpen(origin);await new Promise(r=>setTimeout(r,40));const select=d.querySelector('[data-pool-category]'),category=select.value,chance=d.querySelector('[data-pool-chance]'),icon=d.querySelector('[data-pool-help]');
   const prior=select.value;icon.click();poolLayoutCheck(select.value===prior,'Info does not change category');poolLayoutCheck([...d.querySelectorAll('.model-help-tooltip')].some(n=>!n.hidden),'Help opens on click');icon.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));poolLayoutCheck(d.open,'Escape dismisses help without closing pool');
   poolLayoutChange(chance,'37.5');poolLayoutCheck(d.querySelector('[data-config-save]').disabled,'Fractional chance still rejected');poolLayoutChange(chance,'37');
   const alternate=[...select.options].find(o=>o.value!==category).value;poolLayoutChange(select,alternate);poolLayoutChange(select,category);poolLayoutCheck(chance.value==='37','Category chance survives category changes');
   d.querySelector('[data-pool-clear]').click();poolLayoutCheck(!d.querySelector('[data-pool-item]:checked'),'Clear removes selections from draft');d.querySelector('[data-config-cancel]').click();poolLayoutCheck(document.getElementById('equipment-mod-pools').value===before,'Cancel preserves canonical pool');
   const saved=poolLayoutOpen(origin),c=saved.querySelector('[data-pool-category]');poolLayoutChange(c,category);poolLayoutChange(saved.querySelector('[data-pool-chance]'),'37');saved.querySelector('[data-pool-clear]').click();saved.querySelector('[data-pool-item]').click();saved.querySelector('[data-config-save]').click();
   const settings=modPoolOptions();poolLayoutCheck(settings[origin][category].chance===37&&settings[origin][category].items.length===1,'Save preserves chance/item behavior');poolLayoutCheck(presetConfiguration().values['equipment-mod-pools']===document.getElementById('equipment-mod-pools').value,'Pool presets retain canonical JSON');
  }
 })()`);
 let audited=0;
 for(const theme of ['light','dark'])for(const width of [1480,760,520])for(const textSize of ['standard','extra']){
  window.setContentSize(width,width===1480?1000:780);
  await execute(`document.documentElement.dataset.theme=${JSON.stringify(theme)};document.documentElement.dataset.textSize=${JSON.stringify(textSize)};void 0;`);
  for(const origin of ['unlocked','raw','eljax']){
   audited+=await execute(`(async()=>{const d=poolLayoutOpen(${JSON.stringify(origin)}),control=d.querySelector('[data-pool-category]');await new Promise(r=>setTimeout(r,25));let count=0;for(const category of [...control.options].map(o=>o.value)){poolLayoutChange(control,category);await new Promise(r=>setTimeout(r,5));poolLayoutAudit();count++}return count})()`);
   await execute(`(()=>{const d=document.querySelector('dialog[open]');poolLayoutChange(d.querySelector('[data-pool-category]'),${JSON.stringify(origin==='unlocked'?'undershirts':origin==='raw'?'neckwear':'armSleeves')});d.querySelector('.configuration-body').scrollTop=0;})()`);
   await execute(`new Promise(r=>setTimeout(r,70))`);
   if(textSize==='standard'&&width!==760)fs.writeFileSync(path.join(root,`outputs/v225-pool-layout-${origin}-${theme}-${width}.png`),(await window.webContents.capturePage()).toPNG());
   await execute(`document.querySelector('dialog[open]').querySelector('[data-config-cancel]').click();void 0;`);
  }
 }
 await execute(`document.documentElement.dataset.textSize='standard';void 0;`);
 console.log('PASS mod pool layout: '+audited+' category/layout combinations across Unlocked, RAW and Equipment Truck; authored help, control/item alignment, one scroll area, persistent actions, validation, Save/Cancel/presets, light/dark 1480/760/520 and Standard/Extra text.');
};
