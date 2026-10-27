import test from 'node:test';import assert from 'node:assert/strict';
import sources from '../src/shared/donorSources.cjs';
import {patchFreshmanEquipment} from '../src/main/tools/equipment/core/patcher.js';
import {DEFAULT_CROSS_DONOR_GROUPS} from '../src/main/tools/equipment/core/donorGroups.js';
const ref=row=>(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
function run(position,overrides,extra={}){
 const donorPositions=['QB','WR','MLB','LOLB','ROLB','DT','LE','RE','CB','FS','SS','K','P','TE'];
 const players=[position,...donorPositions].map((Position,row)=>({FirstName:row?'Donor':'Target',LastName:String(row),Position,SchoolYear:row?'Senior':'Freshman',RedshirtStatus:row?'Previous':'Eligible',CharacterBodyType:'Thin',CharacterVisuals:ref(row),TeamIndex:1,OverallRating:90,isEmpty:false}));
 if(extra.targetSenior)players[0].SchoolYear='Senior';
 const visuals=players.map((p,row)=>({isEmpty:false,RawData:JSON.stringify({metadata:7,loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'HeadWear',itemAssetName:'Custom_Helmet_'+row},{slotType:'OuterShirt',itemAssetName:'Custom_Jersey_'+row},{slotType:'OuterPants',itemAssetName:'Custom_Pants_'+row}]}]})}));
 const before=visuals[0].RawData,result=patchFreshmanEquipment(players,visuals,10,{crossDonorGroups:structuredClone(DEFAULT_CROSS_DONOR_GROUPS),donorSources:overrides,seed:123,top:30,eligiblePlayer:p=>p===players[0],protectOriginalEaPlayers:false,apply:true,...extra});return {result,raw:visuals[0].RawData,before};
}
test('defaults and legacy grouped presets retain the exact seeded donor results',()=>{
 for(const position of ['CB','FS','SS','MLB','LOLB','ROLB','DT','LE','K','P'])for(const chance of [0,.1,1]){
  const extra={crossMixedChance:chance,mixedChance:chance===1?0:.3,forceCrossPosition:chance===1,disableCrossPosition:chance===0};assert.deepEqual(run(position,{},extra),run(position,undefined,extra));
 }
 assert.deepEqual(sources.defaults('CB',DEFAULT_CROSS_DONOR_GROUPS,0),['CB']);assert.ok(sources.defaults('P',DEFAULT_CROSS_DONOR_GROUPS).includes('K'));
});
test('exclusive per-receiver sources work at zero cross chance without own-position fallback',()=>{
 for(const [position,group,allowed,expected]of [['CB','CB',['WR'],['WR']],['FS','FS',['WR'],['WR']],['SS','SS',['WR'],['WR']],['DT','DT',['MIKE'],['MLB']],['LE','EDGE',['MIKE'],['MLB']],['LOLB','SAM',['MIKE'],['MLB']],['ROLB','WILL',['TE'],['TE']],['P','P',['K'],['K']],['K','K',['P'],['P']],['MLB','MIKE',['MIKE'],['MLB']]]){
  const {result}=run(position,{[group]:allowed},{crossMixedChance:0,mixedChance:0,disableCrossPosition:true});assert.equal(result.changes.length,1,position);assert.ok(result.changes[0].donorUses.every(use=>expected.includes(use.donor.position)),position+JSON.stringify(result.changes[0].donorUses));
 }
});
test('empty and unavailable explicit sources skip rather than using an unchecked source',()=>{
 for(const override of [{CB:[]},{CB:['FB']}]){const {result,raw,before}=run('CB',override);assert.equal(result.changes.length,0);assert.equal(result.skipped.length,1);assert.equal(raw,before);}
 assert.throws(()=>sources.normalize({CB:['Unknown']}),/valid/);assert.throws(()=>sources.normalize({Unknown:['CB']}),/valid/);
});
test('own-position inclusion and mixing never pull from an unchecked position',()=>{
 for(let seed=1;seed<=50;seed++){const {result}=run('CB',{CB:['CB','WR']},{seed,crossMixedChance:.5,mixedChance:.3});assert.ok(result.changes[0].donorUses.every(use=>['CB','WR'].includes(use.donor.position)));}
});

test('unused own-position donors do not protect recipients under an exclusive override',()=>{const {result}=run('CB',{CB:['WR']},{targetSenior:true});assert.equal(result.changes.length,1);assert.ok(result.changes[0].donorUses.every(use=>use.donor.position==='WR'));assert.ok(!result.changes[0].fallbackNotes.some(note=>note.includes('position-family')));});
