import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/renderer/equipment-sources.js',import.meta.url),'utf8');
const context=vm.createContext({escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),localizedPosition:value=>value,forceLogoUrl:()=>'/logo.png'});
vm.runInContext(source,context);
test('sources group repeated donors and show each supplied category once',()=>{
  const donor={row:1,firstName:'John',lastName:'Smith',team:'Alabama',position:'WR'};
  const result=context.equipmentSourcesMarkup({donorUses:[{donor,group:'helmet'},{donor,group:'upper'},{donor,group:'helmet'}],modPoolAdditions:{raw:[{displayName:'White Skullcap'}]},facePaint:[{asset:'FacePaint_example',source:'RAW Accessories Equipment Pool',displayName:'Custom Eye Tape'},{asset:'FacePaint_example',source:'RAW Accessories Equipment Pool',displayName:'Custom Eye Tape'}],noDrip:true});
  assert.equal((result.match(/John Smith/g)??[]).length,1);assert.equal((result.match(/Helmet &amp; face/g)??[]).length,1);
  assert.match(result,/Upper body/);assert.match(result,/RAW Accessories/);assert.match(result,/White Skullcap/);assert.match(result,/Simplified look/);
  assert.equal((result.match(/Custom Eye Tape/g)??[]).length,1);assert.equal((result.match(/RAW Accessories/g)??[]).length,1);
});
test('sources preserve distinct same-name players, escape user names and support older saved reviews',()=>{
  const row={donorUses:[1,2].map(id=>({group:'helmet',donor:{row:id,firstName:'<Alex>',lastName:'Jones',team:'School',position:'QB'}}))};
  const html=context.equipmentSourcesMarkup(row,true);assert.equal((html.match(/class="equipment-source"/g)??[]).length,2);assert.match(html,/&lt;Alex>/);assert.doesNotMatch(html,/<Alex>/);
  assert.match(context.equipmentSourcesMarkup({donor:'Older source details'}),/Older source details/);
});
