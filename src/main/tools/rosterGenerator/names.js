import {stripSuffix} from '../commentary/matcher.js';
const SUFFIXES=['Jr.','II','III','IV'];
const pick=(items,rng)=>items[Math.floor(rng()*items.length)];
const observedPools=new WeakMap(),weightedPools=new WeakMap();
export function observedSurnamePool(catalog,appearance){
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
