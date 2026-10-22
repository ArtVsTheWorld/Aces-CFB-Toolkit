import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { getTool } from '../src/shared/toolRegistry.js';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const renderer = read('src/renderer/renderer.js');

test('Jersey Renumber and Team Boost use distinct shared stroke icons, not text glyphs', () => {
  const iconFunction = renderer.split(/\r?\n/).find(line => line.startsWith('function toolIcon('));
  const context = vm.createContext({ escapeHtml: value => String(value) });
  vm.runInContext(iconFunction, context);
  for (const [id, expected] of [['jersey-renumber', 'jersey-number'], ['team-boost', 'ratings-trend']]) {
    assert.equal(getTool(id).icon, expected);
    const markup = vm.runInContext('toolIcon(' + JSON.stringify(expected) + ')', context);
    assert.match(markup, /<svg viewBox="0 0 24 24" aria-hidden="true">/);
    assert.match(markup, /<path d=/);
    assert.doesNotMatch(markup, /<img|<text/);
  }
  assert.notEqual(getTool('jersey-renumber').icon, getTool('team-boost').icon);
});

test('Equipment Truck credits ElJax YT in pool requirements, recolor help and catalog provenance', () => {
  assert.match(read('src/renderer/mod-pools.js'), /Requires ELJAX's Equipment Truck by ElJax YT\./);
  assert.match(renderer, /Requires ELJAX's Equipment Truck by ElJax YT\./);
  assert.match(renderer, /ELJAX’s Equipment Truck by ElJax YT/);
  assert.equal(JSON.parse(read('src/main/tools/equipment/equipmentTruckInventory.json')).author, 'ElJax YT');
});

test('About keeps the source link but does not list optional mod credits', () => {
  const about = renderer.split(/\r?\n/).find(line => line.includes('else if (state.page === "about")'));
  assert.match(about, /View the source code on GitHub/);
  assert.doesNotMatch(about, /Optional mod credits|Bear5|Orckestra|Delonte RAW|ElJax YT/);
});
