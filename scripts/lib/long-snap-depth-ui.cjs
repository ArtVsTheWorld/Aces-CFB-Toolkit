const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
 const result=await window.webContents.executeJavaScript(`(async()=>{
  const check=(ok,message)=>{if(!ok)throw Error(message)},wait=async f=>{for(let i=0;i<1600;i++){if(f())return;await new Promise(r=>setTimeout(r,25));}throw Error('Long Snap UI timeout: '+content.textContent.slice(-600));};
  await wait(()=>state.bootstrap);navigate('long-snap');await wait(()=>content.querySelector('[data-other-tool-flow]'));
  check([...content.querySelectorAll('[data-model-help]')].some(n=>n.dataset.modelHelp.includes('Tackle ratings stay unchanged.')),'Settings explain tackle protection');
  document.getElementById('preview').click();await wait(()=>state.genericPreviews.get('long-snap'));
  const result=state.genericPreviews.get('long-snap'),output=document.getElementById('run-output');await wait(()=>output.querySelector('.generic-player-change-card'));
  check(result.details.depthChartsReordered>0,'Actual Preview reorders LS charts');check(result.details.changes.some(p=>p.depthChanged),'Actual Preview includes visible depth moves');
  check(output.querySelector('.generic-player-card-list').textContent.includes('LS Depth Chart'),'Cards show chart changes');
  output.querySelector('[data-generic-view=table]').click();check(output.querySelector('.generic-player-table-view').textContent.includes('Previous LS Depth'),'Table shows old depth');check(output.querySelector('.generic-player-table-view').textContent.includes('New LS Depth'),'Table shows new depth');
  check(!document.getElementById('apply').disabled,'Positive Preview enables Apply');output.querySelector('[data-generic-view=cards]').click();
  const search=document.getElementById('long-snap-result-filter');search.value='LSU';search.dispatchEvent(new Event('input',{bubbles:true}));await wait(()=>result.details.searchQuery==='LSU');check(result.details.changes.length>0&&result.details.changes.every(p=>p.team==='LSU'),'Full-run team search retains real LS moves');
  return {players:result.details.totalPreviewRows,chartsReordered:result.details.depthChartsReordered,chartsSkipped:result.details.depthChartsSkipped,lsuPlayers:result.details.changes.length,lsuMoves:result.details.changes.filter(p=>p.depthChanged).map(p=>({player:p.player,position:p.position,from:p.currentValue,to:p.proposedValue}))};
 })()`);
 const dir=path.join(root,'outputs/long-snap-depth-ui');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(result,null,2));
 for(const theme of ['light','dark']){
  await window.webContents.executeJavaScript(`document.documentElement.dataset.theme='${theme}';applyAccentColor({...state.bootstrap.settings,theme:'${theme}'});void 0`);
  await new Promise(r=>setTimeout(r,180));fs.writeFileSync(path.join(dir,theme+'.png'),(await window.webContents.capturePage()).toPNG());
 }
 await window.webContents.executeJavaScript('closeConfigurationDialogs();void 0');await new Promise(r=>setTimeout(r,120));console.log('PASS real Long Snap Preview, Cards/Table depth changes, Apply readiness and full-run search: '+JSON.stringify(result));
};
