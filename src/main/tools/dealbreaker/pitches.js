import fs from 'node:fs';
import {mulberry32} from '../longSnap/core.js';
const observations=JSON.parse(fs.readFileSync(new URL('./pitchObservations.json',import.meta.url),'utf8'));
// Rare stale combinations occur in veteran players after game-side dealbreaker
// changes. Require at least 1% support rather than treating every row as a rule.
export const PITCH_WEIGHTS=Object.freeze(Object.fromEntries(Object.entries(observations.counts).filter(([key])=>key!=='Invalid').map(([key,counts])=>{
  const total=Object.values(counts).reduce((a,b)=>a+b,0);return[key,Object.freeze(Object.fromEntries(Object.entries(counts).filter(([,count])=>count>=Math.max(10,total*.01))))];
})));
export function pitchMatches(dealbreaker,pitch){return dealbreaker==='Invalid'?pitch==='Invalid':Boolean(PITCH_WEIGHTS[dealbreaker]?.[pitch]);}
export function matchingPitch(dealbreaker,current,seed,row=0){
  if(pitchMatches(dealbreaker,current))return current;if(dealbreaker==='Invalid')return 'Invalid';
  const choices=Object.entries(PITCH_WEIGHTS[dealbreaker]??{});if(!choices.length)throw new Error(`No verified recruiting pitches for ${dealbreaker}.`);
  let hash=seed>>>0;for(const ch of `pitch:${row}:${dealbreaker}`)hash=Math.imul(hash^ch.charCodeAt(0),16777619);
  let roll=mulberry32(hash>>>0)()*choices.reduce((sum,[,weight])=>sum+weight,0);
  return choices.find(([,weight])=>(roll-=weight)<0)?.[0]??choices.at(-1)[0];
}
