import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from "electron";
import electronUpdater from "electron-updater";
import {UpdatePrompts} from './services/updatePrompts.js';
import { UpdateService, updateAvailability } from "./services/updates.js";
import { IPC, RUN_MODES } from "../shared/contracts.js";
import { displayAppVersion } from "../shared/appVersion.js";
import { getTool, registrySnapshot } from "../shared/toolRegistry.js";
import {ToolWorkerClient} from './services/toolWorkerClient.js';
import { validateReportLocation } from "./services/reportLocations.js";
import { appPaths, commentaryMapPath, schemaDirectory, schemaPath } from "./services/paths.js";
import { SUPPORTED_SCHEMAS } from "./services/save.js";
import { SettingsStore, normalizeAccentColor } from "./services/settings.js";
import { validatePresetConfiguration, ToolPresets } from "./services/toolPresets.js";
import { AppLogger } from "./services/logger.js";
import { ReportService } from "./services/reports.js";
import { HistoryStore } from "./services/history.js";
import {DynastyProfiles} from "./services/dynastyProfiles.js";
import dynastyIdentity from "../shared/dynastyIdentity.cjs";
const {validDynastyId}=dynastyIdentity;
import { saveTeamArtwork, teamArtworkKey } from "./services/teamArtwork.js";
import { validateSavePath } from "./services/files.js";
import { executableToolIds, getToolHandler } from "./tools/handlers.js";
import { saveCustomMatchupModel } from "./services/customMatchupModel.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const ownsInstance = !app.isPackaged || process.argv.includes("--smoke-test") || app.requestSingleInstanceLock();
if (!ownsInstance) app.quit();
app.on("second-instance", () => {
  const window = BrowserWindow.getAllWindows()[0];
  if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); }
});
let settings;
let logger;
let paths;
let reports;
let history;
let toolWorker;
let saveReadWorker;
let backgroundReadWorker;
let recoveryTimer;
let recoveryRunning=false;
let closing=false;
let selectingSaves=0;
let sessionActiveSave = null;
let activeSaveGeneration=0;
let dynastyProfiles;
let updates;
const updatePrompts=new UpdatePrompts();
let activeToolOperations = 0;
let updateCheckStarted = false;

async function toolOperation(action) {
  updates.assertCanRun();
  activeToolOperations++;
  try { return await action(); }
  finally { activeToolOperations--; void updates.offer(); }
}

function initializeUpdates() {
  const disabledReason = updateAvailability({ packaged: app.isPackaged, platform: process.platform, portable: Boolean(process.env.PORTABLE_EXECUTABLE_DIR || process.env.PORTABLE_EXECUTABLE_FILE), configured: fs.existsSync(path.join(process.resourcesPath, "app-update.yml")) });
  updates = new UpdateService({
    updater: disabledReason ? null : electronUpdater.autoUpdater, currentVersion: app.getVersion(), disabledReason,
    savedNotes:settings.get().updateNotes,lastSeenRelease:settings.get().lastSeenRelease,
    persistNotes:updateNotes=>settings.update({updateNotes}),acknowledge:lastSeenRelease=>settings.update({lastSeenRelease,updateNotes:null}),
    emit: status => { for (const window of BrowserWindow.getAllWindows()) if (!window.isDestroyed()) window.webContents.send(IPC.updateStatus, status); },
    log: (level, event, details) => logger.write(level, event, details),
    busy: () => activeToolOperations > 0,
    prompt: (kind,status)=>updatePrompts.request(BrowserWindow.getAllWindows().find(window=>!window.isDestroyed()),kind,status)
  });
}

const readSave = (savePath,onProgress)=>saveReadWorker.request('snapshot',{savePath,schemaDirectory:schemaDirectory()},onProgress);
const saveInfo = async (savePath,onProgress) => {
  if(!savePath)return null;
  const exists=fs.existsSync(savePath),snapshot=exists?await readSave(savePath,onProgress):null,schema=snapshot?.schema??null,dynastyId=snapshot?.dynastyId??null;
  return {path:savePath,name:path.basename(savePath),exists,modifiedAt:exists?fs.statSync(savePath).mtime.toISOString():null,schema,dynastyId};
};

function scheduleProfileRecovery(){
  clearTimeout(recoveryTimer);if(closing)return;
  recoveryTimer=setTimeout(async()=>{
    if(recoveryRunning)return;
    if(selectingSaves||activeToolOperations){scheduleProfileRecovery();return;}
    recoveryRunning=true;
    try{
      await dynastyProfiles.migrateHistory();
      if(!closing&&sessionActiveSave){const id=await recoverIdentity(sessionActiveSave);await dynastyProfiles.prepare(id);}
      if(!closing)for(const window of BrowserWindow.getAllWindows())if(!window.isDestroyed())window.webContents.send('dynasty:profiles-changed');
    }catch(error){if(!closing)logger.write('error','dynasty-background-recovery-failed',{message:error.message});}
    finally{recoveryRunning=false;}
  },1200);recoveryTimer.unref();
}

async function recoverIdentity(savePath){
  // Yield between old saves; background work never enters the tool queue.
  while(!closing&&(selectingSaves||activeToolOperations))await new Promise(resolve=>setTimeout(resolve,150));
  if(closing)return null;
  return backgroundReadWorker.request('identity',{savePath,schemaDirectory:schemaDirectory()});
}

const assertToolSaveCompatibility = async (toolId, savePath) => {
  const schema = await toolWorker.request('inspect', {savePath,schemaDirectory:schemaDirectory()});
  if (!schema.supported) throw new Error(schema.error);
  if(schema.kind==='roster'&&!['roster-generator','home'].includes(toolId))throw new Error('This is a Play Now roster file. Select Roster Generator, or choose a Dynasty save for this tool.');
  if (toolId === "automatic-force-win" && /-AUTOSAVE/i.test(path.basename(savePath))) throw new Error("Smart Force Win does not support autosaves because their schedule/game data can differ from a manual save. Select a manual Dynasty save for this tool.");
  return schema;
};

function createWindow() {
  const saved = settings.get().window;
  const window = new BrowserWindow({
    title: "Ace's CFB Toolkit", width: Math.max(1080, Number(saved?.width) || 1380), height: Math.max(700, Number(saved?.height) || 860), minWidth: 1040, minHeight: 680,
    backgroundColor: settings.get().theme === "dark" ? "#141417" : "#f5f5f8", show: false,
    webPreferences: { preload: path.join(dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true }
  });
  window.webContents.setWindowOpenHandler(({ url }) => { if (url === "https://github.com/ArtVsTheWorld/Aces-CFB-Toolkit") void shell.openExternal(url); return { action: "deny" }; });
  window.removeMenu();
  window.loadFile(path.join(dirname, "..", "renderer", "index.html"));
  window.once("ready-to-show", () => {
    window.show();
    if (!updateCheckStarted) { updateCheckStarted = true; setTimeout(() => void updates.check(), 3000).unref(); }
  });
  let resizeTimer;
  window.on("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { const [width, height] = window.getSize(); settings.update({ window: { width, height } }); }, 300); });
  return window;
}

function registerIpc() {
  const progressFor = (event, request) => update => {
    if (!event.sender.isDestroyed() && typeof request?.operationId === 'string') event.sender.send(IPC.toolProgress, {operationId:request.operationId, ...update});
  };
  ipcMain.handle(IPC.clearQuickstartMemory,async(event,request)=>toolOperation(async()=>{if(!sessionActiveSave)throw Error('Select an Active Save first.');const savePath=validateSavePath(sessionActiveSave),schema=await assertToolSaveCompatibility('equipment-quickstart',savePath);return toolWorker.request('clearMemory',{savePath,schemaPath:schema.path},progressFor(event,request));}));
  ipcMain.handle(IPC.respondUpdatePrompt,(event,request)=>updatePrompts.respond(event.sender,request));
  ipcMain.handle(IPC.getUpdateStatus, () => updates.snapshot());
  ipcMain.handle(IPC.acknowledgeRelease,(_event,version)=>updates.acknowledgeRelease(version));
  ipcMain.handle(IPC.checkUpdates, () => updates.check());
  ipcMain.handle(IPC.downloadUpdate, () => updates.download());
  ipcMain.handle(IPC.installUpdate, () => updates.install());
  const presets = new ToolPresets(settings);
  ipcMain.handle(IPC.setToolDefault, (_event, request) => { if (!getTool(request?.toolId)) throw new Error("Unknown tool."); const values = { ...(settings.get().toolDefaults ?? {}) }; if (request.configuration === null) delete values[request.toolId]; else values[request.toolId] = validatePresetConfiguration(request.configuration); return settings.update({ toolDefaults: values }); });
  ipcMain.handle(IPC.presetTransfer, async (_event, request) => {
    if (!getTool(request?.toolId)) throw new Error("Unknown tool.");
    if (request.action === "read") { const chosen = await dialog.showOpenDialog({ title: "Import Toolkit Preset", properties: ["openFile"], filters: [{ name: "Toolkit Preset", extensions: ["json"] }] }); if (chosen.canceled) return null; const file = chosen.filePaths[0]; if (fs.statSync(file).size > 260000) throw new Error("Preset file is too large."); const input = JSON.parse(fs.readFileSync(file, "utf8")); if (input.format !== "aces-cfb-toolkit-preset" || input.toolId !== request.toolId) throw new Error("This preset belongs to another tool or is not a Toolkit preset."); return { name: String(input.name ?? "Imported Preset").slice(0, 80), configuration: validatePresetConfiguration(input.configuration) }; }
    if (request.action !== "export") throw new Error("Unknown preset action.");
    const configuration = validatePresetConfiguration(request.configuration); const chosen = await dialog.showSaveDialog({ title: "Export Toolkit Preset", defaultPath: "Toolkit-Preset.json", filters: [{ name: "Toolkit Preset", extensions: ["json"] }] }); if (chosen.canceled) return null; fs.writeFileSync(chosen.filePath, JSON.stringify({ format: "aces-cfb-toolkit-preset", toolId: request.toolId, name: String(request.name ?? "Preset"), configuration }, null, 2)); return chosen.filePath;
  });
  ipcMain.handle(IPC.savePreset, (_event, request) => { if (!getTool(request?.toolId)) throw new Error("Unknown tool."); return presets.save(request); });
  ipcMain.handle(IPC.deletePreset, (_event, request) => { if (!getTool(request?.toolId)) throw new Error("Unknown tool."); return presets.delete(request); });
  ipcMain.handle(IPC.bootstrap, async () => ({ app: { name: "Ace's CFB Toolkit", version: displayAppVersion(app.getVersion()), schemas: SUPPORTED_SCHEMAS.map(schema => schema.version) }, registry: registrySnapshot(), settings: settings.get(), activeSave: await saveInfo(sessionActiveSave), paths: { reports: paths.reports, logs: paths.logs } }));
  ipcMain.handle(IPC.chooseSave, async (_event, purpose) => { const result = await dialog.showOpenDialog({ title: purpose === "equipment-donor" ? "Select a CFB 27 donor save or roster" : "Select a CFB 27 Save or Roster", properties: ["openFile"], filters: [{ name: "CFB 27 Saves", extensions: ["*" ] }] }); return result.canceled ? null : result.filePaths[0]; });
  ipcMain.handle(IPC.chooseFile, async () => { const result = await dialog.showOpenDialog({ title: "Select a file", properties: ["openFile"], filters: [{ name: "All files", extensions: ["*"] }, { name: "Text files", extensions: ["txt"] }] }); return result.canceled ? null : result.filePaths[0]; });
  ipcMain.handle(IPC.setActiveSave, async (event,request)=>{
    const activeSave=validateSavePath(typeof request==='string'?request:request?.savePath),generation=++activeSaveGeneration;
    selectingSaves++;
    try{
    const info=await saveInfo(activeSave,progressFor(event,request));
    if(generation!==activeSaveGeneration)throw Error('Another save was selected.');
    const current=settings.get(),recentSaves=[activeSave,...current.recentSaves.filter(item=>item!==activeSave)].slice(0,8);
    sessionActiveSave=activeSave;settings.update({activeSave:null,recentSaves});dynastyProfiles.prepareKnown(info.dynastyId,activeSave);scheduleProfileRecovery();logger.write('info','active-save-selected',{savePath:activeSave,dynastyId:info.dynastyId});return info;
    }finally{selectingSaves--;}
  });
  ipcMain.handle(IPC.clearActiveSave, () => { sessionActiveSave = null;activeSaveGeneration++; settings.update({ activeSave: null }); return null; });
  ipcMain.handle(IPC.updateReadingSize, (_event, value) => { if (!["standard", "large", "extra"].includes(value)) throw new Error("Choose Standard, Large, or Extra Large text."); return settings.update({ textSize: value }); });
  ipcMain.handle(IPC.updateTheme, (_event, theme) => { if (!["light", "dark"].includes(theme)) throw new Error("Theme must be light or dark."); return settings.update({ theme }); });
  ipcMain.handle(IPC.updateAccent, (_event, color) => settings.update({ accentColor: normalizeAccentColor(color) }));
  ipcMain.handle(IPC.updateBaseColor, (_event,color)=>settings.update({baseColor:normalizeAccentColor(color)}));
  ipcMain.handle(IPC.homeContext, async (event, request) => {
    if(!sessionActiveSave)return null;const savePath=sessionActiveSave;
    const {schema,context,contextError}=await readSave(savePath,progressFor(event,request));
    if(!schema.supported)throw Error(schema.error);
    if(!context)throw Error(contextError||'Home information is unavailable for this save.');
    dynastyProfiles.prepareKnown(context.dynastyId,savePath);
    return {...context,artwork:dynastyProfiles.readArtwork(context.dynastyId,context.teams.map(team=>team.name)),legacyArtworkAvailable:validDynastyId(context.dynastyId)&&dynastyProfiles.canImportLegacy()};
  });
  ipcMain.handle(IPC.saveCustomMatchupModel, (_event, model) => saveCustomMatchupModel(settings, model));
  ipcMain.handle(IPC.homeLines, async (event, request) => {
    if (!sessionActiveSave) throw new Error("Select an Active Dynasty first.");
    const savePath = validateSavePath(sessionActiveSave);
    const {schema}=await readSave(savePath);
    if(!schema.supported)throw Error(schema.error);
    return backgroundReadWorker.request('lines', { savePath, schemaPath: schema.path, modelProfile: request?.modelProfile, customModel: settings.get().customMatchupModel }, progressFor(event,request));
  });
  const artworkContext=async request=>{
    if(!sessionActiveSave)throw Error('Select an Active Dynasty first.');
    const savePath=sessionActiveSave,generation=activeSaveGeneration,kind=request?.kind,teamName=String(request?.teamName??'');
    const {schema,context,contextError}=await readSave(savePath);if(!schema.supported)throw Error(schema.error);if(!context)throw Error(contextError||'Team artwork is unavailable for this save.');
    if(generation!==activeSaveGeneration||savePath!==sessionActiveSave)throw Error('The Active Dynasty changed. Choose artwork again.');
    if(!validDynastyId(context.dynastyId))throw Error('This file has no supported dynasty identifier for custom team artwork.');
    if(request?.dynastyId!=null&&request.dynastyId!==context.dynastyId)throw Error('The Active Dynasty changed. Choose artwork again.');
    dynastyProfiles.prepareKnown(context.dynastyId,savePath);
    return {savePath,generation,kind,teamName,context,schema};
  };
  const checkArtworkContext=scope=>{if(scope.generation!==activeSaveGeneration||scope.savePath!==sessionActiveSave)throw Error('The Active Dynasty changed. Choose artwork again.');};
  ipcMain.handle(IPC.chooseTeamArtwork,async(_event,request)=>{
    const scope=await artworkContext(request),{kind,teamName,context}=scope;
    if(!['logo','header'].includes(kind)||!context.teams.some(team=>team.name===teamName))throw Error('Choose a team from the Active Dynasty.');
    const chosen=await dialog.showOpenDialog({title:kind==='logo'?'Select a 1024 × 1024 team logo':'Select a team header image',properties:['openFile'],filters:[{name:'Images',extensions:['png','jpg','jpeg','webp']}]});
    if(chosen.canceled)return null;checkArtworkContext(scope);
    const currentId=(await readSave(scope.savePath)).dynastyId;checkArtworkContext(scope);
    if(currentId!==context.dynastyId)throw Error('The dynasty in this file changed. Select the save again.');
    const saved=saveTeamArtwork({dataDirectory:paths.data,teamName,kind,sourcePath:chosen.filePaths[0],nativeImage,dynastyId:context.dynastyId});
    dynastyProfiles.setArtwork(context.dynastyId,teamArtworkKey(teamName),kind,saved.path);
    return {teamName,kind,image:saved.dataUrl,dynastyId:context.dynastyId};
  });
  ipcMain.handle(IPC.clearTeamArtwork,async(_event,request)=>{
    const scope=await artworkContext(request),{kind,teamName,context}=scope;checkArtworkContext(scope);
    if(!['logo','header'].includes(kind)||!context.teams.some(team=>team.name===teamName))throw Error('Choose a team from the Active Dynasty.');
    dynastyProfiles.setArtwork(context.dynastyId,teamArtworkKey(teamName),kind,null);
    return {teamName,kind,image:null,dynastyId:context.dynastyId};
  });
  ipcMain.handle(IPC.importLegacyTeamArtwork,async(_event,request)=>{
    const scope=await artworkContext(request);checkArtworkContext(scope);dynastyProfiles.importLegacy(scope.context.dynastyId);return true;
  });
  ipcMain.handle(IPC.prepareEquipmentDonors, async (event, request) => toolOperation(() => toolWorker.request('donors', { savePath: request?.savePath, schemaPath: schemaPath() }, progressFor(event,request))));
  ipcMain.handle(IPC.prepareTool, async (event, request) => toolOperation(async () => {
    const tool = getTool(request?.toolId); const handler = getToolHandler(request?.toolId);
    if (!tool || tool.status !== "available" || !handler?.prepare) return {};
    const savePath = validateSavePath(request.savePath || sessionActiveSave);
    const schema = await assertToolSaveCompatibility(tool.id, savePath);
    return toolWorker.request('prepare', {toolId:tool.id, savePath, options:request.options ?? {}, schemaPath:schema.path, defaultMapPath:commentaryMapPath()}, progressFor(event,request));
  }));
  ipcMain.handle(IPC.searchPreview, (_event, request) => toolWorker.request('search', request));
  ipcMain.handle(IPC.runTool, async (event, request) => toolOperation(async () => {
    const tool = getTool(request?.toolId);
    const handler = getToolHandler(request?.toolId);
    if (!tool || tool.status !== "available" || !handler?.run) throw new Error("This tool has not been migrated yet.");
    if (!RUN_MODES.includes(request.mode)) throw new Error("Invalid run mode.");
    const savePath = validateSavePath(request.savePath || sessionActiveSave);
    const schema = await assertToolSaveCompatibility(tool.id, savePath);
    const runId = crypto.randomUUID();
    logger.write("info", "tool-started", { runId, toolId: tool.id, appVersion: app.getVersion(), mode: request.mode, savePath });
    try {
      const audit = { runId, appVersion: app.getVersion(), mode: request.mode, savePath, schemaVersion: schema.version };
      const {result, reviewAvailable, reviewError} = await toolWorker.request('run', {toolId:tool.id, savePath, mode:request.mode, options:request.options ?? {}, schemaPath:schema.path, defaultMapPath:commentaryMapPath(), audit}, progressFor(event,request));
      logger.write("info", "tool-completed", { runId, toolId: tool.id, status: result.status,dynastyId:result.dynastyId, outputPath: result.savePath, reportPath: result.reportPath, backupPath: result.backupPath, summary: result.historySummary });
      if (reviewError) logger.write("error", "review-snapshot-failed", {runId, toolId:tool.id, message:reviewError});
      const historyEntry = history.add({ id: runId, timestamp: new Date().toISOString(), toolId: tool.id, toolName: tool.name, appVersion: app.getVersion(), inputPath: result.savePath,dynastyId:result.dynastyId, mode: request.mode, status: result.status, summary: result.historySummary, backupPath: result.backupPath, reportPath: result.reportPath, reviewAvailable, logReference: runId });
      try { await toolWorker.request('pruneReviews', {ids:history.entries.map(entry => entry.id)}); }
      catch (error) { logger.write("error", "review-snapshot-prune-failed", { runId, message: error.message }); }
      return { ...result, executionId: historyEntry.id };
    } catch (error) { logger.write("error", "tool-failed", { runId, toolId: tool.id, message: error.message, stack: error.stack }); throw error; }
  }));
  ipcMain.handle(IPC.listReports, () => reports.list());
  ipcMain.handle(IPC.listHistory, () => history.list(250));
  ipcMain.handle(IPC.getHistory, (_event, id) => history.get(id));
  ipcMain.handle(IPC.getReview,async(event,request)=>{const entry=history.get(request?.id);if(!entry?.reviewAvailable)return null;const snapshot=await toolWorker.request('review',{id:request.id},progressFor(event,request));return snapshot?{...snapshot,dynastyArtwork:dynastyProfiles.readArtwork(entry.dynastyId,Object.keys(dynastyProfiles.profile(entry.dynastyId)))}:null;});
  ipcMain.handle(IPC.listLogs, () => logger.list());
  ipcMain.handle(IPC.clearLogs, () => { logger.clear(); return []; });
  ipcMain.handle(IPC.revealReport, (_event, target) => { const report = validateReportLocation(target, paths.reports); shell.showItemInFolder(report); return true; });
  ipcMain.handle(IPC.openPath, async (_event, target) => { if (typeof target !== "string" || !path.isAbsolute(target)) throw new Error("Invalid path."); const backupDirectory = sessionActiveSave ? path.join(path.dirname(sessionActiveSave), "Ace's CFB Toolkit Backups") : null; const allowed = [paths.logs, paths.reports, sessionActiveSave, backupDirectory].filter(Boolean).some(base => target === base || target.startsWith(`${base}${path.sep}`) || path.dirname(target) === path.dirname(base)); if (!allowed) throw new Error("That path is outside Ace's CFB Toolkit's approved locations."); const result = await shell.openPath(target); if (result) throw new Error(result); return true; });
}

app.whenReady().then(() => {
  if (!ownsInstance) return;
  paths = appPaths(); saveReadWorker=new ToolWorkerClient({}, {workerUrl:new URL('./services/saveReadWorker.js',import.meta.url)}); backgroundReadWorker=new ToolWorkerClient({}, {workerUrl:new URL('./services/saveReadWorker.js',import.meta.url)}); toolWorker=new ToolWorkerClient({memoryFile:path.join(paths.data,'equipment-quickstart-memory.json'),reportsDirectory:paths.reports,reviewsDirectory:path.join(paths.data,'review-snapshots')}); settings = new SettingsStore(paths.settings); settings.load(); logger = new AppLogger(paths.logs); reports = new ReportService(paths.reports); history = new HistoryStore(paths.history); history.load(); dynastyProfiles=new DynastyProfiles({settings,history,dataDirectory:paths.data,reportsDirectory:paths.reports,resolveIdentity:recoverIdentity,log:(event,error)=>logger.write('error',event,{message:error.message})});if(settings.get().activeSave)settings.update({activeSave:null}); initializeUpdates(); registerIpc();
  if (process.argv.includes("--smoke-test")) { const snapshot = registrySnapshot(); const available = snapshot.tools.filter(tool => tool.status === "available").map(tool => tool.id).sort(), schemasPresent = SUPPORTED_SCHEMAS.every(schema => fs.existsSync(schemaPath(schema.version))); if (snapshot.tools.length !== 13 || JSON.stringify(available) !== JSON.stringify(executableToolIds().sort()) || !schemasPresent || !fs.existsSync(commentaryMapPath())) process.exitCode = 1; app.quit(); return; }
  createWindow(); app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on('will-quit', () => { closing=true;clearTimeout(recoveryTimer);void toolWorker?.close();void saveReadWorker?.close();void backgroundReadWorker?.close(); });
