import crypto from "node:crypto";
import fs from "node:fs";

const plans = new Map();
export function saveFingerprint(filePath) { return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"); }
const PREVIEW_FACET_FIELDS = ["team", "position", "classYear"];
function previewFacets(rows) { return Object.fromEntries(PREVIEW_FACET_FIELDS.map(field => [field, [...new Set(rows.map(row => String(row?.[field] ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))])); }
export function storePlan(plan) { const id = crypto.randomUUID(), rows = Array.isArray(plan.previewRows) ? plan.previewRows : plan.result?.details?.changes ?? []; if (plan.result?.details) plan.result.details.previewFacets = previewFacets(rows); plans.set(id, { ...plan, createdAt: Date.now() }); while (plans.size > 12) plans.delete(plans.keys().next().value); return id; }
function getPlan(id) { const plan = plans.get(id); if (!plan) throw new Error("This cached result is no longer available. Run the tool again."); if (Date.now() - plan.createdAt > 30 * 60 * 1000) { plans.delete(id); throw new Error("This cached result expired. Run the tool again."); } return plan; }
export function takePlan(id) { const plan = getPlan(id); if (plan.completedAt) throw new Error("This preview has already been applied. Run Preview again before Apply."); return plan; }
export function searchPlanRows(id, query, limit = 1000, filters = {}) { const plan = getPlan(id), rows = Array.isArray(plan.previewRows) ? plan.previewRows : plan.result?.details?.changes ?? [], needle = String(query ?? "").trim().toLowerCase(), selected = Object.fromEntries(PREVIEW_FACET_FIELDS.map(field => [field, String(filters?.[field] ?? "").trim()])), matches = rows.filter(row => (!needle || JSON.stringify(row).toLowerCase().includes(needle)) && PREVIEW_FACET_FIELDS.every(field => !selected[field] || String(row?.[field] ?? "").trim() === selected[field])); return { changes: matches.slice(0, Math.max(1, Math.min(1000, Number(limit) || 1000))), totalMatches: matches.length, totalPreviewRows: rows.length, previewFacets: plan.result?.details?.previewFacets ?? previewFacets(rows) }; }
export function snapshotPlanRows(id) { const plan = getPlan(id); return structuredClone(Array.isArray(plan.previewRows) ? plan.previewRows : plan.result?.details?.changes ?? []); }
export function completePlan(id) { const plan = getPlan(id); plan.completedAt = Date.now(); }
