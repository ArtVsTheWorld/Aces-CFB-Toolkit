import {mulberry32} from '../longSnap/core.js';

export const NIL_FIELD='CurrentNILCompensation';
export const NIL_MAX=1023; // C27 Player schema: unsigned ten-bit integer.
const premiums={QB:2.8,WR:1.4,HB:1.25,LE:1.4,RE:1.4,LT:1.3,RT:1.2,CB:1.3,DT:1.15,FB:.45,K:.6,P:.6};

// Capped largest-remainder allocation. No money is created or discarded, even
// for a zero budget, a one-player roster, or a team near the field's ceiling.
export function rosterNilBudget(players,targets,seed){
  const original=targets.map(target=>target.original[NIL_FIELD]??0);
  if(original.some(value=>!Number.isInteger(value)||value<0||value>NIL_MAX))throw new Error('The roster contains an invalid current NIL compensation value.');
  const total=original.reduce((sum,value)=>sum+value,0),rng=mulberry32((seed^0x4e494c)>>>0);
  const rows=[...players].sort((a,b)=>a.row-b.row).map(player=>({row:player.row,value:0,weight:(premiums[player.position]??1)*Math.pow(Math.max(1,player.fields.OverallRating)/60,3)*(.85+rng()*.3),tie:rng()}));
  let remaining=total,available=[...rows];
  while(remaining&&available.length){
    const sum=available.reduce((n,row)=>n+row.weight,0),saturated=available.filter(row=>remaining*row.weight/sum>=NIL_MAX);
    if(saturated.length){for(const row of saturated){row.value=NIL_MAX;remaining-=NIL_MAX;}available=available.filter(row=>!saturated.includes(row));continue;}
    for(const row of available){const share=remaining*row.weight/sum;row.value=Math.floor(share);row.remainder=share-row.value;}
    const spare=remaining-available.reduce((n,row)=>n+row.value,0);
    available.sort((a,b)=>b.remainder-a.remainder||a.tie-b.tie||a.row-b.row).slice(0,spare).forEach(row=>row.value++);
    remaining=0;
  }
  if(remaining||rows.reduce((n,row)=>n+row.value,0)!==total)throw new Error('Unable to preserve the team NIL budget.');
  return {byRow:new Map(rows.map(row=>[row.row,row.value])),summary:{before:total,after:total}};
}
