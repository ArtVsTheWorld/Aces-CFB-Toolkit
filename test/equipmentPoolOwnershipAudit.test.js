import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import{modPoolDefinitions,normalizeModPools,modPoolEditorCatalog,POOL_OWNERSHIP}from'../src/main/tools/equipment/core/modPools.js';
import{applyModdedRandomizerEquipment,mulberry32}from'../src/main/tools/equipment/core/patcher.js';
import{createGeneratedEquipmentState}from'../src/main/tools/equipment/core/generatedCompatibility.js';
import{equipmentDisplayName}from'../src/main/tools/equipment/catalog.js';import{equipmentPreviewChanges}from'../src/main/tools/equipment/preview.js';import{rollConfiguredItem}from'../src/main/tools/equipment/core/poolRoll.js';import Migration from'../src/shared/equipmentPoolMigration.cjs';
import{mapperCatalog}from'../src/main/tools/equipmentMapper/catalog.js';
const defs=modPoolDefinitions(),empty=()=>({_version:2,...Object.fromEntries(Object.entries(defs).map(([origin,c])=>[origin,Object.fromEntries(c.map(c=>[c.id,{chance:0,items:[]}]))]))}),outfit=()=>[{loadoutType:'PlayerOnField',loadoutElements:[]}];
const nike5='GearHand_glove_NikeVaporJet5_TeamColor',kobe6='GearFootwear_shoe_low_NikeKobeVenom';

test('all six user-confirmed new Nike cleats are Vanilla while all unavailable glove colors stay Unlocked',()=>{
 for(const id of ['GearFootwear_shoe_low_NikeDiamondTurf93','GearFootwear_shoe_mid_NikeDiamondTURF2',kobe6,'GearFootwear_shoe_mid_NikeFoamposite','GearFootwear_shoe_mid_NikeAlphaMenaceElite5','GearFootwear_shoe_mid_NikeAlphaMenacePro5']){assert.ok(POOL_OWNERSHIP.vanillaItems[id]);assert.ok(!POOL_OWNERSHIP.unlockedItems[id]);}
 for(const stem of ['GearHand_glove_AdidasAdizero11_','GearHand_glove_JordanVaporJet5_','GearHand_glove_UnderArmourBlur_']){const all=Object.keys(POOL_OWNERSHIP.unlockedItems).filter(n=>n.startsWith(stem));assert.equal(all.length,4);for(const n of all)assert.ok(!POOL_OWNERSHIP.vanillaItems[n]);}
 assert.ok(POOL_OWNERSHIP.unlockedItems.GearFootwear_shoe_low_NikeVaporEdge_zebra);assert.ok(!POOL_OWNERSHIP.vanillaItems.GearFootwear_shoe_low_NikeVaporEdge_zebra);
});

test('shared Nike 5/9 and replacement cleat IDs have distinct labels and only one eligible generating provider',()=>{
 assert.match(equipmentDisplayName(nike5,{usingUnlockedMod:false}),/Vapor Jet 5/);assert.match(equipmentDisplayName(nike5,{usingUnlockedMod:true}),/Vapor Jet 9/);
 const shoe='GearFootwear_shoe_Low_NikeVaporUntouchable2';assert.equal(equipmentDisplayName(shoe,{usingUnlockedMod:false}),'Nike Vapor Untouchable 2 Low');assert.equal(equipmentDisplayName(shoe,{usingUnlockedMod:true}),'Jordan 4 Alpha Menace');
 for(const [category,id]of [['gloves',nike5],['cleats',shoe]])for(let seed=0;seed<25;seed++){
  const pools=empty();pools.vanilla[category]={chance:100,items:[id]};pools.unlocked[category]={chance:100,items:[id]};
  for(const enabled of [true,false]){const loadouts=outfit(),state=createGeneratedEquipmentState(loadouts),audit=applyModdedRandomizerEquipment(loadouts,{position:'WR',branding:'nike'},mulberry32(seed),1,state,{usingVanillaPool:true,usingUnlockedMod:enabled,modPools:pools});assert.equal(audit.vanilla.length,enabled?0:1);if(enabled)assert.equal(audit.unlocked.length,1);}
  pools.unlocked[category].chance=0;const loadouts=outfit(),audit=applyModdedRandomizerEquipment(loadouts,{position:'WR',branding:'nike'},mulberry32(seed),1,undefined,{usingVanillaPool:true,usingUnlockedMod:true,modPools:pools});assert.ok(!Object.values(audit).flat().length,'Vanilla cannot bypass a disabled Unlocked replacement roll');
 }
 const raw=item=>JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'LeftHandWear',itemAssetName:item}]}]});const change=equipmentPreviewChanges(raw('GearHand_None'),raw(nike5),{usingUnlockedMod:false});assert.match(change[0].proposedValue,/Vapor Jet 5/);
});

test('a prior review preset moves restricted items back without dropping mixed selections or their distinct chances',()=>{
 const plain='NeckWear_Turtleneck_Tight',brand='NeckWear_Turtleneck_Tight2';
 const old={vanilla:{neckwear:{chance:27,items:[plain]},balaclavas:{chance:0,items:['FaceGear_BalaclavaOverNose']},socks:{chance:43,items:['Socks_CrewCut']},gloves:{chance:66,items:['GearHand_glove_AdidasAdizero11_teamColor',nike5]}},unlocked:{neckwear:{chance:53,items:[brand]},gloves:{chance:10,items:[]}}},snapshot=structuredClone(old),result=normalizeModPools(old);
 assert.deepEqual(old,snapshot);assert.equal(result._version,2);assert.deepEqual(result.vanilla.neckwear,{chance:27,items:[plain]});assert.equal(result.unlocked.socks.chance,43);assert.equal(result.unlocked.balaclavas.chance,0);assert.deepEqual(result.unlocked.neckwear,{chance:53,items:[brand]});assert.deepEqual(new Set(result.unlocked.gloves.items),new Set(['GearHand_glove_AdidasAdizero11_teamColor',nike5]));assert.deepEqual(result.vanilla.gloves.items,[nike5]);assert.deepEqual(normalizeModPools(JSON.parse(JSON.stringify(result))),result);
 const browser={};vm.runInNewContext(fs.readFileSync(new URL('../src/shared/equipmentPoolMigration.cjs',import.meta.url),'utf8'),{globalThis:browser,structuredClone});assert.equal(JSON.stringify(browser.EquipmentPoolMigration.migrate(old,modPoolEditorCatalog())),JSON.stringify(Migration.migrate(old,defs)));
 const chanceOnly=normalizeModPools({vanilla:{socks:{chance:24},balaclavas:{chance:0}}});assert.equal(chanceOnly.unlocked.socks.chance,24);assert.deepEqual(chanceOnly.unlocked.socks.items,['Socks_CrewCut','Socks_High']);assert.equal(chanceOnly.unlocked.balaclavas.chance,0);
 assert.throws(()=>normalizeModPools({_version:99}),/version/);assert.throws(()=>normalizeModPools({_version:2,unlocked:{socks:{items:['UnknownSock']}}}),/supported/);
});

test('migrated item-group chances are honored and competing successes apply one winner',()=>{
 const items=[{itemName:'a'},{itemName:'b'}],zero={items:['a','b'],rollGroups:[{chance:0,items:['a']},{chance:100,items:['b']}]};
 for(let seed=0;seed<100;seed++)assert.equal(rollConfiguredItem(items,()=>true,mulberry32(seed),0,zero).itemName,'b');
 const seen=new Set();for(let seed=0;seed<100;seed++)seen.add(rollConfiguredItem(items,()=>true,mulberry32(seed),0,{items:['a','b'],rollGroups:[{chance:100,items:['a']},{chance:100,items:['b']}]}).itemName);assert.deepEqual(seen,new Set(['a','b']));
 const config=empty();config.unlocked.neckwear={chance:0,items:['NeckWear_Turtleneck_Tight3','NeckWear_Turtleneck_Tight2'],rollGroups:[{chance:0,items:['NeckWear_Turtleneck_Tight3']},{chance:100,items:['NeckWear_Turtleneck_Tight2']}]};
 for(let seed=0;seed<20;seed++){const l=outfit(),changes=applyModdedRandomizerEquipment(l,{position:'WR',branding:'nike'},mulberry32(seed),0,undefined,{usingUnlockedMod:true,modPools:config});assert.equal(changes.unlocked.length,1);assert.equal(changes.unlocked[0].newItem,'NeckWear_Turtleneck_Tight2');}
});

test('Mapper uses the same verified availability and preserves stable IDs across installed-mod choices',()=>{
 const base=mapperCatalog({confirmed:true,unlocked:false}),mod=mapperCatalog({confirmed:true,unlocked:true});
 for(const n of ['FaceGear_BalaclavaOverNose','Socks_CrewCut','Socks_High','GearHand_glove_AdidasAdizero11_black','GearHand_glove_JordanVaporJet5_Black','GearHand_glove_UnderArmourBlur_Black']){assert.ok(!base.items.some(i=>i.asset===n),n);assert.ok(mod.items.some(i=>i.asset===n),n);}
 for(const n of [nike5,kobe6,'NeckWear_Turtleneck_Tight','NeckWear_Turtleneck_Scrunched']){const a=base.items.find(i=>i.asset===n),b=mod.items.find(i=>i.asset===n);assert.ok(a&&b);assert.equal(a.id,b.id);assert.equal(a.origin,'vanilla');}
 assert.match(base.items.find(i=>i.asset===nike5).name,/Vapor Jet 5/);assert.match(mod.items.find(i=>i.asset===nike5).name,/Vapor Jet 9/);
});


test('plain Scrunched/Tight turtlenecks are Vanilla across pools, Mapper and all saved preset generations',()=>{
 const plain=Object.keys(POOL_OWNERSHIP.vanillaItems).filter(n=>/^NeckWear_Turtleneck_(Scrunched|Tight)(_(Black|White|Secondary))?$/.test(n));
 assert.equal(plain.length,8);
 const branded=defs.unlocked.find(c=>c.id==='neckwear').items.map(i=>i.itemName);assert.equal(branded.length,6);
 for(const n of plain){assert.ok(!POOL_OWNERSHIP.unlockedItems[n]);assert.ok(defs.vanilla.find(c=>c.id==='neckwear').defaultItems.includes(n));assert.equal(mapperCatalog({confirmed:true,unlocked:false}).items.find(i=>i.asset===n)?.origin,'vanilla');}
 for(const n of branded)assert.ok(!mapperCatalog({confirmed:true,unlocked:false}).items.some(i=>i.asset===n));
 for(const chance of [0,37,100])for(const old of [{unlocked:{neckwear:{chance,items:[plain[0],branded[0]]}}},{vanilla:{neckwear:{chance,items:[plain[0]]}},unlocked:{neckwear:{chance:53,items:[branded[0]]}}},{_version:2,unlocked:{neckwear:{chance,items:[plain[0],branded[0]]}}}]){
  const before=structuredClone(old),result=normalizeModPools(old);assert.deepEqual(old,before);assert.deepEqual(result.vanilla.neckwear,{chance,items:[plain[0]]});assert.deepEqual(result.unlocked.neckwear.items,[branded[0]]);assert.deepEqual(normalizeModPools(result),result);
  const browser={};vm.runInNewContext(fs.readFileSync(new URL('../src/shared/equipmentPoolMigration.cjs',import.meta.url),'utf8'),{globalThis:browser,structuredClone});assert.equal(JSON.stringify(browser.EquipmentPoolMigration.migrate(old,modPoolEditorCatalog())),JSON.stringify(Migration.migrate(old,defs)));
 }
 const groups=normalizeModPools({_version:2,unlocked:{neckwear:{chance:10,items:[plain[0],branded[0]],rollGroups:[{chance:0,items:[plain[0]]},{chance:71,items:[branded[0]]}]}}});assert.deepEqual(groups.vanilla.neckwear.rollGroups,[{chance:0,items:[plain[0]]}]);assert.deepEqual(groups.unlocked.neckwear.rollGroups,[{chance:71,items:[branded[0]]}]);
 const none=normalizeModPools({_version:2,unlocked:{neckwear:{chance:0,items:[]}}});assert.deepEqual(none.unlocked.neckwear,{chance:0,items:[]});assert.deepEqual(none.vanilla.neckwear,{chance:0,items:[]});
 const brandedOnly=normalizeModPools({_version:2,unlocked:{neckwear:{chance:44,items:[branded[0]]}}});assert.deepEqual(brandedOnly.vanilla.neckwear,{chance:44,items:[]});assert.deepEqual(normalizeModPools(brandedOnly),brandedOnly);
 for(const n of plain){const pools=empty();pools.vanilla.neckwear={chance:100,items:[n]};const l=outfit(),changes=applyModdedRandomizerEquipment(l,{position:'WR',branding:'nike'},mulberry32(123),1,undefined,{usingVanillaPool:true,usingUnlockedMod:false,modPools:pools});assert.equal(changes.vanilla[0]?.newItem,n);assert.equal(changes.unlocked?.length??0,0);}
});
