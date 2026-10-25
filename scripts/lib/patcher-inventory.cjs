const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 const inventory=await window.webContents.executeJavaScript(`(async()=>{
   navigate('equipment-patcher');
   for(let i=0;i<1000&&!document.getElementById('fix-unlocked-mouthpieces');i++)await new Promise(r=>setTimeout(r,25));
   await new Promise(r=>setTimeout(r,250));
   const controls=configurationControls(content).filter(n=>!n.closest('.config-presets')).map(n=>({id:n.id,type:n.type,value:configurationValue(n)}));
   const defaults=equipmentOptions('equipment-patcher');
   for(const n of content.querySelectorAll('input[id^="fix-"]'))if(!n.checked)n.click();
   const selected=equipmentOptions('equipment-patcher');
   return {controls,defaults,selected,passes:[...content.querySelectorAll('input[id^="fix-"]')].map(n=>n.id).sort()};
 })()`);
 const destination=path.join(root,'outputs/patcher-ui-before-redesign.json');
 fs.writeFileSync(destination,JSON.stringify(inventory,null,2)+'\n');
 console.log('Patcher inventory:',inventory.controls.length,'canonical controls,',inventory.passes.length,'passes;',destination);
};
