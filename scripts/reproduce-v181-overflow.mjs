import path from "node:path";
import { pathToFileURL } from "node:url";
import asar from "@electron/asar";
import { openCfb27Save, readTables } from "../src/main/services/save.js";
import { VISUALS_TABLE_UID } from "../src/main/tools/equipment/shared.js";
import { rollUnlockedMouthpiece } from "../src/main/tools/equipment/core/globalFixes.js";
import { mulberry32 } from "../src/main/tools/equipment/core/patcher.js";
const archive = "dist/v0.18.1-installer/win-unpacked/resources/app.asar";
const entry = asar.listPackage(archive).find(file => file.endsWith("visualsSafety.js")).slice(1);
const oldSource = asar.extractFile(archive, entry).toString().replace("../../services/save.js", pathToFileURL(path.resolve("src/main/services/save.js")).href).replace("./openSave.js", pathToFileURL(path.resolve("src/main/tools/equipment/openSave.js")).href);
const legacy = await import("data:text/javascript;base64," + Buffer.from(oldSource).toString("base64"));
const opened = await openCfb27Save("D:/Downloads/DYNASTY-UWDYNTEST", "resources/engine-data/C27_486_6.gz"), { visuals } = await readTables(opened.franchise, { visuals: VISUALS_TABLE_UID });
legacy.installVisualsWriteSafety(visuals);
const spill = visuals.records[14161], main = visuals.records[12955];
console.log("Before", { overflow: main.Overflow, spillRawLength: spill.RawData.length });
const original = JSON.parse(main.RawData), field = main.getFieldByKey("RawData").thirdTableField;
let compact;
for (let seed = 0; seed < 1000; seed++) {
  const candidate = structuredClone(original), mouth = rollUnlockedMouthpiece("skill", mulberry32(seed), false, 75);
  for (const loadout of candidate.loadouts) if (loadout.loadoutType === "PlayerOnField") for (const element of loadout.loadoutElements) if (element.slotType === "MouthWear") element.itemAssetName = mouth.item.itemName;
  const json = JSON.stringify(candidate), bytes = field.strategy.setUnformattedValueFromFormatted(json, field.unformattedValue, field.maxLength, field.strategyContext);
  if (bytes.length <= field.maxLength + 2) { compact = json; console.log("Fits inline after mouthpiece reroll", { seed, mouthpiece: mouth.item.itemName, bytes: bytes.length }); break; }
}
if (!compact) throw new Error("No inline reroll found");
main.RawData = compact;
console.log("After parent mutation", { overflow: main.Overflow, spillEmpty: spill.isEmpty, spillOverflow: spill.Overflow, spillRaw: spill.RawData });
try { spill.RawData = "{}"; } catch (error) { console.log("Legacy spill replay:", error.message); }
