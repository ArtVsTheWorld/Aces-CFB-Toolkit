import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { HistoryStore } from "../src/main/services/history.js";

test("execution history persists compact summaries without result detail snapshots", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-history-")); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new HistoryStore(path.join(directory, "history.json")); store.load(); store.add({ id: "run-1", timestamp: "2026-08-20T04:00:00.000Z", toolId: "team-boost", toolName: "Team Boost", toolVersion: "0.5", inputPath: "DYNASTY-TEST", mode: "preview", status: "preview", summary: [{ label: "Players changed", value: 12 }], reportPath: "report.csv", details: { huge: true } });
  const reloaded = new HistoryStore(path.join(directory, "history.json")); reloaded.load(); assert.equal(reloaded.list().length, 1); assert.equal(reloaded.get("run-1").summary[0].value, 12); assert.equal("details" in reloaded.get("run-1"), false);
});
