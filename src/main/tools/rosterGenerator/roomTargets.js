// Evenly spaced depth, with small seeded variation, rather than independent
// OVR rolls that can leave two stars and a disproportionately weak third player.
export function roomRatingTargets(rows,average,spread,rng){
  if(!rows.length)return new Map();
  const shuffled=[...rows];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  if(rows.length===1)return new Map([[rows[0].row,average]]);
  const width=Math.min(12,spread*(rows.length===2?.75:1)),values=shuffled.map((_,i)=>average+width*(1-2*i/(rows.length-1))+(rng()-.5)*1.2),mean=values.reduce((a,b)=>a+b,0)/values.length;
  return new Map(shuffled.map((row,i)=>[row.row,Math.max(30,Math.min(99,values[i]+average-mean))]));
}
