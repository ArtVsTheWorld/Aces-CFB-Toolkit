import test from 'node:test';
import assert from 'node:assert/strict';
import {selectFrequencyCandidates,normalizeFillFrequencies} from '../src/main/tools/equipment/core/frequency.js';
import {mulberry32,patchFreshmanEquipment} from '../src/main/tools/equipment/core/patcher.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';
import {normalizeTattooChances,rollUnlockedTattoo} from '../src/main/tools/equipment/core/tattoos.js';
import {normalizeMouthpieceLimits} from '../src/main/tools/equipment/core/mouthpieceSettings.js';
const ref=row=>(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
const element=(slotType,itemAssetName)=>({slotType,itemAssetName});
function fixture(){const players=[],visuals=[];for(let team=1;team<=2;team++)for(let i=0;i<20;i++){const row=players.length;players.push({isEmpty:false,FirstName:'Test',LastName:String(row),TeamIndex:team,Position:'WR',SchoolYear:'Junior',RedshirtStatus:'Previous',OverallRating:95-i,CharacterBodyType:'Thin',CharacterVisuals:ref(row)});visuals.push({isEmpty:false,RawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[element('HeadWear','GearHelmet_Riddell_SpeedFlex'),element('Visor','GearVisor_None'),element('MouthWear','GearMouthpiece_None'),element('OuterShirt','Gear_JerseyStyle_RolledLow'),element('InnerShirt','Gear_Undershirt_CompressionTCrewSleeveless'),element('OuterPants','GearPants_AboveKnee'),element('InnerPants','BottomBase_None')]}]})});}return {players,visuals};}
test('frequency rolls can finish below limit; fill skips rolls; selection is shuffled and reproducible',()=>{
 const rows=Array.from({length:100},(_,i)=>i);
 assert.equal(selectFrequencyCandidates(rows,20,20,false,()=>.99).length,0);
 assert.equal(selectFrequencyCandidates(rows,20,20,true,()=>.99).length,20);
 assert.equal(selectFrequencyCandidates(rows,20,0,true,mulberry32(1)).length,0);
 assert.deepEqual(selectFrequencyCandidates(rows,20,20,false,mulberry32(7)),selectFrequencyCandidates(rows,20,20,false,mulberry32(7)));
 const counts=Array(100).fill(0);for(let seed=1;seed<=200;seed++)for(const row of selectFrequencyCandidates(rows,20,20,true,mulberry32(seed)))counts[row]++;
 assert.ok(counts.every(n=>n>15&&n<70),'Late and early rows all get opportunities');
});
test('defaults remove freshman restriction and keep protections/default non-fill behavior',()=>{
 const options=normalizeEquipmentOptions({},true);assert.deepEqual(options.classes,[]);assert.deepEqual(options.redshirtStatuses,[]);assert.equal(options.protectPreviouslyRandomized,true);assert.equal(options.randomizeDonors,false);assert.ok(Object.values(options.fillFrequencies).every(v=>v===false));
 assert.throws(()=>normalizeFillFrequencies({tattoos:1}));
 const limits=normalizeMouthpieceLimits({WR:{applicationChance:99,populationCap:20}});assert.deepEqual(limits.WR,{applicationChance:20,populationCap:20});
});
test('all five passes fill separate team limits without exceeding them',()=>{
 const {players,visuals}=fixture(),uniform=Object.fromEntries(['QB','HB','FB','WR','TE','OL','EDGE','DT','LB','CB','FS','SS','K/P'].map(g=>[g,20]));
 const result=applyGlobalEquipmentFixes(players,visuals,10,{seed:12,protectOriginalEaPlayers:false,visorFix:true,visorFrequencies:uniform,unlockedMouthpieceFix:true,mouthpieceLimits:normalizeMouthpieceLimits({WR:{frequency:20}}),unlockedTattooFix:true,unlockedTattooCap:20,lowerRolledJerseyFix:true,lowerJerseyCaps:uniform,cutoffPantsFix:true,cutoffPantsCaps:uniform,fillFrequencies:normalizeFillFrequencies(Object.fromEntries(['visors','mouthpieces','tattoos','lowerJersey','cutoffPants'].map(k=>[k,true])))});
 assert.deepEqual(result.unlockedTattooPopulation.teams.map(t=>t.addedTattooPlayers),[4,4]);
 for(const team of result.populationSafeguards.teams){assert.equal(Object.values(team.visors)[0].equipped,4);assert.equal(Object.values(team.mouthpieces)[0].equipped,4);}
 for(const team of result.uniformPopulation){assert.equal(team.lowerSelected,4);assert.equal(team.cutoffSelected,4);}
});
test('tattoo placement controls respect zero/100 endpoints and validate totals',()=>{
 assert.throws(()=>normalizeTattooChances({arm:50}));
 const options={arm:100,leg:0,both:0,doubleArm:0,differentArms:100,leftArm:100};
 for(let seed=1;seed<30;seed++){const p=rollUnlockedTattoo(mulberry32(seed),{},undefined,options);assert.equal(p.kind,'arm');assert.deepEqual(Object.keys(p.arms),['left']);assert.equal(p.legs,null);}
 for(let seed=1;seed<30;seed++){const p=rollUnlockedTattoo(mulberry32(seed),{},undefined,{...options,doubleArm:100});assert.deepEqual(Object.keys(p.arms),['left','right']);assert.notEqual(p.arms.left.asset,p.arms.right.asset);}
});
test('donors can be recipients without modifying their frozen donor outfits',()=>{
 const a=fixture(),before=a.visuals.map(v=>v.RawData),common={seed:4,top:2,apply:true,protectOriginalEaPlayers:false,teamNames:new Map([[1,'Alpha'],[2,'Beta']])};
 const normal=patchFreshmanEquipment(a.players,a.visuals,10,common);assert.ok(normal.skipped.some(s=>s.reason.includes('donor pool')));
 const b=fixture(),again=patchFreshmanEquipment(b.players,b.visuals,10,{...common,randomizeDonors:true});assert.ok(!again.skipped.some(s=>s.reason.includes('donor pool')));assert.ok(again.changes.some(c=>c.target.row===0));assert.ok(again.changes.every(c=>c.donorUses.every(d=>d.donor.row!==c.target.row)));
});
