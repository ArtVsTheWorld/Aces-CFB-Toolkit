import fs from "node:fs";
import path from "node:path";

export function validateSavePath(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("Select a Dynasty or Road To Glory save file.");
  const resolved = path.resolve(value.trim().replace(/^["']|["']$/g, ""));
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error("Ace's CFB Toolkit could not find the selected save file.");
  return resolved;
}

export function nextBackupPath(savePath, now = new Date()) {
  const stamp = [String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0"), String(now.getFullYear()).slice(-2)].join("");
  const backupDirectory = path.join(path.dirname(savePath), "Ace's CFB Toolkit Backups");
  const base = path.join(backupDirectory, `${path.basename(savePath)}-BACKUP-${stamp}`);
  let candidate = base;
  for (let suffix = 1; fs.existsSync(candidate); suffix += 1) candidate = `${base}-${suffix}`;
  return candidate;
}

export function createBackup(savePath) {
  const backupPath = nextBackupPath(savePath);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(savePath, backupPath, fs.constants.COPYFILE_EXCL);
  return backupPath;
}

const csvCell = value => { const text = String(value ?? ""); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; };
export function writeCsv(filePath, headings, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${[headings, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}\r\n`, "utf8");
  return filePath;
}
