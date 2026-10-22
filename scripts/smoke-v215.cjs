// Hidden Electron test window, isolated settings and copied save. Never opens or
// edits the user's running app, installed settings, or original dynasty.
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),uiRoot=path.resolve(process.argv.find(arg=>arg.startsWith('--ui-root='))?.slice(10)||root),directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-v215-ui-')),savePath=path.join(directory,'DYNASTY-UI-TEST');
const cleanup=async()=>{if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('cfb-v215-ui-'))throw Error('Unsafe test cleanup');await fs.promises.rm(directory,{recursive:true,force:true,maxRetries:4,retryDelay:150});};
app.setPath('userData',path.join(directory,'user-data'));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
  fs.copyFileSync(path.resolve(root,'../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),savePath);
  const imports=async file=>import(pathToFileURL(path.join(uiRoot,file)).href),{registrySnapshot}=await imports('src/shared/toolRegistry.js'),{getToolHandler}=await imports('src/main/tools/handlers.js'),{searchPlanRows}=await imports('src/main/tools/jersey/planStore.js'),{writeCsv}=await imports('src/main/services/files.js'),{ToolPresets}=await imports('src/main/services/toolPresets.js');
  const schemaPath=path.join(root,'resources/engine-data/C27_486_6.gz');let settings={theme:'light',toolPresets:[],toolDefaults:{},textSize:'standard'},report=0;
  const presets=new ToolPresets({get:()=>settings,update:values=>(settings={...settings,...values})});
  ipcMain.handle('app:bootstrap',()=>({app:{version:'22.0',schemas:['C27_486_6']},registry:registrySnapshot(),settings,activeSave:{path:savePath,name:'UI TEST',exists:true,schema:{supported:true,version:'C27_486_6'}},paths:{reports:directory,logs:directory}}));
  for(const channel of ['history:list','reports:list','logs:list'])ipcMain.handle(channel,()=>[]);
  ipcMain.handle('updates:status',()=>({phase:'disabled',message:'Disabled in test'}));
  ipcMain.handle('home:context',()=>({season:{season:2026,week:0},controlledTeams:[],teams:[{name:'LSU'}],artwork:{}}));
  ipcMain.handle('home:lines',()=>({rows:[],profiles:[]}));
  ipcMain.handle('settings:save-preset',(_event,request)=>presets.save(request));ipcMain.handle('settings:delete-preset',(_event,request)=>presets.delete(request));
  ipcMain.handle('tools:prepare',(_event,request)=>getToolHandler(request.toolId).prepare({savePath,schemaPath}));
  ipcMain.handle('tools:search-preview',(_event,request)=>searchPlanRows(request.planId,request.query,1000,request.filters));
  ipcMain.handle('tools:run',(_event,request)=>getToolHandler(request.toolId).run({savePath,schemaPath,mode:request.mode,options:request.options,defaultMapPath:path.join(root,'resources/commentary-data/PlayerCommentaryidMap.txt'),reports:{create:data=>writeCsv(path.join(directory,`report-${++report}.csv`),data.headings,data.rows)}}));
  const window=new BrowserWindow({show:false,width:1480,height:1000,webPreferences:{preload:path.join(uiRoot,'src/main/preload.cjs'),contextIsolation:true,sandbox:true,offscreen:true,backgroundThrottling:false}}),errors=[];
  window.webContents.on('console-message',details=>{if(details.level==='error'&&!/ERR_FILE_NOT_FOUND|frame-ancestors/.test(details.message))errors.push(details.message);});
  await window.loadFile(path.join(uiRoot,'src/renderer/index.html'));
  const execute=source=>window.webContents.executeJavaScript(source);
  await execute(`window.uiCheck=(value,message)=>{if(!value)throw Error(message)};window.uiWait=async predicate=>{for(let i=0;i<1500;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,40));}throw Error('Timed out: '+content.textContent.slice(-800))};void 0;`);
  await execute(`(async()=>{
    await uiWait(()=>state.bootstrap);navigate('about');
    uiCheck(!content.textContent.includes('Optional mod credits')&&!content.textContent.includes('Orckestra'),'About does not list optional mod credits');
    uiCheck(content.querySelector('a[href="https://github.com/ArtVsTheWorld/Aces-CFB-Toolkit"]'),'About retains source link');
    navigate('freshman-equipment');await uiWait(()=>document.querySelector('#equipment-truck'));
    uiCheck(document.querySelector('[data-page="jersey-renumber"] .nav-icon svg')&&document.querySelector('[data-page="team-boost"] .nav-icon svg'),'Jersey and Team Boost share the SVG tool icon style');
    const toggle=document.querySelector('#equipment-truck'),entry=document.querySelector('[data-mod-pool-entry="eljax"]');
    uiCheck(!toggle.checked&&entry.hidden,'Equipment Truck starts disabled and its configuration stays hidden');
    toggle.click();uiCheck(!entry.hidden,'Truck configuration appears when enabled');entry.querySelector('button').click();
    uiCheck(document.querySelector('dialog[open] h2').textContent.includes('Equipment Truck'),'Named Truck editor');
    uiCheck(document.querySelector('dialog[open]').textContent.includes('by ElJax YT'),'Equipment Truck author credited');
    uiCheck(document.querySelectorAll('[data-pool-category] option').length===2,'Only sleeve and visor categories');
    uiCheck(document.querySelectorAll('[data-pool-item]').length===12,'Twelve verified sleeve color choices');
    uiCheck([...document.querySelectorAll('[data-pool-item]')].every(input=>input.closest('label').textContent.includes('Sleeve')),'Readable sleeve labels');
    document.querySelector('[data-pool-item]').click();document.querySelector('dialog [data-config-cancel]').click();entry.querySelector('button').click();
    uiCheck(document.querySelectorAll('[data-pool-item]:checked').length===12,'Cancel discards selection changes');
    const chance=document.querySelector('[data-pool-chance]');chance.value='12.5';chance.dispatchEvent(new Event('input'));uiCheck(document.querySelector('[data-config-save]').disabled,'Whole-number validation');
    chance.value='25';chance.dispatchEvent(new Event('input'));document.querySelector('[data-pool-item]').click();
    const category=document.querySelector('[data-pool-category]');category.value='visors';category.dispatchEvent(new Event('change'));
    uiCheck(document.querySelectorAll('[data-pool-item]').length===2,'Two verified visor choices');
    document.querySelector('[data-pool-chance]').value='40';document.querySelector('[data-pool-chance]').dispatchEvent(new Event('input'));
    document.querySelector('[data-pool-item]').click();document.querySelector('[data-config-save]').click();
    window.truckSavedPool=JSON.parse(document.querySelector('#equipment-mod-pools').value).eljax;
    uiCheck(truckSavedPool.armSleeves.chance===25&&truckSavedPool.armSleeves.items.length===11,'Sleeve chance and selection saved');
    uiCheck(truckSavedPool.visors.chance===40&&truckSavedPool.visors.items.length===1,'Independent visor chance and selection saved');
    const config=presetConfiguration(),saved=await window.cfbToolkit.savePreset({toolId:'freshman-equipment',name:'Truck test',configuration:config});
    uiCheck(saved.configuration.values['equipment-truck']&&JSON.parse(saved.configuration.values['equipment-mod-pools']).eljax.visors.chance===40,'Truck preset serialized');
    uiCheck(presetValues(saved.configuration)['equipment-mod-pools']===config.values['equipment-mod-pools'],'Truck preset reload preserves settings');
    await window.cfbToolkit.deletePreset({toolId:'freshman-equipment',id:saved.id});
    document.querySelector('#equipment-step-next').click();uiCheck(content.textContent.includes('Equipment Truck Pool Settings')&&content.textContent.includes('25%'),'Review exposes selected Truck settings');
    document.querySelector('#equipment-step-back').click();toggle.click();uiCheck(entry.hidden,'Disabling Truck hides its controls');toggle.click();
    navigate('home');navigate('freshman-equipment');await uiWait(()=>document.querySelector('#equipment-truck'));
    uiCheck(document.querySelector('#equipment-truck').checked&&JSON.parse(document.querySelector('#equipment-mod-pools').value).eljax.visors.chance===40,'Navigation preserves pool settings');
  })()`);
  fs.writeFileSync(path.join(root,'outputs/v215-equipment-truck-controls.png'),(await window.webContents.capturePage()).toPNG());
  await execute(`document.querySelector('[data-mod-pool-open="eljax"]').click();void 0;`);
  for(const width of [1480,760,520]){
    window.setContentSize(width,1000);await execute('new Promise(resolve=>setTimeout(resolve,100))');
    await execute(`uiCheck(document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth+2,'Truck editor fits window');uiCheck([...document.querySelectorAll('[data-pool-item]')].every(input=>input.closest('label').scrollWidth<=input.closest('label').clientWidth+2),'Truck names fit without horizontal overflow');void 0;`);
    if(width===1480)fs.writeFileSync(path.join(root,'outputs/v215-equipment-truck-editor.png'),(await window.webContents.capturePage()).toPNG());
  }
  await execute(`document.querySelector('dialog [data-config-cancel]').click();void 0;`);window.setContentSize(1480,1000);
  if(process.argv.includes('--truck-only')){
    if(errors.length)throw Error(errors.join('\n'));console.log('PASS: Equipment Truck default off, hidden entry, 12 readable sleeves/2 visors, independent whole chances, isolated Cancel, Save, presets, review, navigation, and responsive modal.');
    window.destroy();await new Promise(resolve=>setTimeout(resolve,250));await cleanup();app.exit(0);return;
  }
  await execute(`(async()=>{await uiWait(()=>state.bootstrap);navigate('equipment-mapper');await uiWait(()=>document.querySelector('#mapper-add'));uiCheck(document.querySelector('[data-page="equipment-mapper"]'),'Sidebar navigation');uiCheck(!content.textContent.includes('Find Gear. Choose Targets. Review Changes.'),'Professional main page');await new Promise(resolve=>setTimeout(resolve,200));})()`);
  fs.writeFileSync(path.join(root,'outputs/v215-mapper-main.png'),(await window.webContents.capturePage()).toPNG());
  await execute(`(async()=>{
    const p=state.prepared.get('equipment-mapper|'+state.activeSave.path);window.mapperPrepared=p;
    uiCheck(p.items.some(item=>item.slot==='FaceMask'&&item.implicitOccurrences>0),'Previously omitted implicit facemasks cataloged');
    uiCheck(p.libraryPlayers.length>p.players.length,'Non-active saved sources included');
    document.querySelector('#mapper-browse').click();await new Promise(resolve=>setTimeout(resolve,200));
    uiCheck(document.querySelector('dialog[open]'),'Library opens');uiCheck(!document.querySelector('dialog .dialog-section-links'),'No redundant library jump links');
    const first=[...document.querySelectorAll('[data-map-group]')].map(row=>row.dataset.mapGroup);
    uiCheck(first.length===100&&new Set(first).size===100,'One unique item per row with bounded pagination');
    uiCheck(!document.querySelector('[data-map-next]').disabled,'All library pages accessible');document.querySelector('[data-map-next]').click();
    uiCheck([...document.querySelectorAll('[data-map-group]')].every(row=>!first.includes(row.dataset.mapGroup)),'Next page has different items');document.querySelector('[data-map-prev]').click();
    const search=document.querySelector('[data-map-search]');search.value='Light Gladiator';search.dispatchEvent(new Event('input'));
    uiCheck(document.querySelectorAll('[data-map-group]').length===1,'Helmet metadata configurations grouped into one item');
    const backplate=p.groups.find(group=>group.slots.includes('BackPlate')&&group.variantIds.length>1);uiCheck(backplate,'Backplate variants present');search.value=backplate.asset;search.dispatchEvent(new Event('input'));
    uiCheck(document.querySelectorAll('[data-map-group="'+backplate.id+'"]').length===1,'Backplate metadata grouped');
    const waist=p.groups.find(group=>group.slots.includes('WaistWear')&&group.variantIds.length>1);uiCheck(waist,'Waist configurations present');search.value=waist.asset;search.dispatchEvent(new Event('input'));
    uiCheck(document.querySelectorAll('[data-map-group="'+waist.id+'"]').length===1,'Waist metadata grouped');
    const sleeve=p.groups.find(group=>group.copyable&&group.slots.includes('LeftArmWear')&&group.slots.includes('RightArmWear'));uiCheck(sleeve,'Bilateral sleeve available');window.mapperSleeve=sleeve;
    search.value=sleeve.asset;search.dispatchEvent(new Event('input'));
    const row=document.querySelector('[data-map-group="'+sleeve.id+'"]');uiCheck(row,'Sleeve appears once');uiCheck(row.querySelector('[data-map-side-slot]'),'Compact side selector');
    window.mapperSideTestId=sleeve.id;
  })()`);
  fs.writeFileSync(path.join(root,'outputs/v215-mapper-library.png'),(await window.webContents.capturePage()).toPNG());
  await execute("document.documentElement.dataset.theme='dark';new Promise(resolve=>setTimeout(resolve,100))");
  fs.writeFileSync(path.join(root,'outputs/v215-mapper-library-dark.png'),(await window.webContents.capturePage()).toPNG());
  await execute("document.documentElement.dataset.theme='light';void 0;");
  await execute(`(async()=>{
    const row=document.querySelector('[data-map-group="'+mapperSideTestId+'"]'),side=row.querySelector('[data-map-side-slot]');side.value='LeftArmWear';side.dispatchEvent(new Event('change'));
    document.querySelector('[data-map-group="'+mapperSideTestId+'"] [data-map-choose]').click();await new Promise(resolve=>setTimeout(resolve,200));
    uiCheck(document.querySelectorAll('dialog[open]').length===1,'Single configuration window');uiCheck(!document.querySelector('dialog .dialog-section-links'),'No rule jump links');
    uiCheck(document.querySelector('[data-map-source-slot]').textContent==='Left Arm Wear','Source side preserved');document.querySelector('[data-map-pick="replacement"]').click();
    const items=new Map(mapperPrepared.items.map(item=>[item.id,item]));uiCheck([...document.querySelectorAll('[data-map-choose]')].every(button=>items.get(button.dataset.mapChoose).slot==='LeftArmWear'),'Replacement picker enforces exact same side and slot');
    uiCheck(document.querySelectorAll('dialog[open]').length===1,'No nested picker modal');document.querySelector('[data-map-back]').click();document.querySelector('dialog [data-config-cancel]').click();
    uiCheck(JSON.parse(document.querySelector('#mapper-rules').value).length===0,'Cancel preserves queue');
    document.querySelector('#mapper-copy').click();await new Promise(resolve=>setTimeout(resolve,200));uiCheck(!document.querySelector('dialog .dialog-section-links'),'No Copy From Player jump links');
    const flow=document.querySelector('.mapper-flow');uiCheck(flow.firstElementChild.getBoundingClientRect().width>flow.getBoundingClientRect().width*.9,'Single source card uses full width');document.querySelector('[data-map-pick="replacement"]').click();
    const donor=mapperPrepared.players.find(player=>!player.shared),search=document.querySelector('[data-map-player-search]');search.value=donor.player;search.dispatchEvent(new Event('input'));document.querySelector('[data-map-donor="'+donor.row+'"]').click();
    uiCheck(new Set([...document.querySelectorAll('[data-map-group]')].map(row=>row.dataset.mapGroup)).size===document.querySelectorAll('[data-map-group]').length,'Copy player items grouped');
    document.querySelector('[data-map-choose]:not([disabled])').click();document.querySelector('dialog [data-config-save]').click();uiCheck(document.querySelector('[data-config-error]').textContent.includes('Choose at least one'),'Empty copy target rejected');document.querySelector('dialog [data-config-cancel]').click();
    const glove=mapperPrepared.items.find(item=>item.copyable&&item.slot==='LeftHandWear'&&mapperPrepared.items.some(other=>other.copyable&&other.slot==='RightHandWear'&&other.asset===item.asset));uiCheck(glove,'Observed glove pair available');
    openMapperRule(mapperPrepared,{action:'copy',scope:'all',replacementId:glove.id,matchMode:'asset'},rule=>window.mapperPairSaved=rule);
    uiCheck(document.querySelector('[data-map-pair]').checked,'Gloves default to a pair');uiCheck(document.querySelector('[data-map-replacement-pair]').value,'Other glove preselected');document.querySelector('dialog [data-config-save]').click();uiCheck(mapperPairSaved.pairSides&&mapperPairSaved.replacementPairId,'Paired copy survives Save');
    const source=mapperPrepared.items.find(item=>item.copyable&&item.slot==='LeftArmWear'),replacement=mapperPrepared.items.find(item=>item.copyable&&item.slot==='LeftArmWear'&&item.asset!==source.asset);
    openMapperRule(mapperPrepared,{action:'replace',scope:'all',sourceId:source.id,replacementId:replacement.id,matchMode:'asset'},rule=>window.mapperCapSaved=rule);document.querySelector('[data-map-cap]').value='40';document.querySelector('dialog [data-config-save]').click();uiCheck(mapperCapSaved.replacementCap===40,'Per-team replacement cap survives Save');
  })()`);
  // Preselect real observed items, then exercise the same visible Save action.
  await execute(`(async()=>{window.mapperPrepared=await window.cfbToolkit.prepareTool({toolId:'equipment-mapper',savePath:state.activeSave.path});const p=mapperPrepared;window.mapperSource=p.items.find(item=>item.asset==='Gear_Socks_Low'&&item.wearers.some(row=>p.players.some(player=>player.row===row&&!player.shared)));window.mapperTarget=p.items.find(item=>item.asset==='Gear_Socks_Mid');window.mapperRow=mapperSource.wearers.find(row=>p.players.some(player=>player.row===row&&!player.shared));openMapperRule(p,{action:'replace',sourceId:mapperSource.id,replacementId:mapperTarget.id,matchMode:'exact',scope:'selected',playerRows:[mapperRow]},rule=>{const control=document.querySelector('#mapper-rules');control.value=JSON.stringify([rule]);control.dispatchEvent(new Event('change',{bubbles:true}));});})()`);
  await execute('new Promise(resolve=>setTimeout(resolve,200))');
  fs.writeFileSync(path.join(root,'outputs/v215-mapper-rule.png'),(await window.webContents.capturePage()).toPNG());
  for(const width of [760,520]){
    window.setContentSize(width,900);await execute("new Promise(resolve=>setTimeout(resolve,100))");
    await execute("uiCheck(document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth+2,'Mapping dialog fits small window');void 0;");
    await execute("document.querySelector('[data-map-pick=\"replacement\"]').click();uiCheck(document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth+2,'Replacement picker fits small window');document.querySelector('[data-map-back]').click();void 0;");
  }
  window.setContentSize(1480,1000);await execute("new Promise(resolve=>setTimeout(resolve,100))");
  await execute(`(async()=>{document.querySelector('dialog [data-config-save]').click();uiCheck(!document.querySelector('dialog[open]'),'Rule saved');uiCheck(JSON.parse(document.querySelector('#mapper-rules').value)[0].playerIdentities.length===1,'Player identity is pinned');document.querySelector('#mapper-preview').click();await uiWait(()=>state.genericPreviews.has('equipment-mapper'));uiCheck(document.querySelectorAll('.equipment-change-card').length===1,'One targeted player');uiCheck(!document.querySelector('#mapper-apply').disabled,'Validated Apply enabled');document.querySelector('[data-equipment-view="table"]').click();uiCheck(document.querySelector('.equipment-card-list').hidden&&!document.querySelector('.equipment-table-view').hidden,'Table replaces cards');document.querySelector('#mapper-apply').click();await uiWait(()=>document.querySelector('#run-output').textContent.includes('Changes applied successfully'));uiCheck(document.querySelector('#run-output').textContent.includes('Backup'),'Backup displayed');})()`);
  await execute(`(async()=>{document.querySelector('[data-standard-edit-settings]').click();document.querySelector('#preset-name').value='UI Mapping';document.querySelector('#preset-save').click();await uiWait(()=>state.bootstrap.settings.toolPresets.length===1);uiCheck(state.bootstrap.settings.toolPresets[0].configuration.values['mapper-rules'].includes(mapperTarget.id),'Reusable mapping preset');navigate('roster-generator');await uiWait(()=>document.querySelector('#roster-teams'));const result=await window.cfbToolkit.runTool({toolId:'roster-generator',savePath:state.activeSave.path,mode:'preview',options:{teams:['LSU'],preset:'building-blocks'}});state.genericResultViews.set('roster-generator','cards');renderResult(document.querySelector('#run-output'),result);document.querySelector('.standard-config-workspace').hidden=true;document.querySelector('.standard-preview-workspace').hidden=false;const card=document.querySelector('.roster-player-card');uiCheck(card.querySelectorAll('.roster-key-ratings>div').length>=6,'Physical and relevant ratings shown');uiCheck(card.textContent.includes('Hometown')&&card.textContent.includes('Development')&&card.textContent.includes('Captain'),'Friendly facts shown');uiCheck(!card.querySelector('.roster-overall').textContent.includes('→'),'No old/new OVR on main card');card.querySelector('[data-roster-details="fields"]').open=true;await new Promise(resolve=>setTimeout(resolve,50));uiCheck(card.querySelector('[data-roster-detail-body]').textContent.includes('Commentary'),'Technical details available on demand');})()`);
  await execute("document.querySelector('.roster-player-card').scrollIntoView({block:'start'});new Promise(resolve=>setTimeout(resolve,200))");
  fs.writeFileSync(path.join(root,'outputs/v215-roster-cards.png'),(await window.webContents.capturePage()).toPNG());
  if(errors.length)throw Error(errors.join('\n'));console.log('PASS: Grouped/paginated Mapper library, implicit facemasks, exact-side replacement picker, compact Copy From Player, no jump links/nested modals, isolated drafts, real Preview/Apply/backup, view switch, presets, roster cards and technical details.');
  window.destroy();await new Promise(resolve=>setTimeout(resolve,250));await cleanup();app.exit(0);
}).catch(async error=>{console.error(error);try{await cleanup();}catch(cleanupError){console.error(cleanupError);}app.exit(1);});
