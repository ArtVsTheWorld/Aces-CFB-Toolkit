import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { tools } from "../src/shared/toolRegistry.js";

const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");

function rendererFunction(name) {
  const asyncStart = renderer.indexOf(`async function ${name}(`);
  const start = asyncStart >= 0 ? asyncStart : renderer.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  let depth = 0, bodyStart = false;
  for (let index = start; index < renderer.length; index++) {
    if (renderer[index] === "{") { depth++; bodyStart = true; }
    if (renderer[index] === "}" && --depth === 0 && bodyStart) return renderer.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

function createRendererContext() {
  const context = vm.createContext({
    state: { commentaryReview: null, genericResultViews: new Map() },
    escapeHtml: value => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]),
    forceLogoUrl: team => `logo/${team}.png`
  });
  for (const name of ["reviewDecision", "filteredCommentaryProposals", "commentaryDecisionControl", "commentaryReviewTable", "previewChanges", "commentaryResults"]) vm.runInContext(rendererFunction(name), context);
  return context;
}

test("Commentary match review supports cards and table without losing decisions", () => {
  const context = createRendererContext();
  context.state.commentaryReview = {
    analysis: { proposals: [{ row: 7, team: "East Point", player: "Avery Example", currentId: 12, proposedId: 34, matchedName: "Examples", source: "map", method: "phonetic", requiresDecision: true }] },
    decisions: { 7: true }, filter: "", view: "cards"
  };
  const cards = vm.runInContext("commentaryReviewTable()", context);
  assert.match(cards, /commentary-review-card/);
  assert.match(cards, /Avery Example/);
  assert.match(cards, /value="accept" selected/);
  context.state.commentaryReview.view = "table";
  const table = vm.runInContext("commentaryReviewTable()", context);
  assert.match(table, /commentary-review-table/);
  assert.match(table, /Avery Example/);
  assert.match(table, /value="accept" selected/);
  assert.equal(context.state.commentaryReview.decisions[7], true);
});

test("Commentary final preview defaults to cards and retains a table view", () => {
  const context = createRendererContext();
  const result = {
    resultKind: "commentary-id",
    details: { commentaryMapSize: 10, exact: 1, suffix: 0, phonetic: 1, first: 0, unmatched: 0, totalPreviewRows: 1,
      changes: [{ team: "East Point", player: "Avery Example", currentId: 12, proposedId: 34, method: "phonetic", matchedName: "Examples", decision: "Accepted" }] }
  };
  const cards = vm.runInContext("commentaryResults(result)", Object.assign(context, { result }));
  assert.match(cards, /data-generic-view="cards"[^>]*class="active"/);
  assert.match(cards, /commentary-change-card/);
  assert.match(cards, /12 → 34/);
  assert.match(cards, /commentary-result-table/);
  context.state.genericResultViews.set("commentary-id", "table");
  const table = vm.runInContext("commentaryResults(result)", context);
  assert.match(table, /data-generic-view="table"[^>]*class="active"/);
  assert.match(table, /class="equipment-table-view generic-player-table-view"/);
});

test("all active tools have a card-based preview and deprecated White Helmet is not registered", () => {
  assert.equal(tools.some(tool => tool.id === "white-helmet-fix"), false);
  for (const name of ["jerseyResults", "equipmentResults", "teamBoostResults", "genericPlayerResults", "commentaryResults"]) assert.match(rendererFunction(name), /card-list|change-card|player-card/);
  assert.match(rendererFunction("forceScheduleTable"), /force-game/);
  assert.match(rendererFunction("renderResult"), /"commentary-id", "nil-toggle"\].includes\(result.resultKind\)\) bindGenericResultView/);
});

test("Commentary Analyze opens final Preview directly when no decisions are needed", async () => {
  for (const proposals of [[], [{ row: 3, requiresDecision: false }]]) {
    const events = [], output = { innerHTML: "" };
    const context = vm.createContext({
      state: { commentaryReview: null, activeSave: { path: "test-save" } },
      document: { querySelector: () => output },
      window: { cfbToolkit: { prepareTool: async () => ({ analysisSignature: "test", proposals }) } },
      commentaryOptionsFromForm: () => ({ freshmenOnly: true }),
      render: () => events.push("render"),
      runCommentaryReview: async mode => events.push(mode),
      readableError: error => error,
      showError: () => { throw new Error("Unexpected analysis error"); }
    });
    vm.runInContext(rendererFunction("analyzeCommentary"), context);
    await vm.runInContext("analyzeCommentary()", context);
    assert.deepEqual(events, ["render", "preview"]);
    assert.equal(context.state.commentaryReview.autoSkipped, true);
  }
});

test("Commentary Analyze keeps decision review when a phonetic choice is needed", async () => {
  const events = [], output = { innerHTML: "" };
  const context = vm.createContext({
    state: { commentaryReview: null, activeSave: { path: "test-save" } },
    document: { querySelector: () => output },
    window: { cfbToolkit: { prepareTool: async () => ({ analysisSignature: "test", proposals: [{ row: 3, requiresDecision: true }] }) } },
    commentaryOptionsFromForm: () => ({}),
    render: () => events.push("render"),
    runCommentaryReview: async mode => events.push(mode),
    readableError: error => error,
    showError: () => { throw new Error("Unexpected analysis error"); }
  });
  vm.runInContext(rendererFunction("analyzeCommentary"), context);
  await vm.runInContext("analyzeCommentary()", context);
  assert.deepEqual(events, ["render"]);
  assert.equal(context.state.commentaryReview.autoSkipped, false);
});

test("Edit Settings bypasses an empty Commentary review page", () => {
  let click;
  const context = vm.createContext({
    state: { page: "commentary-id", commentaryReview: { autoSkipped: true } },
    document: { querySelectorAll: () => [{ addEventListener: (event, handler) => { if (event === "click") click = handler; } }] },
    render: () => { context.rendered = true; },
    showStandardPreviewStage: () => { throw new Error("Should return to settings, not the empty review page"); }
  });
  vm.runInContext(rendererFunction("bindStandardPreviewStage"), context);
  vm.runInContext("bindStandardPreviewStage()", context);
  click();
  assert.equal(context.state.commentaryReview, null);
  assert.equal(context.rendered, true);
});
