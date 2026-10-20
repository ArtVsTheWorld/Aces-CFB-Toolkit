import test from "node:test";
import assert from "node:assert/strict";
import { equipmentDisplayName, equipmentDisplayValue, recolorEquipmentItem } from "../src/main/tools/equipment/catalog.js";

// Labels supplied by the user and matched to the four SJSU quarterbacks in
// DYNASTY-UNDERSHIRTEXAMPLE. These aliases do not change generation eligibility.
const tees = [
  ["primary", "G_CompressionT_Crew_LongSleeve_99Club_B_GOL", "Relaxed Tee Primary"],
  ["secondary", "G_CompressionT_Crew_LongSleeve_99Club_B_WHI", "Relaxed Tee Secondary"],
  ["white", "G_CompressionT_Crew_ShortSleeve_99Club_B_GOL", "Relaxed Tee White"],
  ["black", "G_CompressionT_Crew_ShortSleeve_99Club_B_WHI", "Relaxed Tee Black"]
];

test("verified Relaxed Tee labels appear in direct and combined equipment descriptions", () => {
  for (const [, asset, label] of tees) {
    assert.equal(equipmentDisplayName(asset), label);
    assert.equal(equipmentDisplayValue(`InnerShirt: ${asset}`), `InnerShirt: ${label}`);
  }
  assert.equal(equipmentDisplayValue(`${tees[0][1]} → ${tees[3][1]}`), "Relaxed Tee Primary → Relaxed Tee Black");
});

test("display aliases preserve every verified Relaxed Tee recolor mapping", () => {
  for (const source of ["Undershirt_Untucked", ...tees.map(([, asset]) => asset)]) {
    for (const [color, asset] of tees) assert.equal(recolorEquipmentItem(source, color), asset);
  }
  assert.equal(equipmentDisplayName("Unknown_Custom_Asset"), "Unknown_Custom_Asset");
});
