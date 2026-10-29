import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAppearancePreview} from '../src/main/tools/rosterGenerator/core.js';
import {UNLOCKED_TATTOO_POOL} from '../src/main/tools/equipment/core/tattoos.js';

const appearance={loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[]}]};
const makeRaw=base=>({keep:{custom:123},loadouts:[base,{loadoutCategory:'Base'},...structuredClone(appearance.loadouts)]});

test('roster regeneration safely resets every catalogued Unlocked tattoo in its body slot',()=>{
  for(const item of UNLOCKED_TATTOO_POOL)for(const side of ['Left','Right']){
    const slotType=side+(item.type==='arm'?'ArmTattoo':'LegTattoo');
    const raw=makeRaw({loadoutCategory:'Base',loadoutElements:[{slotType,itemAssetName:item.value}]}),before=structuredClone(raw);
    const result=buildAppearancePreview(raw,appearance,'nike'),parsed=JSON.parse(result.raw);
    assert.deepEqual(result.unknownLayers,[],item.value+'/'+slotType);
    assert.deepEqual(parsed.loadouts[0],{loadoutCategory:'Base',loadoutElements:[{slotType,itemAssetName:item.type==='arm'?'ArmTattoo_None':'LegTattoo_None'}]});
    assert.deepEqual(parsed.loadouts.slice(1),raw.loadouts.slice(1));
    assert.deepEqual(parsed.keep,raw.keep);assert.deepEqual(raw,before);
  }
});

test('roster tattoo recognition retains blockers for unknown assets, slots and layer metadata',()=>{
  const element={slotType:'LeftArmTattoo',itemAssetName:'CujoMatty_ArmTats_35'};
  for(const layer of [
    {loadoutCategory:'Base',loadoutElements:[{...element,itemAssetName:'CujoMatty_ArmTats_999'}]},
    {loadoutCategory:'Base',loadoutElements:[{...element,slotType:'LeftLegTattoo'}]},
    {loadoutCategory:'Base',loadoutElements:[{...element,slotType:'Head'}]},
    {loadoutCategory:'Base',loadoutElements:[{...element,unknownOverride:1}]},
    {loadoutCategory:'Base',loadoutElements:[element],unknownOverride:1},
    {loadoutType:'Head',loadoutElements:[element]},
    {loadoutCategory:'Base',loadoutElements:[element,{slotType:'Head',itemAssetName:'UnknownHead'}]}
  ]){
    const raw=makeRaw(layer),result=buildAppearancePreview(raw,appearance,'nike');
    assert.equal(result.unknownLayers.length,1);
    assert.deepEqual(JSON.parse(result.raw).loadouts[0],layer);
  }
});
