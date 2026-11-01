import test from 'node:test';import assert from 'node:assert/strict';
import{buildFreshAppearancePreview,generateRosterPreview,validateRosterPreview}from'../src/main/tools/rosterGenerator/core.js';
import{loadObservedCatalog}from'../src/main/tools/rosterGenerator/catalog.js';import{rosterPreset,modelForPreset}from'../src/main/tools/rosterGenerator/presets.js';import{WRITE_FIELDS}from'../src/main/tools/rosterGenerator/contract.js';import{VALID_POSITIONS}from'../src/main/tools/equipment/shared.js';
const appearance={loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[]}]};

test('complete regeneration uses a canonical appearance and discards arbitrary old layers, metadata and overrides',()=>{
 for(const old of [
  {loadouts:[{loadoutType:'CustomUnknownHead',loadoutElements:[{slotType:'Face',itemAssetName:'CustomUniqueFace',transforms:[{scale:9}]}]},{loadoutCategory:'Base',unknown:1,loadoutElements:[{slotType:'NeckTattoo',itemAssetName:'UnknownTattoo'}]}],unknownRoot:{body:99},skinTone:7,bodyType:'Custom'},
  {loadouts:[null,7,'unknown',{unknown:true}],futureVersion:99},
  {loadouts:null,unknown:{name:'CustomFace'}},
  {futureAppearanceSchema:{face:'UnknownFace'}}
 ]){
  const before=structuredClone(old),result=buildFreshAppearancePreview(old,appearance,'nike');assert.equal(result.raw,JSON.stringify(appearance));assert.deepEqual(result.unknownLayers,[]);assert.equal(result.reset.mode,'complete');assert.deepEqual(result.reset.discardedRootFields,Object.keys(old).filter(k=>k!=='loadouts'));assert.deepEqual(old,before);assert.ok(!result.raw.includes('Unknown'));
 }
});

test('unreadable or non-player JSON is still rejected; source templates are cloned and compatibility-checked',()=>{
 for(const raw of ['not json','null','[]','17',null,[]])assert.throws(()=>buildFreshAppearancePreview(raw,appearance,'nike'));
 const original={loadouts:[{loadoutType:'Custom'}]},source=structuredClone(appearance),a=buildFreshAppearancePreview(original,source,'nike');assert.deepEqual(source,appearance);assert.equal(a.raw,JSON.stringify(appearance));assert.ok(!Object.hasOwn(original,'unknownLayers'));
});

test('unknown old appearance data does not change generated identities, ratings or appearance; shared rows still block',()=>{
 const base=loadObservedCatalog(),preset=rosterPreset('competitive'),model=modelForPreset(base,preset),targets=VALID_POSITIONS.map((position,row)=>({row,position,visualRow:row,visualOwners:[row],rawData:JSON.stringify(appearance),original:{...Object.fromEntries(WRITE_FIELDS.map(f=>[f,0])),FirstName:'Old',LastName:String(row),Position:position,JerseyNum:row,OverallRating:70}})),unknown=structuredClone(targets);
 unknown[0].rawData=JSON.stringify({futureSkin:{unknown:1},loadouts:[{loadoutType:'UnknownCustomHead',loadoutElements:[{slotType:'PlusHead',itemAssetName:'RealCustomHead',transforms:[{scale:2}]}]},{loadoutCategory:'Base',loadoutElements:[{slotType:'NeckTattoo',itemAssetName:'MysteryInk'}]}]});unknown[1].rawData=JSON.stringify({loadouts:[null,{unrecognized:true}],customIdentity:'OldFace'});
 const options={team:{name:'Test Team',teamIndex:1,branding:'nike'},model,preset,seed:257},clean=generateRosterPreview({...options,targets}),rebuilt=generateRosterPreview({...options,targets:unknown});assert.equal(rebuilt.blocking.length,0);
 assert.deepEqual(rebuilt.players.map(p=>[p.fields,p.rawData]),clean.players.map(p=>[p.fields,p.rawData]));assert.doesNotThrow(()=>validateRosterPreview(rebuilt,unknown,model));assert.ok(!rebuilt.players[0].rawData.includes('MysteryInk'));assert.equal(rebuilt.players[0].beforeRawData,unknown[0].rawData);
 const shared=structuredClone(unknown);shared[0].visualOwners=[0,999];const blocked=generateRosterPreview({...options,targets:shared});assert.ok(blocked.blocking.some(b=>b.row===0&&/shares appearance/.test(b.reason)));
});
