const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 const observed=await window.webContents.executeJavaScript(`(async()=>{
  const check=(ok,message)=>{if(!ok)throw Error(message)},wait=async f=>{for(let i=0;i<1200;i++){if(f())return;await new Promise(r=>setTimeout(r,25));}throw Error('Removal preview timeout: '+content.textContent.slice(-600));};
  await wait(()=>state.bootstrap);navigate('equipment-patcher');await wait(()=>content.querySelector('[data-patcher-flow]')?.patcherCards);
  const open=title=>{const entry=[...content.querySelectorAll('.configuration-entry')].find(n=>n.textContent.includes(title));check(entry,'Configuration '+title);entry.querySelector('[data-config-open]').click();return document.querySelector('dialog[open]');};
  let d=open('Player Filters');const protection=configurationRead(d,'equipment-protect-ea');protection.checked=false;protection.dispatchEvent(new Event('change',{bubbles:true}));const positions=configurationRead(d,'equipment-positions');for(const option of positions.options)option.selected=option.value==='WR';positions.dispatchEvent(new Event('change',{bubbles:true}));d.querySelector('[data-config-save]').click();
  d=open('Teams');const teams=configurationRead(d,'equipment-included');for(const option of teams.options)option.selected=option.value==='LSU';teams.dispatchEvent(new Event('change',{bubbles:true}));d.querySelector('[data-config-save]').click();
  document.getElementById('fix-remove-equipment').click();document.getElementById('equipment-step-next').click();content.querySelector('[data-patcher-setting="fix-remove-equipment"] [data-config-open]').click();d=document.querySelector('dialog[open]');
  const ids=['GearVisor_visorClear','GearVisor_visorOakley_clear','GearMouthpiece_PacifierDualHanging_White','GearMouthpiece_PacifierDualHanging_TeamColor'];
  for(const id of ids){const choice=[...d.querySelectorAll('[data-option-choice]')].find(n=>n.value===id);check(choice,'Catalog '+id);choice.click();}
  d.querySelector('[data-config-save]').click();check(equipmentOptions('equipment-patcher').removeEquipmentItems.length===ids.length,'Dialog selections reach run options');
  document.getElementById('equipment-preview').click();await wait(()=>state.equipmentPreviews.get('equipment-patcher'));
  const result=state.equipmentPreviews.get('equipment-patcher'),rows=result.details.changes,output=document.getElementById('run-output');
  check(result.details.totalPreviewRows>0&&rows.length>0,'Actual removal preview has players');check(rows.every(row=>row.team==='LSU'&&row.position==='WR'&&row.changes.some(change=>change.type==='Remove Specific Item(s)'&&change.proposedValue.includes('Not Equipped'))),'Scoped removal rows show item before and after');
  await wait(()=>output.querySelector('.equipment-change-card summary'));output.querySelector('.equipment-change-card summary').click();await wait(()=>output.querySelector('.equipment-preview-body')?.textContent.includes('Not Equipped'));output.querySelector('[data-equipment-view=table]').click();output.querySelector('.equipment-table-details summary').click();await wait(()=>output.querySelector('.equipment-table-view').textContent.includes('Not Equipped'));output.querySelector('[data-equipment-view=cards]').click();check(!document.getElementById('equipment-apply').disabled,'Visible preview is applicable');
  return {players:result.details.totalPreviewRows,removalPlayers:result.details.removeEquipmentPlayersChanged,actions:result.details.totalCorrectionActions,firstPlayer:rows[0].player,reportPath:result.reportPath};
 })()`);
 fs.writeFileSync(path.join(root,'outputs/v245-removal-preview-ui-result.json'),JSON.stringify(observed,null,2));
 window.setSize(1480,960);await new Promise(r=>setTimeout(r,180));fs.writeFileSync(path.join(root,'outputs/v245-removal-preview-ui.png'),(await window.webContents.capturePage()).toPNG());
 console.log('PASS real UI -> native Preview -> visible filtered removal players: '+JSON.stringify(observed));
 await window.webContents.executeJavaScript('closeConfigurationDialogs();void 0');await new Promise(r=>setTimeout(r,120));
};
