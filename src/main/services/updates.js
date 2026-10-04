/** Consent-based installer updates. No network or Electron dependency in this module. */
import { displayAppVersion } from "../../shared/appVersion.js";
export function updateAvailability({ packaged, platform, portable, configured }) {
  if (!packaged) return "Update checks are available in the installed app, not development mode.";
  if (portable) return "Automatic updates require the installer edition. Portable copies must be replaced manually.";
  if (platform !== "win32") return "Automatic updates are currently available for the Windows installer.";
  if (!configured) return "This build does not have an update location configured.";
  return null;
}

export class UpdateService {
  constructor({ updater, currentVersion, disabledReason = null, emit = () => {}, log = () => {}, prompt = async () => false, busy = () => false }) {
    Object.assign(this, { updater, emit, log, prompt, busy });
    this.state = { phase: disabledReason ? "disabled" : "idle", currentVersion, version: null, percent: 0, message: disabledReason ?? "Updates are checked when the app opens." };
    this.prompted = new Set();
    this.installing = false;
    if (disabledReason) return;
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowPrerelease = false;
    updater.allowDowngrade = false;
    updater.disableWebInstaller = true;
    updater.on("checking-for-update", () => this.set({ phase: "checking", message: "Checking for updates…" }));
    updater.on("update-available", info => { this.set({ phase: "available", version: info.version, message: `Version ${displayAppVersion(info.version)} is available.` }); void this.offer(); });
    updater.on("update-not-available", () => this.set({ phase: "idle", message: "You're up to date." }));
    updater.on("download-progress", progress => this.set({ phase: "downloading", percent: Math.min(100, Math.max(0, Number(progress.percent) || 0)), message: "Downloading the update. You can keep using the Toolkit." }));
    updater.on("update-downloaded", info => { this.set({ phase: "downloaded", version: info.version, percent: 100, message: "Update ready. Restart and install when you're ready." }); void this.offer(); });
    updater.on("error", error => this.fail(error));
  }

  snapshot() { return { ...this.state, installing: this.installing }; }
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
