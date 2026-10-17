module.exports=async(window,root)=>{
  const result=await window.webContents.executeJavaScript(`(async()=>{
    const check=(value,message)=>{if(!value)throw new Error('Team Colors: '+message);};
    closeConfigurationDialogs();navigate('equipment-patcher');for(let i=0;i<300&&!document.getElementById('fix-unlocked-recolor');i++)await new Promise(resolve=>setTimeout(resolve,40));
    check([...document.querySelectorAll('input[id^="fix-"]')].every(control=>!control.defaultChecked),'all factory pass defaults off');
    check(!content.textContent.includes('Requires the mod named by each option.'),'redundant banner removed');
    if(!document.getElementById('fix-unlocked-recolor').checked)document.getElementById('fix-unlocked-recolor').click();
    const entry=[...content.querySelectorAll('.configuration-entry')].find(node=>node.querySelector('strong')?.textContent==='Colors & Tape');
    entry.querySelector('button').click();let dialog=document.querySelector('dialog'),draft=id=>configurationRead(dialog,id);
    const change=(control,value)=>{control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}));};
    change(draft('unlocked-color-theme'),'team');change(draft('tape-color-mode'),'accessory');
    check(!draft('accessory-team-distribution-settings').hidden&&draft('tape-distribution-settings').hidden,'one shared accessory table when tape matches');
    const row=dialog.querySelector('[data-accessory-team-row="alabama"]');check(row,'Alabama row');
    const weights=()=>Object.fromEntries([...row.querySelectorAll('[data-accessory-team-color]')].map(input=>[input.dataset.accessoryTeamColor,Number(input.value)]));
    check(weights().black===100&&weights().white===0,'same Alabama black default as tape');
    check(row.querySelectorAll('.tape-color-swatch').length===4,'all four swatches');
    change(draft('accessory-team-search'),'alabama');draft('accessory-team-search').dispatchEvent(new Event('input',{bubbles:true}));
    check([...dialog.querySelectorAll('[data-accessory-team-row]')].filter(row=>!row.hidden).every(row=>row.dataset.accessoryTeamRow.includes('alabama')),'team search');
    const white=row.querySelector('[data-accessory-team-color="white"]');change(white,'10.5');check(dialog.querySelector('[data-config-save]').disabled,'fractions blocked');
    change(white,'10');row.querySelector('[data-balance-accessory-team]').click();check(Object.values(weights()).reduce((a,b)=>a+b,0)===100&&Object.values(weights()).every(Number.isInteger),'whole-number balance');
    for(const input of row.querySelectorAll('[data-accessory-team-color]'))change(input,input.dataset.accessoryTeamColor==='primary'?'100':'0');
    check(!dialog.querySelector('[data-config-save]').disabled,'valid accessory team mix');dialog.querySelector('[data-config-save]').click();
    check(equipmentOptions('equipment-patcher').teamAccessoryColors.alabama.primary===100&&equipmentOptions('equipment-patcher').tapeColorMode==='accessory','saved options retain shared roll mode');
    const preset=presetConfiguration();check(preset.accessoryColors.alabama.primary===100&&!Object.keys(preset.values).some(id=>/^accessory-team-color-/.test(id)),'preset portable by team name');
    const mapped=presetValues(preset),primary=document.querySelector('[data-accessory-team="alabama"][data-accessory-team-color="primary"]');check(mapped[primary.id]==='100','preset maps team colors back to current row');
    check(presetCompatibility(preset).messages.length===0,'preset compatibility');
    check(recolorReviewRows().some(([title,value])=>title.startsWith('Accessory Color —')&&value.includes('Alabama')),'team percentages visible in Review even when tape matches');
    entry.querySelector('button').click();dialog=document.querySelector('dialog');const edited=dialog.querySelector('[data-accessory-team-row="alabama"]');change(edited.querySelector('[data-accessory-team-color="primary"]'),'0');change(edited.querySelector('[data-accessory-team-color="white"]'),'100');dialog.querySelector('.configuration-footer [data-config-cancel]').click();
    check(equipmentOptions('equipment-patcher').teamAccessoryColors.alabama.primary===100,'Cancel preserves saved mix');
    return 'Team accessory percentages, matching tape, swatches, whole-number validation/balance, search, Save/Cancel, Review, and name-based presets passed.';
  })()`);
  const fs=require('node:fs'),path=require('node:path');
  for(const [width,theme]of [[1480,'light'],[760,'dark'],[520,'light']]){
    window.setSize(width,width===1480?1000:760);
    await window.webContents.executeJavaScript(`closeConfigurationDialogs();document.documentElement.dataset.theme=${JSON.stringify(theme)};[...content.querySelectorAll('.configuration-entry')].find(node=>node.querySelector('strong')?.textContent==='Colors & Tape').querySelector('button').click();`);
    await new Promise(resolve=>setTimeout(resolve,140));
    const bounds=await window.webContents.executeJavaScript(`(()=>{const d=document.querySelector('dialog'),b=d.querySelector('.configuration-body');return{left:d.getBoundingClientRect().left,right:d.getBoundingClientRect().right,width:innerWidth,scroll:b.scrollWidth,client:b.clientWidth};})()`);
    if(bounds.left<0||bounds.right>bounds.width+1||bounds.scroll>bounds.client+1)throw new Error('Team color overflow: '+JSON.stringify(bounds));
    fs.writeFileSync(path.join(root,'outputs',`v201-team-colors-${theme}-${width}.png`),(await window.webContents.capturePage()).toPNG());
  }
  await window.webContents.executeJavaScript(`closeConfigurationDialogs();document.documentElement.dataset.theme='light';`);window.setSize(1480,1000);
  return result;
};
