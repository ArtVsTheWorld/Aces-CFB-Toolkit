// Exercises the real NSIS updater against a loopback feed. Never runs an installer.
const { app } = require("electron");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), http = require("node:http"), crypto = require("node:crypto"), assert = require("node:assert/strict"), { pathToFileURL } = require("node:url");
const { NsisUpdater } = require("electron-updater"), { ElectronHttpExecutor } = require("electron-updater/out/electronHttpExecutor.js"), yaml = require("js-yaml");
const root = path.resolve(__dirname, ".."), build = path.resolve(process.argv.find(arg => arg.startsWith("--build="))?.slice(8) || path.join(root, "dist/v0.18.0-installer"));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-update-download-"));
app.setPath("userData", temporary); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const { UpdateService } = await import(pathToFileURL(path.join(root, "src/main/services/updates.js")));
  const manifest = yaml.load(fs.readFileSync(path.join(build, "latest.yml"), "utf8"));
  assert.equal(manifest.files.length, 1); const file = manifest.files[0], installer = path.join(build, file.url);
  assert.equal(fs.statSync(installer).size, file.size, "Manifest file name/size must match the real installer");
  const invalidBody = Buffer.alloc(1024, 65), invalidHash = crypto.createHash("sha512").update("wrong-content").digest("base64");
  const invalid = { ...manifest, files: [{ url: "bad.exe", sha512: invalidHash, size: invalidBody.length }], path: "bad.exe", sha512: invalidHash };
  let downloadRequests = 0;
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname === "/good/latest.yml" || url.pathname === "/bad/latest.yml") { response.setHeader("Content-Type", "text/yaml"); response.end(yaml.dump(url.pathname.startsWith("/good/") ? manifest : invalid)); }
    else if (url.pathname === `/good/${file.url}`) { downloadRequests++; response.setHeader("Content-Length", file.size); fs.createReadStream(installer).pipe(response); }
    else if (url.pathname === "/bad/bad.exe") { downloadRequests++; response.setHeader("Content-Length", invalidBody.length); response.end(invalidBody); }
    else { response.statusCode = 404; response.end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let quitCalls = 0;
  const make = kind => {
    const profile = path.join(temporary, kind); fs.mkdirSync(profile, { recursive: true });
    const configPath = path.join(profile, "app-update.yml"); fs.writeFileSync(configPath, yaml.dump({ provider: "generic", url: `${base}/${kind}/`, updaterCacheDirName: "isolated-cache" }));
    const adapter = { version: "0.17.9", name: "cfb-toolkit-test", isPackaged: true, userDataPath: profile, baseCachePath: profile, appUpdateConfigPath: configPath, whenReady: async () => {}, onQuit: () => {}, quit: () => { quitCalls++; }, relaunch: () => { quitCalls++; } };
    const updater = new NsisUpdater(null, adapter); updater.httpExecutor = new ElectronHttpExecutor(); updater.logger = { info() {}, warn() {}, error() {}, debug() {} };
    updater.setFeedURL({ provider: "generic", url: `${base}/${kind}/` }); updater.disableDifferentialDownload = true;
    const phases = [], service = new UpdateService({ updater, currentVersion: adapter.version, emit: value => phases.push(value.phase) });
    return { updater, service, phases };
  };
  try {
    const good = make("good"); await good.service.check(); assert.equal(good.service.snapshot().phase, "available"); assert.equal(downloadRequests, 0, "Check must not auto-download");
    await good.service.download(); assert.equal(good.service.snapshot().phase, "downloaded"); assert.ok(good.phases.includes("downloading"));
    const downloaded = good.updater.downloadedUpdateHelper.file;
    assert.equal(crypto.createHash("sha512").update(fs.readFileSync(downloaded)).digest("base64"), file.sha512);
    const bad = make("bad"); await bad.service.check(); await bad.service.download(); assert.equal(bad.service.snapshot().phase, "error", "Checksum failures must prevent a ready-to-install result");
    assert.ok(!bad.phases.includes("downloaded")); assert.equal(quitCalls, 0, "Downloads must never restart or install without approval");
    console.log("Real NSIS updater passed: higher-version detection, no automatic download, actual installer download/progress, manifest SHA-512 verification, invalid checksum rejection, isolated cache, no installer execution.");
  } finally { await new Promise(resolve => server.close(resolve)); }
  app.quit();
}).catch(error => { console.error(error.stack); app.exit(1); });
