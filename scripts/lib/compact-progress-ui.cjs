const {ipcMain} = require('electron');
const fs = require('node:fs'), path = require('node:path');
module.exports = async function compactProgressUi(window, root) {
  const execute = code => window.webContents.executeJavaScript(code, true);
  await execute(`window.compactCheck=(condition,label)=>{if(!condition)throw Error(label)};window.compactSample={row:1,player:'Example Player',team:'LSU',position:'WR',classYear:'Senior',overall:89,currentValue:'Multiple donors',donorUses:[{group:'helmet',donor:{row:2,firstName:'One',lastName:'Donor',team:'Florida',position:'WR'}}],changes:[{type:'Arm sleeve',currentValue:'<Original sleeve>',proposedValue:'RAW Jamo Sleeves — White'}],modPoolAdditions:{raw:[{displayName:'Diamond Necklace'}]},brandCorrections:[{slot:'Cleats',oldItem:'Unbranded Cleats',newItem:'Nike Team Cleats',reason:'Compatible donor item'}],fallbackNotes:['Used a different position-family donor. '+ 'LongEquipmentAsset'.repeat(15)]};void 0`);
  for (const kind of ['freshman-equipment','equipment-quickstart','equipment-patcher']) {
    await execute(`(()=>{state.equipmentView='cards';const result={resultKind:${JSON.stringify(kind)},mode:'preview',status:'preview',summary:[],details:{changes:[compactSample,{...compactSample,row:3,player:'Second Player'}],totalPreviewRows:2}};content.innerHTML='<div id=run-output></div>';renderResult(document.getElementById('run-output'),result);compactCheck(content.querySelectorAll('.equipment-preview-row').length===2,'Two compact rows');compactCheck(content.querySelectorAll('.equipment-preview-logo').length===2,'Player team logos');compactCheck(!content.querySelector('.equipment-preview-row[open]'),'Collapsed by default');compactCheck(!content.textContent.includes('Original sleeve'),'Details are lazy');content.querySelector('.equipment-preview-row>summary').click()})()`);
    await execute(`new Promise(resolve=>setTimeout(resolve,30))`);
    await execute(`(()=>{const row=content.querySelector('.equipment-preview-row');compactCheck(row.open&&row.textContent.includes('<Original sleeve>')&&row.textContent.includes('RAW Jamo Sleeves'),'Dropdown shows before/after');compactCheck(!row.querySelector('original'),'Values escaped');compactCheck(!content.querySelectorAll('.equipment-preview-row')[1].open,'Other player stays collapsed');if(${JSON.stringify(kind)}!=='equipment-patcher')compactCheck(row.textContent.includes('One Donor')&&row.textContent.includes('Diamond Necklace'),'Sources inside dropdown');content.querySelector('[data-equipment-view=table]').click();compactCheck(!content.querySelector('.equipment-table-view').hidden,'Table available');compactCheck(!content.querySelector('.equipment-table-details').open,'Table starts collapsed');content.querySelector('.equipment-table-details>summary').click()})()`);
    await execute(`new Promise(resolve=>setTimeout(resolve,30))`);
    await execute(`compactCheck(content.querySelector('.equipment-table-details').textContent.includes('RAW Jamo Sleeves'),'Exact table details');void 0`);
  await execute(`document.querySelector('[data-equipment-view=cards]').click();content.querySelectorAll('.equipment-card-list .randomizer-gear-details').forEach(panel=>panel.open=true);void 0`);
  for (const width of [1480,760,520]) for (const theme of ['light','dark']) {
    window.setContentSize(width,850);
    await execute(`document.documentElement.dataset.theme=${JSON.stringify(theme)};void 0`);
    await execute(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
    await execute(`(()=>{for(const summary of content.querySelectorAll('.equipment-preview-row>summary')){compactCheck(summary.scrollWidth<=summary.clientWidth+2,'Summary fits '+innerWidth);const logo=summary.querySelector('.equipment-preview-logo').getBoundingClientRect();compactCheck(logo.width===36&&logo.height===36,'Logo stays jersey-sized at '+innerWidth)}for(const panel of content.querySelectorAll('.equipment-card-list .randomizer-gear-details')){const card=panel.closest('.equipment-preview-row'),a=card.getBoundingClientRect(),b=panel.getBoundingClientRect();compactCheck(panel.closest('.equipment-preview-body'),'Compatibility belongs inside card body');compactCheck(b.left>=a.left&&b.right<=a.right,'Dropdown stays within card');compactCheck(card.scrollWidth<=card.clientWidth+2,'No card content overflow')} })()`);
    fs.writeFileSync(path.join(root,`outputs/compact-equipment-${kind}-${width}-${theme}.png`),(await window.webContents.capturePage()).toPNG());
  }
  }
  const flights=[];
  ipcMain.removeHandler('tools:prepare');
  ipcMain.handle('tools:prepare',(event,request)=>new Promise((resolve,reject)=>{flights.push({event,request,resolve,reject});}));
  const waitFlight = async () => { for(let attempt=0;attempt<50&&!flights.length;attempt++)await new Promise(resolve=>setTimeout(resolve,10));if(!flights.length)throw Error('Missing progress request');return flights.shift(); };
  const start = async () => { await execute(`content.innerHTML=toolLoading('Loading equipment…');window.progressFlight=window.cfbToolkit.prepareTool({toolId:'equipment-patcher'}).catch(error=>({error:error.message}));void 0`);return waitFlight(); };
  const send=(flight,percent)=>flight.event.sender.send('tools:progress',{operationId:flight.request.operationId,percent,message:'Processing players…'});
  const first=await start();send(first,64);send(first,10);
  await execute(`new Promise(resolve=>setTimeout(resolve,20))`);
  await execute(`compactCheck(content.querySelector('progress').value===64&&content.querySelector('[data-progress-percent]').textContent==='64%','Progress monotonic')`);
  first.reject(new Error('Test validation failure'));
  await execute(`progressFlight.then(()=>{compactCheck(content.querySelector('progress').value===64,'Failure never reaches 100');compactCheck(content.textContent.includes('Stopped:'),'Failure state shown')})`);
  const old=await start(), current=await start();send(old,88);send(current,35);
  await execute(`new Promise(resolve=>setTimeout(resolve,20))`);
  await execute(`compactCheck(content.querySelector('progress').value===35,'Stale request ignored')`);
  old.resolve({});current.resolve({});await execute(`progressFlight.then(()=>compactCheck(content.querySelector('progress').value===100,'Success reaches 100'))`);
  await execute(`content.innerHTML='';window.progressFlight=window.cfbToolkit.prepareTool({toolId:'equipment-quickstart'});void 0`);
  const floating=await waitFlight();send(floating,52);await execute(`new Promise(resolve=>setTimeout(resolve,20))`);
  await execute(`compactCheck(document.querySelector('#tool-progress-tray progress').value===52,'Background meter visible')`);
  fs.writeFileSync(path.join(root,'outputs/tool-progress-ui.png'),(await window.webContents.capturePage()).toPNG());
  floating.resolve({});await execute(`progressFlight.then(()=>compactCheck(!document.querySelector('#tool-progress-tray'),'Completed meter removed'))`);
  console.log('PASS compact lazy dropdowns, escaped details, table view, responsive light/dark layouts, scoped progress, stale requests, failures and background meters.');
};
