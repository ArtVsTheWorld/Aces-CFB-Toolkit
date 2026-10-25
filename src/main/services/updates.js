/** Consent-based installer updates. No network or Electron dependency in this module. */
import { displayAppVersion } from "../../shared/appVersion.js";
export function releaseNotesText(value){
  if(Array.isArray(value))return value.slice(0,20).map(note=>typeof note?.note==='string'?`${note.version?String(note.version).slice(0,60)+'\n':''}${note.note}`:'').filter(Boolean).join('\n\n').slice(0,60000);
  return typeof value==='string'?value.slice(0,60000):'';
}
const sameVersion=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.replace(/^v/,'').replace(/\.0$/,'')===b.replace(/^v/,'').replace(/\.0$/,'');
export function updateAvailability({ packaged, platform, portable, configured }) {
  if (!packaged) return "Update checks are available in the installed app, not development mode.";
  if (portable) return "Automatic updates require the installer edition. Portable copies must be replaced manually.";
  if (platform !== "win32") return "Automatic updates are currently available for the Windows installer.";
  if (!configured) return "This build does not have an update location configured.";
  return null;
}

export class UpdateService {
  constructor({ updater, currentVersion, disabledReason = null, emit = () => {}, log = () => {}, prompt = async () => false, busy = () => false, savedNotes=null,lastSeenRelease=null,persistNotes=()=>{},acknowledge=()=>{} }) {
    Object.assign(this, { updater, emit, log, prompt, busy,persistNotes,acknowledge,lastSeenRelease });
    this.state = { phase: disabledReason ? "disabled" : "idle", currentVersion, version: null, percent: 0, message: disabledReason ?? "Updates are checked when the app opens." };
    this.prompted = new Set();
    this.installing = false;
    this.state.releaseNotes='';
    this.state.whatsNew=sameVersion(savedNotes?.version,currentVersion)&&!sameVersion(lastSeenRelease,currentVersion)&&releaseNotesText(savedNotes?.notes)?{version:currentVersion,notes:releaseNotesText(savedNotes.notes)}:null;
    if (disabledReason) return;
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowPrerelease = false;
    updater.allowDowngrade = false;
    updater.disableWebInstaller = true;
    updater.on("checking-for-update", () => this.set({ phase: "checking", message: "Checking for updates…" }));
    updater.on("update-available", info => { this.set({ phase: "available", version: info.version,releaseNotes:releaseNotesText(info.releaseNotes), message: `Version ${displayAppVersion(info.version)} is available.` }); void this.offer(); });
    updater.on("update-not-available", info => {const notes=releaseNotesText(info?.releaseNotes);this.set({phase:'idle',message:"You're up to date.",...(sameVersion(info?.version,currentVersion)&&!sameVersion(this.lastSeenRelease,currentVersion)&&notes?{whatsNew:{version:currentVersion,notes}}:{})});});
    updater.on("download-progress", progress => this.set({ phase: "downloading", percent: Math.min(100, Math.max(0, Number(progress.percent) || 0)), message: "Downloading the update. You can keep using the Toolkit." }));
    updater.on("update-downloaded", info => { const notes=releaseNotesText(info.releaseNotes)||this.state.releaseNotes;try{this.persistNotes({version:info.version,notes});}catch(error){this.log('error','update-notes-persist-failed',{message:String(error.message)});}this.set({ phase: "downloaded", version: info.version,releaseNotes:notes, percent: 100, message: "Update ready. Restart and install when you're ready." }); void this.offer(); });
    updater.on("error", error => this.fail(error));
  }

  snapshot() { return structuredClone({ ...this.state, installing: this.installing }); }
  acknowledgeRelease(version){if(!sameVersion(version,this.state.currentVersion))throw Error('Only the installed release can be acknowledged.');this.acknowledge(this.state.currentVersion);this.lastSeenRelease=this.state.currentVersion;this.set({whatsNew:null});return this.snapshot();}
  set(patch) { this.state = { ...this.state, ...patch }; this.emit(this.snapshot()); }
  fail(error) {
    this.log("error", "update-failed", { message: error?.message ?? String(error) });
    this.set({ phase: "error", message: "Couldn't get the update. Check your internet connection and try again later. Your installed app is still usable." });
  }
  assertCanRun() { if (this.installing) throw new Error("An update restart is being confirmed. Finish or cancel it before running a tool."); }

  async check() {
    if (["disabled", "available", "downloading", "downloaded"].includes(this.state.phase) || this.installing) return this.snapshot();
    if (this.checking) return this.checking;
    this.set({ phase: "checking", message: "Checking for updates…" });
    this.checking = (async () => {
      try { this.log("info", "update-check-started", {}); await this.updater.checkForUpdates(); }
      catch (error) { this.fail(error); }
      finally { this.checking = null; }
      return this.snapshot();
    })();
    return this.checking;
  }

  async download() {
    if (this.downloading) return this.downloading;
    if (this.state.phase !== "available") throw new Error("Check for an available update first.");
    this.set({ phase: "downloading", percent: 0, message: "Downloading the update. You can keep using the Toolkit." });
    this.downloading = (async () => {
      try { await this.updater.downloadUpdate(); }
      catch (error) { this.fail(error); }
      finally { this.downloading = null; }
      return this.snapshot();
    })();
    return this.downloading;
  }

  async install() {
    if (this.state.phase !== "downloaded") throw new Error("Download the update before installing it.");
    if (this.busy()) throw new Error("Wait for the current tool operation to finish before installing the update.");
    if (this.installing) return this.snapshot();
    this.installing = true;
    this.emit(this.snapshot());
    try {
      const confirmed = await this.prompt("install", this.snapshot());
      if (confirmed && !this.busy()) {
        this.log("info", "update-install-requested", { version: this.state.version });
        this.updater.quitAndInstall(true, true);
        return this.snapshot();
      }
    } catch (error) { this.fail(error); }
    this.installing = false;
    this.emit(this.snapshot());
    return this.snapshot();
  }

  async offer() {
    const { phase, version } = this.state;
    const key = `${phase}:${version}`;
    if (!["available", "downloaded"].includes(phase) || this.busy() || this.offering || this.prompted.has(key)) return;
    this.prompted.add(key);
    this.offering = true;
    try {
      if (phase === "available") {
        if (await this.prompt("download", this.snapshot())) await this.download();
      } else await this.install();
    } catch (error) { this.fail(error); }
    finally { this.offering = false; }
    // A fast download can complete while the download prompt is still open.
    if (this.state.phase !== phase) void this.offer();
  }
}
