import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const renderer = fs.readFileSync(new URL('../src/renderer/renderer.js', import.meta.url), 'utf8');
const runTool = renderer.match(/^async function runTool\(toolId, mode\).*$/m)?.[0];

for (const expired of [false, true]) test(`failed equipment Apply ${expired ? 'discards an expired plan' : 'restores its reviewed preview above the error'}`, async () => {
  const preview = {planId: 'reviewed-plan', details: {canApply: true}}, output = {innerHTML: ''}, buttons = {preview: {}, apply: {}}, events = [];
  const state = {activeSave: {path: 'save'}, page: 'equipment-quickstart', genericPreviews: new Map([['equipment-quickstart', preview]])};
  const context = vm.createContext({
    state,
    document: {querySelector: selector => selector === '#run-output' ? output : buttons[selector.slice(1)], querySelectorAll: () => Object.values(buttons)},
    window: {cfbToolkit: {runTool: async () => {throw new Error(expired ? 'This cached result expired.' : 'Equipment cannot fit.');}}},
    beginToolRun: () => 'token', currentToolRun: () => true,
    renderResult: (target, result) => {assert.equal(result, preview); target.innerHTML = 'Reviewed equipment'; events.push('preview');},
    readableError: error => error,
    showError: (error, target) => {target.innerHTML += ` | ${error.message}`; events.push('error');}
  });
  vm.runInContext(runTool, context);
  await vm.runInContext("runTool('equipment-quickstart', 'apply')", context);
  assert.deepEqual(events, expired ? ['error'] : ['preview', 'error']);
  assert.equal(state.genericPreviews.has('equipment-quickstart'), !expired);
  assert.equal(buttons.apply.disabled, expired);
  assert.equal(buttons.preview.disabled, false);
  if (!expired) assert.match(output.innerHTML, /^Reviewed equipment \| Equipment cannot fit/);
});
