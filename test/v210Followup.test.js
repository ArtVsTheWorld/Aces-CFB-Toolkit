import SelectionOrder from '../src/shared/selectionOrder.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import TALENT from '../src/shared/rosterTalent.cjs';
import {mulberry32} from '../src/main/tools/longSnap/core.js';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('randomized talent budgets use integer shares, preserve specialists and the roster OVR target',()=>{
  const counts={QB:3,HB:5,WR:9,TE:5,OL:15,EDGE:6,DT:5,LB:8,CB:8,SS:4,FS:4,'K/P':4};
  const seen=new Set();
  for(let seed=0;seed<100;seed++){
    const shares=TALENT.randomShares(counts,mulberry32(seed));assert.equal(TALENT.allocationError(shares,counts),'');assert.equal(shares.FB,0);assert.equal(shares['K/P'],TALENT.minimumShare('K/P',counts));
    const targets=TALENT.targets(counts,69,shares),total=Object.values(counts).reduce((a,b)=>a+b,0);assert.ok(Math.abs(Object.entries(targets).reduce((n,[g,v])=>n+v*counts[g],0)/total-69)<1e-8);
    seen.add(JSON.stringify(shares));assert.deepEqual(shares,TALENT.randomShares(counts,mulberry32(seed)));
  }
  assert.ok(seen.size>90);assert.deepEqual(TALENT.randomShares({'K/P':2}),TALENT.baseline({'K/P':2}));
});
test('large additional player pickers defer checkbox rows but retain every selectable identity',()=>{
  const context=vm.createContext({ToolkitSelectionOrder:SelectionOrder,escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;'),localizedPosition:value=>value,positionCompare:(a,b)=>a.localeCompare(b),multiSelectEmptyMeaning:()=> 'All'});
  vm.runInContext(read('src/renderer/selectors.js'),context);
  const players=Array.from({length:8000},(_,index)=>({value:String(index),label:'Player '+index,position:index%2?'WR':'QB'}));
  const markup=context.checkboxPicker('commentary-players','Individual Players',players,'Select players',[]);
  assert.match(markup,/data-lazy-options="true"/);assert.doesNotMatch(markup,/data-option-row /);assert.equal((markup.match(/<select id="commentary-players"[^]*?<\/select>/)[0].match(/<option value=/g)||[]).length,8000);
  assert.doesNotMatch(context.checkboxPicker('boost-players','Players',players.slice(0,20),'',[]),/data-lazy-options/);
});
test('roster editors attach their explanations to titles and apply starting mixes on change',()=>{
  const source=read('src/renderer/roster-generator.js');assert.doesNotMatch(source,/data-roster-load-spending|Use This Mix|Average player rating, not/);
  assert.match(source,/titleHelp:"Ratings represent the average player OVR, not the game's team OVR rating\."/);
  assert.match(source,/title:'Offensive & Defensive Schemes',titleHelp:/);assert.match(source,/spending\.addEventListener\('change'/);assert.match(source,/data-roster-randomize/);
});
