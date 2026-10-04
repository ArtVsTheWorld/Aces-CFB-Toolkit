import fs from "node:fs";
import zlib from "node:zlib";
import test from "node:test";
import assert from "node:assert/strict";
import { resolveBundledSchemaForHeader } from "../src/main/services/save.js";

const schemaUrl = new URL("../resources/engine-data/C27_486_6.gz", import.meta.url);

test("the latest CFB 27 schema is bundled with verified embedded metadata", () => {
  assert.equal(fs.existsSync(schemaUrl), true);
  const schema = JSON.parse(zlib.gunzipSync(fs.readFileSync(schemaUrl)));
  assert.deepEqual(schema.meta, { major: 486, minor: 6, gameYear: 27 });
  for (const table of ["Player", "Team", "SeasonInfo", "SeasonGame", "CharacterVisuals", "FranchiseUser"]) assert.ok(schema.schemaMap[table], `${table} schema is required`);
});

test("current CFB 27 saves route to schema 486.6", () => {
  assert.equal(resolveBundledSchemaForHeader(27, 833, 0)?.version, "C27_486_6");
});
