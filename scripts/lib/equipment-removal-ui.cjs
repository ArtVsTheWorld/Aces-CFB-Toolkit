const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 await window.webContents.executeJavaScript(`(async()=>{
  const check=(ok,message)=>{if(!ok)throw Error(message)},wait=async f=>{for(let i=0;i<600;i++){if(f())return;await new Promise(r=>setTimeout(r,25));}throw Error('Removal UI timeout');};
  await wait(()=>state.bootstrap);navigate('equipment-patcher');await wait(()=>content.querySelector('[data-patcher-flow]')?.patcherCards);
  const toggle=document.getElementById('fix-remove-equipment'),select=document.getElementById('equipment-remove-items');check(toggle&&!toggle.checked,'Removal starts off');check(select.options.length>900,'Full named catalog');check([...select.options].every(o=>o.textContent.trim()),'Display names');
  toggle.click();document.getElementById('equipment-step-next').click();const card=content.querySelector('[data-patcher-setting="fix-remove-equipment"]');check(!card.hidden,'Shared configure card');card.querySelector('[data-config-open]').click();let dialog=document.querySelector('dialog[open]');check(dialog?.classList.contains('tool-ui-dialog'),'Shared modal');
  const choice=dialog.querySelector('[data-option-choice]');choice.click();const picked=choice.value;dialog.querySelector('[data-config-cancel]').click();check(select.selectedOptions.length===0,'Cancel preserves selection');
  card.querySelector('[data-config-open]').click();dialog=document.querySelector('dialog[open]');dialog.querySelector('[data-option-choice]').click();dialog.querySelector('[data-config-save]').click();check(select.selectedOptions.length===1,'Save commits choice');const options=equipmentOptions('equipment-patcher');check(options.removeEquipment&&options.removeEquipmentItems[0]===picked,'Canonical serializer');check(options.includedTeams.length===0,'Shared team filters retained');
  card.querySelector('[data-config-open]').click();dialog=document.querySelector('dialog[open]');const search=dialog.querySelector('[data-option-search]');search.value='sleeveless';search.dispatchEvent(new Event('input',{bubbles:true}));check([...dialog.querySelectorAll('[data-option-row]')].some(row=>!row.hidden),'Catalog search');
 })()`);
 const directory=path.join(root,'outputs/v243-removal-ui');fs.mkdirSync(directory,{recursive:true});
 for(const [theme,width]of [['dark',1480],['light',520]]){window.setSize(width,960);await window.webContents.executeJavaScript(`document.documentElement.dataset.theme='${theme}';void 0`);await new Promise(r=>setTimeout(r,150));fs.writeFileSync(path.join(directory,theme+'.png'),(await window.webContents.capturePage()).toPNG());}
 console.log('PASS full catalog, shared configure modal, cancel/save, serializer, search, responsive screenshots');
};
