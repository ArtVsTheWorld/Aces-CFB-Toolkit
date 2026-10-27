import test from 'node:test';import assert from 'node:assert/strict';
import {rollCompatibleItem} from '../src/main/tools/equipment/core/poolRoll.js';
import {mulberry32} from '../src/main/tools/equipment/core/patcher.js';
test('lazy pool selection preserves eager choices, probabilities, ordering and subsequent random draws',()=>{
  const pool=Array.from({length:60},(_,index)=>({index}));
  for(let seed=0;seed<200;seed++)for(const chance of [0,.01,.1,.5,1])for(const divisor of [1,3,999]){
    const a=mulberry32(seed),b=mulberry32(seed),fits=item=>item.index>0&&item.index%divisor===0,available=pool.filter(fits);
    const expected=available.length&&a()<chance?available[Math.floor(a()*available.length)]:undefined;
    assert.equal(rollCompatibleItem(pool,fits,b,chance),expected);assert.equal(a(),b(),'The next random draw is identical');
  }
});
test('failed rolls stop after one compatible item; successful rolls still validate all possible choices',()=>{
  const pool=Array.from({length:1000},(_,index)=>index);let checks=0;
  assert.equal(rollCompatibleItem(pool,item=>{checks++;return item>=3;},()=>.9,.1),undefined);assert.equal(checks,4);
  checks=0;assert.equal(rollCompatibleItem(pool,item=>{checks++;return item>=3;},()=>0,1),3);assert.equal(checks,1000);
  assert.equal(rollCompatibleItem([],()=>{throw Error('No candidates');},()=>{throw Error('No roll');},1),undefined);
});
