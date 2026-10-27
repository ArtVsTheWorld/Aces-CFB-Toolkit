import test from 'node:test';
import assert from 'node:assert/strict';
import {visualOverflowChain,readVisualStorage} from '../src/main/tools/equipment/visualStorage.js';
import {snapshotVisualsForVerification,verifyVisualSnapshot} from '../src/main/tools/equipment/visualsSafety.js';
const zero='0'.repeat(32),ref=(row,table=10)=>table.toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
function mock(){return {header:{tableId:10},records:[{index:0,isEmpty:false,Overflow:ref(2),RawData:'{}'},{index:1,isEmpty:false,Overflow:zero,RawData:'{}'},{index:2,isEmpty:false,Overflow:ref(3),RawData:null},{index:3,isEmpty:false,Overflow:zero,RawData:null}]};}
test('existing non-adjacent continuation chains verify without treating their raw tails as players',()=>{
  const table=mock(),before=snapshotVisualsForVerification(table,new Map([[0,'{}'],[1,'{}'],[2,undefined],[3,undefined]]));
  assert.deepEqual(visualOverflowChain(table,table.records[0]).map(row=>row.index),[2,3]);
  assert.doesNotThrow(()=>verifyVisualSnapshot(before,table,[]));
  table.records[3].Overflow=ref(0);
  assert.throws(()=>verifyVisualSnapshot(before,table,[]),/storage is invalid/);
});
test('chain validation rejects cycles, foreign tables, missing/free rows, malformed references and player targets',()=>{
  for(const bad of [ref(0),ref(2),ref(3,11),ref(99),'x'.repeat(32)]){
    const table=mock();table.records[2].Overflow=bad;assert.throws(()=>visualOverflowChain(table,table.records[0]),/invalid overflow/);
  }
  const table=mock();table.records[3].isEmpty=true;assert.throws(()=>visualOverflowChain(table,table.records[0]),/invalid overflow/);
  table.records[3].isEmpty=false;assert.throws(()=>visualOverflowChain(table,table.records[0],new Set([3])),/invalid overflow/);
});
test('a formerly valid chain cannot introduce a new shared tail during Apply',()=>{
  const table=mock(),before=snapshotVisualsForVerification(table,new Map([[0,'{}'],[1,'{}'],[2,undefined],[3,undefined]]));
  table.records[1].Overflow=ref(3);
  assert.throws(()=>verifyVisualSnapshot(before,table,[]),/introduced shared overflow/);
});
test('complete frame reads follow linked blocks rather than physical adjacency and reject truncation',()=>{
  const table=mock(),payload=Buffer.from('a complete payload needing the last block'),capacity=20,data=Buffer.alloc(4*capacity);
  data.writeUInt16LE(payload.length);payload.subarray(0,18).copy(data,2);payload.subarray(18,38).copy(data,40);payload.subarray(38).copy(data,60);
  table.data=data;table.header.table3StartIndex=0;
  table.records.forEach(record=>{record.parent=table;const field={index:record.index*capacity,maxLength:capacity-2,strategy:{getFormattedValueFromUnformatted:bytes=>bytes.subarray(2,2+bytes.readUInt16LE()).toString()}};record.getFieldByKey=()=>({thirdTableField:field});});
  assert.equal(readVisualStorage(table.records[0]),payload.toString());
  data.writeUInt16LE(100);assert.throws(()=>readVisualStorage(table.records[0]),/truncated overflow chain/);
});
