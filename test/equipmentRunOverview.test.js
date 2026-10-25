import test from 'node:test';import assert from 'node:assert/strict';
import {equipmentRunOverview} from '../src/shared/equipmentRunOverview.js';
import {storePlan,takePlan,searchPlanRows} from '../src/main/tools/jersey/planStore.js';

test('equipment overview counts the complete run, distinct players per change type and all teams',()=>{
 const rows=Array.from({length:2501},(_,row)=>({row,team:row<2000?'Florida':'LSU',player:'Player '+row,changes:[{type:'Sleeves'},{type:'Sleeves'},{type:'Pants'}]}));
 const original=structuredClone(rows),result={resultKind:'equipment-patcher',details:{totalPreviewRows:rows.length,changes:rows.slice(0,1000)}};
 const id=storePlan({toolId:result.resultKind,result,previewRows:rows}),overview=takePlan(id).result.details.equipmentOverview;
 assert.deepEqual([overview.players,overview.teams,overview.changes],[2501,2,7503]);
 assert.deepEqual(overview.byType.find(row=>row.type==='Sleeves'),{type:'Sleeves',players:2501,changes:5002});
 assert.deepEqual(overview.byTeam,[{team:'Florida',players:2000},{team:'LSU',players:501}]);
 assert.equal(searchPlanRows(id,'LSU').totalMatches,501);assert.equal(overview.players,2501);assert.deepEqual(rows,original);
});
test('missing teams are not presented as a reliable team total; other tools keep their own units',()=>{
 assert.equal(equipmentRunOverview('equipment-quickstart',[{changes:[]}]).teams,null);
 assert.equal(equipmentRunOverview('team-boost',[]),null);
 const result={resultKind:'freshman-equipment',details:{totalPreviewRows:2000,changes:[{team:'LSU',changes:[]}]}};
 storePlan({toolId:result.resultKind,result});assert.equal(result.details.equipmentOverview,undefined,'a bounded page cannot be counted as the whole run');
});
