import {RATING_FIELDS} from './contract.js';
import {ATHLETIC_RATINGS,observedAthleticBounds} from './athleticBounds.js';
import {calibrateProfile} from './presets.js';
import {athleticVariant,athleticProfilePool} from './athletics.js';

const indices=ATHLETIC_RATINGS.map(field=>RATING_FIELDS.indexOf(field)),indexes=new WeakMap();
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
function referenceIndex(model){
  const observed=model.observedById;
  if(!observed)return null;
  if(!indexes.has(observed)){
    const positions=new Map();
    for(const profile of observed.values())if(profile.source===0){
      const pool=positions.get(profile.position)??[];pool.push(profile);positions.set(profile.position,pool);
    }
    indexes.set(observed,{positions,queries:new Map()});
  }
  return indexes.get(observed);
}
export const hasAthleticReferences=model=>Boolean(referenceIndex(model)?.positions.size);

// References are unmodified EA observations. Exact positions never share
// athletic ranges; sparse archetype/class groups back off explicitly.
export function athleticReferences(model,position,archetype,overall,classYear,redshirt){
  const index=referenceIndex(model),all=index?.positions.get(position)??[];
  if(!all.length)return null;
  const target=Math.round(overall),key=JSON.stringify([position,archetype,target,classYear,redshirt]);
  if(index.queries.has(key))return index.queries.get(key);
  const same=all.filter(p=>!archetype||p.archetype===archetype),stages=[
    ['archetype, overall and class',same.filter(p=>Math.abs(p.overall-target)<=5&&p.classYear===classYear&&p.redshirt===redshirt)],
    ['archetype and overall',same.filter(p=>Math.abs(p.overall-target)<=5)],
    ['archetype, wider overall',same.filter(p=>Math.abs(p.overall-target)<=10)],
    ['position and overall',all.filter(p=>Math.abs(p.overall-target)<=5)],
    ['position, wider overall',all.filter(p=>Math.abs(p.overall-target)<=10)],
    ['nearest observed position',all]
  ];
  const selected=stages.find(([,pool])=>pool.length>=8)??stages.at(-1),fallbackLevel=stages.indexOf(selected);
  let [scope,pool]=selected;
  if(!archetype)scope=scope.replace('archetype','position');
  if(scope==='nearest observed position'){
    const distance=Math.min(...pool.map(p=>Math.abs(p.overall-target)));
    pool=pool.filter(p=>Math.abs(p.overall-target)<=distance+3);
  }
  const scales=indices.map(i=>{const average=mean(pool.map(p=>p.ratings[i]));return Math.max(4,Math.sqrt(mean(pool.map(p=>(p.ratings[i]-average)**2))));});
  const result={scope,pool,scales,fallbackLevel};index.queries.set(key,result);return result;
}

export function calibratedAthleticProfile(model,source,overall,athleticProfile='balanced'){
  const native=model.observedById.get(source.id);
  if(!native)throw Error('Missing original physical/football observation.');
  const calibrated=calibrateProfile(native,overall,model.formulas,{athleticBounds:observedAthleticBounds(model,native.position,athleticProfile)});
  return athleticVariant(model,calibrated,athleticProfile);
}

// Choose one complete observed vector. Nearby OVR variants used by balancing
// retain this exact source and physical package, rather than swapping it away.
export function selectAthleticPackage(model,candidates,desired,athleticProfile,rng,archetype){
  const nativePool=athleticProfilePool(candidates.map(p=>model.observedById.get(p.id)),athleticProfile).filter(p=>!archetype||p.archetype===archetype);
  if(!nativePool.length)throw Error('No observed package supports this position and class.');
  const sample=nativePool[0],reference=athleticReferences(model,sample.position,archetype,desired,sample.classYear,sample.redshirt);
  if(!reference)throw Error('Missing conditional athletic reference.');
  const anchor=reference.pool[Math.floor(rng()*reference.pool.length)],target=Math.max(30,Math.min(99,Math.round(desired)));
  const supported=nativePool.filter(p=>p.physical.every(t=>t==='None')||p.overall<=target+2),available=supported.length?supported:nativePool;
  const closest=Math.min(...available.map(p=>Math.abs(p.overall-target)));
  const nearby=available.filter(p=>Math.abs(p.overall-target)<=Math.max(10,closest+3));
  const ranked=nearby.map(source=>({source,score:indices.reduce((sum,i,n)=>sum+((source.ratings[i]-anchor.ratings[i])/reference.scales[n])**2,0)+((source.overall-target)/8)**2})).sort((a,b)=>a.score-b.score||a.source.id.localeCompare(b.source.id));
  // A small weighted neighborhood preserves variation while following the
  // sampled reference vector instead of consistently selecting the fastest.
  const choices=ranked.slice(0,Math.min(8,ranked.length)),minimum=choices[0].score;
  let roll=rng()*choices.reduce((sum,p)=>sum+Math.exp(-(p.score-minimum)),0);
  const chosen=choices.find(p=>(roll-=Math.exp(-(p.score-minimum)))<0)??choices.at(-1);
  let source=chosen.source,profile=calibratedAthleticProfile(model,source,target,athleticProfile);
  if(Math.abs(profile.overall-target)>2){
    const alternative=ranked.slice(0,24).map(p=>({...p,profile:calibratedAthleticProfile(model,p.source,target,athleticProfile)})).sort((a,b)=>Math.abs(a.profile.overall-target)-Math.abs(b.profile.overall-target)||a.score-b.score)[0];
    source=alternative.source;profile=alternative.profile;
  }
  const pool=[...new Map(Array.from({length:7},(_,i)=>calibratedAthleticProfile(model,source,Math.max(30,Math.min(99,target+i-3)),athleticProfile)).map(p=>[p.overall,p])).values()];
  return {profile,pool,selection:{referenceId:anchor.id,scope:reference.scope,fallbackLevel:reference.fallbackLevel,referenceCount:reference.pool.length,requestedOverall:target,nativeOverall:source.overall}};
}

const appearances=new WeakMap();
export function appearancePoolForPhysicalPackage(model,pool,profile,athleticProfile){
  if(!profile||athleticProfile==='outlier'||pool.length<2)return pool;
  if(!appearances.has(model.catalog))appearances.set(model.catalog,new Map(model.catalog.appearances.map(a=>[a.id,a])));
  const observed=appearances.get(model.catalog).get(profile.id);if(!observed)return pool;
  const distance=a=>Math.abs(a.fields.Height-observed.fields.Height)*3+Math.abs(a.fields.Weight-observed.fields.Weight),closest=Math.min(...pool.map(distance));
  return pool.filter(a=>distance(a)<=closest+12);
}

export function athleticSelectionSummary(players){
  const byPosition={};
  for(const player of players){const row=byPosition[player.position]??={players:0,largeCalibrations:0,broadReferences:0,physicalTotals:Object.fromEntries(ATHLETIC_RATINGS.map(f=>[f,0]))},selection=player.provenance.athleticSelection;
    row.players++;for(const field of ATHLETIC_RATINGS)row.physicalTotals[field]+=player.fields[field];
    if(selection){if(Math.abs(player.fields.OverallRating-selection.nativeOverall)>12)row.largeCalibrations++;if(selection.fallbackLevel>=2)row.broadReferences++;}
  }
  return Object.fromEntries(Object.entries(byPosition).map(([position,{physicalTotals,...row}])=>[position,{...row,physicalMeans:Object.fromEntries(Object.entries(physicalTotals).map(([field,sum])=>[field,sum/row.players]))}]));
}
