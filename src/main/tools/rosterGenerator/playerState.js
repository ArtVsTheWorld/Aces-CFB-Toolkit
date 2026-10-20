import {OFFENSE,SPECIALISTS} from '../jersey/shared.js';

export const WEAR_FIELDS=Object.freeze(['Back','LAnkle','LArm','LElbow','LFoot','LHand','LHip','LKnee','LLeg','LShoulder','RAnkle','RArm','RElbow','RFoot','RHand','RHip','RKnee','RLeg','RShoulder','Rib'].map(part=>'WearAndTear_'+part));
// Schema defaults corroborated by all healthy first-year generated players.
export const HEALTHY_FIELDS=Object.freeze({InjuryStatus:'Uninjured',InjuryType:'Invalid_',InjurySeverity:'Invalid_',MinInjuryDuration:0,MaxInjuryDuration:0,TotalInjuryDuration:0,IsInjuredReserve:false,WasPreviouslyInjured:false,CurrentYearSeasonEndingInjuryWeek:30,LastYearSeasonEndingInjuryWeek:0,LatestInjuryStage:'PreSeason',LatestInjuryWeek:0,LatestInjuryYear:0,SeasonHealthPool:1000,SeasonHealthPoolMax:1000,Fatigue:0,...Object.fromEntries(WEAR_FIELDS.map(field=>[field,10]))});
export const BIO_FIELDS=Object.freeze(['PLYR_CONSECYEARSWITHTEAM','PLYR_HANDEDNESS','PLYR_HOME_TOWN','PLYR_HOME_STATE','HomePipeline']);
export const CAPTAIN_FIELDS=Object.freeze(['PLYR_ISCAPTAIN','CaptainsPatch']);
export const STATE_FIELDS=Object.freeze([...Object.keys(HEALTHY_FIELDS),...BIO_FIELDS,...CAPTAIN_FIELDS,'IdealRecruitingPitch','PresentationId']);
export function observedPlayerState(profile,selectedHome){
  const home=selectedHome??profile.home??{town:'',state:'NonUS',pipeline:'International'};
  return {...HEALTHY_FIELDS,PLYR_CONSECYEARSWITHTEAM:profile.consecutiveYears??0,PLYR_HANDEDNESS:profile.handedness??'Right',PLYR_HOME_TOWN:home.town,PLYR_HOME_STATE:home.state,HomePipeline:home.pipeline,PLYR_ISCAPTAIN:false,CaptainsPatch:'None',IdealRecruitingPitch:profile.idealPitch??'Invalid'};
}
export function assignRosterCaptains(players,team){
  const desired=team.captainCount??6;if(!Number.isInteger(desired)||desired<0||desired>100)throw new Error('Invalid team captain count.');
  const year={Freshman:0,Sophomore:1,Junior:2,Senior:3};
  const ranked=[...players].sort((a,b)=>(year[b.fields.SchoolYear]??0)-(year[a.fields.SchoolYear]??0)||Number(b.fields.Personality==='Leader')-Number(a.fields.Personality==='Leader')||b.fields.OverallRating-a.fields.OverallRating||a.row-b.row);
  const offense=ranked.filter(p=>OFFENSE.has(p.position)&&!SPECIALISTS.has(p.position)),defense=ranked.filter(p=>!OFFENSE.has(p.position)&&!SPECIALISTS.has(p.position)),selected=[];
  while(selected.length<Math.min(desired,players.length)&&(offense.length||defense.length)){const pool=selected.length%2===0?(offense.length?offense:defense):(defense.length?defense:offense);selected.push(pool.shift());}
  for(const p of ranked)if(selected.length<Math.min(desired,players.length)&&!selected.includes(p))selected.push(p);
  const rows=new Set(selected.map(p=>p.row));for(const p of players){p.fields.PLYR_ISCAPTAIN=rows.has(p.row);p.fields.CaptainsPatch=rows.has(p.row)?'OneYear':'None';}
  return {requested:desired,selected:selected.map(p=>({row:p.row,position:p.position,classYear:p.fields.SchoolYear,overall:p.fields.OverallRating,personality:p.fields.Personality}))};
}
