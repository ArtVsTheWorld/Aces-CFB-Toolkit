import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const renderer=fs.readFileSync(new URL('../src/renderer/renderer.js',import.meta.url),'utf8'),operations=fs.readFileSync(new URL('../src/renderer/operations.js',import.meta.url),'utf8');
const home=renderer.slice(renderer.indexOf('function homeIsPreseason()'),renderer.indexOf('function toolHeader('));
function fixture(weekType,active=true){
 const state={activeSave:active?{exists:true,path:'test-save',schema:{supported:true}}:null,homeContext:{season:{weekType,week:0}},page:'home'};
 const context=vm.createContext({state,homeHero:()=>'<hero/>',homeWorkflow:()=>'<workflow/>',homeQuickTools:()=>'<quick/>',homeRecentActivity:()=>'<recent/>',homeMatchupLines:()=>'<lines/>'});vm.runInContext(home,context);return {state,context};
}
test('Home puts the preseason workflow first only for an active preseason save and omits matchup lines',()=>{
 const {context}=fixture('PreSeason'),html=vm.runInContext('homePage()',context);assert.ok(html.indexOf('<workflow/>')<html.indexOf('<quick/>'));assert.ok(html.includes('<recent/>'));assert.ok(!html.includes('<lines/>'));
});
test('Home puts quick tools/activity before lines outside preseason, with no preseason workflow',()=>{
 for(const weekType of ['RegularSeason','PostSeason',null]){const {context}=fixture(weekType),html=vm.runInContext('homePage()',context);assert.ok(!html.includes('<workflow/>'));assert.ok(html.indexOf('<quick/>')<html.indexOf('<lines/>'));assert.ok(html.indexOf('<recent/>')<html.indexOf('<lines/>'));}
 const {context}=fixture('PreSeason',false);assert.ok(!vm.runInContext('homePage()',context).includes('<workflow/>'),'No-save Home does not claim preseason');
});
test('Preseason does not request unavailable matchup projections',async()=>{
 const {context}=fixture('PreSeason');let requests=0;context.window={cfbToolkit:{homeLines:async()=>{requests++;return {};}}};vm.runInContext(operations.slice(operations.indexOf('async function ensureHomeLines()')),context);await vm.runInContext('ensureHomeLines()',context);assert.equal(requests,0);
});

function pendingLines(){
 let resolve,reject,renders=0;const state={activeSave:{path:'same',schema:{supported:true}},page:'home',seasonLinesRequest:1},content={innerHTML:'loading pane'};
 const context=vm.createContext({state,content,homeIsPreseason:()=>false,readableError:error=>error,homePage:()=>{renders++;return 'Home';},bindCommon:()=>{},window:{cfbToolkit:{homeLines:()=>new Promise((yes,no)=>{resolve=yes;reject=no;})}}});
 vm.runInContext(operations.slice(operations.indexOf('async function ensureHomeLines()')),context);
 return {state,content,pending:vm.runInContext('ensureHomeLines()',context),resolve:()=>resolve({rows:['old']}),reject:()=>reject(Error('old error')),renders:()=>renders};
}
test('old matchup success or failure cannot affect a replacement save at the same path',async()=>{
 for(const failure of [false,true]){const f=pendingLines();f.state.seasonLinesRequest++;f.state.homeLinesLoading=true;failure?f.reject():f.resolve();await f.pending;assert.equal(f.state.seasonLines,undefined);assert.equal(f.state.seasonLinesError,undefined);assert.equal(f.state.homeLinesLoading,true);assert.equal(f.renders(),0);}
});
test('matchup completion cannot replace the save-loading pane',async()=>{
 const f=pendingLines();f.state.saveLoading=true;f.resolve();await f.pending;assert.equal(f.content.innerHTML,'loading pane');assert.equal(f.renders(),0);
});
