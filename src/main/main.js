import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from "electron";
import electronUpdater from "electron-updater";
import { UpdateService, updateAvailability } from "./services/updates.js";
import { IPC, RUN_MODES } from "../shared/contracts.js";
import { displayAppVersion } from "../shared/appVersion.js";
import { getTool, registrySnapshot } from "../shared/toolRegistry.js";
import { appPaths, commentaryMapPath, schemaDirectory, schemaPath } from "./services/paths.js";
import { inspectSaveSchema, SUPPORTED_SCHEMAS } from "./services/save.js";
import { SettingsStore, normalizeAccentColor } from "./services/settings.js";
import { ToolPresets } from "./services/toolPresets.js";
import { AppLogger } from "./services/logger.js";
import { ReportService } from "./services/reports.js";
import { HistoryStore } from "./services/history.js";
import { ReviewSnapshots } from "./services/reviewSnapshots.js";
import { readHomeContext } from "./services/homeContext.js";
import { readTeamArtwork, saveTeamArtwork, teamArtworkKey } from "./services/teamArtwork.js";
import { validateSavePath } from "./services/files.js";
import { executableToolIds, getToolHandler } from "./tools/handlers.js";
import { searchPlanRows, snapshotPlanRows, planAudit, setPlanAudit } from "./tools/jersey/planStore.js";
import { readSeasonLines } from "./tools/forceWin/runner.js";
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
let reviews;
let sessionActiveSave = null;
let updates;
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
    emit: status => { for (const window of BrowserWindow.getAllWindows()) if (!window.isDestroyed()) window.webContents.send(IPC.updateStatus, status); },
    log: (level, event, details) => logger.write(level, event, details),
    busy: () => activeToolOperations > 0,
    prompt: async (kind, status) => {
      const options = kind === "download"
        ? { title: "Toolkit Update Available", message: `Ace's CFB Toolkit ${displayAppVersion(status.version)} is available.`, detail: "Download it now? You can keep using the app during the download. It will only install when you approve a restart.", buttons: ["Download Update", "Later"] }
        : { title: "Restart to Update", message: `Install Ace's CFB Toolkit ${displayAppVersion(status.version)}?`, detail: "The Toolkit will close and reopen. Unapplied previews and review decisions will be discarded. Unsaved tool settings also reset on restart. Your saves, backups, saved settings, presets, reports, and history are not removed.", buttons: ["Restart and Install", "Later"] };
      const parent = BrowserWindow.getAllWindows().find(window => !window.isDestroyed());
      const config = { ...options, type: "info", defaultId: 1, cancelId: 1, noLink: true };
      const answer = parent ? await dialog.showMessageBox(parent, config) : await dialog.showMessageBox(config);
      return answer.response === 0;
    }
  });
}

const saveInfo = savePath => savePath ? { path: savePath, name: path.basename(savePath), exists: fs.existsSync(savePath), modifiedAt: fs.existsSync(savePath) ? fs.statSync(savePath).mtime.toISOString() : null, schema: fs.existsSync(savePath) ? inspectSaveSchema(savePath, schemaDirectory()) : null } : null;
const assertToolSaveCompatibility = (toolId, savePath) => {
  const schema = inspectSaveSchema(savePath, schemaDirectory());
  if (!schema.supported) throw new Error(schema.error);
  if (toolId === "automatic-force-win" && /-AUTOSAVE/i.test(path.basename(savePath))) throw new Error("Smart Force Win does not support autosaves because their schedule/game data can differ from a manual save. Select a manual Dynasty save for this tool.");
  return schema;
};

function createWindow() {
  const saved = settings.get().window;
  const window = new BrowserWindow({
    title: "Ace's CFB Toolkit", width: Math.max(1080, Number(saved?.width) || 1380), height: Math.max(700, Number(saved?.height) || 860), minWidth: 1040, minHeight: 680,
    backgroundColor: settings.get().theme === "dark" ? "#0c0f0d" : "#f4f7f5", show: false,
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
  ipcMain.handle(IPC.getUpdateStatus, () => updates.snapshot());
  ipcMain.handle(IPC.checkUpdates, () => updates.check());
  ipcMain.handle(IPC.downloadUpdate, () => updates.download());
  ipcMain.handle(IPC.installUpdate, () => updates.install());
  const presets = new ToolPresets(settings);
  ipcMain.handle(IPC.savePreset, (_event, request) => { if (!getTool(request?.toolId)) throw new Error("Unknown tool."); return presets.save(request); });
  ipcMain.handle(IPC.deletePreset, (_event, request) => { if (!getTool(request?.toolId)) throw new Error("Unknown tool."); return presets.delete(request); });
  ipcMain.handle(IPC.bootstrap, () => ({ app: { name: "Ace's CFB Toolkit", version: displayAppVersion(app.getVersion()), schemas: SUPPORTED_SCHEMAS.map(schema => schema.version) }, registry: registrySnapshot(), settings: settings.get(), activeSave: saveInfo(sessionActiveSave), paths: { reports: paths.reports, logs: paths.logs } }));
  ipcMain.handle(IPC.chooseSave, async () => { const result = await dialog.showOpenDialog({ title: "Select a CFB 27 Dynasty or Road To Glory save", properties: ["openFile"], filters: [{ name: "CFB 27 saves", extensions: ["*" ] }] }); return result.canceled ? null : result.filePaths[0]; });
  ipcMain.handle(IPC.chooseFile, async () => { const result = await dialog.showOpenDialog({ title: "Select a file", properties: ["openFile"], filters: [{ name: "All files", extensions: ["*"] }, { name: "Text files", extensions: ["txt"] }] }); return result.canceled ? null : result.filePaths[0]; });
  ipcMain.handle(IPC.setActiveSave, (_event, candidate) => {
    const activeSave = validateSavePath(candidate);
    const current = settings.get();
    const recentSaves = [activeSave, ...current.recentSaves.filter(item => item !== activeSave)].slice(0, 8);
    sessionActiveSave = activeSave;
    settings.update({ activeSave: null, recentSaves }); logger.write("info", "active-save-selected", { savePath: activeSave }); return saveInfo(activeSave);
  });
  ipcMain.handle(IPC.clearActiveSave, () => { sessionActiveSave = null; settings.update({ activeSave: null }); return null; });
  ipcMain.handle(IPC.updateTheme, (_event, theme) => { if (!["light", "dark"].includes(theme)) throw new Error("Theme must be light or dark."); return settings.update({ theme }); });
  ipcMain.handle(IPC.updateAccent, (_event, color) => settings.update({ accentColor: normalizeAccentColor(color) }));
  ipcMain.handle(IPC.homeContext, async () => {
    if (!sessionActiveSave) return null;
    const schema = assertToolSaveCompatibility("home", sessionActiveSave);
    const context = await readHomeContext(sessionActiveSave, schema.path);
    return { ...context, artwork: readTeamArtwork(paths.data, settings.get().teamArtwork, context.teams.map(team => team.name)) };
  });
  ipcMain.handle(IPC.saveCustomMatchupModel, (_event, model) => saveCustomMatchupModel(settings, model));
  ipcMain.handle(IPC.homeLines, async (_event, request) => {
    if (!sessionActiveSave) throw new Error("Select an Active Dynasty first.");
    const savePath = validateSavePath(sessionActiveSave);
    const schema = assertToolSaveCompatibility("home", savePath);
    return readSeasonLines({ savePath, schemaPath: schema.path, modelProfile: request?.modelProfile, customModel: settings.get().customMatchupModel });
  });
  ipcMain.handle(IPC.chooseTeamArtwork, async (_event, request) => {
    if (!sessionActiveSave) throw new Error("Select an Active Dynasty first.");
    const kind = request?.kind, teamName = String(request?.teamName ?? "");
    const schema = assertToolSaveCompatibility("home", sessionActiveSave);
    const context = await readHomeContext(sessionActiveSave, schema.path);
    if (!["logo", "header"].includes(kind) || !context.teams.some(team => team.name === teamName)) throw new Error("Choose a team from the Active Dynasty.");
    const chosen = await dialog.showOpenDialog({ title: kind === "logo" ? "Select a 1024 × 1024 team logo" : "Select a team header image", properties: ["openFile"], filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }] });
    if (chosen.canceled) return null;
    const saved = saveTeamArtwork({ dataDirectory: paths.data, teamName, kind, sourcePath: chosen.filePaths[0], nativeImage });
    const key = teamArtworkKey(teamName), artwork = settings.get().teamArtwork ?? {};
    settings.update({ teamArtwork: { ...artwork, [key]: { ...artwork[key], [kind]: saved.path } } });
    return { teamName, kind, image: saved.dataUrl };
  });
  ipcMain.handle(IPC.clearTeamArtwork, async (_event, request) => {
    if (!sessionActiveSave) throw new Error("Select an Active Dynasty first.");
    const kind = request?.kind, teamName = String(request?.teamName ?? "");
    const schema = assertToolSaveCompatibility("home", sessionActiveSave);
    const context = await readHomeContext(sessionActiveSave, schema.path);
    if (!["logo", "header"].includes(kind) || !context.teams.some(team => team.name === teamName)) throw new Error("Choose a team from the Active Dynasty.");
    const key = teamArtworkKey(teamName), artwork = { ...(settings.get().teamArtwork ?? {}) }, entry = { ...(artwork[key] ?? {}) };
    delete entry[kind]; if (Object.keys(entry).length) artwork[key] = entry; else delete artwork[key];
    settings.update({ teamArtwork: artwork });
    return { teamName, kind, image: null };
  });
  ipcMain.handle(IPC.prepareTool, async (_event, request) => toolOperation(async () => {
    const tool = getTool(request?.toolId); const handler = getToolHandler(request?.toolId);
    if (!tool || tool.status !== "available" || !handler?.prepare) return {};
    const savePath = validateSavePath(request.savePath || sessionActiveSave);
    const schema = assertToolSaveCompatibility(tool.id, savePath);
    const [prepared, home] = await Promise.all([handler.prepare({ savePath, options: request.options ?? {}, schemaPath: schema.path, defaultMapPath: commentaryMapPath() }), readHomeContext(savePath, schema.path).catch(error => { logger.write("warn", "optional-user-team-context-unavailable", { toolId: tool.id, message: error.message }); return null; })]);
    if (!home) return prepared; // Optional markers must not prevent a supported tool from opening.
    const controlled = new Map([...(prepared.userControlledTeams ?? []), ...(home.controlledTeams ?? [])].map(team => [team.name ?? team, team]));
    return { ...prepared, userControlledTeams: [...controlled.values()] };
  }));
  ipcMain.handle(IPC.searchPreview, (_event, request) => searchPlanRows(request?.planId, request?.query, 1000, request?.filters));
  ipcMain.handle(IPC.runTool, async (_event, request) => toolOperation(async () => {
    const tool = getTool(request?.toolId);
    const handler = getToolHandler(request?.toolId);
    if (!tool || tool.status !== "available" || !handler?.run) throw new Error("This tool has not been migrated yet.");
    if (!RUN_MODES.includes(request.mode)) throw new Error("Invalid run mode.");
    const savePath = validateSavePath(request.savePath || sessionActiveSave);
    const schema = assertToolSaveCompatibility(tool.id, savePath);
    const runId = crypto.randomUUID();
    logger.write("info", "tool-started", { runId, toolId: tool.id, toolVersion: tool.version, mode: request.mode, savePath });
    try {
      const previousAudit = request.mode === "apply" && request.options?.planId ? planAudit(request.options.planId) : null;
      const audit = { runId, toolVersion: tool.version, mode: request.mode, savePath, schemaVersion: schema.version, options: previousAudit?.options ?? request.options ?? {}, previewRunId: previousAudit?.runId ?? null };
      const result = await handler.run({ savePath, mode: request.mode, options: request.options ?? {}, schemaPath: schema.path, defaultMapPath: commentaryMapPath(), reports: reports.forRun(audit) });
      if (request.mode === "preview" && result.planId) setPlanAudit(result.planId, audit);
      logger.write("info", "tool-completed", { runId, toolId: tool.id, status: result.status, outputPath: result.savePath, reportPath: result.reportPath, backupPath: result.backupPath, summary: result.historySummary });
      let reviewAvailable = false;
      try { reviewAvailable = reviews.save(runId, result, result.planId ? snapshotPlanRows(result.planId) : null); }
      catch (error) { logger.write("error", "review-snapshot-failed", { runId, toolId: tool.id, message: error.message }); }
      const historyEntry = history.add({ id: runId, timestamp: new Date().toISOString(), toolId: tool.id, toolName: tool.name, toolVersion: tool.version, inputPath: result.savePath, mode: request.mode, status: result.status, summary: result.historySummary, backupPath: result.backupPath, reportPath: result.reportPath, reviewAvailable, logReference: runId });
      try { reviews.prune(history.entries.map(entry => entry.id)); }
      catch (error) { logger.write("error", "review-snapshot-prune-failed", { runId, message: error.message }); }
      return { ...result, executionId: historyEntry.id };
    } catch (error) { logger.write("error", "tool-failed", { runId, toolId: tool.id, message: error.message, stack: error.stack }); throw error; }
  }));
  ipcMain.handle(IPC.listReports, () => reports.list());
  ipcMain.handle(IPC.listHistory, () => history.list(250));
  ipcMain.handle(IPC.getHistory, (_event, id) => history.get(id));
  ipcMain.handle(IPC.getReview, (_event, id) => history.get(id)?.reviewAvailable ? reviews.get(id) : null);
  ipcMain.handle(IPC.listLogs, () => logger.list());
  ipcMain.handle(IPC.clearLogs, () => { logger.clear(); return []; });
  ipcMain.handle(IPC.openPath, async (_event, target) => { if (typeof target !== "string" || !path.isAbsolute(target)) throw new Error("Invalid path."); const backupDirectory = sessionActiveSave ? path.join(path.dirname(sessionActiveSave), "Ace's CFB Toolkit Backups") : null; const allowed = [paths.logs, paths.reports, sessionActiveSave, backupDirectory].filter(Boolean).some(base => target === base || target.startsWith(`${base}${path.sep}`) || path.dirname(target) === path.dirname(base)); if (!allowed) throw new Error("That path is outside Ace's CFB Toolkit's approved locations."); const result = await shell.openPath(target); if (result) throw new Error(result); return true; });
}

app.whenReady().then(() => {
  if (!ownsInstance) return;
  paths = appPaths(); settings = new SettingsStore(paths.settings); settings.load(); if (settings.get().activeSave) settings.update({ activeSave: null }); logger = new AppLogger(paths.logs); reports = new ReportService(paths.reports); history = new HistoryStore(paths.history); history.load(); reviews = new ReviewSnapshots(path.join(paths.data, "review-snapshots")); initializeUpdates(); registerIpc();
  if (process.argv.includes("--smoke-test")) { const snapshot = registrySnapshot(); const available = snapshot.tools.filter(tool => tool.status === "available").map(tool => tool.id).sort(), schemasPresent = SUPPORTED_SCHEMAS.every(schema => fs.existsSync(schemaPath(schema.version))); if (snapshot.tools.length !== 10 || JSON.stringify(available) !== JSON.stringify(executableToolIds().sort()) || !schemasPresent || !fs.existsSync(commentaryMapPath())) process.exitCode = 1; app.quit(); return; }
  createWindow(); app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
