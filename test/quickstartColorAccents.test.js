import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {defaultTeamAccessoryWeights,defaultTeamTapeWeights,teamAccessoryWeights,ACCESSORY_RECOLOR_CONTEXT} from '../src/main/tools/equipment/core/recolor.js';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
import {recolorQuickstartAccent,applyQuickstartColorAccents} from '../src/main/tools/equipmentQuickstart/colorAccents.js';
import {equipmentColorVariant,RAW_314} from '../src/main/tools/equipment/catalog.js';

const whiteMix={white:95,black:5,primary:0,secondary:0},blackMix={white:0,black:100,primary:0,secondary:0},schools=['Alabama','Nebraska','Penn State','USC'];
const element=(slotType,itemAssetName)=>({slotType,itemAssetName,keep:'metadata'}),glove='GearHand_glove_AdidasAdizero11_white',sleeve='GearArmSleeve_Half_sleeveLongUnderarmor_normal_White',shirt='Gear_Undershirt_CompressionTCrewSleeveless_White';
const outfit=()=>[{loadoutType:'PlayerOnField',loadoutElements:[element('LeftHandWear',glove),element('RightHandWear',glove),element('LeftArmWear',sleeve),element('RightArmWear',sleeve),element('InnerShirt',shirt),element('LeftWristWear','GearWrist_wristTapedLite_TeamColor'),element('RightWristWear','GearWrist_wristTapedLite_TeamColor'),element('LeftSpat','GearSpats_spatThin_TeamColor'),element('RightSpat','GearSpats_spatThin_TeamColor'),element('MouthWear','GearMouthpiece_PacifierDualHanging_Black')]},{loadoutType:'Base',loadoutElements:[element('LeftHandWear',glove),element('LeftArmTattoo','KeepTattoo')]}];
const ref=(row,table=10)=>table.toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
const player=row=>({isEmpty:false,FirstName:'Example',LastName:String(row),TeamIndex:1,Position:'WR',SchoolYear:'Junior',CharacterVisuals:ref(row)});
const visual=()=>({isEmpty:false,RawData:JSON.stringify({keep:true,loadouts:outfit()})});
const pick=(loadouts,slot)=>loadouts[0].loadoutElements.find(item=>item.slotType===slot)?.itemAssetName;
const sequence=(...numbers)=>()=>numbers.shift()??0;

test('four accessory defaults change in both tools without replacing tape distributions or explicit accessory choices',()=>{
  for(const settings of [normalizeEquipmentOptions({unlockedRecolorFix:true},false),quickstartSettings({unlocked:true}).patcher])for(const team of schools){
    assert.deepEqual(teamAccessoryWeights(team,settings.teamAccessoryColors),whiteMix);assert.deepEqual(defaultTeamTapeWeights(team),blackMix);
    assert.deepEqual(teamAccessoryWeights(team,{[team.toLowerCase()]:blackMix}),blackMix,'Explicit settings take precedence over defaults');
  }
  for(const team of ['Alabama Crimson Tide','Bama','Penn St.','Penn State Nittany Lions','Southern California','USC Trojans','Nebraska Cornhuskers'])assert.deepEqual(defaultTeamAccessoryWeights(team),whiteMix,team);
  for(const team of ['Georgia','Army','Missouri','Michigan','Florida','Florida State','Miami'])assert.deepEqual(defaultTeamAccessoryWeights(team),defaultTeamTapeWeights(team),team);
});

test('Patcher editor uses independent accessory and tape defaults',()=>{
  const source=fs.readFileSync(new URL('../src/renderer/team-color-settings.js',import.meta.url),'utf8'),render=vm.runInNewContext(source+';teamColorDistributionMarkup',{escapeHtml:value=>value,forceLogoUrl:()=>''});
  const prepared={teams:schools.map(name=>({name})),tapeColorDefaults:Object.fromEntries(schools.map(name=>[name.toLowerCase(),defaultTeamTapeWeights(name)])),accessoryColorDefaults:Object.fromEntries(schools.map(name=>[name.toLowerCase(),defaultTeamAccessoryWeights(name)]))};
  for(const [kind,expected] of [['accessory',whiteMix],['tape',blackMix]]){
    const markup=render(prepared,kind);for(const color of ['white','black','primary','secondary']){
      const attribute=kind==='tape'?'data-tape-color':'data-accessory-team-color';
      assert.equal([...markup.matchAll(new RegExp(attribute+'="'+color+'"[^>]*value="'+expected[color]+'"','g'))].length,4);
    }
  }
});

test('Quickstart alone uses white wrist tape and black spats; Patcher matching and independent distributions remain usable',()=>{
  for(const team of schools){
    const records=Array.from({length:85},(_,row)=>player(row)),visuals=records.map(()=>{const value=visual(),raw=JSON.parse(value.RawData);for(const item of raw.loadouts[0].loadoutElements)if(['LeftArmWear','RightArmWear'].includes(item.slotType))item.itemAssetName='ArmSleeve_None';value.RawData=JSON.stringify(raw);return value;});
    const result=applyGlobalEquipmentFixes(records,visuals,10,{...quickstartSettings({unlocked:true,protectOriginalEaPlayers:false}).patcher,quickstartTapeDefaults:true,teamNames:new Map([[1,team]]),seed:701});
    assert.ok(result.unlockedRecolorChanges.some(row=>row.colorTheme==='white'));assert.ok(result.unlockedRecolorChanges.some(row=>row.colorTheme==='black'));
    for(const raw of visuals){const loadouts=JSON.parse(raw.RawData).loadouts;
      for(const side of ['Left','Right']){assert.equal(pick(loadouts,side+'WristWear'),'GearWrist_wristTapedLite_White');assert.equal(pick(loadouts,side+'Spat'),'GearSpats_spatThin_Black');}
    }
    const custom=[visual()];applyGlobalEquipmentFixes([player(0)],custom,10,{unlockedRecolorFix:true,unlockedColorTheme:'team',tapeColorMode:'distribution',teamNames:new Map([[1,team]]),teamTapeColors:{[team.toLowerCase()]:{white:100,black:0,primary:0,secondary:0}},seed:701});
    assert.equal(pick(JSON.parse(custom[0].RawData).loadouts,'LeftSpat'),'GearSpats_spatThin_White');
    for(const color of ['white','black','primary','secondary']){
      const patcher=[visual()],options=normalizeEquipmentOptions({unlockedRecolorFix:true,unlockedColorTheme:color,tapeColorMode:'accessory',quickstartTapeDefaults:true},false);
      applyGlobalEquipmentFixes([player(0)],patcher,10,{...options,teamNames:new Map([[1,team]])});
      const loadouts=JSON.parse(patcher[0].RawData).loadouts,token={white:'White',black:'Black',primary:'TeamColor',secondary:'SecondaryColor'}[color];
      for(const side of ['Left','Right']){assert.equal(pick(loadouts,side+'WristWear'),'GearWrist_wristTapedLite_'+token);assert.equal(pick(loadouts,side+'Spat'),'GearSpats_spatThin_'+token);}
    }
  }
});

test('one category changes, paired gloves/sleeves and duplicate outfits match, other gear and Base metadata stay intact',()=>{
  for(const [name,index,slots] of [['gloves',0,['LeftHandWear','RightHandWear']],['sleeves',1,['LeftArmWear','RightArmWear']],['undershirt',2,['InnerShirt']]])for(const [color,roll] of [['primary',0],['secondary',.99]]){
    const loadouts=outfit();loadouts.push(structuredClone(loadouts[0]));const before=structuredClone(loadouts);
    const accent=recolorQuickstartAccent(loadouts,sequence((index+.1)/3,roll));assert.equal(accent.group,name);assert.equal(accent.color,color);
    for(let i=0;i<loadouts.length;i++)for(let j=0;j<loadouts[i].loadoutElements.length;j++){
      const current=loadouts[i].loadoutElements[j],old=before[i].loadoutElements[j];
      if(loadouts[i].loadoutType!=='PlayerOnField'||!slots.includes(current.slotType))assert.deepEqual(current,old);
      else {assert.equal(current.itemAssetName,equipmentColorVariant(old.itemAssetName,color,ACCESSORY_RECOLOR_CONTEXT));assert.equal(current.keep,old.keep);}
    }
    assert.equal(loadouts[0].loadoutElements.length,before[0].loadoutElements.length);
  }
});

test('single-sided gear remains single-sided; RAW and GDG styles recolor without adding items',()=>{
  for(const [slot,asset,target] of [['RightHandWear',glove,'GearHand_glove_AdidasAdizero11_secondaryColor'],['LeftArmWear',RAW_314.jamoColors.white,RAW_314.jamoColors.secondary],['InnerShirt','gear_undershirt_irishjamo_whi','gear_undershirt_irishjamo_sec']]){
    const loadouts=[{loadoutType:'PlayerOnField',loadoutElements:[element(slot,asset)]}];
    const result=recolorQuickstartAccent(loadouts,sequence(0,.99));assert.equal(result.color,'secondary');assert.equal(loadouts[0].loadoutElements.length,1);assert.equal(pick(loadouts,slot),target);
  }
  for(const [worn,empty,asset,none] of [['LeftHandWear','RightHandWear',glove,'GearHand_None'],['RightArmWear','LeftArmWear',sleeve,'ArmSleeve_None']]){
    const loadouts=[{loadoutType:'PlayerOnField',loadoutElements:[element(worn,asset),element(empty,none)]}];
    assert.ok(recolorQuickstartAccent(loadouts,sequence(0,.99)));assert.equal(pick(loadouts,empty),none,'Explicit None remains empty');assert.notEqual(pick(loadouts,worn),asset,'A single worn item is eligible');
  }
});

test('absent, tape-only, unknown and unavailable colors are never replaced with invented gear',()=>{
  for(const loadouts of [[],outfit().slice(1),[{loadoutType:'PlayerOnField',loadoutElements:[element('LeftHandWear','Gloves_None'),element('LeftArmWear','GearArmSleeve_Quarter_armTape_normal_OffWhite'),element('InnerShirt','Custom_Unverified_Shirt')]}],{bad:true}]){
    const before=structuredClone(loadouts);assert.equal(recolorQuickstartAccent(loadouts,()=>0),null);assert.deepEqual(loadouts,before);
  }
  const loadouts=[{loadoutType:'PlayerOnField',loadoutElements:[element('LeftHandWear',glove),element('RightHandWear','Custom_Unknown_Glove')]}],before=structuredClone(loadouts);
  assert.equal(recolorQuickstartAccent(loadouts,()=>0),null);assert.deepEqual(loadouts,before,'Cannot guarantee both glove colors when one is unknown');
  assert.equal(equipmentColorVariant('NeckWear_Turtleneck_Tight3','secondary',ACCESSORY_RECOLOR_CONTEXT),null,'Missing color is distinguishable from an unchanged item');
});

test('Quickstart accents have a 5% per-player gate, require Unlocked, and keep donor-only/shared/EA protections',()=>{
  const players=Array.from({length:8},(_,row)=>player(row)),visuals=players.map(visual),changes=players.map((_,row)=>({target:{row},visualsRow:row}));
  Object.assign(players[1],{Position:'K'});Object.assign(players[2],{Position:'P'});players[3].CharacterVisuals=ref(4);
  Object.assign(players[5],{PLYR_ASSETNAME:'SmithJeremiah_8726',IsNIL:true});players[6].CharacterVisuals=ref(6,11);
  const options={unlocked:true,players,visuals,changes,visualsTableId:10,seed:701},before=structuredClone(visuals);
  assert.deepEqual(applyQuickstartColorAccents({...options,unlocked:false,random:()=>{throw Error('Disabled accent must not roll');}}),[]);assert.deepEqual(visuals,before);
  assert.deepEqual(applyQuickstartColorAccents({...options,random:()=>.05}),[]);assert.deepEqual(visuals,before,'The 5% boundary does not pass');
  const selected=applyQuickstartColorAccents({...options,random:()=>0});assert.deepEqual(selected.map(row=>row.row),[0,7]);
  for(const row of [1,2,3,4,5,6])assert.deepEqual(visuals[row],before[row]);
  assert.ok(applyQuickstartColorAccents({...options,changes:[changes[5]],protectOriginalEaPlayers:false,random:sequence(.04999,0,.99)}).some(row=>row.row===5));
});

test('large eligible cohorts get independently seeded accents near 5%, spread across all three categories',()=>{
  const players=Array.from({length:10000},(_,row)=>player(row)),a=players.map(visual),b=structuredClone(a),changes=players.map((_,row)=>({target:{row},visualsRow:row})),options={unlocked:true,players,changes,visualsTableId:10,seed:1701};
  const first=applyQuickstartColorAccents({...options,visuals:a}),second=applyQuickstartColorAccents({...options,visuals:b});assert.deepEqual(first,second);assert.deepEqual(a,b);
  assert.ok(first.length>=430&&first.length<=570,'Expected approximately 5% of players, got '+first.length);assert.equal(new Set(first.map(row=>row.row)).size,first.length);assert.equal(new Set(first.map(row=>row.group)).size,3);assert.equal(new Set(first.map(row=>row.color)).size,2);
});
