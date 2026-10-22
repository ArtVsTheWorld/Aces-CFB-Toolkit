import test from 'node:test';import assert from 'node:assert/strict';
import {mapperLibrary,mapperCategoryLabel,mapperBrandLabel} from '../src/main/tools/equipmentMapper/library.js';
import {buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
const gear=(slotType,itemAssetName)=>({slotType,itemAssetName});
const player=(row,team='A',asset='Custom_Old')=>({row,visualRow:row,player:`Player ${row}`,team,position:'WR',branding:'nike',rawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[gear('LeftArmWear',asset),gear('RightArmWear',asset),gear('InnerSocks','Gear_Socks_Low')]}]})});
function setup(){const players=[...Array.from({length:5},(_,i)=>player(i)),...Array.from({length:5},(_,i)=>player(i+5,'B')),player(10,'Donors','Custom_New')],library=mapperLibrary(players),item=(asset,slot)=>library.items.find(item=>item.asset===asset&&item.slot===slot),rule={action:'replace',matchMode:'asset',sourceId:item('Custom_Old','LeftArmWear').id,sourcePairId:item('Custom_Old','RightArmWear').id,replacementId:item('Custom_New','LeftArmWear').id,replacementPairId:item('Custom_New','RightArmWear').id,pairSides:true};return{players,library,rule};}
test('paired replacements use observed left/right recipes and preserve unrelated gear',()=>{
 const {players,library,rule}=setup(),result=buildMapperPreview(players,library,[rule]);assert.equal(result.blocked.length,0);assert.equal(result.changes.length,10);assert.equal(result.statistics.length,1);
 for(const p of result.changes){const e=JSON.parse(p.newRawData).loadouts[0].loadoutElements;for(const slot of ['LeftArmWear','RightArmWear'])assert.equal(e.find(i=>i.slotType===slot).itemAssetName,'Custom_New');assert.equal(e.find(i=>i.slotType==='InnerSocks').itemAssetName,'Gear_Socks_Low');assert.ok(p.edits.every(e=>e.rule===1));}
});
test('paired copy works on both sides; mismatched pair slots fail closed',()=>{
 const {players,library,rule}=setup(),copy={...rule,action:'copy',scope:'all'},result=buildMapperPreview(players,library,[copy]);assert.equal(result.changes.length,10);assert.equal(result.blocked.length,0);assert.throws(()=>buildMapperPreview(players,library,[{...copy,replacementPairId:copy.replacementId}]),/other side/);
});
test('40% replacement caps select two of five players on each team, not a global or side count',()=>{
 const {players,library,rule}=setup(),result=buildMapperPreview(players,library,[{...rule,replacementCap:40}]);assert.equal(result.changes.length,4);for(const team of ['A','B']){assert.equal(result.changes.filter(p=>p.team===team).length,2);const a=result.allocations.find(a=>a.team===team);assert.equal(a.matchedPlayers,5);assert.equal(a.selectedPlayers,2);}
 const again=buildMapperPreview([...players].reverse(),library,[{...rule,replacementCap:40}]);assert.deepEqual(new Set(result.changes.map(p=>p.row)),new Set(again.changes.map(p=>p.row)));
});
test('caps validate whole percentages, round down safely, and support zero or full replacements',()=>{
 const {players,library,rule}=setup();assert.equal(buildMapperPreview(players,library,[{...rule,replacementCap:0}]).changes.length,0);assert.equal(buildMapperPreview(players,library,[{...rule,replacementCap:100}]).changes.length,10);assert.equal(buildMapperPreview(players,library,[{...rule,replacementCap:19}]).changes.length,0);for(const cap of [-1,101,40.5,'40'])assert.throws(()=>buildMapperPreview(players,library,[{...rule,replacementCap:cap}]),/whole percentages/);
});
test('categories combine sides and brands use readable labels',()=>{assert.equal(mapperCategoryLabel('LeftShoeOverride'),'Shoe Override');assert.equal(mapperCategoryLabel('RightShoeOverride'),'Shoe Override');assert.equal(mapperBrandLabel('nike'),'Nike');assert.equal(mapperBrandLabel('underarmour'),'Under Armour');});
test('coach wardrobe never enters the player equipment library',()=>{const p=player(1);const data=JSON.parse(p.rawData);data.loadouts.push({loadoutType:'CoachOnField',loadoutElements:[gear('EarWear','Coach_Headset'),gear('LeftShoe','Coach_Sneakers'),gear('PlayCard','Coach_PlayCard')]});p.rawData=JSON.stringify(data);assert.ok(!mapperLibrary([p]).items.some(item=>item.asset.startsWith('Coach_')));});
