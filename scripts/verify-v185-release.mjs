// Verify the built source/assets and prepare matching local upload files.
// Does not publish, install, or read userData.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url), asar = require("@electron/asar"), yaml = require("js-yaml");
const root = process.cwd(), releaseVersion = JSON.parse(fs.readFileSync("package.json", "utf8")).version, build = path.resolve(process.argv[2] ?? `dist/v${releaseVersion.replace(/\.0$/, "")}-release`), archive = path.join(build, "win-unpacked/resources/app.asar");
const digest = (data, algorithm = "sha256", encoding = "hex") => createHash(algorithm).update(data).digest(encoding);
const files = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
let verified = 0;
for (const file of files(path.join(root, "src"))) {
  const relative = path.relative(root, file);
  assert.equal(digest(asar.extractFile(archive, relative)), digest(fs.readFileSync(file)), `Packaged source/asset differs: ${relative}`); verified++;
}
// Builder intentionally strips scripts/build/dev metadata from package.json.
const packaged = JSON.parse(asar.extractFile(archive, "package.json")), source = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const key of ["name", "version", "main", "type", "license", "dependencies"]) assert.deepEqual(packaged[key], source[key], `Packaged metadata: ${key}`);
const manifest = yaml.load(fs.readFileSync(path.join(build, "latest.yml"), "utf8"));
assert.equal(manifest.version, releaseVersion); assert.equal(manifest.files.length, 1);
const installer = path.join(build, manifest.path), bytes = fs.readFileSync(installer);
assert.equal(bytes.length, manifest.files[0].size);
assert.equal(digest(bytes, "sha512", "base64"), manifest.sha512);
assert.equal(manifest.sha512, manifest.files[0].sha512);
assert.equal(digest(fs.readFileSync(path.join(build, "win-unpacked/resources/commentary-data/PlayerCommentaryidMap.txt"))), digest(fs.readFileSync("resources/commentary-data/PlayerCommentaryidMap.txt")));
for (const schema of files(path.join(root, "resources/engine-data")).filter(file => /C27_.*\.gz$/.test(file))) assert.equal(digest(fs.readFileSync(path.join(build, "win-unpacked/resources/engine-data", path.basename(schema)))), digest(fs.readFileSync(schema)));
const upload = path.join(build, "github-release-assets"); fs.mkdirSync(upload, { recursive: true });
for (const name of [manifest.path, `${manifest.path}.blockmap`, "latest.yml"]) {
  fs.copyFileSync(path.join(build, name), path.join(upload, name));
  assert.equal(digest(fs.readFileSync(path.join(upload, name))), digest(fs.readFileSync(path.join(build, name))));
}
console.log(`Verified ${verified} packaged source/assets, schemas, commentary map, installer manifest/size/SHA-512, and matching local upload copies. Nothing published.`);
console.log(upload);
