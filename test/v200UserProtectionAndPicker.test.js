import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const renderer = read('src/renderer/renderer.js');
const helpers = renderer.slice(renderer.indexOf('function forceWinUserTeams('), renderer.indexOf('function installUserScheduleControl('));
const prepared = { userControlledTeamIds: [7, 8], teams: [{ value: '7', label: 'Wake Forest' }, { value: '8', label: 'LSU' }], userControlledTeams: [{ name: 'Wake Forest' }, { name: 'LSU' }] };
function context(answer = false) {
  const prompts = [];
  const ctx = vm.createContext({ appConfirm: (_title, message) => { prompts.push(message); return answer; } });
  vm.runInContext(helpers, ctx);
  return { ctx, prompts };
}
test('user names are resolved from IDs instead of stringifying team objects', () => {
  const { ctx } = context();
  assert.equal(ctx.forceWinUserTeams(prepared).map(team => team.name).join(', '), 'Wake Forest, LSU');
  assert.equal(ctx.forceWinUserTeams({ userControlledTeamIds: [7], userControlledTeams: [{ name: 'Wake Forest' }] })[0].name, 'Wake Forest');
  assert.equal(ctx.forceWinUserTeams({ userControlledTeamIds: [7], userControlledTeams: ['Wake Forest'] })[0].name, 'Wake Forest');
});
test('only unprotected user teams require confirmation; numeric/string IDs match', () => {
  const { ctx, prompts } = context();
  assert.equal(ctx.confirmForceWinUserTeams(prepared, { skippedTeamIds: ['7', 8] }), true);
  assert.equal(prompts.length, 0);
  assert.equal(ctx.confirmForceWinUserTeams(prepared, { skippedTeamIds: [7, '99'] }), false);
  assert.match(prompts[0], /LSU/); assert.doesNotMatch(prompts[0], /Wake Forest|\[object Object\]/);
  assert.match(prompts[0], /losses for your team/);
});
test('user schedule only requires confirmation and Clear does not', () => {
  const { ctx, prompts } = context(true);
  assert.equal(ctx.confirmForceWinUserTeams(prepared, { userScheduleOnly: true, skippedTeamIds: [] }), true);
  assert.equal(prompts.length, 1);
  assert.equal(ctx.confirmForceWinUserTeams(prepared, { action: 'clear', skippedTeamIds: [] }), true);
  assert.equal(ctx.confirmForceWinUserTeams({}, { skippedTeamIds: [] }), true);
  assert.equal(prompts.length, 1);
});
test('canceling confirmation stops before tool IPC or any loading state', async () => {
  const { ctx } = context(false);
  Object.assign(ctx, { state: { activeSave: { path: 'save' }, prepared: new Map([['automatic-force-win|save', prepared]]), forceWinPreviews: new Map() }, forceWinOptions: () => ({ skippedTeamIds: [] }), document: { querySelector: () => ({}) } });
  vm.runInContext(renderer.match(/^async function runForceWin.*$/m)[0], ctx);
  await ctx.runForceWin('automatic-force-win', 'preview');
});
test('donor and Active Save share the wildcard CFB save dialog; generic TXT picker stays separate', async () => {
  let handler;
  const dialogs = [];
  const ctx = vm.createContext({ IPC: { chooseSave: 'save' }, ipcMain: { handle: (_channel, callback) => { handler = callback; } }, dialog: { showOpenDialog: async options => { dialogs.push(options); return { canceled: false, filePaths: ['file'] }; } } });
  vm.runInContext(read('src/main/main.js').split('\n').find(line => line.includes('ipcMain.handle(IPC.chooseSave,')), ctx);
  assert.equal(await handler(null), 'file');
  assert.equal(await handler(null, 'equipment-donor'), 'file');
  assert.equal(JSON.stringify(dialogs[0].filters), JSON.stringify(dialogs[1].filters));
  assert.equal(dialogs[1].filters[0].name, 'CFB 27 Saves');
  assert.equal(dialogs[1].filters[0].extensions.join(), '*');
  for (const file of ['src/renderer/renderer.js', 'src/renderer/configuration.js']) assert.match(read(file), /chooseSave\("equipment-donor"\)/);
  assert.match(read('src/main/main.js'), /Text files/);
});
