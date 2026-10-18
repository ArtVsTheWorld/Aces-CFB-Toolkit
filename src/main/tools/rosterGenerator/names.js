import {stripSuffix} from '../commentary/matcher.js';
const SUFFIXES=['Jr.','II','III','IV'];
const pick=(items,rng)=>items[Math.floor(rng()*items.length)];
export function surnameVariant(names,rng){
  const hyphen=rng()<.012,suffixRoll=rng(),suffix=suffixRoll<.018?(suffixRoll<.010?'Jr.':suffixRoll<.014?'II':suffixRoll<.017?'III':'IV'):'';
  return {hyphen,suffix};
}
export function makeSurname(names,rng,variant){
  for(let attempt=0;attempt<100;attempt++){
    const parts=variant.hyphen?[pick(names,rng),pick(names,rng)]:[pick(names,rng)];
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
