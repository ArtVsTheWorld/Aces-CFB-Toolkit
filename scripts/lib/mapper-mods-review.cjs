const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
  await window.webContents.executeJavaScript(`(async()=>{for(let i=0;!state.bootstrap;i++){if(i>1000)throw Error('Bootstrap timeout');await new Promise(r=>setTimeout(r,25));}navigate('equipment-mapper');for(let i=0;!document.getElementById('mapper-confirm-mods');i++){if(i>1000)throw Error('Mapper mods timeout');await new Promise(r=>setTimeout(r,25));}})()`);
  for(const [theme,width]of [['dark',1480],['light',520]]){
    window.setContentSize(width,1000);
    await window.webContents.executeJavaScript(`document.documentElement.dataset.theme='${theme}';applyAccentColor({...state.bootstrap.settings,theme:'${theme}'});void 0`);await new Promise(r=>setTimeout(r,150));
    await window.webContents.executeJavaScript(`(()=>{const root=document.querySelector('.mapper-mod-workspace'),group=root.querySelector('.quickstart-mod-options'),rows=[...group.querySelectorAll('.ui-option-row')],heights=rows.map(n=>n.getBoundingClientRect().height);if(rows.length!==3||Math.max(...heights)-Math.min(...heights)>1)throw Error('Mapper mod rows must be equal height');if(parseFloat(getComputedStyle(group).borderTopWidth)<1)throw Error('Mapper mod list needs shared border');if(root.scrollWidth>root.clientWidth+1)throw Error('Mapper mod page overflow');if(!root.textContent.includes('v0.97+')||!root.textContent.includes('v3.1.4+')||!root.textContent.includes('v2.0+'))throw Error('Mod versions missing');if(rows.some(row=>!row.querySelector('.model-help-button')))throw Error('Each mod needs a help icon');})()`);
    fs.writeFileSync(path.join(root,'outputs/v246-mapper-mods-'+theme+'.png'),(await window.webContents.capturePage()).toPNG());
  }
  window.setContentSize(1480,1050);await window.webContents.executeJavaScript(`document.documentElement.dataset.theme='light';applyAccentColor({...state.bootstrap.settings,theme:'light'});void 0`);
};
