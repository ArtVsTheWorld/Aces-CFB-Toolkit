import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {normalizePlayerScope,matchesPlayerScope} from '../src/main/tools/playerScope.js';
import {planNilToggle} from '../src/main/tools/nilToggle/runner.js';

const context=vm.createContext({modelHelpButton:()=>'<button>i</button>'});vm.runInContext(fs.readFileSync(new URL('../src/renderer/configuration.js',import.meta.url),'utf8'),context);
const plain=value=>JSON.parse(JSON.stringify(value));
const records=['Eligible','Current','Previous'].map((RedshirtStatus,row)=>({isEmpty:false,FirstName:'Player'+row,LastName:'Test',Position:'QB',SchoolYear:'Sophomore',RedshirtStatus,TeamIndex:1,IsNIL:false,OverallRating:70}));
test('every redshirt scope uses equipment semantics across composed scopes and NIL Toggle',()=>{
 for(const [value,expected]of [['all',[0,1,2]],['true',[0,1]],['redshirt',[2]]]){
  const statuses=plain(context.redshirtScopeStatuses(value)),scope=normalizePlayerScope({redshirtStatuses:statuses});
  assert.deepEqual(records.flatMap((record,row)=>matchesPlayerScope(record,row,scope)?[row]:[]),expected);
  assert.deepEqual(planNilToggle(records,{targetValue:true,redshirtStatuses:statuses},{teamNames:new Map([[1,'Test']])}).map(player=>player.row),expected);
 }
});
test('legacy status arrays migrate consistently to the three grouped dropdown choices',()=>{
 for(const [old,next]of [[[],'all'],[['Eligible'],'true'],[['Current'],'true'],[['Eligible','Current'],'true'],[['Previous'],'redshirt'],[['Previous','Eligible'],'all'],[['Eligible','Current','Previous'],'all']])assert.equal(context.redshirtScopeValue(old),next);
 const values={'commentary-redshirt':['Current','Eligible'],'boost-redshirt':['Previous'],'nil-redshirts':[],'equipment-redshirt-group':'true',untouched:12};
 context.migrateRedshirtFilterSettings(values);assert.deepEqual(values,{'commentary-redshirt':'true','boost-redshirt':'redshirt','nil-redshirts':'all','equipment-redshirt-group':'true',untouched:12});
});
test('redshirt dropdowns have one consistent label and stable All/True/Redshirt order',()=>{
 const markup=context.redshirtScopeMarkup('test-scope','redshirt');
 assert.match(markup,/Redshirt Scope/);assert.match(markup,/data-order="preserve"/);
 assert.deepEqual([...markup.matchAll(/<option value="([^"]+)"/g)].map(match=>match[1]),['all','true','redshirt']);
 assert.match(markup,/<option value="redshirt" selected>/);
});

test('scope summaries display the selected redshirt scope rather than a selected-option count',()=>{
 const controls=new Map();
 context.document={querySelector:selector=>controls.get(selector.slice(1))??null,getElementById:id=>controls.get(id)};
 const refinements=fs.readFileSync(new URL('../src/renderer/refinements.js',import.meta.url),'utf8');
 vm.runInContext(refinements.slice(refinements.indexOf('function selectSummary('),refinements.indexOf('function affectedScopeSummary(')),context);
 for(const id of ['equipment-redshirt-group','commentary-redshirt','boost-redshirt','nil-redshirts'])for(const [value,label]of [['all','All Players'],['true','True'],['redshirt','Redshirt']]){
  controls.set(id,{value,dataset:{},selectedOptions:[{textContent:label}],options:[{},{},{}]});
  assert.equal(context.redshirtScopeSummary(context.document,id),'Redshirt Scope: '+label);
  assert.equal(context.selectSummary(id),'Redshirt Scope: '+label);
 }
});
test('help text is not replaced by an unanchored floating icon',()=>{
 const source=fs.readFileSync(new URL('../src/renderer/option-help.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/note\.before\(button\)/);assert.match(source,/if \(!caption\) continue;/);
 assert.match(source,/caption\.querySelector\('input,select,textarea'\)/);
});
