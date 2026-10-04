import path from "node:path";
import { createBackup } from "../../services/files.js";
import { loadJerseyTables } from "./shared.js";
import { completePlan, saveFingerprint, takePlan } from "./planStore.js";

export async function applyJerseyPlan({ toolId, savePath, options, schemaPath, reports }) {
  const plan = takePlan(options?.planId); if (plan.toolId !== toolId || path.resolve(plan.savePath) !== path.resolve(savePath)) throw new Error("The preview does not belong to this tool and Active Save.");
  if (saveFingerprint(plan.savePath) !== plan.saveFingerprint) throw new Error("The save changed after Preview. Run Preview again before Apply.");
  if (plan.assignments.some(change => !Number.isInteger(change.newNumber) || change.newNumber < 0 || change.newNumber > 99)) throw new Error("The preview contains an invalid jersey number and cannot be applied.");
  const loaded = await loadJerseyTables(savePath, schemaPath);
  for (const assignment of plan.assignments) { const record = loaded.players.records[assignment.row]; if (!record || record.isEmpty || Number(record.JerseyNum) !== assignment.oldNumber) throw new Error(`Player row ${assignment.row} changed after Preview. Run Preview again.`); }
  const reportPath = reports.create({ ...plan.report, toolId, toolName: plan.toolName }); let backupPath = null;
  if (plan.assignments.length || plan.backupWhenEmpty) { backupPath = createBackup(loaded.savePath); for (const assignment of plan.assignments) loaded.players.records[assignment.row].JerseyNum = assignment.newNumber; await loaded.franchise.save(); }
  completePlan(options.planId);
  return { ...plan.result, status: plan.assignments.length ? "completed" : "no-changes", mode: "apply", savePath: loaded.savePath, backupPath, reportPath, planId: options.planId };
}
