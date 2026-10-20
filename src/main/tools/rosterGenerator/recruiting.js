import {mulberry32,boundedNormal} from '../longSnap/core.js';
export const RECRUIT_STARS=Object.freeze(['ONE_STAR','TWO_STAR','THREE_STAR','FOUR_STAR','FIVE_STAR']);
export function generatedRecruitStars(fields,seed,row){
  const rng=mulberry32((seed^Math.imul(row+1,0x9e3779b1)^0x57a25)>>>0);
  const years={Freshman:0,Sophomore:1,Junior:2,Senior:3},ageAdjustment=(years[fields.SchoolYear]??0)*1.2+(fields.RedshirtStatus==='Previous'?1:0);
  const estimate=boundedNormal(fields.OverallRating-ageAdjustment,4,30,99,rng);
  let rank=estimate<58?0:estimate<66?1:estimate<77?2:estimate<88?3:4;
  // Occasional overlooked prospects and recruits who never lived up to the hype.
  if(rng()<.025)rank=Math.max(0,Math.min(4,rank+(rng()<.5?-2:2)));
  return RECRUIT_STARS[rank];
}
