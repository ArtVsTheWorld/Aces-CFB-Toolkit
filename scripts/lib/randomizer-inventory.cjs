const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 const inventory=await window.webContents.executeJavaScript(`(async()=>{
   navigate('freshman-equipment');
   for(let i=0;i<1000&&!document.getElementById('equipment-mod-pools');i++)await new Promise(r=>setTimeout(r,25));
   await new Promise(r=>setTimeout(r,250));
   const controls=configurationControls(content).filter(n=>!n.closest('.config-presets')).map(n=>({id:n.id,type:n.type,value:configurationValue(n)}));
   const defaults=equipmentOptions('freshman-equipment');
   for(const id of ['equipment-no-drip','equipment-unlocked','equipment-raw-accessories','equipment-truck'])document.getElementById(id).click();
   return {controls,defaults,selected:equipmentOptions('freshman-equipment')};
 })()`);
 const destination=path.join(root,'outputs/randomizer-ui-before-redesign.json');
 if(fs.existsSync(destination))throw Error('Randomizer baseline already exists; preserve the original.');
 fs.writeFileSync(destination,JSON.stringify(inventory,null,2)+'\n');
 console.log('Randomizer inventory:',inventory.controls.length,'canonical controls;',destination);
};
