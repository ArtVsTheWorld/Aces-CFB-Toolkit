import test from 'node:test';import assert from 'node:assert/strict';
import{limitQbGloves,enforceRandomizerPositionRestrictions}from'../src/main/tools/equipment/core/positionRestrictions.js';
import{assignCompatibleBrandEquipment}from'../src/main/tools/equipment/core/brandCompatibility.js';
import{applyModdedRandomizerEquipment,mulberry32}from'../src/main/tools/equipment/core/patcher.js';
import{createGeneratedEquipmentState}from'../src/main/tools/equipment/core/generatedCompatibility.js';
import{capQuickstartQbGloves}from'../src/main/tools/equipmentQuickstart/qbGloves.js';
import{normalizeModPools}from'../src/main/tools/equipment/core/modPools.js';
const asset='GearHand_glove_AdidasAdizero11_white',e=(slotType,itemAssetName)=>({slotType,itemAssetName,keep:'metadata'}),outfit=(l=asset,r=asset)=>({loadoutType:'PlayerOnField',loadoutElements:[e('LeftHandWear',l),e('RightHandWear',r),e('InnerSocks','Gear_Socks_Low')]});
test('QB final restriction clears only the throwing glove in every on-field outfit and retains all other metadata',()=>{
 for(const hand of ['Left','Right']){const field=outfit(),base={...outfit(),loadoutType:'Base'},loadouts=[field,structuredClone(field),base],before=structuredClone(loadouts);const edits=enforceRandomizerPositionRestrictions(loadouts,'QB',hand);assert.equal(edits.length,2);for(let i=0;i<2;i++){const expected=before[i];expected.loadoutElements.find(e=>e.slotType===hand+'HandWear').itemAssetName='GearHand_None';assert.deepEqual(loadouts[i],expected);}assert.deepEqual(base,before[2]);assert.deepEqual(limitQbGloves(loadouts,hand),[]);}
});
test('single gloves, bare hands and taped hands remain unchanged, and other positions can keep paired gloves',()=>{
 for(const [l,r]of [[asset,'GearHand_None'],['GearHand_None',asset],['GearHand_None','GearHand_None'],['GearHand_tapedHandNormal_White',asset],['GearHand_tapedHandNormal_White','GearHand_tapedHandMax_White']]){const loadouts=[outfit(l,r)],before=structuredClone(loadouts);assert.deepEqual(limitQbGloves(loadouts),[]);assert.deepEqual(loadouts,before);}
 const wr=[outfit()],before=structuredClone(wr);assert.deepEqual(enforceRandomizerPositionRestrictions(wr,'WR'),[]);assert.deepEqual(wr,before);
});
test('QB pool rolls never add gloves even without Quickstart options, across all mod combinations and seeds',()=>{
 const modPools=normalizeModPools();for(const cats of Object.values(modPools))for(const c of Object.values(cats))c.chance=100;
 for(let flags=0;flags<8;flags++)for(let seed=1;seed<=40;seed++){const loadouts=[outfit('GearHand_None','GearHand_None')],result=applyModdedRandomizerEquipment(loadouts,{position:'QB',branding:'adidas'},mulberry32(seed),1,createGeneratedEquipmentState(loadouts),{usingUnlockedMod:!!(flags&1),usingRawAccessoriesMod:!!(flags&2),usingEquipmentTruckMod:!!(flags&4),modPools});assert.ok(!Object.values(result).flat().some(c=>c.category==='Gloves'));for(const side of ['Left','Right'])assert.equal(loadouts[0].loadoutElements.find(e=>e.slotType===side+'HandWear').itemAssetName,'GearHand_None');}
});
test('QB brand matching cannot add gloves from a gloved fallback donor; non-QB matching still works',()=>{
 const donor={row:1,visuals:{loadouts:[outfit()]}};
 for(const [l,r]of [['GearHand_None','GearHand_None'],[asset,'GearHand_None'],[asset,asset]]){const loadouts=[outfit(l,r)],before=structuredClone(loadouts);const audit=assignCompatibleBrandEquipment(loadouts,{position:'QB',branding:'adidas'},[donor],[],()=>0);assert.deepEqual(loadouts,before);assert.ok(!audit.donorUses.some(d=>d.group.includes('gloves')));}
 const loadouts=[outfit('GearHand_None','GearHand_None')];assignCompatibleBrandEquipment(loadouts,{position:'WR',branding:'adidas'},[donor],[],()=>0);assert.equal(loadouts[0].loadoutElements[0].itemAssetName,asset);
});

test('Quickstart one-percent glove cap leaves taped hands alone',()=>{
 const raw=JSON.stringify({loadouts:[outfit('GearHand_tapedHandNormal_White','GearHand_tapedHandMax_White')]}),visuals=[{isEmpty:false,RawData:raw}],players=[{isEmpty:false,Position:'QB',CharacterVisuals:(10).toString(2).padStart(15,'0')+'0'.repeat(17)}];
 const result=capQuickstartQbGloves({changes:[{target:{row:0},visualsRow:0}],players,visuals,visualsTableId:10});assert.equal(result.removed,0);assert.equal(result.totalGloved,0);assert.equal(visuals[0].RawData,raw);
});
