import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../src/renderer/index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/renderer/redesign.css", import.meta.url), "utf8");
const layout = fs.readFileSync(new URL("../src/renderer/layout-fixes.css", import.meta.url), "utf8");
const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("the stable shell and packaging no longer show experimental release labels", () => {
  assert.doesNotMatch(index, /Experimental UI|EXPERIMENTAL UI|UI REDESIGN|\(Experimental\)/);
  assert.doesNotMatch(renderer, /\(Experimental\)|This experimental build/);
  assert.doesNotMatch(pkg.build.artifactName, /Experimental/);
  assert.equal(pkg.version, "19.0.0");
});

test("sports operations navigation retains every registered primary tool", () => {
  for (const id of ["jersey-renumber", "commentary-id", "freshman-equipment", "equipment-patcher", "team-boost", "long-snap", "dealbreaker-fixer", "automatic-force-win"]) {
    assert.match(renderer, new RegExp(`navTool\\(\"${id}\"`));
  }
  assert.match(renderer, /Player &amp; Roster Tools/);
  assert.match(renderer, /Team Management/);
  assert.match(renderer, /Dynasty Management/);
});

test("equipment redesign retains the original option and preview/apply contract", () => {
  for (const id of ["equipment-included", "equipment-positions", "equipment-classes", "equipment-redshirt-group", "equipment-min", "equipment-max", "equipment-skip-nil", "equipment-top", "equipment-donor", "equipment-cross-percent", "equipment-multiple-percent", "equipment-no-drip", "equipment-unlocked", "fix-pants", "fix-helmet", "fix-rolled", "fix-socks", "fix-sleeves", "fix-nike", "fix-visors", "fix-unlocked-mouthpieces", "fix-unlocked-recolor"]) {
    assert.match(renderer, new RegExp(id));
  }
  assert.match(renderer, /window\.cfbToolkit\.runTool\(\{ toolId, savePath: state\.activeSave\.path, mode, options \}\)/);
  assert.match(renderer, /mode === "preview" \? equipmentOptions\(toolId\) : \{ planId: preview\?\.planId \}/);
  assert.match(renderer, /Save unchanged until Apply/);
});

test("redesign supports both themes, dense previews, and narrow desktop layouts", () => {
  assert.match(css, /\[data-theme="dark"\]/);
  assert.match(css, /equipment-workbench/);
  assert.match(css, /equipment-change-card/);
  assert.match(css, /jersey-change-card/);
  assert.match(css, /commentary-review-card/);
  assert.match(css, /@media \(max-width: 920px\)/);
});

test("Jersey redesign keeps both allocation cores and the exact cached-plan workflow", () => {
  assert.match(renderer, /state\.jerseyMode === "no-duplicates" \? "jersey-no-duplicates" : "jersey-renumber"/);
  for (const id of ["jersey-skipped", "renumber-nil", "jersey-team-rules", "jersey-retired", "jersey-promotions", "jersey-preview", "jersey-apply"]) {
    assert.match(renderer, new RegExp(id));
  }
  assert.match(renderer, /mode === "preview" \? jerseyOptions\(toolId\) : \{ planId: preview\?\.planId \}/);
  assert.match(renderer, /Choose one numbering style for this run/);
  assert.match(css, /jersey-workbench/);
});

test("Commentary redesign preserves matching defaults and explicit review decisions", () => {
  for (const id of ["phonetic", "first-name", "preserve-unmatched", "freshmen-only", "analyze-commentary"]) {
    assert.match(renderer, new RegExp(id));
  }
  assert.match(renderer, /ruleToggle\("phonetic"/);
  assert.match(renderer, /ruleToggle\("first-name"/);
  assert.doesNotMatch(renderer, /id="show-all" type="checkbox"/);
  assert.match(renderer, /You will Accept or Reject each sound-alike suggestion before Apply/);
  assert.match(css, /commentary-workbench/);
});

test("Equipment second pass uses a persistent wizard and dedicated full-width preview", () => {
  assert.match(renderer, /equipmentStepNames/);
  assert.match(renderer, /\["Player Pool", "Donor Settings", "Equipment Options", "Review"\]/);
  assert.match(renderer, /\["Player Pool", "Correction Passes", "Modded Correction Passes", "Review"\]/);
  assert.match(renderer, /equipmentWizardPanel\(3, "Review"/);
  assert.match(renderer, /Preview Complete — Save Unchanged/);
  assert.match(renderer, /View Full Configuration/);
  assert.match(renderer, /id="equipment-edit-settings"/);
  assert.match(renderer, /showEquipmentPreviewWorkspace\(true\)/);
  assert.match(css, /equipment-stepper/);
  assert.match(css, /equipment-preview-workspace \.equipment-card-list \{ grid-template-columns: repeat\(2/);
});

test("equipment preview replaces the full configuration page and Player Pool stays compact", () => {
  assert.match(renderer, /id="equipment-config-workspace"/);
  assert.match(renderer, /querySelector\("#equipment-config-workspace"\)/);
  assert.match(renderer, /showEquipmentPreviewWorkspace\(show\)[\s\S]*window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
  assert.match(css, /\.equipment-config-workspace\[hidden\]/);
  assert.match(renderer, /player-pool-layout/);
  assert.match(renderer, /player-filter-grid/);
  assert.match(css, /\.player-pool-layout \{ display: grid/);
  assert.match(css, /\.experimental-ui \.player-filter-grid select\[multiple\] \{ min-height: 70px; height: 70px; \}/);
});

test("Jersey, Commentary, and Long Snap stop at the shared no-save screen", () => {
  assert.match(renderer, /function longSnapPage\(tool\) \{ if \(!state\.activeSave\?\.exists\) return `\$\{toolHeader\(tool\)\}\$\{inputCard\(\)\}`/);
  assert.match(renderer, /async function jerseyPage\(tool\)[\s\S]*if \(!state\.activeSave\?\.exists\) \{ content\.innerHTML = `\$\{toolHeader\(tool\)\}\$\{inputCard\(\)\}`; bindCommon\(\); return; \}/);
  assert.match(renderer, /function commentaryConfigPage\(tool\) \{ if \(!state\.activeSave\?\.exists\) return `\$\{toolHeader\(tool\)\}\$\{inputCard\(\)\}`/);
});

test("Equipment team picker uses the single Teams selection in the displayed count", () => {
  assert.match(renderer, /function teamPicker/);
  assert.match(renderer, /data-team-choice/);
  assert.match(renderer, /equipmentAvailableTeamCount/);
  assert.match(renderer, /return included\.length \|\| prepared\.teams\.length/);
  assert.doesNotMatch(renderer, /teamPicker\("equipment-excluded"/);
  assert.match(renderer, /teamNode\.textContent = equipmentAvailableTeamCount\(prepared\)/);
});

test("dark sidebar artwork stays bright in both themes and home field marks are removed", () => {
  assert.match(layout, /\.nav-link \.nav-icon \.custom-tool-icon[\s\S]*filter: invert\(1\)/);
  assert.match(css, /\.experimental-ui \.hero:after \{ content: none; \}/);
});

test("Smart Force Win uses settings review and a dedicated schedule preview", () => {
  for (const id of ["force-config-workspace", "force-review-workspace", "force-preview-workspace", "force-review-settings", "force-preview", "force-apply"]) {
    assert.match(renderer, new RegExp(id));
  }
  assert.match(renderer, /Approve Settings &amp; Preview Schedule/);
  assert.match(renderer, /showForceWinStage\("preview"\)/);
  assert.match(renderer, /mode === "preview" \? forceWinOptions\(\) : \{ planId: preview\?\.planId \}/);
  assert.match(css, /force-review-grid/);
});

test("team logos cover Middle Tennessee aliases and use the supplied TeamBuilder fallback", () => {
  for (const alias of ["middletennessee", "middletenn", "mtennessee", "midtennstate", "mtsu"]) {
    assert.match(renderer, new RegExp(`"${alias}": "MidTennState"`));
  }
  assert.match(renderer, /const teamLogoFallback = "assets\/team-logos\/TeamBuilderFallback\.png"/);
  assert.match(renderer, /const forceLogoOverrides = \{ navy: "Navy_OL\.png" \}/);
  assert.match(renderer, /content\.addEventListener\("error", event => applyTeamLogoFallback\(event\.target\), true\)/);
  assert.match(renderer, /img\[data-team-logo\]/);
  assert.doesNotMatch(renderer, /onerror=/);
  assert.doesNotMatch(renderer, /BringGloryHome_OL\.webp/);
  assert.ok(fs.statSync(new URL("../src/renderer/assets/team-logos/TeamBuilderFallback.png", import.meta.url)).size > 0);
  assert.ok(fs.statSync(new URL("../src/renderer/assets/team-logos/Navy_OL.png", import.meta.url)).size > 0);
});

test("Dealbreaker preview lists only actual changes and explains None-floor protection", () => {
  const runner = fs.readFileSync(new URL("../src/main/tools/dealbreaker/runner.js", import.meta.url), "utf8");
  assert.match(runner, /const changedRows = rows\.filter\(row => row\.currentStoredValue !== row\.proposedStoredValue\)/);
  assert.match(runner, /totalPreviewRows: changedRows\.length, changes: changedRows\.slice/);
  assert.match(runner, /previewRows: changedRows/);
  assert.match(renderer, /The None minimum protected existing players/);
  assert.match(renderer, /No proposed changes\./);
});

test("all shared team pickers filter hidden rows and show team logos", () => {
  for (const id of ["team-search", "jersey-skipped", "equipment-included", "force-skipped"]) {
    assert.match(renderer, new RegExp(`teamPicker\\("${id}"`));
  }
  assert.match(renderer, /row\.hidden = Boolean\(query && !row\.dataset\.search\.includes\(query\)\)/);
  assert.match(css, /\.team-picker-row\[hidden\] \{ display: none !important; \}/);
});

test("remaining player tools use logo cards and table views for preview", () => {
  assert.match(renderer, /function genericPlayerResults/);
  for (const kind of ["dealbreaker-fixer", "long-snap"]) {
    assert.match(renderer, new RegExp(`result\\.resultKind === "${kind}"\\) return genericPlayerResults`));
  }
  assert.match(renderer, /result\.resultKind === "team-boost"\) return teamBoostResults/);
  assert.match(renderer, /generic-player-card-list/);
  assert.match(renderer, /data-generic-view="table"/);
});

test("Team Boost groups attribute changes per player with signed color treatment", () => {
  assert.match(renderer, /function groupTeamBoostChanges/);
  assert.match(renderer, /groups\.get\(key\)\.changes\.push\(change\)/);
  assert.match(renderer, /function teamBoostRatingChanges/);
  assert.match(renderer, /delta >= 0 \? "increase" : "decrease"/);
  for (const abbreviation of ["OVR", "SPD", "ACC", "AGI", "COD", "STR", "AWR", "JMP", "STA", "INJ", "TGH", "CAR", "BCV", "BTK", "TRK", "SFA", "SPM", "JKM", "CTH", "CIT", "SPC", "SRR", "MRR", "DRR", "RLS", "THP", "SAC", "MAC", "DAC", "RUN", "PAC", "TUP", "BSK", "RBK", "PBK", "IBL", "RBP", "RBF", "PBP", "PBF", "LBK", "TAK", "POW", "PUR", "PRC", "BSH", "PMV", "FMV", "MCV", "ZCV", "PRS", "KPW", "KAC", "RET"]) {
    assert.match(renderer, new RegExp(`: "${abbreviation}"`));
  }
  assert.match(css, /\.team-boost-rating-change\.increase/);
  assert.match(css, /\.team-boost-rating-change\.decrease/);
  assert.match(css, /\.team-boost-table td:last-child/);
});

test("every remaining preview opens as a dedicated second-stage page", () => {
  assert.match(renderer, /function standardPreviewWorkspace/);
  assert.match(renderer, /function showStandardPreviewStage/);
  for (const title of ["Long Snap Rating Preview", "Team Boost Rating Preview", "Jersey Assignment Preview", "Dealbreaker Preview", "Commentary ID Final Preview"]) {
    assert.match(renderer, new RegExp(`standardPreviewWorkspace\\("${title}"`));
  }
  assert.match(renderer, /if \(mode === "preview"\) showStandardPreviewStage\(true\)/);
  assert.match(renderer, /data-standard-edit-settings/);
  assert.match(css, /\.standard-config-workspace\[hidden\]/);
  assert.match(css, /\.standard-preview-workspace\[hidden\]/);
  assert.match(css, /\.stage-settings-workbench \{ grid-template-columns: minmax\(0, 920px\)/);
});

test("Unlocked-only options clearly display their requirement", () => {
  assert.match(renderer, /<strong class=\\"requirement\\">Requires CFB27 Unlocked by Orckestra\. Latest version recommended: 0\.96\.<\/strong>/);
  assert.match(renderer, /Requires RAW Accessories by Delonte RAW\. Latest version recommended: v2\.0\.4\./);
  assert.match(renderer, /unlocked-warning/);
  assert.match(css, /\.requirement/);
});
