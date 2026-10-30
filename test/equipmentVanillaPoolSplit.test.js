import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {modPoolDefinitions,normalizeModPools,modPoolEditorCatalog} from '../src/main/tools/equipment/core/modPools.js';
import {patchFreshmanEquipment,applyModdedRandomizerEquipment,mulberry32} from '../src/main/tools/equipment/core/patcher.js';
import {createGeneratedEquipmentState} from '../src/main/tools/equipment/core/generatedCompatibility.js';
import {VANILLA_FACE_PAINT_OPTIONS,MOD_FACE_PAINT_ITEMS} from '../src/main/tools/equipment/core/facepaint.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import Migration from '../src/shared/equipmentPoolMigration.cjs';
const definitions=modPoolDefinitions(),empty=()=>Object.fromEntries(Object.entries(definitions).map(([origin,cats])=>[origin,Object.fromEntries(cats.map(c=>[c.id,{chance:0,items:[]}]))]));
const element=(slotType,itemAssetName)=>({slotType,itemAssetName});
const outfit=paint=>({loadoutType:'PlayerOnField',loadoutElements:[element('OuterPants','GearPants_AboveKnee'),...(paint===undefined?[]:[element('FacePaint',paint)])]});
const ref=row=>(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
const fixtures=(position='WR',paint='FaceMarks_EyeTape',secondPaint=paint)=>{
 const players=[0,1,2].map(row=>({FirstName:'Test',LastName:String(row),Position:position,SchoolYear:row?'Senior':'Freshman',RedshirtStatus:'Eligible',OverallRating:90-row,CharacterVisuals:ref(row),TeamIndex:1,IsNIL:false}));
 const visuals=players.map((p,row)=>({RawData:JSON.stringify({loadouts:[outfit(row?paint:'FaceMarks_EyePaint'),outfit(row?secondPaint:'FaceMarks_EyePaint2')]})}));
 return {players,visuals};
};
const paints=change=>JSON.parse(change.newRawData).loadouts.map(l=>l.loadoutElements.find(e=>e.slotType==='FacePaint'));

test('menu-confirmed Vanilla and Unlocked classifications override misleading base-file presence',()=>{
 const stock=new Set(definitions.vanilla.flatMap(c=>c.items.map(i=>i.itemName))),mod=new Set(definitions.unlocked.flatMap(c=>c.items.map(i=>i.itemName)));
 for(const id of ['FaceGear_BalaclavaOverNose','FaceGear_BalaclavaOverNose_White','FaceGear_BalaclavaOverNose_Primary','FaceGear_BalaclavaOverNose_Secondary','Socks_CrewCut','Socks_High','GearFootwear_shoe_low_NikeVaporEdge_zebra']){assert.ok(!stock.has(id),id);assert.ok(mod.has(id),id);}
 for(const stem of ['GearHand_glove_AdidasAdizero11_','GearHand_glove_JordanVaporJet5_','GearHand_glove_UnderArmourBlur_']){const ids=[...mod].filter(id=>id.startsWith(stem));assert.equal(ids.length,4);for(const id of ids)assert.ok(!stock.has(id),id);}
 for(const id of ['NeckWear_Turtleneck_Tight','NeckWear_Turtleneck_Scrunched','GearSpats_spatThin_White','GearArmSleeve_Baggy_Black','GearFootwear_shoe_low_NikeDiamondTurf93','GearFootwear_shoe_low_NikeKobeVenom','GearFootwear_shoe_mid_NikeFoamposite','GearFootwear_shoe_mid_NikeDiamondTURF2','GearFootwear_shoe_mid_NikeAlphaMenaceElite5','GearFootwear_shoe_mid_NikeAlphaMenacePro5'])assert.ok(stock.has(id),id);
 const evidence=JSON.parse(fs.readFileSync(new URL('../src/main/tools/equipment/equipmentPoolOwnership.json',import.meta.url),'utf8'));for(const i of [...Object.values(evidence.vanillaItems),...Object.values(evidence.unlockedItems)])assert.ok(i.evidence.length&&i.evidence.every(id=>evidence.evidenceSources[id]));assert.ok(!evidence.vanillaItems.Socks_High);
});

test('legacy mixed selections keep the exact chosen items and chances after the split, including empty and zero',()=>{
 const glove=definitions.vanilla.find(c=>c.id==='gloves').items[0].itemName;
 const sleeve=definitions.vanilla.find(c=>c.id==='armSleeves').items[0].itemName;
 const mod=definitions.unlocked.find(c=>c.id==='armSleeves').items[0].itemName;
 const old={unlocked:{gloves:{chance:77,items:[glove]},armSleeves:{chance:42,items:[sleeve,mod]},elbowGear:{chance:0,items:[]}},raw:{facepaint:{chance:83,items:[MOD_FACE_PAINT_ITEMS.raw[0]]}}};
 const before=structuredClone(old),current=normalizeModPools(old);
 assert.deepEqual(old,before);assert.deepEqual(current.vanilla.gloves,{chance:77,items:[glove]});assert.deepEqual(current.unlocked.gloves,{chance:77,items:[]});
 assert.deepEqual(current.vanilla.armSleeves,{chance:42,items:[sleeve]});assert.deepEqual(current.unlocked.armSleeves,{chance:42,items:[mod]});
 for(const origin of ['vanilla','unlocked'])assert.deepEqual(current[origin].elbowGear,{chance:0,items:[]});
 assert.deepEqual(current.raw.facepaint,old.raw.facepaint);assert.deepEqual(normalizeModPools(current),current);
 const chanceOnly=normalizeModPools({unlocked:{elbowGear:{chance:17}}});assert.ok(!chanceOnly.vanilla.elbowGear.items.some(id=>/^GearWrist_wristbrace_CompressShort_/i.test(id)));
 assert.throws(()=>normalizeModPools({unlocked:{gloves:{chance:11,items:['made-up']}}}),/supported/);
 const browser={};vm.runInNewContext(fs.readFileSync(new URL('../src/shared/equipmentPoolMigration.cjs',import.meta.url),'utf8'),{globalThis:browser,structuredClone});
 assert.equal(JSON.stringify(browser.EquipmentPoolMigration.migrate(old,modPoolEditorCatalog())),JSON.stringify(Migration.migrate(old,definitions)));
});

test('default pool restrictions and disabled categories survive in both tools',()=>{
 const defaults=normalizeModPools(),quick=quickstartSettings({unlocked:true}).randomizer;
 assert.equal(normalizeEquipmentOptions({},true).usingVanillaPool,true);assert.equal(quick.usingVanillaPool,true);
 for(const pools of [defaults,quick.modPools]){
  assert.equal(pools.vanilla.spats.chance,5);assert.equal(pools.unlocked.balaclavas.chance,5);
  assert.ok(!pools.unlocked.elbowGear.items.some(id=>/^GearBicepBand_/.test(id)));
  assert.ok(!pools.vanilla.elbowGear.items.some(id=>/^ElbowGear_(elbowBrace|elbowpad)/i.test(id)));
  assert.deepEqual(pools.unlocked.towels,{chance:1,items:['Towel2_South']});
  for(const origin of ['vanilla','unlocked','raw'])assert.equal(pools[origin].facepaint.chance,10);
 }
});

test('all donor facepaint, None and missing slots copy exactly in full and mixed modes with no pool replacement',()=>{
 for(const mode of ['full','mixed'])for(const paint of [undefined,'FaceMarks_None','FaceMarks_EyeTape',MOD_FACE_PAINT_ITEMS.raw[0],'Future_Unknown_CustomPaint']){
  const {players,visuals}=fixtures('WR',paint,paint===undefined?undefined:'FaceMarks_NoseTape');
  if(paint===undefined)for(const v of visuals.slice(1)){const data=JSON.parse(v.RawData);for(const l of data.loadouts)l.loadoutElements=l.loadoutElements.filter(e=>e.slotType!=='FacePaint');v.RawData=JSON.stringify(data);}
  const before=structuredClone(visuals);
  for(let seed=1;seed<=15;seed++){
   const result=patchFreshmanEquipment(players,visuals,10,{seed,top:2,protectOriginalEaPlayers:false,mixedChance:mode==='mixed'?1:0,crossMixedChance:0,usingVanillaPool:true,usingUnlockedMod:true,usingRawAccessoriesMod:true,modPools:empty()});
   assert.equal(result.changes.length,1);const copied=paints(result.changes[0]);assert.equal(copied[0]?.itemAssetName,paint);assert.equal(copied[1]?.itemAssetName,paint===undefined?undefined:'FaceMarks_NoseTape');
   assert.ok(result.changes[0].facePaint.every(p=>p.source==='Copied from donor'));assert.deepEqual(visuals,before);
  }
 }
});

test('mixed facepaint follows the named helmet donor, including separate external donor records',()=>{
 const f=fixtures(),external=structuredClone(f.players),sourceVisuals=structuredClone(f.visuals);
 sourceVisuals[1].RawData=JSON.stringify({loadouts:[outfit('FaceMarks_EyeTapeLeft'),outfit('FaceMarks_EyeTapeRight')]});
 sourceVisuals[2].RawData=JSON.stringify({loadouts:[outfit('FaceMarks_NoseTape'),outfit('FaceMarks_EyePaintCross')]});
 for(let seed=1;seed<=25;seed++){
  const result=patchFreshmanEquipment(f.players,f.visuals,10,{seed,top:2,donorPlayerRecords:external,donorVisualRecords:sourceVisuals,donorVisualsTableId:10,eligiblePlayer:p=>p.SchoolYear==='Freshman',mixedChance:1,crossMixedChance:0});
  const change=result.changes[0],donor=change.donorUses.find(u=>u.group==='helmet').donor.row;
  assert.deepEqual(paints(change),JSON.parse(sourceVisuals[donor].RawData).loadouts.map(l=>l.loadoutElements.find(e=>e.slotType==='FacePaint')));
 }
});

test('each enabled facepaint pool replaces donor paint only on its own chance, and zero/empty preserve it',()=>{
 for(const origin of ['vanilla','unlocked','raw']){
  const asset=definitions[origin].find(c=>c.id==='facepaint').items[0].itemName;
  for(const [chance,items,expected]of [[100,[asset],asset],[0,[asset],'FaceMarks_EyeTape'],[100,[],'FaceMarks_EyeTape']]){
   const f=fixtures(),pools=empty();pools[origin].facepaint={chance,items};
   const r=patchFreshmanEquipment(f.players,f.visuals,10,{seed:44,top:2,mixedChance:0,crossMixedChance:0,usingVanillaPool:origin==='vanilla',usingUnlockedMod:origin==='unlocked',usingRawAccessoriesMod:origin==='raw',modPools:pools});
   for(const e of paints(r.changes[0]))assert.equal(e.itemAssetName,expected);
   assert.equal(r.changes[0].facePaint[0].source,expected===asset?({vanilla:'CFB 27 Equipment Pool',unlocked:'Unlocked Equipment Pool',raw:'RAW Accessories Equipment Pool'})[origin]:'Copied from donor');
  }
 }
});

test('competing facepaint pools all win sometimes and accepted reports have one winner without overwrites',()=>{
 const assets={vanilla:VANILLA_FACE_PAINT_OPTIONS[0],unlocked:MOD_FACE_PAINT_ITEMS.unlocked[0],raw:MOD_FACE_PAINT_ITEMS.raw[0]},seen=new Set();
 for(let seed=1;seed<=150;seed++){
  const pools=empty();for(const[origin,asset]of Object.entries(assets))pools[origin].facepaint={chance:100,items:[asset]};
  const loadouts=[outfit('FaceMarks_None')],state=createGeneratedEquipmentState(loadouts),accepted=applyModdedRandomizerEquipment(loadouts,{position:'WR',branding:'nike'},mulberry32(seed),.1,state,{usingVanillaPool:true,usingUnlockedMod:true,usingRawAccessoriesMod:true,modPools:pools});
  const claims=Object.entries(accepted).filter(([,changes])=>changes.some(c=>c.slots.includes('FacePaint')));assert.equal(claims.length,1);seen.add(claims[0][0]);
  assert.equal(loadouts[0].loadoutElements.find(e=>e.slotType==='FacePaint').itemAssetName,assets[claims[0][0]]);
 }
 assert.deepEqual(seen,new Set(['vanilla','unlocked','raw']));
});

test('new vanilla pool retains QB and specialist pool exclusions, while Quickstart K/P stay donor-only',()=>{
 const pools=empty();for(const c of definitions.vanilla)pools.vanilla[c.id]={chance:100,items:c.items.map(i=>i.itemName)};
 for(const position of ['QB','LT','LG','C','RG','RT','DT','K','P'])for(let seed=0;seed<20;seed++){
  const loadouts=[outfit('FaceMarks_None')],state=createGeneratedEquipmentState(loadouts);applyModdedRandomizerEquipment(loadouts,{position,branding:'nike'},mulberry32(seed),1,state,{usingVanillaPool:true,modPools:pools});
  const added=loadouts[0].loadoutElements.filter(e=>/HandWear/.test(e.slotType));assert.ok(added.every(e=>position!=='QB'&&!['K','P'].includes(position)&&/^GearHand_tapedHand/i.test(e.itemAssetName)));
  if(position!=='QB')assert.ok(!loadouts[0].loadoutElements.some(e=>/Balaclava|Turtleneck/.test(e.itemAssetName)));
 }
 for(const position of ['K','P']){const f=fixtures(position,'Custom_Donor_Paint');const r=patchFreshmanEquipment(f.players,f.visuals,10,{...quickstartSettings({unlocked:true,raw:true,gameday:true,protectOriginalEaPlayers:false}).randomizer,noDripProfile:false,top:1,mixedChance:0,crossMixedChance:0,seed:5});assert.ok(!r.changes[0].vanillaChanges.length);assert.equal(paints(r.changes[0])[0].itemAssetName,'Custom_Donor_Paint');}
});
