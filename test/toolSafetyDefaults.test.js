import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {EQUIPMENT_ITEMS,RETIRED_EQUIPMENT_ITEMS} from '../src/main/tools/equipment/catalog.js';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {removalCatalog} from '../src/main/tools/equipment/core/removal.js';
import {modPoolDefinitions} from '../src/main/tools/equipment/core/modPools.js';
import {patchFreshmanEquipment} from '../src/main/tools/equipment/core/patcher.js';
import {getTool,LONG_SNAP_ENABLED} from '../src/shared/toolRegistry.js';
import {getToolHandler,executableToolIds} from '../src/main/tools/handlers.js';
import {runLongSnap} from '../src/main/tools/longSnap/runner.js';
import {DEFAULT_DISTRIBUTION,patchDealbreakers,normalizeDistribution} from '../src/main/tools/dealbreaker/core.js';
const retired='GearArmSleeve_Bands_armTape_normal_OffWhite';
test('broken Arm Bands White is retired from every selectable equipment catalog',()=>{
 assert.ok(RETIRED_EQUIPMENT_ITEMS.has(retired));assert.ok(!EQUIPMENT_ITEMS.some(i=>i.itemName===retired));assert.ok(!removalCatalog().some(i=>i.value===retired));
 for(const mods of [{confirmed:true},{confirmed:true,unlocked:true,raw:true,eljax:true}])assert.ok(!mapperCatalog(mods).items.some(i=>i.asset===retired));
 for(const cats of Object.values(modPoolDefinitions()))for(const c of cats)assert.ok(!c.items.some(i=>i.itemName===retired));
});
test('donor copying preserves recipient sleeves instead of introducing a retired broken sleeve',()=>{
 const ref=row=>(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0'),e=(slotType,itemAssetName)=>({slotType,itemAssetName});
 for(const mixedChance of [0,1]){
  const players=[0,1].map(row=>({FirstName:'Test',LastName:String(row),Position:'WR',SchoolYear:row?'Senior':'Freshman',RedshirtStatus:'Eligible',OverallRating:90-row,CharacterVisuals:ref(row),TeamIndex:1,IsNIL:false})),outfit=(left,right)=>({loadoutType:'PlayerOnField',loadoutElements:[e('OuterPants','GearPants_AboveKnee'),e('LeftArmWear',left),e('RightArmWear',right)]});
  const originals=['GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_White','ArmSleeve_None'];
  const visuals=[{RawData:JSON.stringify({loadouts:[outfit(...originals)]})},{RawData:JSON.stringify({loadouts:[outfit(retired,retired)]})}],before=structuredClone(visuals);
  const result=patchFreshmanEquipment(players,visuals,10,{seed:2,donorRows:[1],top:1,eligiblePlayer:p=>p.SchoolYear==='Freshman',protectOriginalEaPlayers:false,mixedChance,crossMixedChance:0,noDripProfile:false});
  assert.equal(result.changes.length,1);const elements=JSON.parse(result.changes[0].newRawData).loadouts[0].loadoutElements;
  assert.equal(elements.find(e=>e.slotType==='LeftArmWear').itemAssetName,originals[0]);assert.equal(elements.find(e=>e.slotType==='RightArmWear').itemAssetName,originals[1]);assert.ok(!elements.some(e=>e.itemAssetName===retired));assert.deepEqual(visuals,before);
 }
});
test('Long Snap is visible under maintenance and cannot Preview or Apply through its handler',async()=>{
 assert.equal(LONG_SNAP_ENABLED,false);assert.equal(getTool('long-snap').status,'maintenance');assert.ok(!executableToolIds().includes('long-snap'));assert.ok(executableToolIds().includes('roster-generator'));
 for(const mode of ['preview','apply'])for(const run of [runLongSnap,getToolHandler('long-snap').run])await assert.rejects(run({mode,savePath:'does-not-exist',options:{planId:'old-plan'},reports:{create(){throw Error('Must never create a report');}}}),/Temporarily disabled.*field-goal accuracy/);
 const renderer=fs.readFileSync('src/renderer/renderer.js','utf8'),fn=renderer.slice(renderer.indexOf('function plannedTool('),renderer.indexOf('function inputCard('));const c=vm.createContext({toolHeader:()=>'',escapeHtml:String});vm.runInContext(fn,c);const html=c.plannedTool(getTool('long-snap'));assert.match(html,/Under Construction/);assert.match(html,/maintenance-tape/);assert.doesNotMatch(html,/id="(?:preview|apply)"/);
});
test('Dealbreaker screenshot defaults match UI and never retain None through the default roll or floor',()=>{
 const expected={Invalid:0,PlayingTime:25,ProPotential:10,PlayingStyle:5,ChampionshipContender:10,BrandExposure:15,ProximityToHome:15,CoachPrestige:10,ConferencePrestige:10};assert.deepEqual(DEFAULT_DISTRIBUTION,expected);
 const source=fs.readFileSync('src/renderer/renderer.js','utf8'),literal=source.match(/const DEALBREAKER_DEFAULTS = (\{[^\n;]+\});/)[1];assert.deepEqual(JSON.parse(JSON.stringify(vm.runInNewContext('('+literal+')'))),expected);
 const records=Array.from({length:100},(_,row)=>({FirstName:'Test',LastName:String(row),TeamIndex:1,Position:'WR',SchoolYear:'Sophomore',Age:20,OverallRating:80,RecruitingDealbreaker:'Invalid'}));const result=patchDealbreakers(records,{teamNames:new Map([[1,'Test']]),random:()=>0});assert.equal(result.changes.length,100);assert.equal(result.population.noneFloorCount,0);assert.ok(result.outcomes.every(o=>o.newValue!=='Invalid'));
 const old={Invalid:15,PlayingTime:18,ProPotential:7,PlayingStyle:5,ChampionshipContender:16,BrandExposure:10,ProximityToHome:12,CoachPrestige:10,ConferencePrestige:7};assert.deepEqual(normalizeDistribution(old),old);
});
