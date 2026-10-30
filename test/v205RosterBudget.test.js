import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import TALENT from '../src/shared/rosterTalent.cjs';
import {normalizeGenerationSettings,positionTalentTargets,toneWeights,TONE_PRESETS} from '../src/main/tools/rosterGenerator/settings.js';
import {makeRosterEquipmentGenerator,ROSTER_EQUIPMENT_OPTIONS} from '../src/main/tools/rosterGenerator/equipment.js';
import {patchFreshmanEquipment} from '../src/main/tools/equipment/core/patcher.js';

test('importance follows every requested rank, and linked whole-number shares always total 100%',()=>{
  const groups=['QB','EDGE','OL','CB','WR','DT','LB','HB','SS','FS','TE','K/P','FB'];for(let i=1;i<groups.length;i++)assert.ok(TALENT.importance[groups[i-1]]>TALENT.importance[groups[i]]);assert.ok(TALENT.importance.QB/TALENT.importance.FB>10);
  const counts=Object.fromEntries(groups.map(group=>[group,4])),base=TALENT.baseline(counts);assert.equal(Object.values(base).reduce((a,b)=>a+b,0),100);assert.ok(base.QB>base.FB);
  for(const group of groups)for(const value of [0,1,25,99,100]){const shares=TALENT.redistribute(base,group,value,counts);assert.equal(shares[group],value);assert.equal(Object.values(shares).reduce((a,b)=>a+b,0),100);assert.ok(Object.values(shares).every(v=>Number.isInteger(v)&&v>=0&&v<=100));if(value>base[group])assert.ok(groups.some(other=>other!==group&&shares[other]<base[other]));}
  const only=TALENT.redistribute(TALENT.baseline({QB:3}),'QB',2,{QB:3});assert.equal(only.QB,100);
});
test('important players cost more per rating gain while every mix keeps the arithmetic roster target',()=>{
  const counts={QB:4,FB:4,CB:4},base=TALENT.baseline(counts),qb=TALENT.targets(counts,70,TALENT.redistribute(base,'QB',base.QB+1,counts)),fb=TALENT.targets(counts,70,TALENT.redistribute(base,'FB',base.FB+1,counts));assert.ok(qb.QB>70);assert.ok(fb.FB-70>qb.QB-70);
  for(const shares of [base,TALENT.redistribute(base,'QB',100,counts),TALENT.redistribute(base,'FB',100,counts)]){const result=TALENT.targets(counts,70,shares);assert.ok(Math.abs(Object.entries(counts).reduce((n,[group,c])=>n+c*result[group],0)/12-70)<1e-8);assert.ok(Object.values(result).every(v=>v>=30&&v<=99));}
  const input=Object.entries(counts).flatMap(([position,n])=>Array.from({length:n},()=>({position}))),settings=normalizeGenerationSettings({talentShares:base});assert.ok(Math.abs(positionTalentTargets(input,{targetAverage:70},settings).QB-70)<1e-8);
  for(const talentShares of [{QB:99},{QB:100.1},{QB:100,Unknown:0},{QB:'100'}])assert.throws(()=>normalizeGenerationSettings({talentShares}),/whole percentages/);
});
test('HBCU has the approved tone 7 share and development preference descriptions stay nontechnical',()=>{
  const weights=toneWeights('hbcu','QB',[]);assert.equal(weights[7]/Object.values(weights).reduce((a,b)=>a+b,0),.60);
  for(const option of TONE_PRESETS)assert.ok(!/observed|sample|[1-8][–-][1-8]|pool|pairing/i.test(option.description));
  const page=fs.readFileSync(new URL('../src/renderer/roster-generator.js',import.meta.url),'utf8'),nil=fs.readFileSync(new URL('../src/renderer/operations.js',import.meta.url),'utf8');assert.ok(!page.includes('A fresh roster for your team.'));assert.ok(!page.includes('First names come from a small pool'));assert.ok(!nil.includes('Only the NIL flag changes. This flag controls'));assert.ok(page.includes('RosterTalent.editShare'));
});

function fixture(){
  const ref=(table,row)=>(table*0x20000+row).toString(2).padStart(32,'0'),root=()=>JSON.stringify({keep:'appearance',loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'HeadWear',itemAssetName:'GearHelmet_Speed_Flex'},{slotType:'FaceMask',itemAssetName:'GearFaceMask_Speedflex2BarQB'},{slotType:'LeftShoe',itemAssetName:'GearFootwear_shoe_low_NikeVaporEdge'},{slotType:'RightShoe',itemAssetName:'GearFootwear_shoe_low_NikeVaporEdge'},{slotType:'InnerShirt',itemAssetName:'Gear_Undershirt_None'}]}]});
  const players=Array.from({length:25},(_,row)=>({isEmpty:false,FirstName:'Donor',LastName:String(row),TeamIndex:0,Position:'QB',SchoolYear:'Senior',RedshirtStatus:'Previous',OverallRating:99-row,CharacterBodyType:'Standard',CharacterVisuals:ref(2,row),IsNIL:true,JerseyNum:row}));
  const visuals=players.map(()=>({isEmpty:false,RawData:root()})),roster={isEmpty:false,arraySize:players.length,...Object.fromEntries(players.map((_,i)=>['Player'+i,ref(1,i)]))};
  const loaded={players:{header:{tableId:1},records:players},visuals:{header:{tableId:2},records:visuals},teams:{records:[{isEmpty:false,DisplayName:'Test Team',TeamIndex:0,TeamApparel:'Nike',Roster:ref(3,0)}]},rosters:{header:{tableId:3},records:[roster]}};
  const generated=[{row:100,position:'QB',fields:{FirstName:'New',LastName:'Name',TeamIndex:0,IsNIL:false,CharacterBodyType:'Standard',OverallRating:70,SchoolYear:'Freshman'},rawData:root()}];return {loaded,generated,ref};
}
test('roster equipment is the actual Randomizer with top-20 active donors, no mod pools, exact audit and no donor mutations',()=>{
  const {loaded,generated,ref}=fixture(),team={name:'Test Team',teamIndex:0,branding:'nike'},before=JSON.stringify(loaded),generate=makeRosterEquipmentGenerator(loaded),result=generate(generated,205,team),same=generate(generated,205,team);
  assert.deepEqual(result,same);assert.equal(JSON.stringify(loaded),before);const item=result.byRow.get(100);assert.ok(item.audit.donorUses.every(use=>use.donor.row<20));assert.equal(item.audit.usingUnlockedMod,false);assert.equal(item.audit.usingRawAccessoriesMod,false);assert.equal(JSON.parse(item.rawData).keep,'appearance');
  const receivers=generated.map((p,i)=>({...p.fields,Position:p.position,TeamIndex:0,CharacterVisuals:ref(1,i)})),visuals=generated.map(p=>({isEmpty:false,RawData:p.rawData})),direct=patchFreshmanEquipment(receivers,visuals,1,{...ROSTER_EQUIPMENT_OPTIONS,teamNames:new Map([[0,'Test Team']]),teamApparel:new Map([[0,'nike']]),donorPlayerRecords:loaded.players.records,donorVisualRecords:loaded.visuals.records,donorVisualsTableId:2,donorRosterRows:new Set(loaded.players.records.map((_,i)=>i)),eligiblePlayer:()=>true,seed:(205^0x47454152)>>>0,apply:true});assert.equal(direct.changes[0].newRawData,item.rawData);
  loaded.players.records.forEach(p=>p.SchoolYear='Freshman');assert.throws(()=>makeRosterEquipmentGenerator(loaded)(generated,205,team),/could not be generated/);
});
