const { contextBridge, ipcRenderer } = require("electron");
const applyListeners = new Set();
const progressListeners = new Set();
const emitProgress = update => { for (const callback of progressListeners) { try { callback(update); } catch {} } };
ipcRenderer.on('tools:progress', (_event, update) => emitProgress({...update, phase:'progress'}));
async function invokeOperation(channel, request = {}) {
  const operationId = globalThis.crypto.randomUUID();
  emitProgress({phase:'start', operationId, channel, toolId:request.toolId, savePath:request.savePath, percent:0});
  try {
    const result = await ipcRenderer.invoke(channel, {...request, operationId});
    emitProgress({phase:'complete', operationId, percent:100, message:'Complete'});
    return result;
  } catch (error) {
    emitProgress({phase:'error', operationId, message:error.message});
    throw error;
  }
}

const channels = Object.freeze({ bootstrap: "app:bootstrap", chooseSave: "dialog:choose-save", chooseFile: "dialog:choose-file", setActiveSave: "context:set-active-save", clearActiveSave: "context:clear-active-save", updateTheme: "settings:update-theme", homeContext: "home:context", homeLines: "home:lines", chooseTeamArtwork: "settings:choose-team-artwork", clearTeamArtwork: "settings:clear-team-artwork", runTool: "tools:run", prepareTool: "tools:prepare", prepareEquipmentDonors: "equipment:prepare-donors", searchPreview: "tools:search-preview", listReports: "reports:list", listHistory: "history:list", getHistory: "history:get", getReview: "history:get-review", listLogs: "logs:list", clearLogs: "logs:clear", revealReport: "shell:reveal-report", openPath: "shell:open-path" });
contextBridge.exposeInMainWorld("cfbToolkit", Object.freeze({
  bootstrap: () => ipcRenderer.invoke(channels.bootstrap),
  getUpdateStatus: () => ipcRenderer.invoke("updates:status"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  downloadUpdate: () => ipcRenderer.invoke("updates:download"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  onUpdateStatus: callback => {
    if (typeof callback !== "function") throw new TypeError("Update listener must be a function.");
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("updates:status-changed", listener);
    return () => ipcRenderer.removeListener("updates:status-changed", listener);
  },
  onUpdatePrompt: callback => {
    if(typeof callback!=="function")throw new TypeError("Update prompt listener must be a function.");
    const listener=(_event,request)=>callback(request);ipcRenderer.on("updates:prompt-request",listener);
    return ()=>ipcRenderer.removeListener("updates:prompt-request",listener);
  },
  respondUpdatePrompt: request=>ipcRenderer.invoke("updates:prompt-response",request),
  chooseSave: purpose => ipcRenderer.invoke(channels.chooseSave, purpose),
  chooseFile: () => ipcRenderer.invoke(channels.chooseFile),
  setActiveSave: value => ipcRenderer.invoke(channels.setActiveSave, value),
  clearActiveSave: () => ipcRenderer.invoke(channels.clearActiveSave),
  updateReadingSize: value => ipcRenderer.invoke("settings:update-reading-size", value),
  presetTransfer: request => ipcRenderer.invoke("settings:preset-transfer", request),
  setToolDefault: request => ipcRenderer.invoke("settings:set-tool-default", request),
  updateTheme: theme => ipcRenderer.invoke(channels.updateTheme, theme),
  updateAccent: color => ipcRenderer.invoke("settings:update-accent", color),
  savePreset: request => ipcRenderer.invoke("settings:save-preset", request),
  deletePreset: request => ipcRenderer.invoke("settings:delete-preset", request),
  homeContext: () => invokeOperation(channels.homeContext),
  homeLines: request => invokeOperation(channels.homeLines, request),
  saveCustomMatchupModel: model => ipcRenderer.invoke("settings:save-custom-matchup-model", model),
  chooseTeamArtwork: request => ipcRenderer.invoke(channels.chooseTeamArtwork, request),
  clearTeamArtwork: request => ipcRenderer.invoke(channels.clearTeamArtwork, request),
  runTool: async request => {
    const result = await invokeOperation(channels.runTool, request);
    if (request?.mode === 'apply' && result?.status === 'completed') for (const callback of applyListeners) { try { callback(); } catch {} }
    return result;
  },
  onToolApplied: callback => { if (typeof callback !== 'function') throw new TypeError('Apply listener must be a function.'); applyListeners.add(callback); return () => applyListeners.delete(callback); },
  onToolProgress: callback => { if (typeof callback !== 'function') throw new TypeError('Progress listener must be a function.'); progressListeners.add(callback); return () => progressListeners.delete(callback); },
  prepareTool: request => invokeOperation(channels.prepareTool, request),
  prepareEquipmentDonors: request => invokeOperation(channels.prepareEquipmentDonors, request),
  clearQuickstartMemory: () => invokeOperation('equipment:clear-quickstart-memory'),
  searchPreview: request => ipcRenderer.invoke(channels.searchPreview, request),
  listReports: () => invokeOperation(channels.listReports),
  listHistory: () => ipcRenderer.invoke(channels.listHistory),
  getHistory: id => ipcRenderer.invoke(channels.getHistory, id),
  getReview: id => invokeOperation(channels.getReview, {id}),
  listLogs: () => ipcRenderer.invoke(channels.listLogs),
  clearLogs: () => ipcRenderer.invoke(channels.clearLogs),
  revealReport: target => ipcRenderer.invoke(channels.revealReport, target),
  openPath: target => ipcRenderer.invoke(channels.openPath, target)
}));
