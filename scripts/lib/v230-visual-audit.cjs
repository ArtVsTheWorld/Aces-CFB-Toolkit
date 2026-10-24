// Actual Electron renderer, real read-only preparation, isolated settings.
const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 const requestedTool=process.argv.find(a=>a.startsWith('--audit-tool='))?.slice(13);
 const out=path.join(root,'outputs/v230-visual-audit'+(requestedTool?'-'+requestedTool:''));fs.mkdirSync(out,{recursive:true});
 const exec=async source=>{try{return await window.webContents.executeJavaScript(source);}catch(error){console.error('Audit expression:',source);throw error;}},records=[];
 await exec(`window.auditWait=async f=>{for(let i=0;i<1500;i++){if(f())return;await new Promise(r=>setTimeout(r,30))}throw Error('Audit timeout '+state.page)};window.auditVisible=n=>!!n&&n.getBoundingClientRect().height>0&&!n.closest('[hidden]');document.documentElement.dataset.theme='dark';`);
 const capture=async name=>{
  await exec(`new Promise(r=>setTimeout(r,180))`);
  const result=await exec(`(()=>{condenseOptionHelp();const root=document.querySelector('dialog[open]')??content,body=root.querySelector('.configuration-body')??root;return {title:root.querySelector('h2,h1')?.textContent,overflow:body.scrollWidth>body.clientWidth+2,icons:[...root.querySelectorAll('[data-model-help]')].filter(auditVisible).map(n=>{const r=n.getBoundingClientRect(),c=n.closest('.field-caption,strong,h2,h3,h4,label,.model-slider-caption'),b=c?.getBoundingClientRect();return {name:n.getAttribute('aria-label'),parent:n.parentElement.outerHTML.slice(0,350),aligned:!!b&&Math.abs(r.top+r.height/2-b.top-b.height/2)<5,captionHasControl:!!c?.querySelector('input,select,textarea')}}),buttons:[...root.querySelectorAll('button')].filter(auditVisible).map(b=>({text:b.textContent, id:b.id})),height:body.scrollHeight};})()`);
  records.push({name,...result});fs.writeFileSync(path.join(out,name+'.png'),(await window.webContents.capturePage()).toPNG());
 };
 const auditDialog=async prefix=>{
  if(!await exec(`!!document.querySelector('dialog[open]')`))return;
  await exec(`new Promise(r=>setTimeout(r,100))`);
  const tabs=await exec(`[...document.querySelector('dialog[open]').querySelectorAll('[role=tab]')].map((n,i)=>{if(!n.id)n.id='audit-tab-'+i;return{id:n.id,text:n.textContent}})`);
  if(!tabs.length)await capture(prefix);
  for(const [i,tab]of tabs.entries()){
   await exec(`document.getElementById(${JSON.stringify(tab.id)}).click();void 0`);await capture(prefix+'-'+i);
  }
  if(await exec(`!!document.querySelector('dialog[open]')&&!!configurationRead(document.querySelector('dialog[open]'),'mouthpiece-style-mode')`)){
   await exec(`(()=>{const d=document.querySelector('dialog[open]');d.querySelector('[role=tab]').click();const m=configurationRead(d,'mouthpiece-style-mode');m.value='custom';m.dispatchEvent(new Event('change',{bubbles:true}));})()`);await capture(prefix+'-custom-all');
   await exec(`document.querySelector('dialog[open] [data-equipment-scope=positions]').click();void 0`);await capture(prefix+'-custom-position');
  }
  if(await exec(`!!document.querySelector('dialog[open]')&&!!configurationRead(document.querySelector('dialog[open]'),'undershirt-color')`)){
   await exec(`(()=>{const d=document.querySelector('dialog[open]'),m=configurationRead(d,'undershirt-color');m.value='custom';m.dispatchEvent(new Event('change',{bubbles:true}));d.querySelector('[role=tab]').click();})()`);await capture(prefix+'-custom');
  }
  if(await exec(`!!document.querySelector('dialog[open] [data-roster-edit]')`)){
   await exec(`document.querySelector('dialog[open] [data-roster-edit]').click();void 0`);
   for(let i=0;i<4;i++){await exec(`document.querySelectorAll('dialog[open] [data-roster-tab]')[${i}].click();void 0`);await capture(prefix+'-individual-'+i);}
  }
  if(await exec(`!!document.querySelector('dialog[open] [data-map-scope]')`)){
   await exec(`(()=>{const n=document.querySelector('dialog[open] [data-map-scope]');n.value='selected';n.dispatchEvent(new Event('change',{bubbles:true}));})()`);
   for(const key of ['teams','positions','players']){await exec(`document.querySelector('dialog[open] [data-map-target-tab=${key}]').click();void 0`);await capture(prefix+'-'+key);}
  }
  await exec(`closeConfigurationDialogs();void 0`);
 };
 const tools=await exec(`state.bootstrap.registry.tools.filter(t=>t.status==='available').map(t=>t.id)`);
 const only=process.argv.find(a=>a.startsWith('--audit-tool='))?.slice(13);
 for(const tool of (only?[only]:[...tools,'home','season-lines','settings','help','about','history','reports'])){
  await exec(`closeConfigurationDialogs();navigate(${JSON.stringify(tool)});void 0`);
  await exec(`auditWait(()=>content.querySelector('h1')&&!content.querySelector('.spinner'))`);
  await exec(`new Promise(r=>setTimeout(r,250))`);
  if(tool==='equipment-patcher')await exec(`for(const n of content.querySelectorAll('input[id^="fix-"]'))if(!n.checked)n.click();void 0`);
  if(tool==='freshman-equipment')await exec(`for(const id of ['equipment-unlocked','equipment-raw-accessories','equipment-truck','equipment-no-drip']){const n=document.getElementById(id);if(n&&!n.checked)n.click();}void 0`);
  if(tool==='roster-generator')await exec(`(()=>{const t=document.getElementById('roster-teams');[...t.options].forEach((o,i)=>o.selected=i<3);t.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  if(tool==='automatic-force-win')await exec(`(()=>{const n=document.getElementById('force-profile');if(n){n.value='custom';n.dispatchEvent(new Event('change',{bubbles:true}));}})()`);
  await capture(tool);
  const buttons=await exec(`[...content.querySelectorAll('[data-config-open],#configure-helmet-mix,#jersey-custom-open,#configure-boost-ranges,[data-mod-pool-open],#mapper-browse,#mapper-copy,#mapper-add,#configure-custom-model,#roster-configure-teams')].filter(n=>auditVisible(n)&&!n.disabled).map((n,i)=>{n.dataset.auditOpen=i;return {index:i,label:n.closest('.configuration-entry')?.querySelector('strong')?.textContent??n.textContent}})`);
  for(const b of buttons){
   await exec(`content.querySelector('[data-audit-open="${b.index}"]').click();void 0`);
   await auditDialog(tool+'-'+b.label.replace(/[^a-z0-9]/gi,'-'));
  }
  console.log('AUDITED',tool,buttons.length,'editors');
  if(tool==='equipment-mapper'){
   await exec(`(()=>{const check=(ok,message)=>{if(!ok)throw Error(message)},p=state.prepared.get('equipment-mapper|'+state.activeSave.path),item=p.items.find(i=>i.copyable&&!mapperPairedSlot(i.slot));check(item,'Non-paired source exists');for(const action of ['replace','copy']){let saved=null;openMapperRule(p,{action,sourceId:item.id,replacementId:item.id,scope:'selected',matchMode:'asset'},rule=>saved=rule);const d=document.querySelector('dialog[open]'),tabs=[...d.querySelectorAll('.configuration-page-tabs [role=tab]')];d.querySelector('[data-map-cap]').value='40';tabs[1].click();d.querySelector('[data-map-target-tab=players]').click();const player=d.querySelector('[data-map-target]');check(player,'Player target exists');player.click();tabs[0].click();d.querySelector('[data-map-pick=replacement]').click();check(d.querySelector('[data-map-back]'),'Embedded library opens');d.querySelector('[data-map-back]').click();d.querySelector('[data-config-save]').click();check(saved?.replacementCap===40&&saved.playerRows.length===1,'Rule preserves settings across pages/library: '+action);check(!document.querySelector('dialog[open]'),'Save closes rule editor');} })()`);
   for(const width of [760,520]){
    window.setContentSize(width,780);
    await exec(`(()=>{const p=state.prepared.get('equipment-mapper|'+state.activeSave.path);openMapperRule(p,{action:'replace',scope:'selected'},()=>{});const d=document.querySelector('dialog[open]');for(const tab of d.querySelectorAll('[role=tab]')){tab.click();const b=d.querySelector('.configuration-body');if(b.scrollWidth>b.clientWidth+2)throw Error('Mapper overflow at '+innerWidth);}d.closeEditor();})()`);
   }
   window.setContentSize(1480,1000);console.log('PASS Mapper page/library round-trip, replacement and copy settings, selected players, Save and narrow layouts.');
  }
 }
 fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify(records,null,2));
 console.log('Visual inventory:',records.length,'screens;',records.filter(r=>r.overflow).map(r=>r.name),'overflow;',records.flatMap(r=>r.icons.filter(i=>!i.aligned||i.captionHasControl).map(i=>r.name+': '+i.name)).join('\n'));
};
