const { contextBridge, ipcRenderer } = require("electron");

const channels = Object.freeze({ bootstrap: "app:bootstrap", chooseSave: "dialog:choose-save", chooseFile: "dialog:choose-file", setActiveSave: "context:set-active-save", clearActiveSave: "context:clear-active-save", updateTheme: "settings:update-theme", homeContext: "home:context", homeLines: "home:lines", chooseTeamArtwork: "settings:choose-team-artwork", clearTeamArtwork: "settings:clear-team-artwork", runTool: "tools:run", prepareTool: "tools:prepare", searchPreview: "tools:search-preview", listReports: "reports:list", listHistory: "history:list", getHistory: "history:get", getReview: "history:get-review", listLogs: "logs:list", clearLogs: "logs:clear", openPath: "shell:open-path" });
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
  chooseSave: () => ipcRenderer.invoke(channels.chooseSave),
  chooseFile: () => ipcRenderer.invoke(channels.chooseFile),
  setActiveSave: value => ipcRenderer.invoke(channels.setActiveSave, value),
  clearActiveSave: () => ipcRenderer.invoke(channels.clearActiveSave),
  updateTheme: theme => ipcRenderer.invoke(channels.updateTheme, theme),
  updateAccent: color => ipcRenderer.invoke("settings:update-accent", color),
  savePreset: request => ipcRenderer.invoke("settings:save-preset", request),
  deletePreset: request => ipcRenderer.invoke("settings:delete-preset", request),
  homeContext: () => ipcRenderer.invoke(channels.homeContext),
  homeLines: request => ipcRenderer.invoke(channels.homeLines, request),
  saveCustomMatchupModel: model => ipcRenderer.invoke("settings:save-custom-matchup-model", model),
  chooseTeamArtwork: request => ipcRenderer.invoke(channels.chooseTeamArtwork, request),
  clearTeamArtwork: request => ipcRenderer.invoke(channels.clearTeamArtwork, request),
  runTool: request => ipcRenderer.invoke(channels.runTool, request),
  prepareTool: request => ipcRenderer.invoke(channels.prepareTool, request),
  searchPreview: request => ipcRenderer.invoke(channels.searchPreview, request),
  listReports: () => ipcRenderer.invoke(channels.listReports),
  listHistory: () => ipcRenderer.invoke(channels.listHistory),
  getHistory: id => ipcRenderer.invoke(channels.getHistory, id),
  getReview: id => ipcRenderer.invoke(channels.getReview, id),
  listLogs: () => ipcRenderer.invoke(channels.listLogs),
  clearLogs: () => ipcRenderer.invoke(channels.clearLogs),
  openPath: target => ipcRenderer.invoke(channels.openPath, target)
}));
