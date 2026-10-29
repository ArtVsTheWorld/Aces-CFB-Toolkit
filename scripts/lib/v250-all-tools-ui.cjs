// Real renderer, isolated settings and read-only native preparation. Never Apply.
const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
  const execute=code=>window.webContents.executeJavaScript(code),out=path.join(root,'outputs/v250-all-tools-ui');fs.mkdirSync(out,{recursive:true});
  await execute(`window.pCheck=(v,m)=>{if(!v)throw Error(m)};window.pWait=async f=>{for(let i=0;i<2000;i++){if(f()){await new Promise(r=>setTimeout(r,100));return;}await new Promise(r=>setTimeout(r,25));}throw Error('Timed out '+state.page+': '+content.textContent.slice(-400));};void 0`);
  const tools=[['jersey-renumber','jersey-preview'],['jersey-no-duplicates','jersey-preview'],['commentary-id','commentary-classes'],['freshman-equipment','equipment-preview'],['equipment-patcher','equipment-preview'],['equipment-quickstart','quickstart-raw'],['equipment-mapper','mapper-mod-unlocked'],['roster-generator','roster-caliber'],['team-boost','boost-classes'],['long-snap','preview'],['nil-toggle','nil-target'],['dealbreaker-fixer','db-protected-values'],['automatic-force-win','force-profile']];
  const results=[];
  for(const [tool,ready]of tools){
    const result=await execute(`(async()=>{await pWait(()=>state.bootstrap);closeConfigurationDialogs();${tool.startsWith('jersey')?`state.jerseyMode=${JSON.stringify(tool==='jersey-no-duplicates'?'no-duplicates':'standard')};`:''}navigate(${JSON.stringify(tool==='jersey-no-duplicates'?'jersey-renumber':tool)});await pWait(()=>document.getElementById(${JSON.stringify(ready)}));await new Promise(r=>setTimeout(r,150));
      const inputs=()=>JSON.stringify([...content.querySelectorAll('input[id],select[id],textarea[id]')].filter(n=>!n.closest('.config-presets')).map(n=>[n.id,n.multiple?[...n.selectedOptions].map(o=>o.value):n.type==='checkbox'?n.checked:n.value]));
      const before=inputs(),entries=[...content.querySelectorAll('.configuration-entry button')].filter(n=>n.getBoundingClientRect().width>0&&!n.disabled);let count=0;
      for(const button of entries){button.click();await new Promise(r=>setTimeout(r,40));const d=document.querySelector('dialog[open]');if(!d)continue;const footer=d.querySelector('.configuration-footer');pCheck(footer,'Consistent dialog footer: '+button.textContent);pCheck(d.querySelector('.configuration-body'),'Consistent dialog body');const box=footer.getBoundingClientRect();pCheck(box.bottom<=innerHeight+1,'Visible dialog actions');const cancel=d.querySelector('[data-config-cancel]');pCheck(cancel,'Cancel available');cancel.click();pCheck(!d.open,'Cancel closes dialog');count++;}
      pCheck(inputs()===before,'Opening and cancelling settings preserves '+state.page);
      if(state.page==='equipment-patcher'){pCheck(document.getElementById('unlocked-tattoo-cap').value==='30','Patcher tattoo 30%');pCheck(document.getElementById('frequency-fill-tattoos').checked,'Patcher Fill on');}
      return {tool:${JSON.stringify(tool)},editors:count,description:content.querySelector('.ops-description,.tool-description,.page-description')?.textContent??'',controls:JSON.parse(inputs()).length};})()`);
    results.push(result);console.log('PASS tool settings and Cancel: '+tool+' ('+result.editors+' editors)');
  }
  await execute(`(async()=>{closeConfigurationDialogs();navigate('help');await pWait(()=>document.getElementById('help-tool'));})()`);
  const help=await execute(`(()=>{const sections=[...content.querySelectorAll('details')];pCheck(sections.length>=14,'Help covers all tools');for(const name of ['Jersey Renumber','Commentary IDs','Equipment Quickstart','Equipment Randomizer','Equipment Patcher','Equipment Mapper','Roster Generator','Team Boost','Long Snap Fixer','NIL Toggle','Dealbreaker Fixer','Smart Force Win'])pCheck(sections.some(s=>s.querySelector('summary')?.textContent.includes(name)),'Help for '+name);pCheck(content.textContent.includes('black baggy sleeve'),'Keep Colors example');pCheck(content.textContent.includes('Save All Team Settings'),'Team save flow explained');pCheck(sections.filter(s=>s.open).length===1,'Only introduction expanded');
    const topics=[...content.querySelectorAll('[data-help-topic]')],search=document.getElementById('help-search'),tool=document.getElementById('help-tool');
    pCheck(tool.options.length===topics.length+1,'Every help topic in filter');search.value='baggy sleeve';search.dispatchEvent(new Event('input',{bubbles:true}));
    pCheck(topics.filter(n=>!n.hidden).length===1&&topics.find(n=>!n.hidden).dataset.helpTopic==='Equipment Mapper','Help search finds color example');pCheck(topics.find(n=>!n.hidden).open,'Search opens matching explanation');
    search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));tool.value='Roster Generator';tool.dispatchEvent(new Event('change',{bubbles:true}));pCheck(topics.filter(n=>!n.hidden).length===1,'Tool filter narrows help');
    tool.value='';tool.dispatchEvent(new Event('change',{bubbles:true}));pCheck(topics.every(n=>!n.hidden)&&topics.filter(n=>n.open).length===1,'Clear restores all topics and introduction');
    return sections.map(s=>s.querySelector('summary').textContent);})()`);
  for(const [width,height,theme]of[[1480,1000,'dark'],[760,900,'light']]){window.setSize(width,height);await execute(`document.documentElement.dataset.theme=${JSON.stringify(theme)};applyAccentColor(state.bootstrap.settings);void 0`);await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(out,'help-'+theme+'.png'),(await window.webContents.capturePage()).toPNG());}
  fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({tools:results,help},null,2));
  console.log('PASS all 13 tool settings, Cancel preservation, 14 Help sections and tattoo defaults.');
};
