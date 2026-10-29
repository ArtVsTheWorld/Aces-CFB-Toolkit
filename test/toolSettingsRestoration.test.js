import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const renderer=fs.readFileSync(new URL('../src/renderer/renderer.js',import.meta.url),'utf8');
test('restoring an early field preserves saved settings for controls that load later',()=>{
 const controls=[],values={minimum:'-3',maximum:'-1','boost-position-ranges':'{"QB":{"minimum":2,"maximum":4}}'},state={page:'team-boost',bootstrap:{registry:{tools:[{id:'team-boost'}]}},toolSettings:new Map([['team-boost',values]])};
 const context=vm.createContext({state,toolSettingsRestoreDepth:0,content:{querySelectorAll:()=>controls},document:{getElementById:id=>controls.find(n=>n.id===id)},migrateOriginalEaProtectionSettings:()=>{},migrateRemovalSettings:()=>{},migrateEquipmentSessionSettings:()=>{},Event:class{}});
 const capture=renderer.match(/^function captureToolSettings\(\).*$/m)[0],restore=renderer.slice(renderer.indexOf('function restoreToolSettings()'),renderer.indexOf('function toolCommandActions()'));
 vm.runInContext(capture+'\n'+restore,context);
 const control=(id,value)=>({id,value,type:'number',dataset:{},closest:()=>null,dispatchEvent:()=>vm.runInContext('captureToolSettings()',context)});
 controls.push(control('minimum','1'),control('maximum','3'));
 vm.runInContext('restoreToolSettings()',context);
 assert.equal(controls[0].value,'-3');assert.equal(state.toolSettings.get('team-boost')['boost-position-ranges'],values['boost-position-ranges'],'restoring early fields cannot erase a late field');
 controls.push(control('boost-position-ranges','{}'));
 vm.runInContext('restoreToolSettings()',context);assert.equal(controls[2].value,values['boost-position-ranges']);
 controls[0].value='5';vm.runInContext('captureToolSettings()',context);assert.equal(state.toolSettings.get('team-boost').minimum,'5','real edits still capture');assert.equal(context.toolSettingsRestoreDepth,0);
});
