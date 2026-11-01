import test from 'node:test';
import assert from 'node:assert/strict';
import {keepQuickstartDoubleSleeves,simplifyQuickstartSleeves,applyQuickstartSleeveStyling} from '../src/main/tools/equipmentQuickstart/sleeveStyling.js';
import {enforceEquipmentCompatibility} from '../src/main/tools/equipment/core/compatibility.js';
import {RAW_314} from '../src/main/tools/equipment/catalog.js';

const ref=(row,table=10)=>table.toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
const player=row=>({isEmpty:false,FirstName:'Test',LastName:String(row),Position:'WR',CharacterVisuals:ref(row)});
const el=(slotType,itemAssetName)=>({slotType,itemAssetName,keep:'metadata'});
const tee='G_CompressionT_Crew_ShortSleeve_Basic_WHI',sleeve='GearArmSleeve_Half_sleeveLongUnderarmor_normal_White';
const loadouts=(shirt=tee,arm=sleeve)=>[{loadoutType:'PlayerOnField',loadoutElements:[el('InnerShirt',shirt),el('LeftArmWear',arm),el('RightArmWear',arm),el('OuterShirt','Gear_JerseyStyle_SleeveStandard')]},{loadoutType:'Base',loadoutElements:[el('InnerShirt',shirt)]}];

test('Quickstart replaces only the tee with its exact sleeveless color, preserving sleeves, other gear and metadata',()=>{
  for(const [source,target]of [['Basic_WHI','_White'],['Basic_BLA','_Black'],['Basic_PRI',''],['Basic_SEC','_Secondary'],['BasicJ_JER','_White']]){
    const outfits=loadouts('G_CompressionT_Crew_ShortSleeve_'+source);outfits.push(structuredClone(outfits[0]));const before=structuredClone(outfits);
    const edits=simplifyQuickstartSleeves(outfits,{usingUnlockedMod:false});assert.equal(edits.length,2);
    for(const i of [0,2]){assert.equal(outfits[i].loadoutElements[0].itemAssetName,'Gear_Undershirt_CompressionTCrewSleeveless'+target);assert.equal(outfits[i].loadoutElements[0].keep,'metadata');assert.deepEqual(outfits[i].loadoutElements.slice(1),before[i].loadoutElements.slice(1));assert.deepEqual(enforceEquipmentCompatibility(structuredClone(outfits[i].loadoutElements)),[]);}
    assert.deepEqual(outfits[1],before[1]);const repeated=structuredClone(outfits);assert.deepEqual(simplifyQuickstartSleeves(outfits),[]);assert.deepEqual(outfits,repeated);
  }
});

test('tape, empty slots, unknown items, different undershirts and ambiguous shirts are left intact; RAW Jamo uses selected mods',()=>{
  for(const arm of ['ArmSleeve_None','GearArmSleeve_Quarter_armTape_normal_OffWhite','GearArmSleeve_Undershirt_armTape_normal_OffWhite','CustomUnknownSleeve']){
    const outfits=loadouts(tee,arm),before=structuredClone(outfits);assert.deepEqual(simplifyQuickstartSleeves(outfits),[]);assert.deepEqual(outfits,before);
  }
  for(const shirt of ['Gear_Undershirt_CompressionTCrewSleeveless_White','G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD','Undershirt_None','CustomShirt']){const outfits=loadouts(shirt),before=structuredClone(outfits);assert.deepEqual(simplifyQuickstartSleeves(outfits),[]);assert.deepEqual(outfits,before);}
  const duplicate=loadouts();duplicate[0].loadoutElements.push(el('InnerShirt',tee));const before=structuredClone(duplicate);assert.deepEqual(simplifyQuickstartSleeves(duplicate),[]);assert.deepEqual(duplicate,before);
  const jamo=RAW_314.jamoColors.primary;assert.equal(simplifyQuickstartSleeves(loadouts(tee,jamo),{usingRawAccessoriesMod:false}).length,0);assert.equal(simplifyQuickstartSleeves(loadouts(tee,jamo),{usingRawAccessoriesMod:true}).length,1);
  for(const invalid of [null,{},[null],[{loadoutType:'PlayerOnField'}]])assert.deepEqual(simplifyQuickstartSleeves(invalid),[]);
});

test('one stable 25% keep preference per player survives outfit changes, run seeds and filename changes',()=>{
  let kept=0;
  for(let row=0;row<10000;row++){
    const p=player(row),keep=keepQuickstartDoubleSleeves(p,row,714);kept+=Number(keep);
    assert.equal(keepQuickstartDoubleSleeves({...p,Position:'TE',TeamIndex:25,JerseyNum:17,SchoolYear:'Senior'},row,714),keep);
  }
  assert.ok(kept>2300&&kept<2700,String(kept));
  const p=player(0);assert.ok(Array.from({length:100},(_,i)=>keepQuickstartDoubleSleeves(p,0,100+i)).some(v=>v!==keepQuickstartDoubleSleeves(p,0,714)));
});

test('style pass touches only processed, unprotected, non-donor players with unique matching visual references',()=>{
  const players=Array.from({length:100},(_,row)=>player(row)),visuals=players.map(()=>({isEmpty:false,RawData:JSON.stringify({keep:true,loadouts:loadouts()})}));
  const changes=players.map((_,row)=>({target:{row},visualsRow:row}));
  const candidates=players.map((p,row)=>row).filter(row=>!keepQuickstartDoubleSleeves(players[row],row,714));assert.ok(candidates.length>30);
  const [donor,ea,k,p,shared,sharer,wrong,malformed,unprocessed]=candidates;
  Object.assign(players[ea],{PLYR_ASSETNAME:'SmithJeremiah_8726',IsNIL:true});players[k].Position='K';players[p].Position='P';players[sharer].CharacterVisuals=ref(shared);players[wrong].CharacterVisuals=ref(wrong,11);visuals[malformed].RawData='not json';
  const before=structuredClone(visuals),options={changes:changes.filter(c=>c.target.row!==unprocessed),players,visuals,visualsTableId:10,dynastyId:714,donorRows:new Set([donor])};
  const edits=applyQuickstartSleeveStyling(options);assert.ok(edits.length>30);
  for(const row of [donor,ea,k,p,shared,sharer,wrong,malformed,unprocessed])assert.deepEqual(visuals[row],before[row],String(row));
  for(const change of edits){assert.equal(change.changes.length,1);assert.ok(!keepQuickstartDoubleSleeves(players[change.row],change.row,714));assert.ok(changes[change.row].sleeveStyleCorrections);}
  assert.deepEqual(applyQuickstartSleeveStyling(options),[],'Repeat pass is idempotent');
});
