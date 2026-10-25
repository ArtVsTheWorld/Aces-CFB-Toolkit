const {app,BrowserWindow,dialog,nativeImage}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),argument=name=>process.argv.find(value=>value.startsWith(name+'='))?.slice(name.length+1),appRoot=path.resolve(argument('--app-root')||root),directory=fs.mkdtempSync(path.join(os.tmpdir(),'dynasty-profile-ipc-'));
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
app.setPath('userData',path.join(directory,'profile'));app.getAppPath=()=>appRoot;app.getVersion=()=>JSON.parse(fs.readFileSync(path.join(appRoot,'package.json'))).version;app.disableHardwareAcceleration();
if(appRoot.endsWith('.asar')){Object.defineProperty(app,'isPackaged',{get:()=>true});Object.defineProperty(process,'resourcesPath',{value:path.dirname(appRoot),configurable:true});process.env.PORTABLE_EXECUTABLE_FILE='dynasty-profile-test';}
app.on('browser-window-created',(_event,window)=>window.on('show',()=>window.hide()));
app.once('will-quit',()=>{if(path.dirname(directory)===path.resolve(os.tmpdir())&&path.basename(directory).startsWith('dynasty-profile-ipc-'))try{fs.rmSync(directory,{recursive:true,force:true});}catch{/* Chromium may hold its isolated profile until process exit. */}});
app.whenReady().then(async()=>{
  const source=path.resolve(root,'../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),other=path.resolve(argument('--other-save')||process.env.CFB_TEST_OTHER_DYNASTY||path.join(root,'../EXAMPLE SAVES VANILLA GAME/DYNASTY-SECOND-DYNASTY')),originals=[source,other].map(hash);
  const first=path.join(directory,'one','DYNASTY-SAME-NAME'),copy=path.join(directory,'DYNASTY-RENAMED'),different=path.join(directory,'two','DYNASTY-SAME-NAME');
  fs.mkdirSync(path.dirname(first));fs.mkdirSync(path.dirname(different));fs.copyFileSync(source,first);fs.copyFileSync(source,copy);fs.copyFileSync(other,different);
  const image=color=>{const bytes=Buffer.alloc(1024*1024*4);for(let i=0;i<bytes.length;i+=4){bytes[i]=color==='blue'?255:0;bytes[i+2]=color==='red'?255:0;bytes[i+3]=255;}return nativeImage.createFromBitmap(bytes,{width:1024,height:1024}).toPNG();};
  const red=path.join(directory,'red.png'),blue=path.join(directory,'blue.png');fs.writeFileSync(red,image('red'));fs.writeFileSync(blue,image('blue'));
  const profile=app.getPath('userData'),legacyLogo=path.join(profile,'team-artwork',createHash('sha256').update('lsu').digest('hex').slice(0,20)+'-logo.png'),legacyBackup=path.join(directory,'legacy-backup');
  fs.mkdirSync(path.dirname(legacyLogo),{recursive:true});fs.copyFileSync(red,legacyLogo);fs.copyFileSync(source,legacyBackup);
  const oldSettings=JSON.stringify({teamArtwork:{lsu:{logo:legacyLogo}},recentSaves:[first]}),oldHistory=JSON.stringify([{id:'00000000-0000-4000-8000-000000000001',timestamp:new Date().toISOString(),toolId:'team-boost',toolName:'Team Boost',inputPath:'missing-old-filename',backupPath:legacyBackup,mode:'apply',status:'completed',summary:[]}]);
  fs.writeFileSync(path.join(profile,'settings.json'),oldSettings);fs.writeFileSync(path.join(profile,'history.json'),oldHistory);
  let selectedImage=red,holdDialog=false,releaseDialog;
  dialog.showOpenDialog=async()=>holdDialog?new Promise(resolve=>releaseDialog=resolve):({canceled:false,filePaths:[selectedImage]});
  await import(pathToFileURL(path.join(appRoot,'src/main/main.js')));
  let window;for(let n=0;n<1500;n++){window=BrowserWindow.getAllWindows()[0];if(window&&!window.webContents.isLoading())break;await new Promise(r=>setTimeout(r,20));}
  if(!window)throw Error('Main window unavailable');
  const execute=code=>window.webContents.executeJavaScript(code,true),ticks=[],timer=setInterval(()=>ticks.push(Date.now()),20);
  try{
    await execute(`window.dCheck=(ok,message)=>{if(!ok)throw Error(message)};window.dSwitch=async file=>{state.activeSave=await window.cfbToolkit.setActiveSave(file);await Promise.all([refreshHomeContext(),refreshHistory()]);state.page='home';state.seasonLinesSave=file;state.seasonLines={rows:[]};render();return state.activeSave.dynastyId;};void 0`);
    const id=await execute(`dSwitch(${JSON.stringify(first)})`);if(!Number.isInteger(id)||id===0)throw Error('Native dynasty ID missing: '+JSON.stringify(await execute('({active:state.activeSave,homeError:state.homeContextError})')));
    // Legacy recovery is deliberately asynchronous; readiness must not wait for it.
    let recovered=false;for(let n=0;n<150;n++){const entries=await execute('window.cfbToolkit.listHistory()');if(entries[0]?.dynastyId===id){recovered=true;break;}await new Promise(resolve=>setTimeout(resolve,100));}if(!recovered)throw Error('Background history recovery did not finish');await execute('refreshHistory()');
    const preview=await execute(`window.cfbToolkit.runTool({toolId:'equipment-patcher',savePath:${JSON.stringify(first)},mode:'preview',options:{pantsFix:true,includedTeams:['LSU'],protectOriginalEaPlayers:false,seed:1776}})`);
    if(preview.dynastyId!==id)throw Error('Run not scoped to native dynasty ID');
    const metadata=JSON.parse(fs.readFileSync(preview.reportPath+'.meta.json'));if(metadata.audit.dynastyId!==id)throw Error('Report audit identity missing');
    const artwork=await execute(`window.cfbToolkit.chooseTeamArtwork({teamName:'LSU',kind:'logo',dynastyId:${id}})`);
    const header=await execute(`window.cfbToolkit.chooseTeamArtwork({teamName:'LSU',kind:'header',dynastyId:${id}})`);
    const renamed=await execute(`dSwitch(${JSON.stringify(copy)})`);if(renamed!==id)throw Error('Renamed copy changed identity');
    await execute(`dCheck(homeHistory().length===2&&lastToolRun('equipment-patcher'),'Renamed copy shares Home run activity');dCheck(homeHistory()[0].dynastyId===state.activeSave.dynastyId,'History retains native ID');void 0`);
    await execute(`navigate('history');document.getElementById('history-this-dynasty').click();dCheck(document.getElementById('history-count').textContent==='1–2 of 2','History scope combines renamed copies');navigate('home');void 0`);
    const shared=await execute('window.cfbToolkit.homeContext()');if(shared.artwork.lsu?.logo!==artwork.image||shared.artwork.lsu?.header!==header.image)throw Error('Renamed copy lost artwork');
    const rejection=await execute(`window.cfbToolkit.runTool({toolId:'equipment-patcher',savePath:${JSON.stringify(copy)},mode:'apply',options:{planId:${JSON.stringify(preview.planId)}}}).then(()=>null,error=>error.message)`);
    if(!rejection||hash(copy)!==originals[0])throw Error('A preview was allowed to write another saved copy');
    const otherId=await execute(`dSwitch(${JSON.stringify(different)})`);if(!Number.isInteger(otherId)||otherId===id)throw Error('Independent test dynasty identity missing');
    await execute(`dCheck(homeHistory().length===0&&!lastToolRun('equipment-patcher'),'Different dynasty with same filename has independent activity');void 0`);
    const blank=await execute('window.cfbToolkit.homeContext()');if(Object.keys(blank.artwork).length)throw Error('Artwork leaked across dynasties');
    selectedImage=blue;const otherArtwork=await execute(`window.cfbToolkit.chooseTeamArtwork({teamName:'LSU',kind:'logo',dynastyId:${otherId}})`);if(otherArtwork.image===artwork.image)throw Error('Independent artwork overwrote first dynasty');
    await execute(`dSwitch(${JSON.stringify(copy)})`);const firstAgain=await execute('window.cfbToolkit.homeContext()');if(firstAgain.artwork.lsu?.logo!==artwork.image)throw Error('First dynasty artwork changed');
    // A selection change while the native file picker is open cannot write to
    // either dynasty under the wrong context.
    holdDialog=true;
    const pending=execute(`window.cfbToolkit.chooseTeamArtwork({teamName:'LSU',kind:'logo',dynastyId:${id}}).then(()=>null,error=>error.message)`);
    for(let n=0;n<1500&&!releaseDialog;n++)await new Promise(r=>setTimeout(r,20));if(!releaseDialog)throw Error('Artwork dialog did not open');
    await execute(`dSwitch(${JSON.stringify(different)})`);holdDialog=false;releaseDialog({canceled:false,filePaths:[blue]});const race=await pending;if(!/changed/i.test(race??''))throw Error('Stale artwork picker was accepted');
    await execute(`window.cfbToolkit.clearTeamArtwork({teamName:'LSU',kind:'logo',dynastyId:${otherId}})`);const cleared=await execute('window.cfbToolkit.homeContext()');if(cleared.artwork.lsu?.logo)throw Error('Reset did not clear current dynasty');
    await execute(`dSwitch(${JSON.stringify(copy)})`);const preserved=await execute('window.cfbToolkit.homeContext()');if(preserved.artwork.lsu?.logo!==artwork.image)throw Error('Reset in another dynasty cleared first artwork');
    // Reusing the same physical filename for a different native dynasty is also
    // recognized. This overwrites only a private test copy.
    fs.copyFileSync(different,first);const reused=await execute(`dSwitch(${JSON.stringify(first)})`);if(reused!==otherId)throw Error('Identity cache trusted a reused filename');await execute(`dCheck(homeHistory().length===0,'Reused filename cannot inherit old activity');void 0`);
    const reusedApply=await execute(`window.cfbToolkit.runTool({toolId:'equipment-patcher',savePath:${JSON.stringify(first)},mode:'apply',options:{planId:${JSON.stringify(preview.planId)}}}).then(()=>null,error=>error.message)`);if(!/save changed after Preview/i.test(reusedApply??'')||hash(first)!==hash(different))throw Error('Reused-filename dynasty change did not invalidate old Apply');
    const snapshot=await execute(`window.cfbToolkit.getReview(${JSON.stringify(preview.executionId)})`);if(snapshot.result.dynastyId!==id)throw Error('Saved review lost dynasty identity');if(snapshot.dynastyArtwork.lsu?.logo!==artwork.image)throw Error('Historical review borrowed the active dynasty artwork');await execute(`(async()=>{navigate('history');document.getElementById('history-this-dynasty').click();dCheck(document.getElementById('history-count').textContent==='0–0 of 0','Other dynasty does not inherit activity');document.getElementById('history-all-dynasties').click();await openHistoryRun(${JSON.stringify(preview.executionId)});dCheck(state.page==='saved-review'&&forceLogoUrl('LSU')===state.savedReview.artwork.lsu.logo,'Historical review uses its own dynasty artwork');navigate('home');dCheck(!state.savedReview,'Historical artwork URLs released on leave');})()`);
    const history=JSON.parse(fs.readFileSync(path.join(directory,'profile/history.json'))),settings=JSON.parse(fs.readFileSync(path.join(directory,'profile/settings.json')));
    if(history.length!==2||history.some(entry=>entry.dynastyId!==id)||Object.keys(settings.dynastyArtwork).length!==2)throw Error('Profile/history persistence failed');
    if(fs.readFileSync(path.join(profile,'settings.json.before-dynasty-profiles.bak'),'utf8')!==oldSettings||fs.readFileSync(path.join(profile,'history.json.before-dynasty-ids.bak'),'utf8')!==oldHistory||hash(legacyLogo)!==hash(red))throw Error('Legacy profile/history backup was not preserved');
    if([source,other].some((file,index)=>hash(file)!==originals[index]))throw Error('Original fixture changed');
    clearInterval(timer);const maxGap=Math.max(...ticks.slice(1).map((time,index)=>time-ticks[index]));if(maxGap>1500)throw Error('Main event loop stalled: '+maxGap);
    const result={appRoot,renamedCopiesShareIdentity:true,independentDynastiesSeparated:true,reusedFilenameDetected:true,historyAndReviewPersisted:true,historicalArtworkScoped:true,legacyMigrationVerified:true,legacyBackupsPreserved:true,reportAuditScoped:true,artworkSharedById:true,artworkResetIsolated:true,stalePickerRejected:true,crossCopyApplyRejected:true,reusedFilenameApplyRejected:true,originalsUnchanged:true,mainLoopMaxGapMs:maxGap};
    fs.writeFileSync(path.resolve(argument('--output')||'outputs/dynasty-profile-ipc-verification.json'),JSON.stringify(result,null,2));console.log('PASS real main/preload: native dynasty IDs, renamed-copy history/artwork, separate dynasties, reused filenames, isolated resets, stale picker and Apply guards, persistence, unchanged originals; main loop gap '+maxGap+' ms.');
  }finally{clearInterval(timer);}
}).then(()=>app.quit()).catch(error=>{console.error(error);app.exit(1);});
