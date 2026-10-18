// Standalone report smoke only; no app/renderer state or dynasty writes.
const {app,BrowserWindow,nativeTheme}=require('electron'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const report=path.resolve(process.argv[2]||'');if(!fs.existsSync(report)||!report.endsWith('.html'))throw new Error('Pass a generated preview.html report.');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'cfb-v205-report-smoke-')));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
  const window=new BrowserWindow({show:false,width:1480,height:1000,webPreferences:{sandbox:true,contextIsolation:true,offscreen:true,backgroundThrottling:false}}),errors=[];
  window.webContents.on('console-message',details=>{if(details.level==='error')errors.push(details.message);});
  await window.loadFile(report);
  const result=await window.webContents.executeJavaScript(`(()=>{const check=(v,m)=>{if(!v)throw new Error(m);},cards=[...document.querySelectorAll('[data-player]')],input=document.querySelector('#search');check(cards.length>0,'Player cards absent');check(document.body.textContent.includes('Preview only'),'Preview warning missing');const query=cards[0].querySelector('summary strong').textContent;input.value=query;input.dispatchEvent(new Event('input'));check(cards.filter(card=>!card.hidden).length===1,'Name filtering failed');input.value='no-player-matches-this-phrase';input.dispatchEvent(new Event('input'));check(cards.every(card=>card.hidden),'Empty search failed');input.value='';input.dispatchEvent(new Event('input'));check(cards.every(card=>!card.hidden),'Reset search failed');cards[0].open=true;return{cards:cards.length,search:true,details:cards[0].open};})()`);
  for(const[width,theme]of[[1480,'light'],[760,'dark'],[520,'light']]){
    nativeTheme.themeSource=theme;window.setSize(width,width===1480?1000:760);await new Promise(resolve=>setTimeout(resolve,150));
    const bounds=await window.webContents.executeJavaScript(`({width:innerWidth,scroll:document.documentElement.scrollWidth})`);if(bounds.scroll>bounds.width+1)throw new Error('Horizontal report overflow '+JSON.stringify(bounds));
    fs.writeFileSync(path.join(path.dirname(report),`report-${theme}-${width}.png`),(await window.webContents.capturePage()).toPNG());
  }
  if(errors.length)throw new Error(errors.join('\n'));console.log(JSON.stringify({...result,responsive:true,scriptErrors:errors.length}));app.quit();
}).catch(error=>{console.error(error);process.exitCode=1;app.quit();});
