const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'background-ipc-'));
app.setPath('userData',path.join(directory,'profile'));app.getAppPath=()=>root;app.disableHardwareAcceleration();
app.on('browser-window-created',(_event,window)=>window.on('show',()=>window.hide()));
// Chromium may retain a profile-file lock until process exit on Windows.
app.once('will-quit',()=>{if(path.dirname(directory)===path.resolve(os.tmpdir())&&path.basename(directory).startsWith('background-ipc-'))try{fs.rmSync(directory,{recursive:true,force:true});}catch{/* The launcher may remove the remaining temporary profile after exit. */}});
app.whenReady().then(async()=>{
  const fixture=path.resolve(root,'../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),savePath=path.join(directory,'DYNASTY-IPC-TEST'),hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');fs.copyFileSync(fixture,savePath);const original=hash(fixture);
  await import(pathToFileURL(path.join(root,'src/main/main.js')));
  let window;for(let attempt=0;attempt<200;attempt++){window=BrowserWindow.getAllWindows()[0];if(window&&!window.webContents.isLoading())break;await new Promise(resolve=>setTimeout(resolve,20));}
  if(!window)throw Error('Main window missing');
  const execute=code=>window.webContents.executeJavaScript(code,true),ticks=[];const timer=setInterval(()=>ticks.push(Date.now()),20);
  try{
    const summary=await execute(`(async()=>{const savePath=${JSON.stringify(savePath)};const api=window.cfbToolkit,updates=[];const stop=api.onToolProgress(update=>updates.push(update));await api.setActiveSave(savePath);const boot=await api.bootstrap();if(!boot.activeSave.schema.supported)throw Error('Async bootstrap schema missing');await api.prepareTool({toolId:'equipment-patcher',savePath});const preview=await api.runTool({toolId:'equipment-patcher',savePath,mode:'preview',options:{pantsFix:true,includedTeams:['LSU'],protectOriginalEaPlayers:false,seed:1776}});if(!preview.planId||!preview.executionId)throw Error('Preview/history missing');const applied=await api.runTool({toolId:'equipment-patcher',savePath,mode:'apply',options:{planId:preview.planId}});const review=await api.getReview(applied.executionId),history=await api.listHistory();stop();if(applied.status!=='completed'||!applied.backupPath||!review?.rows.length||history.length!==2)throw Error('Apply/review/history failed');if(!updates.some(update=>update.percent>30&&update.percent<90))throw Error('Real IPC progress missing');return {players:preview.details.totalPreviewRows,reviewRows:review.rows.length,history:history.length,progressEvents:updates.length,backupPath:applied.backupPath}})()`);
    clearInterval(timer);const maxGap=Math.max(...ticks.slice(1).map((time,index)=>time-ticks[index]));if(maxGap>1500||ticks.length<50)throw Error('Main loop blocked: '+maxGap+' ms');if(hash(fixture)!==original||hash(summary.backupPath)!==original)throw Error('Source/backup mismatch');
    fs.writeFileSync(path.join(root,'outputs/background-ipc-result.json'),JSON.stringify({...summary,testDirectory:directory,maxMainLoopGapMs:maxGap,parentTicks:ticks.length,sourceUnchanged:true},null,2));console.log('PASS actual main/preload IPC: async schema/bootstrap, Preview, Apply, review/history, progress and responsive main loop; max gap '+maxGap+' ms.');
  }finally{clearInterval(timer);}
}).then(()=>app.quit()).catch(error=>{console.error(error);app.exit(1);});
