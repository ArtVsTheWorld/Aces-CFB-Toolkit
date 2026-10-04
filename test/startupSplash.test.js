import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("portable build displays a branded extraction splash", () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.build.portable.splashImage, "build/portable-splash.bmp");
  const bitmap = fs.readFileSync(new URL("../build/portable-splash.bmp", import.meta.url));
  assert.equal(bitmap.toString("ascii", 0, 2), "BM");
  assert.equal(bitmap.readInt32LE(18), 520);
  assert.equal(bitmap.readInt32LE(22), 230);
});

test("renderer keeps a loading screen until startup completes or reports an error", () => {
  const index = fs.readFileSync(new URL("../src/renderer/index.html", import.meta.url), "utf8");
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../src/renderer/redesign.css", import.meta.url), "utf8");
  assert.match(index, /id="startup-screen"/);
  assert.match(css, /\.startup-progress::after[\s\S]*animation: startup-slide/);
  assert.match(renderer, /\.catch\(error => showError\(readableError\(error\)\)\)\.finally\(\(\) => document\.querySelector\("#startup-screen"\)\?\.remove\(\)\)/);
});
