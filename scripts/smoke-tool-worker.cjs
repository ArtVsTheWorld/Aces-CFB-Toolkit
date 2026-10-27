const {app}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{pathToFileURL}=require('node:url'),{createHash,randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),argument=name=>process.argv.find(value=>value.startsWith(name+'='))?.slice(name.length+1);
const appRoot=path.resolve(argument('--app-root')||root),quickstart=process.argv.includes('--quickstart'),randomizer=process.argv.includes('--randomizer');
const previewOnly=process.argv.includes('--preview-only'),includeOriginals=process.argv.includes('--include-originals'),allTeams=process.argv.includes('--all-teams');
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tool-worker-electron-'));
  let client,timer;
  try {
    const {ToolWorkerClient}=await import(pathToFileURL(path.join(appRoot,'src/main/services/toolWorkerClient.js')));
    const {validateSaveContainer}=await import(pathToFileURL(path.join(appRoot,'src/main/services/saveContainer.js')));
    const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    const source=path.resolve(argument('--save')||path.join(root,'../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN')),before=hash(source),savePath=path.join(directory,'DYNASTY-WORKER-TEST');fs.copyFileSync(source,savePath);
    client=new ToolWorkerClient({memoryFile:path.join(directory,'memory.json'),reportsDirectory:path.join(directory,'reports'),reviewsDirectory:path.join(directory,'reviews')});
    const context={toolId:quickstart?'equipment-quickstart':randomizer?'freshman-equipment':'equipment-patcher',savePath,schemaPath:path.join(root,'resources/engine-data/C27_486_6.gz'),defaultMapPath:path.join(root,'resources/commentary-data/PlayerCommentaryidMap.txt')};
    const ticks=[];timer=setInterval(()=>ticks.push(Date.now()),20);
    const inspected=await client.request('inspect',{savePath,schemaDirectory:path.dirname(context.schemaPath)});if(!inspected.supported)throw Error('Schema inspection failed');
    await client.request('prepare',context);
    const options=quickstart?{unlocked:true,raw:true,gameday:true,...includeOriginals?{protectOriginalEaPlayers:false}:{}}:randomizer?{...!allTeams?{includedTeams:['LSU']}:{},protectOriginalEaPlayers:false,noDripProfile:true,usingUnlockedMod:true,usingRawAccessoriesMod:true,usingEquipmentTruckMod:true,seed:1776}:{pantsFix:true,...!allTeams?{includedTeams:['LSU']}:{},protectOriginalEaPlayers:false,seed:1776};
    const progress={preview:[],apply:[]};
    const audit=mode=>({runId:randomUUID(),appVersion:JSON.parse(fs.readFileSync(path.join(appRoot,'package.json'))).version,mode,savePath});
    const previewAudit=audit('preview'),preview=await client.request('run',{...context,mode:'preview',options,audit:previewAudit},update=>progress.preview.push(update));
    if(hash(savePath)!==before||!preview.result.details.totalPreviewRows)throw Error('Preview must be read-only and contain changes');
    const search=await client.request('search',{planId:preview.result.planId,query:''});if(search.totalMatches!==preview.result.details.totalPreviewRows)throw Error('Worker preview lost search rows');
    const savedReview=await client.request('review',{id:previewAudit.runId}),overview=preview.result.details.equipmentOverview;
    if(!preview.reviewAvailable||overview?.players!==search.totalMatches||savedReview.result.details.equipmentOverview?.players!==savedReview.rows.length||overview.changes!==savedReview.rows.reduce((sum,row)=>sum+(row.changes?.length??0),0))throw Error('Full preview/saved-review equipment totals mismatch');
    const {default:pages}=await import(pathToFileURL(path.join(appRoot,'src/shared/previewPages.cjs'))),index=pages.createIndex(savedReview.rows),lastPage=await client.request('search',{planId:preview.result.planId,query:'',page:Math.ceil(search.totalMatches/100)-1}),expected=pages.page(index,{page:Math.ceil(search.totalMatches/100)-1});
    if(preview.result.details.changes.length>100||search.changes.length>100||JSON.stringify(lastPage.changes)!==JSON.stringify(expected.changes))throw Error('100-row transport or final-page mismatch');
    const needle=expected.changes.at(-1)?.player,lastSearch=await client.request('search',{planId:preview.result.planId,query:needle});
    if(!lastSearch.changes.some(row=>row.player===needle))throw Error('Last full-plan player not searchable');
    if(argument('--preview-result'))fs.writeFileSync(path.resolve(argument('--preview-result')),JSON.stringify({result:preview.result,rows:savedReview.rows}));
    if(previewOnly){
      clearInterval(timer);timer=null;
      const result={toolId:context.toolId,appRoot,options,players:overview.players,equipmentOverview:overview,firstPageRows:preview.result.details.changes.length,pages:search.previewPage.pages,lastPage:lastPage.previewPage,lastPlayerSearchVerified:true,reviewRows:savedReview.rows.length,sourceUnchanged:hash(source)===before,copyUnchanged:hash(savePath)===before,memoryWritten:fs.existsSync(path.join(directory,'memory.json')),progressUpdates:progress.preview.length,maxParentGapMs:Math.max(...ticks.slice(1).map((time,i)=>time-ticks[i]))};
      if(!result.sourceUnchanged||!result.copyUnchanged||result.memoryWritten)throw Error('Preview changed save or player memory');
      fs.writeFileSync(path.resolve(argument('--output')||'outputs/tool-worker-electron.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));return;
    }
    const applied=await client.request('run',{...context,mode:'apply',options:{planId:preview.result.planId},audit:audit('apply')},update=>progress.apply.push(update));
    if(applied.result.status!=='completed'||hash(applied.result.backupPath)!==before)throw Error('Exact backed-up Apply failed');
    if(quickstart&&(!applied.result.details.trackingSaved||applied.result.details.rememberedAfter!==preview.result.details.totalPreviewRows))throw Error('Quickstart tracking mismatch');
    clearInterval(timer);timer=null;
    const maxGap=Math.max(...ticks.slice(1).map((time,index)=>time-ticks[index]));if(ticks.length<50||maxGap>1500)throw Error('Parent event loop stalled: '+maxGap+' ms');
    for(const updates of Object.values(progress))if(updates.length<10||updates.some((update,index)=>update.percent>=100||(index&&update.percent<updates[index-1].percent)))throw Error('Invalid measured progress');
    if(hash(source)!==before||fs.statSync(source).size!==fs.statSync(savePath).size)throw Error('Source changed or container expanded');
    if(applied.result.details.equipmentOverview?.players!==overview.players)throw Error('Applied overview lost full preview totals');
    const completedSearch=await client.request('search',{planId:applied.result.planId,query:'',page:search.previewPage.pages-1});
    if(completedSearch.totalMatches!==search.totalMatches||applied.result.details.changes.length>100)throw Error('Applied full-plan paging lost rows');
    const {parseCsv}=await import(pathToFileURL(path.join(appRoot,'src/main/services/reportAudit.js'))),{loadEquipmentTables}=await import(pathToFileURL(path.join(appRoot,'src/main/tools/equipment/shared.js')));
    const [headings,...reportRows]=parseCsv(fs.readFileSync(applied.result.reportPath,'utf8')),visualColumn=headings.indexOf('CharacterVisualsRow'),afterColumn=headings.indexOf('AfterRawData'),expectedVisuals=new Map(reportRows.filter(row=>row[afterColumn]).map(row=>[Number(row[visualColumn]),row[afterColumn]]));
    if(!expectedVisuals.size)throw Error('Equipment report lacks complete Apply expectations');
    const reopened=await loadEquipmentTables(savePath,context.schemaPath);
    for(const [row,raw] of expectedVisuals)assert.deepEqual(JSON.parse(reopened.visuals.records[row].RawData),JSON.parse(raw),'Exact applied appearance row '+row);
    const result={toolId:context.toolId,appRoot,electron:process.versions.electron,node:process.versions.node,players:preview.result.details.totalPreviewRows,equipmentOverview:overview,reviewOverviewVerified:true,firstPageRows:preview.result.details.changes.length,pages:search.previewPage.pages,lastPlayerSearchVerified:true,completedPagingVerified:true,verifiedVisualRows:expectedVisuals.size,sourceUnchanged:true,backupMatches:true,trackingSaved:applied.result.details.trackingSaved??null,parentTicks:ticks.length,maxParentGapMs:maxGap,progress,container:validateSaveContainer(fs.readFileSync(savePath))};
    fs.writeFileSync(path.resolve(argument('--output')||'outputs/tool-worker-electron.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify({...result,progress:{preview:progress.preview.length,apply:progress.apply.length}}));
  } finally {
    if(timer)clearInterval(timer);
    await client?.close();
    if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('tool-worker-electron-'))throw Error('Unsafe test cleanup');
    fs.rmSync(directory,{recursive:true,force:true});
  }
}).then(()=>app.quit()).catch(error=>{console.error(error);app.exit(1);});
