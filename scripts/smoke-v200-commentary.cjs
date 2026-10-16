// Hidden renderer with real read-only Commentary analysis and Preview. Never Apply.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const uiRoot = path.resolve(process.argv.find(arg => arg.startsWith('--ui-root='))?.slice(10) || root);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cfb-v200-commentary-'));
app.setPath('userData', path.join(temporary, 'settings')); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const load = file => import(pathToFileURL(path.join(root, file)));
  const { registrySnapshot } = await load('src/shared/toolRegistry.js');
  const { prepareCommentary, runCommentary } = await load('src/main/tools/commentary/runner.js');
  const { ReportService } = await load('src/main/services/reports.js');
  const context = { savePath: path.resolve(root, '../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'), schemaPath: path.join(root, 'resources/engine-data/C27_486_6.gz'), defaultMapPath: path.join(root, 'resources/commentary-data/PlayerCommentaryidMap.txt'), reports: new ReportService(path.join(temporary, 'reports')) };
  ipcMain.handle('app:bootstrap', () => ({ app: { version:'20.0', schemas:[] }, registry:registrySnapshot(), settings:{theme:'light',toolPresets:[]}, activeSave:{path:context.savePath,name:'Read-only Commentary Test',exists:true,schema:{supported:true,version:'C27_486_6'}} }));
  for(const channel of ['history:list','reports:list','logs:list']) ipcMain.handle(channel, () => []);
  ipcMain.handle('updates:status', () => ({phase:'disabled'}));
  ipcMain.handle('home:context', () => ({teams:[],controlledTeams:[],artwork:{}}));
  ipcMain.handle('home:lines', () => ({rows:[],profiles:[]}));
  ipcMain.handle('tools:prepare', async (_event, request) => {
    const started=performance.now();
    if(request.options?.scopeCatalogOnly) await new Promise(resolve=>setTimeout(resolve,500));
    const result=await prepareCommentary({...context,options:request.options});
    console.log('prepare',request.options?.scopeCatalogOnly?'scope':'matches',Math.round(performance.now()-started)+'ms'); return result;
  });
  ipcMain.handle('tools:run', (_event, request) => { if(request.mode!=='preview') throw new Error('Smoke test forbids Apply'); return runCommentary({...context,mode:'preview',options:request.options}); });
  const window = new BrowserWindow({show:false,width:1480,height:1000,webPreferences:{preload:path.join(uiRoot,'src/main/preload.cjs'),contextIsolation:true,sandbox:true,offscreen:true,backgroundThrottling:false}});
  window.webContents.on('console-message', details => { if(details.level==='error' || details.message.startsWith('commentary-change')) console.error(details.message); });
  await window.loadFile(path.join(uiRoot,'src/renderer/index.html'));
  const result=await window.webContents.executeJavaScript(`(async()=>{
    const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),wait=async fn=>{for(let i=0;i<400;i++){if(fn())return;await delay(50);}throw new Error('Commentary UI timed out: '+content.textContent.slice(-900));};
    await wait(()=>state.bootstrap); state.toolSettings.set('commentary-id',{'commentary-classes':['Freshman']}); navigate('commentary-id');
    await wait(()=>document.getElementById('analyze-commentary'));
    content.addEventListener('change',event=>console.log('commentary-change '+event.target.id+' analyzing='+document.getElementById('analyze-commentary')?.dataset.analyzing+' token='+document.getElementById('analysis-output')?.dataset.runToken));
    const start=performance.now(); await analyzeCommentary();
    await wait(()=>state.commentaryReview?.lastResult);
    if(state.commentaryReview.options.scope.classes[0]!=='Freshman')throw new Error('Analysis lost the restored scope');
    const elapsed=Math.round(performance.now()-start); const result=state.commentaryReview.lastResult;
    if(result.mode!=='preview')throw new Error('Analysis did not reach final Preview');
    return {elapsedMs:elapsed,rows:result.details.totalPreviewRows,scope:result.details.scope};
  })()`);
  console.log('Real Commentary Analyze -> automatic final Preview, including delayed scope restoration:',result);
  window.close(); app.quit();
}).catch(error=>{console.error(error);app.exit(1);});
