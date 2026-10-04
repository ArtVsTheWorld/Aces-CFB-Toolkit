import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateNilSave, validateBoostSave } from "./helpers/v180SaveValidation.js";

const fixture = fileURLToPath(new URL("../../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN", import.meta.url));
const schema = fileURLToPath(new URL("../resources/engine-data/C27_486_6.gz", import.meta.url));
for (const [name, validate] of [["NIL Toggle", validateNilSave], ["Team Boost scope + positions + attributes", validateBoostSave]]) test(`${name}: Preview is read-only, Apply backs up first and changes only the approved fields`, { timeout: 90000 }, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-v180-workflow-")), savePath = path.join(directory, "DYNASTY-TEST");
  fs.copyFileSync(fixture, savePath);
  await validate(savePath, schema);
});
