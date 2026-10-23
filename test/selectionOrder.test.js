import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import Order from '../src/shared/selectionOrder.cjs';
const choices=items=>items.map(value=>({value,label:value})),values=items=>items.map(item=>item.value);
test('exact game positions and save aliases share one order in filters and previews',()=>{
 const expected=['QB','HB','FB','WR','TE','LT','LG','C','RG','RT','LEDG','REDG','DT','SAM','MIKE','WILL','CB','FS','SS','K','P'];assert.deepEqual([...expected].reverse().sort(Order.positionCompare),expected);assert.deepEqual(['P','RE','FB','LE','MLB','LOLB','QB','ROLB'].sort(Order.positionCompare),['QB','FB','LE','RE','LOLB','MLB','ROLB','P']);
 assert.deepEqual(values(Order.sortChoices('positions',choices(['SS','QB','OL','FB','EDGE','HB','WR','TE','DT','LB','CB','FS','K/P']))),['QB','HB','FB','WR','TE','OL','EDGE','DT','LB','CB','FS','SS','K/P']);
});
test('years, age, caliber and potential sort by meaning rather than alphabetically',()=>{
 assert.deepEqual(['Senior','Junior','Freshman','Sophomore'].sort(Order.classCompare),['Freshman','Sophomore','Junior','Senior']);
 assert.deepEqual(values(Order.sortChoices('roster-age',choices(['seniors','standard','youth','veteran']))),['youth','standard','veteran','seniors']);assert.deepEqual(values(Order.sortChoices('roster-potential',choices(['standard','sky','low','dead-end','high']))),['dead-end','low','standard','high','sky']);
 assert.deepEqual(values(Order.sortChoices('roster-caliber',choices(['all-time','startup','building-blocks','fcs','contender','competitive','blue-blood']))),['startup','fcs','building-blocks','competitive','contender','blue-blood','all-time']);
});
test('other selections use natural alphabetical ordering with placeholders and explicit modes first',()=>{
 assert.deepEqual(values(Order.sortChoices('category',choices(['Sleeve 10','Gloves','Sleeve 2','Backplates']))),['Backplates','Gloves','Sleeve 2','Sleeve 10']);assert.deepEqual(values(Order.sortChoices('week',choices(['12','2','1']))),['1','2','12']);
 assert.deepEqual(values(Order.sortChoices('selection-mode-roster-teams',choices(['none','selected','all','user']))),['all','user','selected','none']);
 const items=[{value:'z',label:'Zulu'},{value:'',label:'All Teams'},{value:'a',label:'Alabama'}];assert.deepEqual(values(Order.sortChoices('teams',items)),['','a','z']);assert.deepEqual(items.map(item=>item.value),['z','','a']);
});
test('removed summaries and jump navigation have no production generator',()=>{
 const source=fs.readFileSync(new URL('../src/renderer/refinements.js',import.meta.url),'utf8');assert.doesNotMatch(source,/function addScopeNotice|function addDialogSections|Who This Will Affect|headings\.forEach/);assert.match(source,/Change NIL Flags Across the Dynasty/);
 const order=fs.readFileSync(new URL('../src/renderer/selection-order.js',import.meta.url),'utf8');assert.match(order,/option\.selected=selected\.has/);assert.doesNotMatch(order,/dispatchEvent/);
});
