import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/renderer/renderer.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('window.cfbToolkit.onDynastyProfilesChanged?.('));
function fixture(page='home'){
  const state={activeSave:{path:'same-name'},page,saveLoading:false},calls={home:0,render:0,history:0,applied:0};let callback,modal=false;
  const dependencies={state,window:{cfbToolkit:{onDynastyProfilesChanged:fn=>callback=fn}},document:{querySelector:()=>modal},refreshHistory:async()=>{},historyPage:()=>calls.history++,render:()=>calls.render++,refreshHomeContext:async({when})=>{calls.home++;if(when())calls.applied++;}};
  vm.runInNewContext(handler,dependencies);return {state,calls,dependencies,event:()=>callback(),modal:()=>modal=true};
}

test('background recovery leaves an open tool and its configuration draft intact',async()=>{
  const f=fixture('equipment-patcher');await f.event();assert.deepEqual(f.calls,{home:0,render:0,history:0,applied:0});
  const home=fixture();home.modal();await home.event();assert.equal(home.calls.render,0);assert.equal(home.calls.home,0);
});

test('late recovery cannot refresh another selection that reused the filename',async()=>{
  const f=fixture();let release;f.dependencies.refreshHistory=()=>new Promise(resolve=>release=resolve);
  const pending=f.event();f.state.activeSave={path:'same-name'};release();await pending;assert.equal(f.calls.home,0);assert.equal(f.calls.render,0);
});

test('navigation during recovered Home lookup cannot replace the newly opened tool',async()=>{
  const f=fixture();let release;f.dependencies.refreshHomeContext=async({when})=>{await new Promise(resolve=>release=resolve);if(when())f.calls.applied++;};
  const pending=f.event();await new Promise(resolve=>setImmediate(resolve));f.state.page='freshman-equipment';release();await pending;assert.equal(f.calls.applied,0);assert.equal(f.calls.render,0);
});
