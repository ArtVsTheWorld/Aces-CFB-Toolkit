// Parse quoted CSV, including embedded newlines, without interpreting gear JSON.
export function parseCsv(content) {
  const rows = [], row = []; let cell = "", quoted = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (quoted) { if (char === '"' && content[i + 1] === '"') { cell += '"'; i++; } else if (char === '"') quoted = false; else cell += char; }
    else if (char === '"' && !cell) quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\r" || char === "\n") { if (char === "\r" && content[i + 1] === "\n") i++; row.push(cell); rows.push(row.splice(0)); cell = ""; }
    else cell += char;
  }
  if (quoted) throw new Error("The generated CSV contains an incomplete quoted field.");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
export function auditReport(report, audit) {
  if (!audit) return report;
  const headings = ["AuditRunID", "AuditToolVersion", "AuditRunMode", "AuditSavePath", "AuditInputOptionsJSON"];
  const values = [audit.runId, audit.toolVersion, audit.mode, audit.savePath, JSON.stringify(audit.options ?? {})];
  return { ...report, headings: [...report.headings, ...headings], rows: report.rows.map((row, index) => [...row, ...values.slice(0, 4), index === 0 ? values[4] : ""]) };
}
