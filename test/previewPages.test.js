import test from 'node:test';
import assert from 'node:assert/strict';
import pages from '../src/shared/previewPages.cjs';
import {storePlan,takePlan,pagePlanResult,searchPlanRows,snapshotPlanRows,completePlan} from '../src/main/tools/jersey/planStore.js';

const rows=Array.from({length:12087},(_,row)=>({row,team:row%2?'LSU':'Florida',player:'Player '+String(row).padStart(5,'0'),position:row%3?'WR':'QB',classYear:'Freshman',changes:Array.from({length:34},(_,n)=>({type:'gear '+n,currentValue:'Old',proposedValue:row===12086&&n===33?'Final equipment needle':'New'}))}));

test('large previews page every player exactly once in stable display order without changing the plan',()=>{
  const assignments=rows.map(row=>({row:row.row,newValue:'reviewed'})),result={resultKind:'equipment-quickstart',mode:'preview',details:{changes:rows.slice(0,1000),totalPreviewRows:rows.length,canApply:true}};
  const id=storePlan({toolId:result.resultKind,previewRows:rows,assignments,result});result.planId=id;
  const displayed=pagePlanResult(result);assert.equal(displayed.details.changes.length,100);assert.equal(result.details.changes.length,1000,'Only the transport copy is paged');assert.equal(displayed.details.equipmentOverview.changes,410958);
  const found=[];for(let page=0;page<displayed.details.previewPage.pages;page++){const next=searchPlanRows(id,'',100,{},page);assert.ok(next.changes.length<=100);found.push(...next.changes.map(row=>row.row));}
  assert.equal(found.length,rows.length);assert.equal(new Set(found).size,rows.length);assert.deepEqual(found,pages.createIndex(rows).rows.map(row=>row.row));
  assert.equal(takePlan(id).assignments,assignments);assert.equal(takePlan(id).assignments.length,rows.length);assert.equal(snapshotPlanRows(id).length,rows.length);
  completePlan(id);assert.equal(pagePlanResult({...result,mode:'apply'}).details.totalPreviewRows,rows.length);assert.throws(()=>takePlan(id),/already been applied/);
});

test('search and combined filters cover the full run, with matching page bounds and stable totals',()=>{
  const index=pages.createIndex(rows),one=pages.page(index,{query:'Final equipment needle'});assert.equal(one.totalMatches,1);assert.equal(one.changes[0].row,12086);assert.equal(one.previewPage.index,0);
  const selected=pages.page(index,{filters:{team:'LSU',position:'QB'},page:5}),expected=rows.filter(row=>row.team==='LSU'&&row.position==='QB');assert.equal(selected.totalMatches,expected.length);assert.equal(selected.changes.length,100);assert.ok(selected.changes.every(row=>row.team==='LSU'&&row.position==='QB'));
  const matching=index.matches;pages.page(index,{filters:{team:'LSU',position:'QB'},page:6});assert.equal(index.matches,matching,'Page navigation reuses the filtered index');
  assert.equal(pages.page(index,{query:'missing',page:50}).previewPage.start,0);assert.equal(pages.page(index,{query:'missing'}).previewPage.pages,1);
  const last=pages.page(index,{page:Infinity});assert.equal(last.previewPage.index,last.previewPage.pages-1);assert.equal(pages.page(index,{page:-30}).previewPage.index,0);
});

test('page transport preserves the original objects, summary, safety flags and report metadata',()=>{
  const result={resultKind:'jersey-renumber',planId:null,summary:[{label:'Players',value:200}],reportPath:'report.csv',details:{changes:rows.slice(0,200),canApply:false,totalPreviewRows:200}};
  const id=storePlan({previewRows:rows.slice(0,200),result,assignments:[]});result.planId=id;const displayed=pagePlanResult(result);
  assert.equal(displayed.summary,result.summary);assert.equal(displayed.reportPath,result.reportPath);assert.equal(displayed.details.canApply,false);assert.equal(displayed.planId,id);assert.equal(result.details.changes.length,200);
  const schedule={...result,resultKind:'automatic-force-win'};assert.equal(pagePlanResult(schedule),schedule,'Schedule decisions retain their existing full review');
});
