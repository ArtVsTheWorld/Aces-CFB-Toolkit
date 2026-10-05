// Test the packaged codec and its dictionary/lookup assets, not source substitutes.
const { app } = require("electron");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), assert = require("node:assert/strict"), { pathToFileURL } = require("node:url"), { createHash } = require("node:crypto");
const root = path.resolve(__dirname, ".."), uiRoot = path.resolve(process.argv.find(arg => arg.startsWith("--ui-root="))?.slice(10) || root);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-v184-codec-smoke-"));
app.setPath("userData", profile); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const from = file => import(pathToFileURL(path.join(uiRoot, file)).href);
  const { loadEquipmentTables, snapshotVisualRawData } = await from("src/main/tools/equipment/shared.js");
  const { snapshotVisualsForVerification, saveEquipmentCandidate } = await from("src/main/tools/equipment/visualsSafety.js");
  const { isVisualOverflowStorage } = await from("src/main/tools/equipment/visualStorage.js");
  const source = "D:/Downloads/DYNASTY-OCT04-03h21m46-AUTOSAVE", schema = uiRoot.endsWith("app.asar") ? path.resolve(uiRoot, "../engine-data/C27_486_6.gz") : path.join(root, "resources/engine-data/C27_486_6.gz");
  const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex"), original = hash(source);
  const savePath = path.join(profile, "DYNASTY-CODEC-SMOKE"); fs.copyFileSync(source, savePath);
  const loaded = await loadEquipmentTables(savePath, schema), before = snapshotVisualsForVerification(loaded.visuals, snapshotVisualRawData(loaded.visuals.records));
  const records = loaded.visuals.records.filter(record => !record.isEmpty && !isVisualOverflowStorage(record) && /GearLegsBase_(left|right)sleeve/.test(record.RawData ?? ""));
  assert.ok(records.length >= 2, "Exercise original noncanonical game spellings");
  const assignments = records.map(record => ({ table: "visuals", row: record.index, newValue: JSON.stringify({ ...JSON.parse(record.RawData), encodingSmokeMarker: "v18.4" }) }));
  for (const change of assignments) loaded.visuals.records[change.row].RawData = change.newValue;
  await saveEquipmentCandidate(loaded, schema, before, assignments);
  const reopened = await loadEquipmentTables(savePath, schema);
  for (const change of assignments) assert.deepEqual(JSON.parse(reopened.visuals.records[change.row].RawData), JSON.parse(change.newValue));
  assert.equal(hash(source), original);
  assert.equal(fs.statSync(savePath).size, fs.statSync(source).size);
  console.log(`v18.4 ${uiRoot.endsWith("app.asar") ? "packaged" : "development"} codec smoke passed: ${assignments.length} real case-alias rows, strict candidate verification/reopen, fixed file size, original unchanged.`);
  app.quit();
}).catch(error => { console.error(error.stack); app.exit(1); });
