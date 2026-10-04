import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createBackup, nextBackupPath, writeCsv } from "../src/main/services/files.js";
import { toCsv as originalToCsv } from "./legacy-reference/shared/toolUx.js";

test("backups use the dedicated Toolkit folder while retaining the established MMDDYY suffix", () => {
  const result = nextBackupPath("C:\\Saves\\DYNASTY-TEST", new Date(2026, 7, 20));
  assert.equal(result, "C:\\Saves\\Ace's CFB Toolkit Backups\\DYNASTY-TEST-BACKUP-082026");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-backup-"));
  const save = path.join(directory, "DYNASTY-TEST"); fs.writeFileSync(save, "save-data");
  const backup = createBackup(save);
  assert.equal(path.dirname(backup), path.join(directory, "Ace's CFB Toolkit Backups"));
  assert.equal(fs.readFileSync(backup, "utf8"), "save-data");
  fs.rmSync(directory, { recursive: true, force: true });
});

test("GUI CSV escaping exactly matches the original shared report writer", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-csv-")); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "report.csv"); const headings = ["Name", "Value"]; const rows = [["Air Force", 7], ["Smith, Jr.", 'A "quote"']]; writeCsv(file, headings, rows);
  assert.equal(fs.readFileSync(file, "utf8"), originalToCsv(headings, rows));
});
