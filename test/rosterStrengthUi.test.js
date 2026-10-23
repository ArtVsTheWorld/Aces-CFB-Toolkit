import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import TALENT from '../src/shared/rosterTalent.cjs';

const page=fs.readFileSync(new URL('../src/renderer/roster-generator.js',import.meta.url),'utf8');
test('shared and individual roster configuration place schemes and makeup before position strength',()=>{
  const ids=['roster-build-config','roster-scheme-config','roster-strength-config','roster-appearance-config'];
  const offsets=ids.map(id=>page.indexOf(`id="${id}"`));
  assert.ok(offsets.every((offset,i)=>offset>=0&&(i===0||offset>offsets[i-1])));
  assert.ok(page.indexOf('id="roster-makeup"')<offsets[2]);
  const editor=fs.readFileSync(new URL('../src/renderer/roster-team-settings.js',import.meta.url),'utf8');
  const sections=editor.match(/const sections=(\[.*\]);/)[1];
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInNewContext(sections))).map(([id])=>id),ids);
});

test('position strength presents all groups in a compact, accessible table without redundant meters',()=>{
  const context=vm.createContext({RosterTalent:TALENT,modelHelpButton:(label,text)=>`<button data-model-help="${text}" aria-label="${label}">?</button>`});vm.runInContext(page,context);
  const markup=vm.runInContext('rosterStrengthMarkup()',context);
  assert.equal((markup.match(/<tbody>/g)||[]).length,3);
  assert.equal((markup.match(/data-roster-talent="/g)||[]).length,13);
  assert.equal((markup.match(/data-roster-talent-number="/g)||[]).length,13);
  for(const group of TALENT.groups)assert.ok(markup.includes(`data-roster-target="${group}"`));
  assert.match(markup,/Normalize to 100%/);assert.match(markup,/Talent Budget/);assert.match(markup,/aria-live="polite"/);assert.doesNotMatch(markup,/<meter|Highest|Very High/);
  assert.ok(!page.includes('data-roster-target-bar'));
});
test('normalization retains integer shares, absent-group exclusions and unchanged OVR calculations',()=>{
  const counts={QB:3,HB:5,OL:15,WR:10,EDGE:6,DT:5,LB:8,CB:7,SS:4,FS:4,TE:5,'K/P':4};
  for(const increase of [0,9,40]){
    const shares=TALENT.editShare(TALENT.baseline(counts),'QB',increase,counts),normalized=TALENT.resolvedShares(counts,shares);
    assert.equal(TALENT.allocationError(normalized),'');assert.equal(normalized.FB,0);assert.ok(Object.values(normalized).every(Number.isInteger));
    assert.deepEqual(TALENT.targets(counts,69,normalized),TALENT.targets(counts,69,TALENT.resolvedShares(counts,shares)));
  }
  assert.deepEqual(TALENT.resolvedShares(counts,Object.fromEntries(TALENT.groups.map(g=>[g,0]))),TALENT.baseline(counts));
});
