import {RATING_FIELDS} from './contract.js';
import {calibrateProfile} from './presets.js';
import {ATHLETIC_RATINGS,observedAthleticBounds} from './athleticBounds.js';

export const ATHLETICISM_PROFILES=Object.freeze([
  {id:'balanced',name:'Balanced',weight:85},
  {id:'speed',name:'Speed Focused',weight:2},
  {id:'size',name:'Size & Strength',weight:2},
  {id:'technical',name:'Technical',weight:3},
  {id:'freak',name:'Freak Athlete',weight:1},
  {id:'outlier',name:'Outlier',weight:1},
  {id:'cerebral',name:'Field Savant',weight:3},
  {id:'drill',name:'Drill Specialist',weight:3}
]);
const ATHLETIC=new Set(ATHLETIC_RATINGS);
export const MENTAL_RATINGS=new Set(['AwarenessRating','PlayRecognitionRating','BCVisionRating','PursuitRating']);
export function athleticProfilePool(pool,id){const free=pool.filter(profile=>profile.physical.every(tier=>tier==='None'));return ['cerebral','drill'].includes(id)&&free.length?free:pool;}
const variants=new WeakMap();
export function athleticVariant(model,base,id='balanced'){
  if(!ATHLETICISM_PROFILES.some(profile=>profile.id===id))throw new Error('Unknown athleticism profile.');
  if(id==='balanced'||id==='outlier')return base;
  if(!variants.has(model))variants.set(model,new Map());const cache=variants.get(model),key=base.id+'|'+id+'|'+base.overall+'|'+base.ratings.join(',');if(cache.has(key))return cache.get(key);
  const observed=model.observedById?.get(base.id)??base,active=observed.physical.some(tier=>tier!=='None'),floors=[...(active?observed.ratings:RATING_FIELDS.map(()=>1))],ceilings=RATING_FIELDS.map((field,i)=>id==='drill'&&MENTAL_RATINGS.has(field)?Math.max(floors[i],55):99),formula=model.formulas.get(base.position+'|'+base.archetype);
  const skills=new Set(Object.entries(formula.coefficients).filter(([field,weight])=>weight>0&&!ATHLETIC.has(field)).map(([field])=>field));
  if(id==='cerebral')RATING_FIELDS.forEach((field,i)=>{if(MENTAL_RATINGS.has(field))floors[i]=Math.max(floors[i],88);});
  const delta=field=>{
    if(id==='cerebral')return MENTAL_RATINGS.has(field)?18:skills.has(field)?-10:0;
    if(id==='drill')return MENTAL_RATINGS.has(field)?-18:skills.has(field)?10:0;
    if(id==='speed')return field==='StrengthRating'?-1:ATHLETIC.has(field)?2:skills.has(field)?-2:0;
    if(id==='size')return field==='StrengthRating'?3:ATHLETIC.has(field)?-2:['HitPowerRating','ImpactBlockingRating','TruckingRating'].includes(field)?5:0;
    if(id==='technical')return ATHLETIC.has(field)?-2:skills.has(field)?7:0;
    return ATHLETIC.has(field)?3:skills.has(field)?-7:0;
  };
  const adjusted={...base,ratings:base.ratings.map((value,i)=>Math.max(floors[i],Math.min(ceilings[i],value+delta(RATING_FIELDS[i]))))};
  const result={...calibrateProfile(adjusted,base.overall,model.formulas,{minimumRatings:floors,maximumRatings:ceilings,athleticBounds:observedAthleticBounds(model,base.position,id)}),athleticProfile:id};cache.set(key,result);return result;
}
const buildSize=appearance=>appearance.fields.Height*3+appearance.fields.Weight;
const byBuildSize=pool=>[...pool].sort((a,b)=>buildSize(a)-buildSize(b)||a.id.localeCompare(b.id));
export function appearancePoolForCaliber(pool,presetId){
  if(pool.length<4||!['startup','fcs'].includes(presetId))return pool;
  return byBuildSize(pool).slice(0,Math.max(1,Math.ceil(pool.length*(presetId==='startup'?.30:.45))));
}
export function appearancePoolForAthletics(pool,id,outlierSize='small'){
  if(!pool.length||!['speed','size','freak','outlier'].includes(id))return pool;
  const sorted=byBuildSize(pool);
  if(id==='outlier'){const tail=Math.max(1,Math.ceil(sorted.length*.05));return outlierSize==='large'?sorted.slice(-tail):sorted.slice(0,tail);}
  if(pool.length<4)return pool;
  if(id==='speed')return sorted.slice(0,Math.max(1,Math.ceil(sorted.length*.35)));
  return sorted.slice(Math.floor(sorted.length*(id==='size'?.65:.45)));
}

export function potentialCandidates(model,position,archetype,development){
  const all=model.potentialByPosition?.get(position)??model.byPosition.get(position),developmentPool=all.filter(profile=>profile.development===development),same=developmentPool.filter(profile=>profile.archetype===archetype),pool=same.length?same:developmentPool;
  if(!pool.length)throw new Error('No observed potential package is available for this position.');
  const kind=model.settings?.rosterPotential??'standard',scores=pool.map(profile=>profile.caps.reduce((a,b)=>a+b,0)).sort((a,b)=>a-b);
  if(kind==='standard')return pool;
  const percentile=kind==='dead-end'?.05:kind==='low'?.35:kind==='high'?.6:.9,threshold=scores[Math.min(scores.length-1,Math.floor((scores.length-1)*percentile))];
  return pool.filter(profile=>kind==='dead-end'||kind==='low'?profile.caps.reduce((a,b)=>a+b,0)<=threshold:profile.caps.reduce((a,b)=>a+b,0)>=threshold);
}
