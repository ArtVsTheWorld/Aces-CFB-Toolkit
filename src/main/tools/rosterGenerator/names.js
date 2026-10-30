import {mixNamePools,isUserMixSurname} from './appearanceMixes.js';
import {stripSuffix} from '../commentary/matcher.js';
const SUFFIXES=['Jr.','II','III','IV'];
const pick=(items,rng)=>items[Math.floor(rng()*items.length)];
const observedPools=new WeakMap(),weightedPools=new WeakMap();
export function observedSurnamePool(catalog,appearance,mix="standard"){
  const custom=mixNamePools(catalog,mix);if(custom)return {bucket:mix,counts:null,names:custom.last};
  const tone=appearance.skinTone??Number(appearance.fields.GenericHeadAssetName.split('_').at(-2)),bucket=tone<=3?'light':tone===4?'medium':'dark',counts=catalog.names.lastByTone?.[bucket];
  if(!observedPools.has(catalog))observedPools.set(catalog,new Map());const pools=observedPools.get(catalog);
  if(!pools.has(bucket))pools.set(bucket,{bucket,counts:counts??null,names:counts?Object.keys(counts).filter(name=>name&&Buffer.byteLength(name,'utf8')<=21).sort():catalog.names.last});return pools.get(bucket);
}
export function surnameVariant(names,rng){
  const hyphen=rng()<.012,suffixRoll=rng(),suffix=suffixRoll<.018?(suffixRoll<.010?'Jr.':suffixRoll<.014?'II':suffixRoll<.017?'III':'IV'):'';
  return {hyphen,suffix};
}
export function makeSurname(names,rng,variant,weights=null){
  let cumulative;if(weights){if(!weightedPools.has(weights))weightedPools.set(weights,new WeakMap());const pools=weightedPools.get(weights);if(!pools.has(names)){let total=0;pools.set(names,names.map(name=>total+=weights[name]??0));}cumulative=pools.get(names);}
  const choose=()=>{if(!weights)return pick(names,rng);const roll=rng()*cumulative.at(-1);let low=0,high=names.length-1;while(low<high){const middle=(low+high)>>1;if(cumulative[middle]>roll)high=middle;else low=middle+1;}return names[low];};
  for(let attempt=0;attempt<100;attempt++){
    const parts=variant.hyphen?[choose(),choose()]:[choose()];
    if(variant.hyphen&&(parts[0]===parts[1]||parts.some(name=>name!==stripSuffix(name)||name.includes('-'))))continue;
    if(variant.suffix&&parts.some(name=>name!==stripSuffix(name)))continue;
    const value=parts.join('-')+(variant.suffix?' '+variant.suffix:'');
    if(Buffer.byteLength(value,'utf8')<=21)return {value,parts,suffix:variant.suffix};
  }
  return null;
}
export function validSurname(value,evidence,names){
  return evidence&&Array.isArray(evidence.parts)&&[1,2].includes(evidence.parts.length)&&evidence.parts.every(part=>names.includes(part))&&(!evidence.suffix||SUFFIXES.includes(evidence.suffix))&&value===evidence.parts.join('-')+(evidence.suffix?' '+evidence.suffix:'')&&Buffer.byteLength(value,'utf8')<=21;
}


// Private generation state: no new setting/preset fields. Local usage spreads
// a team first; run usage breaks ties across teams generated in the same run.
export const createNameHistory=()=>({first:new Map(),last:new Map()});
const bump=(map,name,delta=1)=>{const key=String(name).toLowerCase();map.set(key,(map.get(key)??0)+delta);};
export function recordNameUsage(history,first,surname,delta=1){
  if(first)bump(history.first,first,delta);
  for(const part of surname.parts)bump(history.last,part,delta);
}
const usage=(map,name)=>map.get(name.toLowerCase())??0;
function leastUsed(names,local,run){
  const minimum=Math.min(...names.map(n=>usage(local,n))),room=names.filter(n=>usage(local,n)===minimum),across=Math.min(...room.map(n=>usage(run,n)));
  return room.filter(n=>usage(run,n)===across);
}
export function variedMixName(first,last,unavailable,rng,bucket,local,run,initialVariant){
  const firstChoices=leastUsed(first,local.first,run.first),lastChoices=leastUsed(last,local.last,run.last),variant=initialVariant??surnameVariant(last,rng);
  const accept=(f,surname)=>{
    if(!surname)return null;const key=(f+' '+surname.value).trim().toLowerCase().replace(/\s+/g,' ');
    if(unavailable.has(key))return null;unavailable.add(key);
    return [f,surname.value,{parts:surname.parts,suffix:surname.suffix,pool:bucket}];
  };
  const byUsage=(names,a,b)=>[...names].sort((x,y)=>usage(a,x)-usage(a,y)||usage(b,x)-usage(b,y)||x.localeCompare(y));
  const hyphenPool=variant.hyphen&&lastChoices.length===1?[lastChoices[0],...byUsage(last,local.last,run.last).filter(n=>n!==lastChoices[0]).slice(0,1)]:lastChoices;
  for(let attempt=0;attempt<64;attempt++){const value=accept(pick(firstChoices,rng),makeSurname(hyphenPool,rng,variant));if(value)return value;}
  // An unavailable full-name combination must not trap a one-name shortlist.
  // Widen to the next least-used plain combinations before adding rare variants.
  for(const f of byUsage(first,local.first,run.first))for(const l of byUsage(last,local.last,run.last)){
    const value=accept(f,{value:l,parts:[l],suffix:''});if(value)return value;
  }
  for(const suffix of SUFFIXES)for(let attempt=0;attempt<500;attempt++){
    const value=accept(pick(firstChoices,rng),makeSurname(lastChoices,rng,{hyphen:false,suffix}));if(value)return value;
  }
  for(let attempt=0;attempt<1000;attempt++){const value=accept(pick(first,rng),makeSurname(last,rng,{hyphen:true,suffix:''}));if(value)return value;}
  throw new Error('The available name combinations are exhausted.');
}

export function matchGeneratedNameCommentary(first,last,surname,mix,match){
  if(mix!=='standard'&&surname.parts.some(isUserMixSurname))return match('',last);
  return match(first,last);
}
