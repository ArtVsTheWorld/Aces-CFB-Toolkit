import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyQuickstartQbGloves,capQuickstartQbGloves} from '../src/main/tools/equipmentQuickstart/qbGloves.js';
import {applyQuickstartColorAccents} from '../src/main/tools/equipmentQuickstart/colorAccents.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import {applyModdedRandomizerEquipment,mulberry32} from '../src/main/tools/equipment/core/patcher.js';
import {createGeneratedEquipmentState} from '../src/main/tools/equipment/core/generatedCompatibility.js';
import {normalizeModPools} from '../src/main/tools/equipment/core/modPools.js';
const ref=(row,table=10)=>table.toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
const asset='GearHand_glove_AdidasAdizero11_white',element=(slotType,itemAssetName)=>({slotType,itemAssetName,keep:'metadata'});
const player=(row,hand='Right')=>({isEmpty:false,Position:'QB',PLYR_HANDEDNESS:hand,CharacterVisuals:ref(row)});
const outfit=(left=asset,right=asset)=>({loadoutType:'PlayerOnField',loadoutElements:[element('LeftHandWear',left),element('RightHandWear',right),element('LeftArmWear','GearArmSleeve_Baggy_White')]});
const visual=(left=asset,right=asset)=>({isEmpty:false,RawData:JSON.stringify({keep:true,loadouts:[outfit(left,right),outfit(left,right),{loadoutType:'Base',loadoutElements:[element('LeftHandWear',asset),element('RightHandWear',asset)]}]})});
const setup=(hand='Right')=>({changes:[{target:{row:0},visualsRow:0}],players:[player(0,hand)],visuals:[visual()],visualsTableId:10});
test('Quickstart QBs never roll additional gloves, while other mod gear, positions and Randomizer selections remain available',()=>{
  const mods={unlocked:true,raw:true,gameday:true},settings=quickstartSettings(mods),pools=normalizeModPools();
  for(const categories of Object.values(pools))for(const entry of Object.values(categories))entry.chance=100;
  const blank=()=>[outfit('GearHand_None','GearHand_None')];
  for(let seed=1;seed<=50;seed++){
    const loadouts=blank(),changes=applyModdedRandomizerEquipment(loadouts,{position:'QB',branding:'adidas'},mulberry32(seed),1,createGeneratedEquipmentState(loadouts),{...settings.randomizer,modPools:pools});
    assert.ok(!changes.unlocked.some(change=>change.category==='Gloves'));
    for(const item of loadouts[0].loadoutElements.filter(item=>['LeftHandWear','RightHandWear'].includes(item.slotType)))assert.equal(item.itemAssetName,'GearHand_None');
    assert.ok(Object.values(changes).some(items=>items.some(change=>!change.slots.some(slot=>['LeftHandWear','RightHandWear'].includes(slot)))),'Other mod categories remain eligible');
  }
  for(const [position,options] of [['WR',settings.randomizer],['QB',{...settings.randomizer,donorOnlyGlovesPositions:undefined}]]){
    const loadouts=blank(),changes=applyModdedRandomizerEquipment(loadouts,{position,branding:'adidas'},mulberry32(701),1,createGeneratedEquipmentState(loadouts),{...options,modPools:pools});
    assert.ok(changes.unlocked.some(change=>change.category==='Gloves'),'Nonexcluded mod glove rolls still work');
  }
  const worn=[outfit(asset,'GearHand_None')];applyModdedRandomizerEquipment(worn,{position:'QB',branding:'adidas'},mulberry32(701),1,createGeneratedEquipmentState(worn),{...settings.randomizer,modPools:pools});
  assert.equal(worn[0].loadoutElements[0].itemAssetName,asset,'A donor glove is retained');assert.equal(worn[0].loadoutElements[1].itemAssetName,'GearHand_None');
});
test('Quickstart leaves at most one glove on left- and right-handed QBs after every mod combination and color accents',()=>{
  for(let flags=0;flags<8;flags++)for(const hand of ['Right','Left']){
    const settings=quickstartSettings({unlocked:!!(flags&1),raw:!!(flags&2),gameday:!!(flags&4)}),options=setup(hand),old=JSON.parse(options.visuals[0].RawData);
    const generated=JSON.parse(options.visuals[0].RawData);
    applyModdedRandomizerEquipment(generated.loadouts.filter(loadout=>loadout.loadoutType==='PlayerOnField'),{position:'QB',branding:'adidas'},mulberry32(701),1,createGeneratedEquipmentState(generated.loadouts),settings.randomizer);
    options.visuals[0].RawData=JSON.stringify(generated);
    const beforeCorrection=JSON.parse(options.visuals[0].RawData);
    applyQuickstartColorAccents({...options,unlocked:settings.mods.unlocked,seed:1,random:()=>0});
    assert.equal(applyQuickstartQbGloves(options).length,1);
    const after=JSON.parse(options.visuals[0].RawData),removed=hand+'HandWear';
    for(const loadout of after.loadouts.filter(loadout=>loadout.loadoutType==='PlayerOnField')){
      const hands=loadout.loadoutElements.filter(element=>['LeftHandWear','RightHandWear'].includes(element.slotType));
      assert.equal(hands.filter(element=>element.itemAssetName!=='GearHand_None').length,1);
      assert.equal(hands.find(element=>element.slotType===removed).itemAssetName,'GearHand_None');assert.ok(hands.every(element=>element.keep==='metadata'));
      assert.deepEqual(loadout.loadoutElements.filter(element=>!['LeftHandWear','RightHandWear'].includes(element.slotType)),beforeCorrection.loadouts[0].loadoutElements.filter(element=>!['LeftHandWear','RightHandWear'].includes(element.slotType)));
    }
    assert.deepEqual(after.loadouts[2],old.loadouts[2]);assert.equal(after.keep,true);
    const once=options.visuals[0].RawData;assert.deepEqual(applyQuickstartQbGloves(options),[]);assert.equal(options.visuals[0].RawData,once);
  }
});
test('single gloves, bare hands, hand tape and unrelated or unprocessed players remain unchanged',()=>{
  for(const [left,right] of [[asset,'GearHand_None'],['GearHand_None',asset],['GearHand_None','GearHand_None'],[asset,'GearHand_taped_White'],['Unknown_Hand_Accessory',asset]]){
    const options=setup();options.visuals=[visual(left,right)];const before=options.visuals[0].RawData;assert.deepEqual(applyQuickstartQbGloves(options),[]);assert.equal(options.visuals[0].RawData,before);
  }
  for(const position of ['WR','HB','K','P']){const options=setup();options.players[0].Position=position;const before=options.visuals[0].RawData;assert.deepEqual(applyQuickstartQbGloves(options),[]);assert.equal(options.visuals[0].RawData,before);}
  const options=setup();options.changes=[];const before=options.visuals[0].RawData;assert.deepEqual(applyQuickstartQbGloves(options),[]);assert.equal(options.visuals[0].RawData,before);
});
test('EA protection, shared/foreign/mismatched references and unreadable visuals retain their safeguards',()=>{
  for(const kind of ['protected','shared','foreign','mismatch','empty','unreadable']){
    const options=setup();
    if(kind==='protected')Object.assign(options.players[0],{PLYR_ASSETNAME:'SmithJeremiah_8726',IsNIL:true});
    if(kind==='shared')options.players.push(player(0));if(kind==='foreign')options.players[0].CharacterVisuals=ref(0,11);
    if(kind==='mismatch')options.changes[0].visualsRow=1;if(kind==='empty')options.visuals[0].isEmpty=true;if(kind==='unreadable')options.visuals[0].RawData='invalid';
    const before=structuredClone(options.visuals);assert.deepEqual(applyQuickstartQbGloves(options),[]);assert.deepEqual(options.visuals,before);
    if(kind==='protected')assert.equal(applyQuickstartQbGloves({...options,protectOriginalEaPlayers:false}).length,1);
  }
});
test('QB glove cleanup is the final Quickstart equipment step before exact assignments and reporting',()=>{
  const source=fs.readFileSync(new URL('../src/main/tools/equipmentQuickstart/runner.js',import.meta.url),'utf8');
  assert.ok(source.indexOf('  applyQuickstartQbGloves(')>source.indexOf('  applyQuickstartColorAccents('));
  assert.ok(source.indexOf('  applyQuickstartQbGloves(')<source.indexOf('  const assignments='));
  assert.ok(source.indexOf('  const qbGlovePopulation=capQuickstartQbGloves(')>source.indexOf('  applyQuickstartQbGloves('));
  assert.ok(source.indexOf('  const qbGlovePopulation=capQuickstartQbGloves(')<source.indexOf('  const assignments='));
});

const cohort=(count=565)=>({players:Array.from({length:count},(_,row)=>player(row,row%2?'Left':'Right')),visuals:Array.from({length:count},()=>visual(asset,'GearHand_None')),changes:Array.from({length:count},(_,row)=>({target:{row},visualsRow:row})),visualsTableId:10,seed:701,activePlayerRows:new Set(Array.from({length:count},(_,row)=>row))});
const wearing=options=>options.players.flatMap((_,row)=>JSON.parse(options.visuals[row].RawData).loadouts.filter(loadout=>loadout.loadoutType==='PlayerOnField').some(loadout=>loadout.loadoutElements.some(item=>['LeftHandWear','RightHandWear'].includes(item.slotType)&&item.itemAssetName===asset))?[row]:[]);
test('Quickstart enforces a seeded dynasty-wide 1% maximum, never adds gloves, and leaves unrelated data intact',()=>{
  const options=cohort(),old=structuredClone(options.visuals),same=structuredClone(options),different=structuredClone(options);
  const audit=capQuickstartQbGloves(options);assert.equal(audit.population,565);assert.equal(audit.limit,5);assert.equal(audit.retained,5);assert.equal(audit.removed,560);assert.equal(wearing(options).length,5);
  for(let row=0;row<options.players.length;row++){
    const actual=JSON.parse(options.visuals[row].RawData),before=JSON.parse(old[row].RawData);assert.deepEqual(actual.loadouts[2],before.loadouts[2]);assert.equal(actual.keep,true);
    for(const loadout of actual.loadouts.filter(loadout=>loadout.loadoutType==='PlayerOnField')){assert.deepEqual(loadout.loadoutElements[2],before.loadouts[0].loadoutElements[2]);assert.equal(loadout.loadoutElements[1].itemAssetName,'GearHand_None');}
  }
  capQuickstartQbGloves(same);assert.deepEqual(same.visuals,options.visuals);capQuickstartQbGloves({...different,seed:702});assert.notDeepEqual(wearing(different),wearing(options));
  const once=structuredClone(options.visuals);assert.equal(capQuickstartQbGloves(options).removed,0);assert.deepEqual(options.visuals,once);
  const bare=cohort(100);bare.visuals=bare.visuals.map(()=>visual('GearHand_None','GearHand_None'));assert.equal(capQuickstartQbGloves(bare).retained,0);assert.equal(wearing(bare).length,0);
  const small=cohort(99);assert.equal(capQuickstartQbGloves(small).limit,0);assert.equal(wearing(small).length,0,'A strict cap must not round a small population up past 1%');
});
test('protected and remembered QB gloves consume the allowance without bypassing protection or changing other positions',()=>{
  const options=cohort(200);options.changes=options.changes.slice(1);options.players[0].PLYR_ASSETNAME='SmithJeremiah_8726';options.players[0].IsNIL=true;
  const protectedRaw=options.visuals[0].RawData,audit=capQuickstartQbGloves(options);assert.equal(audit.existingGloved,1);assert.equal(audit.retained,1);assert.equal(wearing(options).length,2);assert.equal(options.visuals[0].RawData,protectedRaw);
  const ea=cohort(200);Object.assign(ea.players[0],{PLYR_ASSETNAME:'SmithJeremiah_8726',IsNIL:true});const eaRaw=ea.visuals[0].RawData,protectedAudit=capQuickstartQbGloves(ea);assert.equal(protectedAudit.existingGloved,1);assert.equal(protectedAudit.retained,1);assert.equal(ea.visuals[0].RawData,eaRaw);
  const shared=cohort(200);shared.players[1].CharacterVisuals=ref(0);const sharedRaw=shared.visuals[0].RawData,sharedAudit=capQuickstartQbGloves(shared);assert.equal(sharedAudit.existingGloved,2);assert.equal(sharedAudit.retained,0);assert.equal(shared.visuals[0].RawData,sharedRaw);
  const over=cohort(200);over.changes=over.changes.slice(3);const previous=over.visuals.slice(0,3).map(record=>record.RawData),limited=capQuickstartQbGloves(over);assert.equal(limited.existingGloved,3);assert.equal(limited.retained,0);assert.equal(wearing(over).length,3);assert.deepEqual(over.visuals.slice(0,3).map(record=>record.RawData),previous);
  const scope=cohort(200);scope.activePlayerRows=new Set(Array.from({length:100},(_,row)=>row));scope.players[100].Position='WR';const outside=scope.visuals.slice(100).map(record=>record.RawData),scoped=capQuickstartQbGloves(scope);assert.equal(scoped.population,100);assert.equal(scoped.limit,1);assert.deepEqual(scope.visuals.slice(100).map(record=>record.RawData),outside);
});
