import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { EventEmitter } from "node:events";
import { UpdateService, updateAvailability } from "../src/main/services/updates.js";

const tick = () => new Promise(resolve => setImmediate(resolve));
class FakeUpdater extends EventEmitter {
  checks = 0; downloads = 0; installs = [];
  async checkForUpdates() { this.checks++; this.emit("update-not-available"); }
  async downloadUpdate() { this.downloads++; }
  quitAndInstall(...args) { this.installs.push(args); }
}
function fixture(extra = {}) {
  const updater = new FakeUpdater(), states = [], logs = [];
  const service = new UpdateService({ updater, currentVersion: "0.18.0", emit: state => states.push(state), log: (...entry) => logs.push(entry), ...extra });
  return { service, updater, states, logs };
}

test("updates only enable for configured installed Windows builds", () => {
  const config = { packaged: true, platform: "win32", portable: false, configured: true };
  assert.equal(updateAvailability(config), null);
  for (const override of [{ packaged: false }, { platform: "linux" }, { portable: true }, { configured: false }]) assert.ok(updateAvailability({ ...config, ...override }));
});
test("disabled updates never touch updater or network", async () => {
  const { service, updater } = fixture({ disabledReason: "Installer required" });
  assert.equal((await service.check()).phase, "disabled"); assert.equal(updater.checks, 0); assert.equal(updater.listenerCount("error"), 0);
});
test("updates do not automatically download, install on quit, or downgrade", () => {
  const { updater } = fixture();
  assert.equal(updater.autoDownload, false); assert.equal(updater.autoInstallOnAppQuit, false); assert.equal(updater.allowDowngrade, false); assert.equal(updater.allowPrerelease, false);
  assert.equal(updater.disableWebInstaller, true);
});
test("check with no release leaves app usable and up to date", async () => {
  const { service, updater } = fixture();
  assert.equal((await service.check()).message, "You're up to date."); assert.equal(updater.checks, 1);
});
test("concurrent checks share one request", async () => {
  const { service, updater } = fixture(); let finish;
  updater.checkForUpdates = () => { updater.checks++; return new Promise(resolve => { finish = resolve; }); };
  const first = service.check(), second = service.check();
  assert.equal(updater.checks, 1); finish(); await Promise.all([first, second]);
});
test("offline check is nonfatal and retryable", async () => {
  const { service, updater, logs } = fixture();
  updater.checkForUpdates = async () => { throw new Error("offline"); };
  assert.equal((await service.check()).phase, "error"); assert.equal(logs.at(-1)[1], "update-failed");
  updater.checkForUpdates = async () => updater.emit("update-not-available");
  assert.equal((await service.check()).phase, "idle");
});
test("Later keeps update available without downloading and offers once per session", async () => {
  const offered = []; const { service, updater } = fixture({ prompt: async kind => { offered.push(kind); return false; } });
  updater.emit("update-available", { version: "0.18.1" }); await tick(); await service.offer();
  assert.deepEqual(offered, ["download"]); assert.equal(updater.downloads, 0); assert.equal(service.snapshot().phase, "available");
});
test("explicit approval downloads and reports progress", async () => {
  const { service, updater } = fixture({ prompt: async kind => kind === "download" });
  updater.emit("update-available", { version: "0.18.1" }); await tick(); assert.equal(updater.downloads, 1);
  updater.emit("download-progress", { percent: 43.6 }); assert.equal(service.snapshot().percent, 43.6);
  updater.emit("update-downloaded", { version: "0.18.1" }); await tick();
  assert.equal(service.snapshot().phase, "downloaded"); assert.equal(updater.installs.length, 0);
});
test("manual download after Later remains available", async () => {
  const { service, updater } = fixture(); updater.emit("update-available", { version: "0.18.1" }); await tick();
  await service.check(); assert.equal(updater.checks, 0);
  await service.download(); assert.equal(updater.downloads, 1);
});
test("concurrent downloads do not duplicate network requests", async () => {
  const { service, updater } = fixture(); let finish;
  updater.emit("update-available", { version: "0.18.1" }); await tick();
  updater.downloadUpdate = () => { updater.downloads++; return new Promise(resolve => { finish = resolve; }); };
  const first = service.download(), second = service.download(); assert.equal(updater.downloads, 1); finish(); await Promise.all([first, second]);
});
test("failed download does not restart or install", async () => {
  const { service, updater } = fixture(); updater.emit("update-available", { version: "0.18.1" }); await tick();
  updater.downloadUpdate = async () => { throw new Error("Checksum mismatch"); };
  await service.download(); assert.equal(service.snapshot().phase, "error"); assert.equal(updater.installs.length, 0);
});
test("busy tool defers the automatic prompt until idle", async () => {
  let busy = true; const offered = []; const { service, updater } = fixture({ busy: () => busy, prompt: async kind => { offered.push(kind); return false; } });
  updater.emit("update-available", { version: "0.18.1" }); await tick(); assert.deepEqual(offered, []);
  busy = false; await service.offer(); assert.deepEqual(offered, ["download"]);
});
test("downloaded update cannot restart during a tool operation", async () => {
  const { service, updater } = fixture({ busy: () => true });
  updater.emit("update-downloaded", { version: "0.18.1" });
  await assert.rejects(service.install(), /current tool operation/); assert.equal(updater.installs.length, 0);
});
test("installation requires restart confirmation and blocks new operations during it", async () => {
  let confirm; const { service, updater } = fixture({ prompt: () => new Promise(resolve => { confirm = resolve; }) });
  updater.emit("update-downloaded", { version: "0.18.1" });
  assert.equal(service.installing, true); assert.throws(() => service.assertCanRun(), /restart is being confirmed/);
  confirm(true); await tick(); assert.deepEqual(updater.installs, [[true, true]]); assert.equal(service.installing, true);
});
test("canceling restart restores tool access and leaves downloaded update ready", async () => {
  const { service, updater } = fixture(); updater.emit("update-downloaded", { version: "0.18.1" }); await tick();
  service.assertCanRun(); assert.equal(service.installing, false); assert.equal(service.snapshot().phase, "downloaded"); assert.equal(updater.installs.length, 0);
});
test("installation rechecks active operations after confirmation", async () => {
  let busy = false; const { service, updater } = fixture({ busy: () => busy, prompt: async () => { busy = true; return true; } });
  updater.emit("update-downloaded", { version: "0.18.1" }); await tick(); assert.equal(updater.installs.length, 0); assert.equal(service.installing, false);
});
test("fast download still offers installation when finished", async () => {
  const offered = []; const { service, updater } = fixture({ prompt: async kind => { offered.push(kind); return kind === "download"; } });
  updater.downloadUpdate = async () => updater.emit("update-downloaded", { version: "0.18.1" });
  updater.emit("update-available", { version: "0.18.1" }); await tick(); assert.deepEqual(offered, ["download", "install"]);
});
test("install is unavailable before a validated download", async () => {
  const { service } = fixture(); await assert.rejects(service.install(), /Download the update/); await assert.rejects(service.download(), /available update/);
});
test("snapshots are isolated from renderer mutations", () => {
  const { service } = fixture(); const state = service.snapshot(); state.phase = "downloaded"; assert.equal(service.snapshot().phase, "idle");
});
test("installer metadata preserves persistence IDs and publishes only Windows release assets", () => {
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url)));
  assert.equal(pkg.name, "cfb-toolkit"); assert.equal(pkg.build.appId, "com.artvstheworld.cfbtoolkit");
  assert.deepEqual(pkg.build.publish, { provider: "github", owner: "ArtVsTheWorld", repo: "Aces-CFB-Toolkit", releaseType: "draft" });
  assert.equal(pkg.build.nsis.deleteAppDataOnUninstall, false); assert.notEqual(pkg.build.nsis.artifactName, pkg.build.artifactName);
  assert.match(pkg.scripts.build, /nsis.*--publish never/); assert.match(pkg.scripts.release, /nsis.*--publish always/);
  const main = fs.readFileSync(new URL("../src/main/main.js", import.meta.url), "utf8");
  assert.match(main, /IPC.prepareTool, async \(_event, request\) => toolOperation/);
  assert.match(main, /IPC.runTool, async \(_event, request\) => toolOperation/);
  assert.match(main, /Unapplied previews and review decisions will be discarded/);
  const preload = fs.readFileSync(new URL("../src/main/preload.cjs", import.meta.url), "utf8");
  assert.match(preload, /const listener = \(_event, status\) => callback\(status\)/);
  assert.match(preload, /removeListener\("updates:status-changed", listener\)/);
  assert.doesNotMatch(main + preload, /GH_TOKEN|setFeedURL/);
});
