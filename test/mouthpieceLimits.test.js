import test from 'node:test';
import assert from 'node:assert/strict';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';
import {normalizeMouthpieceLimits,normalizeMouthpiecePositions} from '../src/main/tools/equipment/core/mouthpieceSettings.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';

function fixture(customize=()=>{}){
  const players=[],visuals=[],teamNames=new Map([[1,'Alabama'],[2,'Wyoming']]);
  for(let team=1;team<=2;team++)for(const position of ['WR','HB','QB','LT'])for(let i=0;i<10;i++){
    const row=players.length,player={isEmpty:false,TeamIndex:team,Position:position,FirstName:'Test',LastName:String(row),SchoolYear:'Junior',RedshirtStatus:'Previous',CharacterBodyType:'Thin',CharacterVisuals:(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0')};
    const parsed={loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'MouthWear',itemAssetName:'GearMouthpiece_None'}]}]};
    customize(player,parsed,i);players.push(player);visuals.push({isEmpty:false,RawData:JSON.stringify(parsed)});
  }
  return {players,visuals,teamNames};
}
function run(data,options={}){return applyGlobalEquipmentFixes(data.players,data.visuals,10,{seed:5,teamNames:data.teamNames,unlockedMouthpieceFix:true,mouthpieceLimits:normalizeMouthpieceLimits({}),...options});}
const equipped=visual=>JSON.parse(visual.RawData).loadouts[0].loadoutElements[0].itemAssetName!=='GearMouthpiece_None';
test('mouthpiece limits migrate old presets to unified 85% defaults and reject invalid percentages',()=>{
  for(const limits of [normalizeMouthpieceLimits(),normalizeEquipmentOptions({},false).mouthpieceLimits]){
    assert.equal(Object.keys(limits).length,13);
    for(const entry of Object.values(limits))assert.deepEqual(entry,{applicationChance:85,populationCap:85});
  }
  assert.deepEqual(normalizeMouthpieceLimits({WR:{applicationChance:0,populationCap:100}}).WR,{applicationChance:100,populationCap:100});
  for(const invalid of [-1,101,1.5,NaN,'85',''])for(const key of ['frequency','applicationChance','populationCap'])assert.throws(()=>normalizeMouthpieceLimits({WR:{[key]:invalid}}),/whole percentage/);
  assert.throws(()=>normalizeMouthpieceLimits({BOGUS:{}}),/unknown/);
});
test('frequency fill remains separate by team and actual position group',()=>{
  const data=fixture(),limits=normalizeMouthpieceLimits({WR:{applicationChance:100,populationCap:40},HB:{frequency:0},OL:{applicationChance:100,populationCap:20}});
  const result=run(data,{mouthpieceLimits:limits,fillFrequencies:{mouthpieces:true}});
  for(const team of result.populationSafeguards.teams){
    assert.equal(team.mouthpieces.WR.equipped,4);assert.equal(team.mouthpieces.WR.ceilingCount,4);
    assert.equal(team.mouthpieces.HB.equipped,0);assert.equal(team.mouthpieces.HB.ceilingCount,0);
    assert.equal(team.mouthpieces.OL.equipped,2);assert.equal(team.mouthpieces.OL.applicationChance,20);
    assert.equal(team.mouthpieces.QB,undefined,'legacy style keeps QB disabled');
  }
});
test('existing mouthpieces outside the player filter count, and caps never remove existing gear',()=>{
  const data=fixture((player,parsed,index)=>{if(player.TeamIndex===1&&player.Position==='WR'&&index<7)parsed.loadouts[0].loadoutElements[0].itemAssetName='GearMouthpiece_Standard_White';});
  const before=data.visuals.map(visual=>visual.RawData);
  const result=run(data,{fillFrequencies:{mouthpieces:true},eligiblePlayer:player=>Number(player.LastName)%10>=7,mouthpieceLimits:normalizeMouthpieceLimits({WR:{applicationChance:100,populationCap:40}})});
  assert.equal(result.populationSafeguards.teams[0].mouthpieces.WR.equipped,7);
  for(let row=0;row<10;row++)assert.equal(data.visuals[row].RawData,before[row]);
  assert.equal(result.populationSafeguards.teams[1].mouthpieces.WR.equipped,3);
});
test('zero caps block additions, custom styles respect disabled groups and tiny groups round down',()=>{
  const data=fixture(),positions=normalizeMouthpiecePositions({QB:{enabled:true,standard:100,pacifier:0,hanging:0},WR:{enabled:false,standard:100,pacifier:0,hanging:0}});
  const result=run(data,{mouthpiecePositions:positions,mouthpieceLimits:normalizeMouthpieceLimits({QB:{applicationChance:100,populationCap:100},OL:{applicationChance:100,populationCap:0}})});
  for(const team of result.populationSafeguards.teams){assert.equal(team.mouthpieces.QB.equipped,10);assert.equal(team.mouthpieces.OL.equipped,0);assert.equal(team.mouthpieces.WR,undefined);}
  assert.equal(data.visuals.filter(equipped).length,20+result.populationSafeguards.teams.reduce((sum,team)=>sum+team.mouthpieces.HB.equipped,0));
  const tiny=fixture();tiny.players=tiny.players.slice(0,1);tiny.visuals=tiny.visuals.slice(0,1);
  assert.equal(run(tiny,{mouthpieceLimits:normalizeMouthpieceLimits({WR:{applicationChance:100,populationCap:85}})}).unlockedMouthpiecePlayersChanged,0);
});
