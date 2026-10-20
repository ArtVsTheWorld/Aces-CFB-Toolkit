import {isGeneratedProfile} from './cohorts.js';
import {RATING_FIELDS,BUILDING_BLOCKS,validateFootballProfile} from './contract.js';
import {calculateOverall} from './ratings.js';
import {rosterSamplingPolicy} from './sampling.js';
import {positionGroup} from '../../../shared/positionGroups.js';
import {normalizeGenerationSettings} from './settings.js';

export const ROSTER_PRESETS = Object.freeze([
  {id:'startup',name:'From Nothing',targetAverage:60,spread:7,description:'A tough rebuild with limited current talent and smaller builds.'},
  {id:'fcs',name:'FCS Call-Up',targetAverage:64,spread:8,description:'A lower-rated roster with smaller builds, making the jump up.'},
  {...BUILDING_BLOCKS,description:'A workable squad with useful starters and developing depth.'},
  {id:'competitive',name:'Competitive',targetAverage:72,spread:8,description:'Ready to compete, with clear strengths and weaknesses.'},
  {id:'contender',name:'Contender',targetAverage:75,spread:8,description:'A strong roster built to challenge for titles.'},
  {id:'blue-blood',name:'Blue Blood',targetAverage:79,spread:7,description:'Strong starters and quality depth throughout the roster.'},
  {id:'all-time',name:'All-Time Team',targetAverage:83,spread:7,description:'Exceptional current talent across the roster.'}
].map(item=>Object.freeze({...item,minimumAverage:item.targetAverage-1,maximumAverage:item.targetAverage+1})));
export function rosterPreset(id='building-blocks') {
  const preset=ROSTER_PRESETS.find(item=>item.id===id);
  if(!preset)throw new Error('Choose a supported roster caliber preset.');
  return preset;
}

// Preserve the shape of an observed position/archetype rating vector. Only
// positive OVR contributors are calibrated; unrelated ratings stay observed.
// Downward calibration uses ability-free physical packages: unknown ability
// thresholds must never be invented for a newly weakened rating vector.
export function calibrateProfile(source,desired,formulas,{minimumRatings=null,maximumRatings=null}={}) {
  const constrained=minimumRatings!==null,speedFloor=({WR:74,FS:74,SS:74,HB:75,CB:75,TE:68,FB:68,LOLB:70,MLB:70,ROLB:70,SAM:70,MIKE:70,WILL:70})[source.position]??1;
  minimumRatings=RATING_FIELDS.map((field,i)=>Math.max(minimumRatings?.[i]??1,field==='SpeedRating'?speedFloor:1));
  const formula=formulas.get(`${source.position}|${source.archetype}`);
  const fields=new Set(Object.entries(formula.coefficients).filter(([,weight])=>weight>0).map(([field])=>field));
  let best=null,low=constrained?-99:source.physical.some(tier=>tier!=='None')?0:-99,high=99;
  const evaluate=offset=>{
    const ratings=source.ratings.map((value,i)=>Math.max(minimumRatings[i],Math.min(maximumRatings?.[i]??99,value+(fields.has(RATING_FIELDS[i])?offset:0))));
    const overall=calculateOverall({...source,ratings},formulas),distance=Math.abs(overall-desired);
    if(!best||distance<best.distance||distance===best.distance&&Math.abs(offset)<Math.abs(best.offset))best={ratings,overall,offset,distance};
    return overall;
  };
  // All tuned coefficients are positive, so this is monotonic and bounded.
  while(low<=high){const middle=Math.floor((low+high)/2);if(evaluate(middle)<desired)low=middle+1;else high=middle-1;}
  evaluate(Math.max(constrained?-99:source.physical.some(tier=>tier!=='None')?0:-99,Math.min(99,low)));
  return {...source,ratings:best.ratings,overall:best.overall,calibration:{offset:best.offset,observedOverall:source.overall,observedId:source.id}};
}

export function modelForPreset(model,preset,settings=null,talentTargets={}) {
  settings=normalizeGenerationSettings(settings??{});
  const sampling=rosterSamplingPolicy(model,settings),potentialByPosition=new Map();
  for(const profile of model.profiles.filter(isGeneratedProfile)){if(!potentialByPosition.has(profile.position))potentialByPosition.set(profile.position,[]);potentialByPosition.get(profile.position).push(profile);}
  let candidates=model.profiles.filter(isGeneratedProfile);
  if(settings.rosterAge==='seniors')candidates=candidates.filter(profile=>profile.classYear==='Senior'&&profile.redshirt==='Previous');
    // Development quotas, rather than an OVR cutoff, control roster potential.
  const byPosition=new Map(),byId=new Map(),profiles=[];
  for(const position of model.byPosition.keys()) {
    const pool=candidates.filter(profile=>profile.position===position&&(profile.physical.every(tier=>tier==='None')||profile.overall<=(talentTargets[positionGroup(position)]??preset.targetAverage)+8));
    if(!pool.length)throw new Error(`No observed ${position} eligibility/ability packages support this preset. Choose another caliber.`);
    const means=new Map();for(const profile of pool){const key=profile.classYear+'|'+profile.redshirt,entry=means.get(key)??{sum:0,count:0};entry.sum+=profile.overall;entry.count++;means.set(key,entry);}
    for(const source of pool) {
      const entry=means.get(source.classYear+'|'+source.redshirt),average=entry.sum/entry.count;
      const desired=Math.max(30,Math.min(99,(talentTargets[positionGroup(position)]??preset.targetAverage)+(source.overall-average)*.8));
      const profile=calibrateProfile(source,desired,model.formulas);
      validateFootballProfile(profile);profiles.push(profile);byId.set(profile.id,profile);
      if(!byPosition.has(position))byPosition.set(position,[]);byPosition.get(position).push(profile);
    }
  }
  return {...model,profiles,byPosition,byId,sampling,settings,talentTargets,potentialByPosition,potentialById:model.byId,observedById:model.byId};
}
