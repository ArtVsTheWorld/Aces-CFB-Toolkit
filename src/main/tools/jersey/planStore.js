import crypto from "node:crypto";
import fs from "node:fs";
import {equipmentRunOverview} from '../../../shared/equipmentRunOverview.js';
import previewPages from '../../../shared/previewPages.cjs';

const plans = new Map();
const indexes=new WeakMap();
export function saveFingerprint(filePath) { return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"); }
const PREVIEW_FACET_FIELDS = ["team", "position", "classYear"];
function previewFacets(rows) { return Object.fromEntries(PREVIEW_FACET_FIELDS.map(field => [field, [...new Set(rows.map(row => String(row?.[field] ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))])); }
export function storePlan(plan) { const id = crypto.randomUUID(), rows = Array.isArray(plan.previewRows) ? plan.previewRows : plan.result?.details?.changes ?? []; if (plan.result?.details) { plan.result.details.previewFacets = previewFacets(rows); if(rows.length===Number(plan.result.details.totalPreviewRows??rows.length)){const overview=equipmentRunOverview(plan.result.resultKind??plan.toolId,rows);if(overview)plan.result.details.equipmentOverview=overview;} } plans.set(id, { ...plan, createdAt: Date.now() }); while (plans.size > 12) plans.delete(plans.keys().next().value); return id; }
function getPlan(id) { const plan = plans.get(id); if (!plan) throw new Error("This cached result is no longer available. Run the tool again."); if (Date.now() - plan.createdAt > 30 * 60 * 1000) { plans.delete(id); throw new Error("This cached result expired. Run the tool again."); } return plan; }
export function takePlan(id) { const plan = getPlan(id); if (plan.completedAt) throw new Error("This preview has already been applied. Run Preview again before Apply."); return plan; }
export function searchPlanRows(id, query, limit = 1000, filters = {}, page = 0) {
  const plan=getPlan(id),rows=Array.isArray(plan.previewRows)?plan.previewRows:plan.result?.details?.changes??[];
  if(!indexes.has(plan))indexes.set(plan,previewPages.createIndex(rows));
  return {...previewPages.page(indexes.get(plan),{query,filters,page,size:limit}),previewFacets:plan.result?.details?.previewFacets??previewFacets(rows)};
}
// Page only the IPC/display result. The exact cached assignments and complete
// review/report rows stay untouched, including after Apply.
export function pagePlanResult(result){
  if(!result.planId||!previewPages.supports(result.resultKind))return result;
  const page=searchPlanRows(result.planId,'',previewPages.PAGE_SIZE);
  return {...result,details:{...result.details,...page}};
}
export function snapshotPlanRows(id) { const plan = getPlan(id); return structuredClone(Array.isArray(plan.previewRows) ? plan.previewRows : plan.result?.details?.changes ?? []); }
export function completePlan(id) { const plan = getPlan(id); plan.completedAt = Date.now(); }
export function setPlanAudit(id, audit) { getPlan(id).audit = structuredClone(audit); }
export function planAudit(id) { return getPlan(id).audit ? structuredClone(getPlan(id).audit) : null; }
