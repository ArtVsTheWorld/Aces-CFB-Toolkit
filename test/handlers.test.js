import test from "node:test";
import assert from "node:assert/strict";
import { executableToolIds, getToolHandler } from "../src/main/tools/handlers.js";
import { tools } from "../src/shared/toolRegistry.js";

test("every available registry tool has an allowlisted handler and vice versa", () => {
  const registered = tools.filter(tool => tool.status === "available").map(tool => tool.id).sort();
  assert.deepEqual(executableToolIds().sort(), registered);
  assert.ok(registered.every(id => typeof getToolHandler(id).run === "function"));
});
