import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// Source-only recovery: never includes personal settings, saves, outputs or Git.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots = ["src", "resources", "build", "scripts", "test", "docs"];
const files = ["package.json", "package-lock.json", ".gitignore", "README.md", "CONTRIBUTING.md", "LICENSE", "THIRD_PARTY_NOTICES.md"];
const digest = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const contained = (base, relative) => {
  const result = path.resolve(base, relative);
  if (!result.startsWith(path.resolve(base) + path.sep)) throw new Error("Snapshot path escapes its directory.");
  return result;
};
function inventory() {
  const result = [];
  const visit = relative => {
    const absolute = contained(root, relative);
    if (!fs.existsSync(absolute)) return;
    if (fs.statSync(absolute).isDirectory()) for (const entry of fs.readdirSync(absolute)) visit(path.join(relative, entry));
    else result.push(relative.replaceAll("\\", "/"));
  };
  [...roots, ...files].forEach(visit);
  return result.sort();
}
function create() {
  const target = fs.mkdtempSync(path.join(root, "outputs", "ui-rollback-"));
  const entries = inventory().map(relative => {
    const source = contained(root, relative), copy = contained(path.join(target, "files"), relative);
    fs.mkdirSync(path.dirname(copy), { recursive: true }); fs.copyFileSync(source, copy);
    return { path: relative, sha256: digest(source) };
  });
  fs.writeFileSync(path.join(target, "manifest.json"), JSON.stringify({ created: new Date().toISOString(), version: JSON.parse(fs.readFileSync(path.join(root, "package.json"))).version, entries }, null, 2));
  return target;
}
function verify(target) {
  const manifest = JSON.parse(fs.readFileSync(path.join(target, "manifest.json")));
  if (!Array.isArray(manifest.entries) || !manifest.entries.length) throw new Error("Invalid snapshot manifest.");
  for (const entry of manifest.entries) {
    if (![...roots, ...files].some(name => entry.path === name || entry.path.startsWith(name + "/"))) throw new Error("Unexpected snapshot target.");
    if (digest(contained(path.join(target, "files"), entry.path)) !== entry.sha256) throw new Error(`Snapshot checksum mismatch: ${entry.path}`);
  }
  return manifest;
}
fs.mkdirSync(path.join(root, "outputs"), { recursive: true });
const [mode = "create", argument] = process.argv.slice(2);
if (mode === "create") { const target = create(); console.log(JSON.stringify({ snapshot: target, verifiedFiles: verify(target).entries.length })); }
else if (["verify", "restore"].includes(mode) && argument) {
  const target = path.resolve(argument), manifest = verify(target);
  if (mode === "restore") {
    const recovery = create(); // Protect any work done after the snapshot as well.
    for (const entry of manifest.entries) {
      const destination = contained(root, entry.path);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(contained(path.join(target, "files"), entry.path), destination);
    }
    console.log(JSON.stringify({ restoredFiles: manifest.entries.length, newerWorkSavedTo: recovery, note: "New files are not deleted. Restart/rebuild to use the restored UI." }));
  } else console.log(JSON.stringify({ snapshot: target, verifiedFiles: manifest.entries.length, version: manifest.version }));
} else throw new Error("Usage: node scripts/ui-snapshot.mjs create | verify <snapshot> | restore <snapshot>");
