import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniformStylePlan, DEFAULT_CUTOFF_PANTS_CAPS } from '../src/main/tools/equipment/core/unlockedUniforms.js';
import { normalizeEquipmentOptions } from '../src/main/tools/equipment/runner.js';
import { quickstartSettings } from '../src/main/tools/equipmentQuickstart/runner.js';
import { applyQuickstartSpecialistCutoff } from '../src/main/tools/equipmentQuickstart/specialistCutoff.js';
import { mulberry32 } from '../src/main/tools/longSnap/core.js';
import { CUTOFF_PANTS, cutoffPantsConflict } from '../src/main/tools/equipment/core/uniformCompatibility.js';

const expected = { QB: 0, HB: 5, FB: 0, WR: 10, TE: 5, OL: 0, EDGE: 5, DT: 0, LB: 5, CB: 10, FS: 10, SS: 10, 'K/P': 20 };
const raw = (pants='GearPants_AboveKnee',base='BottomBase_None') => JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'OuterPants',itemAssetName:pants},{slotType:'InnerPants',itemAssetName:base},{slotType:'OuterShirt',itemAssetName:'Gear_JerseyStyle_RolledLow'},{slotType:'InnerShirt',itemAssetName:'Gear_Undershirt_CompressionTCrewSleeveless'},{slotType:'LeftShoe',itemAssetName:'KeepShoe'}]}]});
const entries = (count,teamIndex=1) => Array.from({length:count},(_,row)=>({visualsRow:teamIndex*1000+row,position:'WR',teamIndex,team:'Team '+teamIndex,cohort:'fbs',editable:true,raw:raw()}));
const options = extra => ({cutoffPantsFix:true,cutoffPantsCaps:{WR:5},fillFrequencies:{cutoffPants:true},...extra});

test('positive cutoff percentages work on small groups, preserve integer limits and remain opt-in',()=>{
 for(const count of [1,4,8,15,19,20,21,29,100]){
  const plan=buildUniformStylePlan(entries(count),options(),mulberry32(9));
  assert.equal(plan.pants.size,Math.ceil(count*.05));assert.equal(plan.stats[0].cutoffTarget,Math.ceil(count*.05));
 }
 assert.equal(buildUniformStylePlan(entries(10),options({cutoffPantsFix:false}),mulberry32(9)).pants.size,0);
 assert.equal(buildUniformStylePlan(entries(10),options({cutoffPantsCaps:{WR:0}}),mulberry32(9)).pants.size,0);
 assert.equal(buildUniformStylePlan(entries(10),options({cutoffPantsCaps:{WR:100}}),mulberry32(9)).pants.size,10);
});

test('turning Fill off still rolls the configured chance; rounding does not force a recipient',()=>{
 const noFill=options({fillFrequencies:{cutoffPants:false}});
 assert.equal(buildUniformStylePlan(entries(8),noFill,()=>.99).pants.size,0);
 assert.equal(buildUniformStylePlan(entries(8),noFill,()=>.01).pants.size,1);
 const a=buildUniformStylePlan(entries(15),noFill,mulberry32(35)),b=buildUniformStylePlan(entries(15),noFill,mulberry32(35));assert.deepEqual([...a.pants],[...b.pants]);
});

test('existing gear consumes small-group allowance; each team has its own limit',()=>{
 const first=entries(8),second=entries(8,2);first[0].raw=raw(CUTOFF_PANTS);
 const plan=buildUniformStylePlan([...first,...second],options(),mulberry32(6));
 assert.equal(plan.pants.size,1);assert.ok([...plan.pants].every(row=>row>=2000));
 first[1].raw=raw(CUTOFF_PANTS);const above=buildUniformStylePlan(first,options(),mulberry32(6));assert.equal(above.pants.size,0);assert.equal(above.stats[0].existingCutoff,2);
});

test('rounding preserves protection, leg-layer exclusions and the lower-jersey rounding rule',()=>{
 const values=entries(8);values.forEach((entry,i)=>{entry.raw=raw('GearPants_AboveKnee',i%2?'GearLegsBase_LeftSleeve_White':'BottomBase_None');entry.editable=i%2!==0;});
 const before=structuredClone(values),plan=buildUniformStylePlan(values,options({adjustOutfitForCutoff:true,lowerRolledJerseyFix:true,lowerJerseyCaps:{WR:5}}),mulberry32(9));
 assert.equal(plan.pants.size,0);assert.equal(plan.stats[0].lowerTarget,0);assert.deepEqual(values,before);
});

test('Patcher and Unlocked Quickstart use the requested frequencies and Fill default, preserving explicit presets',()=>{
 const patcher=normalizeEquipmentOptions({},false),quickstart=quickstartSettings({unlocked:true});
 assert.deepEqual(DEFAULT_CUTOFF_PANTS_CAPS,expected);assert.deepEqual(patcher.cutoffPantsCaps,expected);assert.deepEqual(quickstart.patcher.cutoffPantsCaps,expected);
 assert.equal(patcher.fillFrequencies.cutoffPants,true);assert.equal(quickstart.patcher.fillFrequencies.cutoffPants,true);assert.equal(patcher.cutoffPantsFix,false);
 const legacy=normalizeEquipmentOptions({cutoffPantsCaps:{WR:5},fillFrequencies:{cutoffPants:false}},false);assert.equal(legacy.cutoffPantsCaps.WR,5);assert.equal(legacy.fillFrequencies.cutoffPants,false);
 assert.equal(quickstartSettings({}).patcher.cutoffPantsFix,false);assert.equal(quickstartSettings({}).patcher.fillFrequencies.cutoffPants,false);assert.equal(normalizeEquipmentOptions({},true).fillFrequencies.cutoffPants,false);
 assert.throws(()=>normalizeEquipmentOptions({fillFrequencies:null},false));
});

test('Quickstart specialist exception changes only cutoff outfit slots, respects scope and runs only with Unlocked',()=>{
 const players=Array.from({length:12},(_,row)=>({Position:row<6?'K':'P',TeamIndex:1,FirstName:'Test',LastName:String(row),CharacterVisuals:(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0')})),visuals=players.map(()=>({RawData:raw(),isEmpty:false})),settings=quickstartSettings({unlocked:true,protectOriginalEaPlayers:false}),rosterRows=new Set(players.map((_,row)=>row)),processedRows=new Set([...rosterRows].filter(row=>row!==11)),fixes={cutoffPantsChanges:[],uniformPopulation:[],visualsChanged:0};
 visuals[0].RawData=raw('GearPants_AboveKnee','GearLegsBase_LeftSleeve_White');const before=structuredClone(visuals);
 applyQuickstartSpecialistCutoff({players,visuals,visualsTableId:10,settings,rosterRows,processedRows,teamNames:new Map([[1,'Team']]),fcsTeamIndexes:new Set()},fixes);
 assert.equal(fixes.uniformPopulation[0].cutoffTarget,3);assert.equal(fixes.uniformPopulation[0].cutoffAfter,3);assert.deepEqual(visuals[0],before[0]);assert.deepEqual(visuals[11],before[11]);
 for(const visual of visuals){const elements=JSON.parse(visual.RawData).loadouts[0].loadoutElements;assert.equal(elements.find(e=>e.slotType==='LeftShoe').itemAssetName,'KeepShoe');if(elements.find(e=>e.slotType==='OuterPants').itemAssetName===CUTOFF_PANTS)assert.equal(cutoffPantsConflict(elements),null);}
 const unchanged=structuredClone(visuals);applyQuickstartSpecialistCutoff({players,visuals,visualsTableId:10,settings:quickstartSettings({}),rosterRows,processedRows},fixes);assert.deepEqual(visuals,unchanged);
});
