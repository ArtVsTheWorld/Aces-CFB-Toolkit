import fs from "node:fs";
import path from "node:path";
import { auditReport, parseCsv } from "./reportAudit.js";
import { writeCsv } from "./files.js";

export class ReportService {
  constructor(directory, audit = null) { this.directory = directory; this.audit = audit; }
  forRun(audit) { return new ReportService(this.directory, structuredClone(audit)); }
  create(report) {
    const { toolId, toolName, prefix, headings, rows } = auditReport(report, this.audit);
    const createdAt = new Date().toISOString();
    const reportPath = path.join(this.directory, `${prefix}-${createdAt.replaceAll(":", "-").replace(".", "-")}.csv`);
    writeCsv(reportPath, headings, rows);
    fs.writeFileSync(`${reportPath}.meta.json`, JSON.stringify({ toolId, toolName, createdAt, ...(this.audit ? { audit: this.audit } : {}) }), "utf8");
    return reportPath;
  }
  createRaw({ toolId, toolName, prefix, content }) { if (this.audit) { const [headings, ...rows] = parseCsv(content); return this.create({ toolId, toolName, prefix, headings, rows }); } const createdAt = new Date().toISOString(); const reportPath = path.join(this.directory, `${prefix}-${createdAt.replaceAll(":", "-").replace(".", "-")}.csv`); fs.mkdirSync(this.directory, { recursive: true }); fs.writeFileSync(reportPath, content, "utf8"); fs.writeFileSync(`${reportPath}.meta.json`, JSON.stringify({ toolId, toolName, createdAt }), "utf8"); return reportPath; }
  list() {
    if (!fs.existsSync(this.directory)) return [];
    return fs.readdirSync(this.directory).filter(name => name.endsWith(".csv")).map(name => { const filePath = path.join(this.directory, name); const stat = fs.statSync(filePath); let metadata = {}; try { metadata = JSON.parse(fs.readFileSync(`${filePath}.meta.json`, "utf8")); } catch {} return { name, path: filePath, toolId: metadata.toolId ?? null, tool: metadata.toolName ?? "Unknown", createdAt: metadata.createdAt ?? stat.birthtime.toISOString() }; }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
