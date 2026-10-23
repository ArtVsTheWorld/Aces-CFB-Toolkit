import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/renderer/configuration.js',import.meta.url),'utf8');
const ui=vm.createContext({});vm.runInContext(source,ui);
const node=(parentElement=null,hidden=false,page=false)=>({parentElement,hidden,disabled:false,hasAttribute:name=>name==='data-config-page'&&page});

test('hidden configuration pages do not disable validation of their controls',()=>{
  const dialog=node(),page=node(dialog,true,true),field=node(page);
  assert.equal(ui.configurationControlActive(field),true);
  field.disabled=true;assert.equal(ui.configurationControlActive(field),false);
});
test('conditional hidden options remain inactive even within a paged editor',()=>{
  const dialog=node(),page=node(dialog,true,true),condition=node(page,true),field=node(condition);
  assert.equal(ui.configurationControlActive(field),false);
  condition.hidden=false;assert.equal(ui.configurationControlActive(field),true);
  dialog.hidden=true;assert.equal(ui.configurationControlActive(field),false);
});
test('shared configuration pages use accessible tabs and keep original draft controls',()=>{
  assert.match(source,/setAttribute\('role', 'tablist'\)/);
  assert.match(source,/setAttribute\('role', 'tabpanel'\)/);
  assert.match(source,/page\.nodes\.forEach\(node => fields\.append\(node\)\)/);
  assert.match(source,/ArrowRight/);assert.match(source,/ArrowLeft/);
  assert.match(source,/addPlayerFilterPages\(dialog, draft\)/);
});
