import test from 'node:test';import assert from 'node:assert/strict';
import {rosterNilBudget,NIL_MAX} from '../src/main/tools/rosterGenerator/nilBudget.js';
import {planBrothers} from '../src/main/tools/rosterGenerator/brothers.js';
const players=Array.from({length:85},(_,row)=>({row,position:row<3?'QB':'WR',fields:{OverallRating:75}})),targets=players.map(player=>({row:player.row,original:{CurrentNILCompensation:20}}));
test('NIL budget is exact, deterministic, bounded and favors quarterbacks',()=>{
  const plan=rosterNilBudget(players,targets,215);assert.equal([...plan.byRow.values()].reduce((a,b)=>a+b,0),1700);assert.deepEqual(plan,rosterNilBudget([...players].reverse(),targets,215));assert.ok(plan.byRow.get(0)>plan.byRow.get(40));assert.deepEqual(plan.summary,{before:1700,after:1700});
});
test('zero, single-player, tiny and fully saturated NIL budgets retain every unit',()=>{
  for(const amount of [0,1,10,NIL_MAX]){const plan=rosterNilBudget(players.slice(0,1),[{original:{CurrentNILCompensation:amount}}],1);assert.equal(plan.byRow.get(0),amount);}
  const plan=rosterNilBudget(players,targets.map(()=>({original:{CurrentNILCompensation:NIL_MAX}})),1);assert.ok([...plan.byRow.values()].every(value=>value===NIL_MAX));
  assert.throws(()=>rosterNilBudget(players,[{original:{CurrentNILCompensation:1024}}],1),/invalid/);
});
test('brothers are rare, seeded, same-tone, same surname/hometown, and retain distinct first names',()=>{
  const model={catalog:{names:{last:['Smith','Jones']},appearances:[{id:'a',skinTone:4,fields:{}}]}},roster=Array.from({length:10},(_,row)=>({row,fields:{FirstName:`Name${row}`,LastName:row%2?'Jones':'Smith',PLYR_HOME_TOWN:`Town${row}`,PLYR_HOME_STATE:'Georgia',HomePipeline:'SouthGeorgia'},provenance:{skinTone:row%2?4:7,appearance:'a',surname:{parts:[row%2?'Jones':'Smith'],suffix:''}}}));
  let hits=0;for(let seed=0;seed<1000;seed++){const plan=planBrothers(roster,model,seed);assert.deepEqual(plan,planBrothers(roster,model,seed));if(!plan.size)continue;hits++;assert.equal(plan.size,2);const [a,b]=[...plan.keys()];assert.equal(roster[a].provenance.skinTone,roster[b].provenance.skinTone);assert.deepEqual(plan.get(a).home,plan.get(b).home);assert.equal(plan.get(a).lastName,plan.get(b).lastName);assert.notEqual(roster[a].fields.FirstName,roster[b].fields.FirstName);}
  assert.ok(hits>=50&&hits<=110,`Expected rare team-level families, saw ${hits}/1000`);
});
