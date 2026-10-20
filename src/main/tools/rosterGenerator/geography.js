import {sf,parseRef} from '../equipment/openSave.js';
import {mulberry32} from '../longSnap/core.js';
import {quotaCounts} from './sampling.js';

const borders={Alabama:'Florida Georgia Mississippi Tennessee',Alaska:'',Arizona:'California Colorado Nevada NewMexico Utah',Arkansas:'Louisiana Mississippi Missouri Oklahoma Tennessee Texas',California:'Arizona Nevada Oregon',Colorado:'Arizona Kansas Nebraska NewMexico Oklahoma Utah Wyoming',Connecticut:'Massachusetts NewYork RhodeIsland',Delaware:'Maryland NewJersey Pennsylvania',DistrictOfColumbia:'Maryland Virginia',Florida:'Alabama Georgia',Georgia:'Alabama Florida NorthCarolina SouthCarolina Tennessee',Hawaii:'',Idaho:'Montana Nevada Oregon Utah Washington Wyoming',Illinois:'Indiana Iowa Kentucky Missouri Wisconsin',Indiana:'Illinois Kentucky Michigan Ohio',Iowa:'Illinois Minnesota Missouri Nebraska SouthDakota Wisconsin',Kansas:'Colorado Missouri Nebraska Oklahoma',Kentucky:'Illinois Indiana Missouri Ohio Tennessee Virginia WestVirginia',Louisiana:'Arkansas Mississippi Texas',Maine:'NewHampshire',Maryland:'Delaware DistrictOfColumbia Pennsylvania Virginia WestVirginia',Massachusetts:'Connecticut NewHampshire NewYork RhodeIsland Vermont',Michigan:'Indiana Ohio Wisconsin',Minnesota:'Iowa NorthDakota SouthDakota Wisconsin',Mississippi:'Alabama Arkansas Louisiana Tennessee',Missouri:'Arkansas Illinois Iowa Kansas Kentucky Nebraska Oklahoma Tennessee',Montana:'Idaho NorthDakota SouthDakota Wyoming',Nebraska:'Colorado Iowa Kansas Missouri SouthDakota Wyoming',Nevada:'Arizona California Idaho Oregon Utah',NewHampshire:'Maine Massachusetts Vermont',NewJersey:'Delaware NewYork Pennsylvania',NewMexico:'Arizona Colorado Oklahoma Texas Utah',NewYork:'Connecticut Massachusetts NewJersey Pennsylvania Vermont',NorthCarolina:'Georgia SouthCarolina Tennessee Virginia',NorthDakota:'Minnesota Montana SouthDakota',Ohio:'Indiana Kentucky Michigan Pennsylvania WestVirginia',Oklahoma:'Arkansas Colorado Kansas Missouri NewMexico Texas',Oregon:'California Idaho Nevada Washington',Pennsylvania:'Delaware Maryland NewJersey NewYork Ohio WestVirginia',RhodeIsland:'Connecticut Massachusetts',SouthCarolina:'Georgia NorthCarolina',SouthDakota:'Iowa Minnesota Montana Nebraska NorthDakota Wyoming',Tennessee:'Alabama Arkansas Georgia Kentucky Mississippi Missouri NorthCarolina Virginia',Texas:'Arkansas Louisiana NewMexico Oklahoma',Utah:'Arizona Colorado Idaho Nevada NewMexico Wyoming',Vermont:'Massachusetts NewHampshire NewYork',Virginia:'DistrictOfColumbia Kentucky Maryland NorthCarolina Tennessee WestVirginia',Washington:'Idaho Oregon',WestVirginia:'Kentucky Maryland Ohio Pennsylvania Virginia',Wisconsin:'Illinois Iowa Michigan Minnesota',Wyoming:'Colorado Idaho Montana Nebraska SouthDakota Utah'};
const codes='AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
const states=Object.keys(borders),aliases=new Map(states.flatMap((state,index)=>[[state.toLowerCase(),state],[codes[index].toLowerCase(),state]]));
export const normalizedHomeState=value=>aliases.get(String(value??'').replace(/[^a-z]/gi,'').toLowerCase())??null;
const catalogs=new WeakMap();
function hometownIndex(catalog){
  if(catalogs.has(catalog))return catalogs.get(catalog);
  const towns=new Map(),pipelineStates=new Map();
  for(const profile of catalog.profiles){const home=profile.home;if(!home?.town?.trim()||!home.state||!home.pipeline||/^(Invalid_?|None)$/i.test(home.pipeline))continue;
    const key=JSON.stringify(home),entry=towns.get(key)??{home:{...home},count:0};entry.count++;towns.set(key,entry);
    if(!pipelineStates.has(home.pipeline))pipelineStates.set(home.pipeline,new Map());const counts=pipelineStates.get(home.pipeline),state=normalizedHomeState(home.state);if(state)counts.set(state,(counts.get(state)??0)+1);
  }
  const result={towns:[...towns.values()],pipelineStates};catalogs.set(catalog,result);return result;
}
function localStateEvidence(rosterStates,pipelines,index){
  const scores=new Map(),rosterTotal=Object.values(rosterStates).reduce((a,b)=>a+b,0),pipelineTotal=pipelines.reduce((n,item)=>n+item.weight,0);
  for(const [state,count] of Object.entries(rosterStates))scores.set(state,.65*count/(rosterTotal||1));
  for(const item of pipelines){const counts=index.pipelineStates.get(item.pipeline),total=[...(counts?.values()??[])].reduce((a,b)=>a+b,0);for(const [state,count] of counts??[])scores.set(state,(scores.get(state)??0)+.35*item.weight/(pipelineTotal||1)*count/(total||1));}
  return [...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]??null;
}

// Static game City assets are not always embedded in a dynasty. Resolve real
// local/asset-table records when present; otherwise label the roster/pipeline
// evidence fallback explicitly, never infer location from the school's name.
export async function readTeamGeography(loaded,team,catalog){
  const warnings=[],tables=loaded.franchise.tables,reads=new Map();
  const resolve=async(value,name)=>{if(typeof value!=='string'||!/^[01]{32}$/.test(value)||!value.includes('1'))return null;
    let ref;if(value[0]==='1'){const asset=loaded.franchise.getReferenceFromAssetId?.(parseInt(value,2)&0x7fffffff);if(asset)ref={tableId:asset.tableId,row:asset.rowNumber};}else ref=parseRef(value);
    const table=ref&&tables.find(table=>table.header.tableId===ref.tableId);if(!table||table.name!==name)return null;
    if(!reads.has(table))reads.set(table,table.readRecords());await reads.get(table);const record=table.records[ref.row];return record&&!record.isEmpty?{record,table}:null;};
  const city=await resolve(sf(team.record,'City'),'City');
  const schoolState=city?(normalizedHomeState(sf(city.record,'State'))??normalizedHomeState(sf(city.record,'CITY_STATE'))):null;
  const rosterStates={};const roster=await resolve(sf(team.record,'Roster'),loaded.rosters.name);
  if(roster)for(let i=0;i<Number(roster.record.arraySize);i++){const ref=parseRef(sf(roster.record,`Player${i}`)),player=ref?.tableId===loaded.players.header.tableId?loaded.players.records[ref.row]:null;if(!player||player.isEmpty||Number(sf(player,'TeamIndex'))!==team.teamIndex)continue;const state=normalizedHomeState(sf(player,'PLYR_HOME_STATE'));if(state)rosterStates[state]=(rosterStates[state]??0)+1;}
  const list=await resolve(sf(team.record,'SchoolPipelineInfluenceList'),'SchoolPipelineInfluence[]'),weights=new Map();
  if(list)for(const field of list.table.offsetTable){if(!/^SchoolPipelineInfluence\d+$/.test(field.name))continue;const item=await resolve(sf(list.record,field.name),'SchoolPipelineInfluence');if(!item)continue;
    const pipeline=sf(item.record,'Pipeline'),weight=Number(sf(item.record,'InfluenceValue'));if(typeof pipeline==='string'&&Number.isFinite(weight)&&weight>0)weights.set(pipeline,Math.max(weights.get(pipeline)??0,weight));}
  const pipelines=[...weights].map(([pipeline,weight])=>({pipeline,weight})).sort((a,b)=>a.pipeline.localeCompare(b.pipeline));
  const localState=schoolState??localStateEvidence(rosterStates,pipelines,hometownIndex(catalog));
  if(!schoolState)warnings.push('School City is an external or unavailable asset; local origins use saved roster and pipeline evidence.');
  if(!pipelines.length)warnings.push('No usable school pipeline list; use local/nearby origins when available, with a national fallback.');
  return {version:1,schoolState,localState,locationSource:schoolState?'school-city':localState?'roster-and-pipelines':'national-fallback',cityReference:sf(team.record,'City')??null,rosterStates,pipelines,warnings};
}

const shuffle=(values,rng)=>{for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]];}return values;};
function pick(values,rng){let roll=rng()*values.reduce((n,item)=>n+item.weight,0);for(const item of values){roll-=item.weight;if(roll<0)return item.home;}return values.at(-1).home;}
export function planRosterHomes(targets,catalog,geography,seed){
  const byRow=new Map();if(!geography)return {byRow,summary:null};
  const index=hometownIndex(catalog),nearby=new Set((borders[geography.localState]??'').split(' ').filter(Boolean)),pipelineWeights=new Map(geography.pipelines.map(item=>[item.pipeline,item.weight]));
  const totals=new Map();for(const item of index.towns)totals.set(item.home.pipeline,(totals.get(item.home.pipeline)??0)+item.count);
  const all=index.towns.map(item=>({...item,weight:item.count})),local=all.filter(item=>normalizedHomeState(item.home.state)===geography.localState&&geography.localState),near=all.filter(item=>nearby.has(normalizedHomeState(item.home.state))),pipeline=all.filter(item=>pipelineWeights.has(item.home.pipeline)).map(item=>({...item,weight:item.count/totals.get(item.home.pipeline)*pipelineWeights.get(item.home.pipeline)}));
  const outside=all.filter(item=>normalizedHomeState(item.home.state)!==geography.localState&&!nearby.has(normalizedHomeState(item.home.state))&&!pipelineWeights.has(item.home.pipeline));
  const pools={local,pipeline,nearby:near,national:outside.length?outside:all},weights={local:40,pipeline:35,nearby:15,national:10};
  const available=Object.fromEntries(Object.entries(weights).filter(([name])=>pools[name].length));
  if(!Object.keys(available).length)return {byRow,summary:{...geography,allocations:{},fallback:'No observed hometown packages; original profile origins retained.'}};
  const allocations=quotaCounts(available,targets.length),rng=mulberry32((seed^0x484F4D45)>>>0),tokens=shuffle(Object.entries(allocations).flatMap(([source,count])=>Array(count).fill(source)),rng);
  [...targets].sort((a,b)=>a.row-b.row).forEach((target,i)=>{const source=tokens[i];byRow.set(target.row,{home:{...pick(pools[source],rng)},source});});
  const count=field=>Object.fromEntries([...byRow.values()].reduce((map,item)=>map.set(item.home[field],(map.get(item.home[field])??0)+1),new Map()));
  return {byRow,summary:{...geography,allocations,states:count('state'),homePipelines:count('pipeline')}};
}
