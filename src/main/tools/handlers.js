import { runLongSnap } from "./longSnap/runner.js";
import { prepareTeamBoost, runTeamBoost } from "./teamBoost/runner.js";
import { prepareCommentary, runCommentary } from "./commentary/runner.js";
import { prepareJerseyRenumber, runJerseyRenumber } from "./jersey/standardRunner.js";
import { prepareJerseyNoDuplicates, runJerseyNoDuplicates } from "./jersey/noDuplicatesRunner.js";
import { prepareEquipmentTool, runEquipmentPatcher, runFreshmanEquipment } from "./equipment/runner.js";
import { prepareForceWin, runForceWin } from "./forceWin/runner.js";
import { prepareDealbreaker, runDealbreaker } from "./dealbreaker/runner.js";
import { prepareNilToggle, runNilToggle } from "./nilToggle/runner.js";

const handlers = new Map([
  ["long-snap", { run: runLongSnap }],
  ["nil-toggle", { prepare: prepareNilToggle, run: runNilToggle }],
  ["team-boost", { prepare: prepareTeamBoost, run: runTeamBoost }]
  ,["commentary-id", { prepare: prepareCommentary, run: runCommentary }],
  ["jersey-renumber", { prepare: prepareJerseyRenumber, run: runJerseyRenumber }],
  ["jersey-no-duplicates", { prepare: prepareJerseyNoDuplicates, run: runJerseyNoDuplicates }],
  ["freshman-equipment", { prepare: prepareEquipmentTool, run: runFreshmanEquipment }],
  ["equipment-patcher", { prepare: prepareEquipmentTool, run: runEquipmentPatcher }],
  ["automatic-force-win", { prepare: prepareForceWin, run: runForceWin }]
  ,["dealbreaker-fixer", { prepare: prepareDealbreaker, run: runDealbreaker }]
]);
export function getToolHandler(toolId) { return handlers.get(toolId) ?? null; }
export function executableToolIds() { return [...handlers.keys()]; }
