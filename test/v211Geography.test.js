import test from 'node:test';
import assert from 'node:assert/strict';
import {planRosterHomes,readTeamGeography,normalizedHomeState} from '../src/main/tools/rosterGenerator/geography.js';

const homes=[{town:'Atlanta',state:'Georgia',pipeline:'MetroAtlanta'},{town:'Valdosta',state:'Georgia',pipeline:'SouthGeorgia'},{town:'Miami',state:'Florida',pipeline:'SouthFlorida'},{town:'Birmingham',state:'Alabama',pipeline:'Alabama'},{town:'Los Angeles',state:'California',pipeline:'SouthernCalifornia'},{town:'Seattle',state:'Washington',pipeline:'PacificNorthwest'}];
const catalog={profiles:homes.flatMap(home=>Array.from({length:3},()=>({home:{...home}})))};
const targets=Array.from({length:100},(_,row)=>({row}));
const geography={version:1,schoolState:'Georgia',localState:'Georgia',locationSource:'school-city',rosterStates:{Texas:85},pipelines:[{pipeline:'MetroAtlanta',weight:1000},{pipeline:'SouthFlorida',weight:200}],warnings:[]};
const ref=(table,row)=>(table.toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0'));
const table=(name,id,records,fields=[])=>({name,header:{tableId:id},records,offsetTable:fields.map(name=>({name})),readRecords:async()=>{}});
function saveFixture(city=true){
  const rosters=table('Player[]',1,[{arraySize:3,Player0:ref(2,0),Player1:ref(2,1),Player2:ref(2,2)}]);
  const players=table('Player',2,[{TeamIndex:7,PLYR_HOME_STATE:'Georgia'},{TeamIndex:7,PLYR_HOME_STATE:'Georgia'},{TeamIndex:7,PLYR_HOME_STATE:'Texas'}]);
  const cities=table('City',3,[{State:'GA',CITY_STATE:'Georgia'}]),list=table('SchoolPipelineInfluence[]',4,[{SchoolPipelineInfluence0:ref(5,0),SchoolPipelineInfluence1:ref(5,1),SchoolPipelineInfluence2:'0'.repeat(32)}],['SchoolPipelineInfluence0','SchoolPipelineInfluence1','SchoolPipelineInfluence2']);
  const influences=table('SchoolPipelineInfluence',5,[{Pipeline:'MetroAtlanta',InfluenceValue:1000},{Pipeline:'SouthFlorida',InfluenceValue:100}]);
  const loaded={rosters,players,franchise:{tables:[rosters,players,cities,list,influences],getReferenceFromAssetId:()=>null}};
  return {loaded,team:{teamIndex:7,name:'A Custom School With No Geographic Name',record:{City:city?ref(3,0):'1'+'0'.repeat(31),Roster:ref(1,0),SchoolPipelineInfluenceList:ref(4,0)}}};
}
test('school City and saved pipeline references take priority over names and roster origin',async()=>{
  const {loaded,team}=saveFixture();const result=await readTeamGeography(loaded,team,catalog);
  assert.equal(result.schoolState,'Georgia');assert.equal(result.localState,'Georgia');assert.equal(result.locationSource,'school-city');
  assert.deepEqual(result.pipelines,[{pipeline:'MetroAtlanta',weight:1000},{pipeline:'SouthFlorida',weight:100}]);
  assert.deepEqual(result.rosterStates,{Georgia:2,Texas:1});assert.equal(normalizedHomeState('North Carolina'),'NorthCarolina');
  team.name='Alaska';assert.deepEqual(await readTeamGeography(loaded,team,catalog),result,'school name never guesses location');
});
test('external City assets use recorded roster/pipeline evidence and missing references fall back safely',async()=>{
  const {loaded,team}=saveFixture(false);const result=await readTeamGeography(loaded,team,catalog);
  assert.equal(result.schoolState,null);assert.equal(result.localState,'Georgia');assert.equal(result.locationSource,'roster-and-pipelines');assert.ok(result.warnings.length);
  team.record.SchoolPipelineInfluenceList=ref(999,4);const absent=await readTeamGeography(loaded,team,catalog);assert.equal(absent.pipelines.length,0);assert.equal(absent.localState,'Georgia');
  team.record.Roster=ref(999,1);const fallback=await readTeamGeography(loaded,team,catalog);assert.equal(fallback.locationSource,'national-fallback');
  const plan=planRosterHomes(targets,catalog,fallback,1);assert.deepEqual(plan.summary.allocations,{national:100});
});
test('hometown plans favor local, pipeline and nearby origins but keep nationwide variety',()=>{
  const result=planRosterHomes(targets,catalog,geography,211),again=planRosterHomes([...targets].reverse(),catalog,geography,211);
  assert.deepEqual(result,again);assert.deepEqual(result.summary.allocations,{local:40,pipeline:35,nearby:15,national:10});
  assert.ok(result.summary.states.Georgia>=40);assert.equal(result.byRow.size,100);
  for(const item of result.byRow.values()){
    assert.ok(homes.some(home=>JSON.stringify(home)===JSON.stringify(item.home)),'town, state and pipeline stay an observed tuple');
    if(item.source==='local')assert.equal(item.home.state,'Georgia');
    if(item.source==='nearby')assert.ok(['Florida','Alabama'].includes(item.home.state));
    if(item.source==='national')assert.ok(['California','Washington'].includes(item.home.state));
  }
  assert.notDeepEqual(result.byRow,planRosterHomes(targets,catalog,geography,212).byRow);
});
test('stronger saved pipeline influence changes hometown sampling without position or caliber bias',()=>{
  const draws=geo=>[...planRosterHomes(Array.from({length:1000},(_,row)=>({row})),catalog,geo,4).byRow.values()].filter(item=>item.source==='pipeline');
  const a=draws(geography),b=draws({...geography,pipelines:[{pipeline:'MetroAtlanta',weight:1},{pipeline:'SouthFlorida',weight:1000}]});
  assert.ok(a.filter(item=>item.home.pipeline==='MetroAtlanta').length>250);assert.ok(b.filter(item=>item.home.pipeline==='SouthFlorida').length>330);
});
test('missing regional candidates redistribute safely and legacy callers retain their observed origin behavior',()=>{
  const empty=planRosterHomes(targets,{profiles:[]},geography,2);assert.equal(empty.byRow.size,0);assert.ok(empty.summary.fallback);
  assert.equal(planRosterHomes(targets,catalog,null,2).summary,null);
  const island=planRosterHomes(targets,catalog,{...geography,localState:'Hawaii',pipelines:[]},2);assert.deepEqual(island.summary.allocations,{national:100});
});
