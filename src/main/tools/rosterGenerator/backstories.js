import {mulberry32} from '../longSnap/core.js';
import {positionGroup} from '../../../shared/positionGroups.js';
import {weightPounds} from '../../../shared/playerMeasurements.js';
import {BACKSTORIES} from './backstoryBank.js';
export {BACKSTORIES};
export const BACKSTORY_VERSION=3;
const references=new WeakMap();
const quantile=(items,q)=>[...items].sort((a,b)=>a-b)[Math.floor((items.length-1)*q)];
function reference(model,position){
  if(!references.has(model))references.set(model,new Map());const cache=references.get(model);if(cache.has(position))return cache.get(position);
  const bodies=model.catalog.appearances.filter(item=>item.position===position),potential=(model.potentialByPosition??model.byPosition).get(position).filter(item=>item.development==='Normal'),heights=bodies.map(item=>item.fields.Height),weights=bodies.map(item=>weightPounds(item.fields.Weight));
  const result={short:quantile(heights,.25),tall:quantile(heights,.75),heightMedian:quantile(heights,.5),light:quantile(weights,.25),heavy:quantile(weights,.75),weightMedian:quantile(weights,.5),capMedian:potential.length?quantile(potential.map(item=>item.caps.reduce((a,b)=>a+b,0)),.5):0};cache.set(position,result);return result;
}
export function backstoryContext(player,model){
  const f=player.fields,ref=reference(model,player.position),height=f.Height,weight=weightPounds(f.Weight),capTotal=Array.from({length:6},(_,i)=>f[`SkillGroupCap${i+1}`]).reduce((a,b)=>a+b,0);
  return {position:positionGroup(player.position),year:f.SchoolYear,redshirt:f.RedshirtStatus,overall:f.OverallRating,development:f.TraitDevelopment,athletic:player.provenance.athleticProfile,personality:f.Personality,height,weight,capTotal,
    small:height<=ref.short&&weight<=ref.light&&(height<ref.heightMedian||weight<ref.weightMedian),large:height>=ref.tall&&weight>=ref.heavy&&(height>ref.heightMedian||weight>ref.weightMedian),
    fast:f.SpeedRating>=88&&f.AccelerationRating>=85,strong:f.StrengthRating>=88,limited:f.TraitDevelopment==='Normal'&&['dead-end','low'].includes(model.settings?.rosterPotential)&&capTotal<=ref.capMedian};
}
export function storyEligible(story,context){
  switch(story.rule){
    case 'any':return true;
    case 'performer':return ['Entertainer','Unpredictable'].includes(context.personality);
    case 'unpredictable':return ['Unpredictable','Entertainer'].includes(context.personality);
    case 'team-first':return ['TeamPlayer','Leader'].includes(context.personality);
    case 'reserved':return ['TeamPlayer','Intense'].includes(context.personality);
    case 'driven':return ['Intense','Leader'].includes(context.personality);
    case 'experienced':return ['Sophomore','Junior','Senior'].includes(context.year)||context.redshirt==='Previous';
    case 'true-freshman':return context.year==='Freshman'&&context.redshirt==='Eligible';
    case 'rs-freshman':return context.year==='Freshman'&&context.redshirt==='Previous';
    case 'young':return ['Freshman','Sophomore'].includes(context.year);
    case 'veteran':return ['Junior','Senior'].includes(context.year);
    case 'rs-senior':return context.year==='Senior'&&context.redshirt==='Previous';
    case 'redshirted':return context.redshirt==='Previous';
    case 'low-overall':return context.overall<=64;
    case 'high-overall':return context.overall>=85;
    case 'high-potential':return ['College_Star','College_Elite'].includes(context.development);
    case 'limited-potential':return context.limited;
    case 'fast':return context.fast;
    case 'strong':return context.strong;
    case 'technical':return context.athletic==='technical';
    case 'small-build':return context.small;
    case 'large-build':return context.large;
    case 'qb':return context.position==='QB';
    case 'offensive-skill':return ['HB','FB','WR','TE'].includes(context.position);
    case 'ol':return context.position==='OL';
    case 'dl':return ['EDGE','DT'].includes(context.position);
    case 'back-seven':return ['LB','CB','FS','SS'].includes(context.position);
    case 'specialist':return context.position==='K/P';
    default:throw new Error('Unknown backstory eligibility rule.');
  }
}
function randomFor(seed,row){let hash=2166136261^seed;for(const ch of `backstory:${row}`)hash=Math.imul(hash^ch.charCodeAt(0),16777619);return mulberry32(hash>>>0);}
export function assignBackstories(players,model,seed){
  const topicOrder=[...players].sort((a,b)=>a.row-b.row),topicRng=randomFor(seed,0x51b0);for(let i=topicOrder.length-1;i>0;i--){const j=Math.floor(topicRng()*(i+1));[topicOrder[i],topicOrder[j]]=[topicOrder[j],topicOrder[i]];}const footballRows=new Set(topicOrder.slice(0,Math.round(players.length*.6)).map(p=>p.row));
  const candidates=new Map(players.map(player=>{const context=backstoryContext(player,model),choices=BACKSTORIES.filter(story=>storyEligible(story,context)),rng=randomFor(seed,player.row);for(let i=choices.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}return [player.row,choices];})),owners=new Map(),chosen=new Map();
  for(const player of players){const preferred=footballRows.has(player.row)?'football':'personal';candidates.get(player.row).sort((a,b)=>Number(b.topic===preferred)-Number(a.topic===preferred));}
  // A matching pass reserves scarce position/age stories before falling back to
  // general stories. It maximizes variety without relaxing any eligibility rule.
  function place(row,visited){for(const story of candidates.get(row)){if(visited.has(story.id))continue;visited.add(story.id);const previous=owners.get(story.id);if(previous===undefined||place(previous,visited)){owners.set(story.id,row);chosen.set(row,story);return true;}}return false;}
  for(const player of [...players].sort((a,b)=>candidates.get(a.row).length-candidates.get(b.row).length||a.row-b.row))if(!place(player.row,new Set()))chosen.set(player.row,candidates.get(player.row)[0]);
  return new Map(players.map(player=>{const story=chosen.get(player.row);if(!story)throw new Error('No compatible player backstory is available.');return [player.row,{version:BACKSTORY_VERSION,...story,eligibility:backstoryContext(player,model)}];}));
}
