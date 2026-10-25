import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const renderer=fs.readFileSync(new URL('../src/renderer/renderer.js',import.meta.url),'utf8'),reports=renderer.slice(renderer.indexOf('async function reportsPage()'),renderer.indexOf('function bindHistory()'));
test('a delayed reports response cannot replace the tool opened afterward',async()=>{
 let finish;const content={innerHTML:''},state={page:'reports'},context=vm.createContext({content,state,toolLoading:()=>'',window:{cfbToolkit:{listReports:()=>new Promise(resolve=>finish=resolve)}}});
 vm.runInContext(reports,context);const pending=vm.runInContext('reportsPage()',context);
 state.page='dealbreaker-fixer';content.innerHTML='Current tool settings';finish([]);await pending;assert.equal(content.innerHTML,'Current tool settings');
});

test('an earlier reports request cannot replace a newer reports visit',async()=>{
 const finishes=[],content={innerHTML:''},state={page:'reports'},context=vm.createContext({content,state,toolLoading:()=>'',window:{cfbToolkit:{listReports:()=>new Promise(resolve=>finishes.push(resolve))}}});
 vm.runInContext(reports,context);const first=vm.runInContext('reportsPage()',context),second=vm.runInContext('reportsPage()',context);content.innerHTML='New reports request loading';finishes[0]([]);await first;assert.equal(content.innerHTML,'New reports request loading');state.page='home';finishes[1]([]);await second;assert.equal(content.innerHTML,'New reports request loading');
});
