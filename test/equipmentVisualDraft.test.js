import test from 'node:test';
import assert from 'node:assert/strict';
import {installVisualStorage,visualOverflowChain} from '../src/main/tools/equipment/visualStorage.js';
import {createVisualDraft,finalizeVisualDraft,removeNonePlaceholders,retainRandomizerResults} from '../src/main/tools/equipment/visualDraft.js';
import {enforceRelaxedTeeCompatibility,RELAXED_TEE_REPLACEMENTS,RELAXED_TEE_INCOMPATIBLE_JERSEYS} from '../src/main/tools/equipment/core/compatibility.js';
import {equipmentPreviewChanges} from '../src/main/tools/equipment/preview.js';
import {mapperLibrary,buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';

const zero='0'.repeat(32),raw=extra=>JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[]}],...extra});
function nativeMock(){
  const capacity=256,n=4,codec={setUnformattedValueFromFormatted(value){const bytes=Buffer.from(value),frame=Buffer.alloc(bytes.length+2);frame.writeUInt16LE(bytes.length);bytes.copy(frame,2);return frame;},getFormattedValueFromUnformatted(bytes){return bytes.subarray(2,bytes.readUInt16LE()+2).toString();}};
  class Field{get index(){return this.offset;}get value(){return this._value;}set value(value){this._value=value;}}
  const table={header:{tableId:10,recordCapacity:n,data1RecordCount:n,table3StartIndex:0,table3Length:n*capacity,tableTotalLength:n*capacity,nextRecordToUse:3},offsetTable:[{type:'binaryblob'}],data:Buffer.alloc(n*capacity),records:[],strategy:{}};
  table.records=Array.from({length:n},(_,index)=>{
    const field=new Field();Object.assign(field,{offset:index*capacity,maxLength:capacity-2,strategy:codec,strategyContext:{},_value:raw(),unformattedValue:codec.setUnformattedValueFromFormatted(raw())});
    const record={index,parent:table,isEmpty:index===3,data:Buffer.alloc(4),getFieldByKey:()=>({thirdTableField:field}),empty(){this.isEmpty=true;this.data.writeUInt32BE(table.header.nextRecordToUse);table.header.nextRecordToUse=index;}};
    let overflow=zero;Object.defineProperty(record,'Overflow',{get:()=>overflow,set(value){if(this.isEmpty){this.isEmpty=false;table.header.nextRecordToUse=this.data.readUInt32BE();}overflow=value;}});
    Object.defineProperty(record,'RawData',{get:()=>field.value,set(value){record.nativeCache=value;field.value=value;}});record.data.writeUInt32BE(n);field.unformattedValue.copy(table.data,index*capacity);return record;
  });installVisualStorage(table,new Set([0,1,2]));return table;
}
test('a storage-full preview skips the entire player without invoking a failed setter or blocking fitting players',()=>{
  const table=nativeMock(),before=table.records.map(record=>record.RawData),draft=createVisualDraft(table);
  draft.table.records[0].RawData=raw({marker:'too large',payload:'x'.repeat(1100)});
  draft.table.records[1].RawData=raw({marker:'all passes complete',payload:'y'.repeat(240)});
  draft.table.records[2].RawData=raw({marker:'small'});
  assert.deepEqual(table.records.map(record=>record.RawData),before,'Planning never allocates');
  const result=finalizeVisualDraft(draft);
  assert.deepEqual([...result.skippedRows],[0]);assert.equal(result.assignments.length,2);
  assert.equal(table.records[0].RawData,before[0]);assert.equal(draft.table.records[0].RawData,before[0]);assert.equal(table.records[0].nativeCache,undefined);
  assert.equal(JSON.parse(table.records[1].RawData).marker,'all passes complete');assert.equal(visualOverflowChain(table,table.records[1]).length,1);
  const generated={changes:[0,1,2].map(row=>({target:{row},visualsRow:row,brandCorrections:[]})),skipped:[],fcsChanged:0};retainRandomizerResults(generated,result.skippedRows);assert.deepEqual(generated.changes.map(change=>change.target.row),[1,2]);assert.equal(generated.storageSkipped,1);assert.deepEqual(generated.skipped,[]);
});
test('shrinking loadouts return their spill rows before growing players are fitted; Apply order reproduces accepted results',()=>{
  const table=nativeMock();table.records[0].RawData=raw({payload:'x'.repeat(240)});assert.equal(table.records.filter(record=>record.isEmpty).length,0);
  const draft=createVisualDraft(table);draft.table.records[1].RawData=raw({payload:'y'.repeat(240)});draft.table.records[0].RawData=raw({marker:'shrunk'});
  const result=finalizeVisualDraft(draft);assert.equal(result.skippedRows.size,0);assert.deepEqual(result.assignments.map(change=>change.row),[0,1]);assert.equal(visualOverflowChain(table,table.records[0]).length,0);
  const fresh=nativeMock();fresh.records[0].RawData=raw({payload:'x'.repeat(240)});for(const change of result.assignments){assert.equal(fresh.records[change.row].RawData,change.oldValue);fresh.records[change.row].RawData=change.newValue;}for(const change of result.assignments)assert.equal(fresh.records[change.row].RawData,change.newValue);
});
test('None cleanup preserves all worn gear, metadata and order, is idempotent, and is absent from displayed equipment changes',()=>{
  const parsed={body:7,loadouts:[{loadoutType:'Base',loadoutElements:[{slotType:'Tattoo',itemAssetName:'ArmTattoo_None'}]},{loadoutType:'PlayerOnField',flag:3,loadoutElements:[{slotType:'LeftArmWear',itemAssetName:'ArmSleeve_None'},{slotType:'LeftArmWear',itemAssetName:'Keep_This',metadata:6},{slotType:'Spats',itemAssetName:'GearSpats_none'},{slotType:'Other',itemAssetName:'None'},{slotType:'Custom',itemAssetName:'NoneSuch_Custom'}]}]};
  const before=JSON.stringify(parsed);assert.equal(removeNonePlaceholders(parsed),4);assert.equal(parsed.loadouts[1].flag,3);assert.deepEqual(parsed.loadouts[1].loadoutElements,[{slotType:'LeftArmWear',itemAssetName:'Keep_This',metadata:6},{slotType:'Custom',itemAssetName:'NoneSuch_Custom'}]);assert.equal(removeNonePlaceholders(parsed),0);assert.deepEqual(equipmentPreviewChanges(before,JSON.stringify(parsed)),[]);
});
test('all 24 relaxed-tee/rolled-jersey combinations preserve the jersey, shirt metadata and exact color',()=>{
  for(const jersey of RELAXED_TEE_INCOMPATIBLE_JERSEYS)for(const [tee,replacement]of Object.entries(RELAXED_TEE_REPLACEMENTS)){
    const elements=[{slotType:'OuterShirt',itemAssetName:jersey,style:4},{slotType:'InnerShirt',itemAssetName:tee,override:'preserve'},{slotType:'LeftHandWear',itemAssetName:'Keep_Glove'}],before=structuredClone(elements);
    const changes=enforceRelaxedTeeCompatibility(elements);assert.equal(changes.length,1);assert.deepEqual(elements,[before[0],{...before[1],itemAssetName:replacement},before[2]]);assert.deepEqual(enforceRelaxedTeeCompatibility(elements),[]);
  }
  for(const tee of Object.keys(RELAXED_TEE_REPLACEMENTS)){const elements=[{slotType:'OuterShirt',itemAssetName:'Gear_JerseyStyle_Standard'},{slotType:'InnerShirt',itemAssetName:tee}],before=structuredClone(elements);assert.deepEqual(enforceRelaxedTeeCompatibility(elements),[]);assert.deepEqual(elements,before);}
});
test('invalid encoding remains fatal instead of being reported as a skipped player',()=>{
  const table=nativeMock(),draft=createVisualDraft(table),field=table.records[0].getFieldByKey('RawData').thirdTableField;
  field.strategy={...field.strategy,getFormattedValueFromUnformatted:()=>'{"lost":1}'};draft.table.records[0].RawData=raw({must:'survive'});assert.throws(()=>finalizeVisualDraft(draft),/lost data/);assert.equal(table.records[0].nativeCache,undefined);
});
test('Mapper can replace missing sleeves and clear worn sleeves after every explicit None entry has been removed',()=>{
  const sleeve={slotType:'LeftArmWear',itemAssetName:'GearArmSleeve_NikeProDriFitSleeve_White'},players=[{row:0,visualRow:0,team:'Team',player:'Source',position:'WR',rawData:raw({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[sleeve]}]})},{row:1,visualRow:1,team:'Team',player:'Target',position:'WR',rawData:raw()}],library=mapperLibrary(players),worn=library.items.find(item=>item.asset===sleeve.itemAssetName),none=library.items.find(item=>item.slot==='LeftArmWear'&&/(?:^|_)None$/i.test(item.asset));
  assert.ok(none?.copyable);const add=buildMapperPreview(players,library,[{action:'replace',sourceId:none.id,replacementId:worn.id,matchMode:'exact',scope:'selected',playerRows:[1],playerIdentities:[{row:1,player:'Target',team:'Team'}]}]);assert.equal(add.blocked.length,0);assert.equal(add.changes.length,1);assert.ok(JSON.parse(add.changes[0].newRawData).loadouts[0].loadoutElements.some(element=>element.itemAssetName===sleeve.itemAssetName));
  const clear=buildMapperPreview(players,library,[{action:'copy',replacementId:none.id,scope:'selected',playerRows:[0],playerIdentities:[{row:0,player:'Source',team:'Team'}]}]);assert.equal(clear.blocked.length,0);assert.equal(clear.changes.length,1);const clean=JSON.parse(clear.changes[0].newRawData);removeNonePlaceholders(clean);assert.deepEqual(clean.loadouts[0].loadoutElements,[]);
});
test('rolled-jersey shirt assignment treats missing undershirts exactly like explicit None after cleanup',()=>{
  const ref=row=>(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0'),player={FirstName:'Test',LastName:'Player',Position:'WR',SchoolYear:'Freshman',RedshirtStatus:'Eligible',CharacterBodyType:'Thin',TeamIndex:1,CharacterVisuals:ref(0),isEmpty:false},make=empty=>({isEmpty:false,RawData:raw({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'OuterShirt',itemAssetName:'Gear_JerseyStyle_RolledLow'},...(empty?[{slotType:'InnerShirt',itemAssetName:'Undershirt_None'}]:[])]}]})});
  const withNone=make(true),missing=make(false),options={pantsFix:false,helmetFix:false,visorFix:false,sockFix:false,sleeveCompatibilityFix:false,rolledJerseyFix:true,undershirtWeights:{shortSleeve:100},seed:42,protectOriginalEaPlayers:false};
  applyGlobalEquipmentFixes([player],[withNone],10,options);applyGlobalEquipmentFixes([player],[missing],10,options);
  const expected=JSON.parse(withNone.RawData),actual=JSON.parse(missing.RawData);removeNonePlaceholders(expected);removeNonePlaceholders(actual);assert.deepEqual(actual,expected);
});
test('the Patcher compatibility pass repairs all 24 shirt pairs and respects excluded players',()=>{
  for(const jersey of RELAXED_TEE_INCOMPATIBLE_JERSEYS)for(const [tee,replacement]of Object.entries(RELAXED_TEE_REPLACEMENTS)){
    const player={FirstName:'Test',LastName:'Player',Position:'CB',SchoolYear:'Junior',RedshirtStatus:'Previous',CharacterBodyType:'Thin',TeamIndex:1,CharacterVisuals:(10).toString(2).padStart(15,'0')+'0'.repeat(17),isEmpty:false};
    const original={loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'OuterShirt',itemAssetName:jersey},{slotType:'InnerShirt',itemAssetName:tee,custom:7},{slotType:'LeftHandWear',itemAssetName:'Custom_Glove'}]}]},visual={isEmpty:false,RawData:JSON.stringify(original)},options={sleeveCompatibilityFix:true,protectOriginalEaPlayers:false};
    const excluded={...visual};applyGlobalEquipmentFixes([player],[excluded],10,{...options,eligiblePlayer:()=>false});assert.equal(excluded.RawData,visual.RawData);
    const result=applyGlobalEquipmentFixes([player],[visual],10,options),expected=structuredClone(original);expected.loadouts[0].loadoutElements[1].itemAssetName=replacement;assert.deepEqual(JSON.parse(visual.RawData),expected);assert.equal(result.visualsChanged,1);assert.ok(result.sleeveCompatibilityChanges.length);assert.ok(result.sleeveCompatibilityChanges.every(change=>!String(change.oldItem).includes('undefined')));
  }
});
