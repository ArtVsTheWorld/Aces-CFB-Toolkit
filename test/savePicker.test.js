import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {chooseGameSave,validatePickedSaveName,acceptedSaveKinds} from '../src/main/services/savePicker.js';
import {tools} from '../src/shared/toolRegistry.js';
test('save picker accepts only nonempty extensionless game save prefixes, including autosaves and backups',()=>{
 for(const name of ['DYNASTY-TEST','RTG-PLAYER','ROSTER-FOOTBALL','dynasty-lowercase','DYNASTY-SAVE-BACKUP-110126-2','DYNASTY-SAVE-AUTOSAVE','DYNASTY-Week8(2)'])assert.equal(validatePickedSaveName('D:/Downloads/'+name),'D:/Downloads/'+name);
 for(const name of ['Raw Accessories.fbmod','DYNASTY-TEST.fbmod','ROSTER-TEST.zip','RTG-SAVE.csv','file','DYNASTY-','NOTDYNASTY-SAVE','DYNASTY-SAVE.exe','','DYNASTY-SAVE.gz'])assert.throws(()=>validatePickedSaveName(name),/game save|file extension/);
});
test('every tool picker follows its declared accepted types; donors allow all three native types',()=>{
 const kinds={'DYNASTY-TEST':'dynasty','RTG-TEST':'road-to-glory','ROSTER-TEST':'roster'};
 for(const tool of tools)for(const [file,kind]of Object.entries(kinds)){if(tool.input.accepted.includes(kind))assert.equal(validatePickedSaveName(file,tool.id),file);else assert.throws(()=>validatePickedSaveName(file,tool.id),/accepts/);}
 for(const file of Object.keys(kinds))assert.equal(validatePickedSaveName(file,'equipment-donor'),file);
 assert.deepEqual(acceptedSaveKinds('roster-generator'),['dynasty','roster']);
});
test('invalid selections warn once and return no candidate; cancel does nothing and valid choices pass through',async()=>{
 for(const [file,purpose,invalid]of [['D:/Downloads/Raw.fbmod',undefined,true],['ROSTER-TEST','equipment-patcher',true],['RTG-PLAYER','roster-generator',true],['DYNASTY-TEST','roster-generator',false],['ROSTER-TEST','equipment-donor',false]]){
 const notices=[],dialogs=[],dialog={showOpenDialog:async options=>(dialogs.push(options),{filePaths:[file]}),showMessageBox:async options=>notices.push(options)};assert.equal(await chooseGameSave(dialog,purpose),invalid?null:file);assert.equal(notices.length,invalid?1:0);if(invalid){assert.equal(notices[0].type,'warning');assert.match(notices[0].detail,/save|accepts/);}assert.deepEqual(dialogs[0].properties,['openFile']);}
 let notices=0;assert.equal(await chooseGameSave({showOpenDialog:async()=>({canceled:true}),showMessageBox:async()=>notices++}),null);assert.equal(notices,0);
});
test('app selection, direct activation, donor preparation and tool execution validate names before parsing',()=>{
 const main=fs.readFileSync(new URL('../src/main/main.js',import.meta.url),'utf8'),renderer=fs.readFileSync(new URL('../src/renderer/renderer.js',import.meta.url),'utf8');assert.match(main,/IPC.chooseSave.*chooseGameSave\(dialog,purpose\)/);assert.match(main,/validateSavePath\(validatePickedSaveName/);assert.match(main,/const assertToolSaveCompatibility[^]*?validatePickedSaveName\(savePath,toolId\);[^]*?toolWorker.request\('inspect'/);assert.match(main,/savePath: validatePickedSaveName\(request\?\.savePath,'equipment-donor'\)/);assert.match(renderer,/chooseSave\(state.page\)/);
});
