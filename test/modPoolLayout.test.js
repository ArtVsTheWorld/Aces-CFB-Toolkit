import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),modelHelpButton:()=>'<button type="button" class="model-help-button" data-model-help="Category help">i</button>'});
vm.runInContext(fs.readFileSync(new URL('../src/renderer/mod-pools.js',import.meta.url),'utf8'),context);

test('all mod pools use explicit field captions rather than a help button inside a vertical control label',()=>{
 for(const origin of ['unlocked','raw','eljax']){
  const markup=context.modPoolCategoryMarkup(origin,[{id:'sample',label:'Sample & More'}]);
  assert.match(markup,new RegExp(`<label for="mod-pool-${origin}-category">Equipment Category</label><button`));
  assert.match(markup,/<div class="field-caption">[^]*?data-pool-help[^]*?<\/button><\/div><select/);
  assert.match(markup,new RegExp(`<label for="mod-pool-${origin}-chance">Category Chance</label>`));
  assert.match(markup,new RegExp(`<input id="mod-pool-${origin}-chance"[^>]*step="1"`));
  assert.match(markup,/Sample &amp; More/);
  assert.doesNotMatch(markup,/<label\b[^>]*>(?:(?!<\/label>)[\s\S])*<(?:select|input)\b/);
 }
});
