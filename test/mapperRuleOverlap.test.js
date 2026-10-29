import test from 'node:test';import assert from 'node:assert/strict';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';import {buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
const library=mapperCatalog({confirmed:true,unlocked:true}),a='GearWrist_wristTapedNormal_White',b='GearWrist_wristTapedNormal_Black',c='GearWrist_wristTapedNormal_TeamColor',slot='LeftWristWear';
const id=(asset,place=slot)=>{const item=library.items.find(i=>i.asset===asset&&i.slot===place);assert.ok(item,asset);return item.id;};
const player=(row,asset=a)=>({row,visualRow:row,team:'Test',teamIndex:1,player:'Test '+row,position:'WR',branding:'nike',rawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:slot,itemAssetName:asset,keep:1}]}]})});
const copy=(asset,more={})=>({action:'copy',replacementId:id(asset),scope:'all',frequency:100,fillToFrequency:true,...more}),replace=(from,to,more={})=>({...copy(to),action:'replace',sourceId:id(from),matchMode:'asset',...more});
const read=change=>JSON.parse(change.newRawData).loadouts[0].loadoutElements.find(e=>e.slotType===slot).itemAssetName;
test('different assignments to the same slot are explicit conflicts; no partial writes or changed statistics',()=>{
 const players=[player(0)],before=structuredClone(players);for(const rules of [[copy(b),copy(c)],[copy(c),copy(b)],[copy(a),copy(b)]]){
  const preview=buildMapperPreview(players,library,rules);assert.equal(preview.changes.length,0);assert.equal(preview.blocked.length,1);assert.match(preview.blocked[0].reason,/Mappings 1 and 2.*Left Wrist Wear/);assert.ok(preview.statistics.every(s=>s.changed===0));assert.deepEqual(players,before);
 }
});
test('replacement matches original equipment and does not cascade or reverse an earlier replacement',()=>{
 for(const rules of [[replace(a,b),replace(b,c)],[replace(b,c),replace(a,b)]]){const preview=buildMapperPreview([player(0,a),player(1,b)],library,rules);assert.equal(preview.blocked.length,0);assert.deepEqual(preview.changes.map(p=>[p.row,read(p)]),[[0,b],[1,c]]);}
 const swap=buildMapperPreview([player(0,a),player(1,b)],library,[replace(a,b),replace(b,a)]);assert.equal(swap.blocked.length,0);assert.deepEqual(swap.changes.map(p=>[p.row,read(p)]),[[0,b],[1,a]]);
});
test('identical duplicate assignments and disjoint player filters remain valid',()=>{
 const duplicate=buildMapperPreview([player(0)],library,[copy(b),copy(b)]);assert.equal(duplicate.blocked.length,0);assert.equal(duplicate.changes.length,1);assert.equal(duplicate.changes[0].edits.length,1);
 const players=[player(0),{...player(1),position:'CB'}],disjoint=buildMapperPreview(players,library,[copy(b,{positions:['WR']}),copy(c,{positions:['CB']})]);assert.equal(disjoint.blocked.length,0);assert.deepEqual(disjoint.changes.map(p=>[p.row,read(p)]),[[0,b],[1,c]]);
});
