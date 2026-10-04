// Portable source checks. Full-save suites remain available through npm test;
// their private/example dynasty fixtures are deliberately not distributed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "test");
const files = fs.readdirSync(directory).filter(file => file.endsWith(".test.js")).sort();
const selected = [], integration = [];
for (const file of files) {
  const source = fs.readFileSync(path.join(directory, file), "utf8");
  (/EXAMPLE SAVES/.test(source) ? integration : selected).push(file);
}
if (!selected.length) throw new Error("No portable source tests found.");
console.log(`Running ${selected.length} source test files. ${integration.length} full-save test files require external fixtures and are not part of this command.`);
console.log(`Full-save files: ${integration.join(", ")}`);
const result = spawnSync(process.execPath, ["--test", "--test-concurrency=2", ...selected.map(file => path.join(directory, file))], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
