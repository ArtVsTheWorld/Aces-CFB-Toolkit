const {app,BrowserWindow,dialog}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),arg=name=>process.argv.find(v=>v.startsWith(name+'='))?.slice(name.length+1),appRoot=path.resolve(arg('--app-root')||root),directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-loading-'));
const profile=path.join(directory,'profile'),output=path.resolve(arg('--output')||'outputs/save-loading.json'),limit=Number(arg('--timeout')||60000);
fs.mkdirSync(profile);const legacy=arg('--legacy-profile');
if(legacy){fs.copyFileSync(path.join(legacy,'history.json'),path.join(profile,'history.json'));fs.writeFileSync(path.join(profile,'settings.json'),JSON.stringify({teamArtwork:{},recentSaves:[]}));}
app.setPath('userData',profile);app.getAppPath=()=>appRoot;app.getVersion=()=>JSON.parse(fs.readFileSync(path.join(appRoot,'package.json'))).version;app.disableHardwareAcceleration();
if(appRoot.endsWith('.asar')){Object.defineProperty(app,'isPackaged',{get:()=>true});Object.defineProperty(process,'resourcesPath',{value:path.dirname(appRoot),configurable:true});process.env.PORTABLE_EXECUTABLE_FILE='save-loading-test';}
app.on('browser-window-created',(_event,w)=>w.on('show',()=>w.hide()));
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex'),result={appRoot,isolatedProfile:true};let timer,timeout,finished=false;
app.once('will-quit',()=>{if(path.dirname(directory)===path.resolve(os.tmpdir())&&path.basename(directory).startsWith('cfb-loading-'))try{fs.rmSync(directory,{recursive:true,force:true});}catch{}});
app.whenReady().then(async()=>{
  const original=path.resolve(arg('--save')||path.join(root,'../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN')),before=hash(original),copy=path.join(directory,'DYNASTY-LOADING-TEST');fs.copyFileSync(original,copy);
  dialog.showOpenDialog=async()=>({canceled:false,filePaths:[copy]});
  await import(pathToFileURL(path.join(appRoot,'src/main/main.js')));
  let w;for(let n=0;n<2000;n++){w=BrowserWindow.getAllWindows()[0];if(w&&!w.webContents.isLoading())break;await new Promise(r=>setTimeout(r,20));}
  const execute=code=>w.webContents.executeJavaScript(code,true),ticks=[];timer=setInterval(()=>ticks.push(Date.now()),20);
  const start=Date.now();
  timeout=setTimeout(()=>{result.timeToReadyMs=null;result.timedOutAfterMs=Date.now()-start;finish(1);},limit);
  await execute(`window.loadingEvents=[];window.cfbToolkit.onToolProgress(u=>loadingEvents.push({channel:u.channel,phase:u.phase,percent:u.percent}));window.loadingDone=false;window.loadingError=null;chooseActiveSave().then(()=>loadingDone=true,e=>loadingError=e.message);void 0`);
  await new Promise(r=>setTimeout(r,100));result.visibleLoading=await execute(`Boolean(document.querySelector('[data-save-loading] .tool-progress'))`);
  if(process.argv.includes('--require-loading')&&!result.visibleLoading)throw Error('Save loading pane was not visible');
  while(!await execute('loadingDone||loadingError'))await new Promise(r=>setTimeout(r,50));
  const status=await execute('({error:loadingError,save:state.activeSave?.dynastyId,home:state.homeContext?.dynastyId,events:loadingEvents})');
  if(status.error||!status.save||status.home!==status.save)throw Error('Save did not become ready: '+JSON.stringify(status));
  result.timeToReadyMs=Date.now()-start;result.progressEvents=status.events.length;
  await new Promise(r=>setTimeout(r,1500));
  result.unassignedHistoryDuringBackground=await execute(`(async()=>(await window.cfbToolkit.listHistory()).filter(entry=>!entry.dynastyId).length)()`);
  const again=Date.now();await execute(`state.seasonLinesSave=state.activeSave.path;state.seasonLines={rows:[]};chooseActiveSave()`);result.repeatTimeToReadyMs=Date.now()-again;
  if(hash(original)!==before||hash(copy)!==before)throw Error('Loading modified a save');result.savesUnchanged=true;
  result.mainLoopMaxGapMs=Math.max(0,...ticks.slice(1).map((t,i)=>t-ticks[i]));finish();
}).catch(error=>{console.error(error);result.error=error.message;finish(1);});
function finish(code=0){if(finished)return;finished=true;clearInterval(timer);clearTimeout(timeout);fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=code;app.quit();}
