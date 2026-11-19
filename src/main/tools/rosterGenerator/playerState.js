import {OFFENSE,SPECIALISTS} from '../jersey/shared.js';
import {starterSlots} from './depthDistribution.js';
import {rankDepthPlayers} from './depthCharts.js';
import {positionGroup} from '../../../shared/positionGroups.js';
export const ROSTER_CAPTAIN_COUNT=4;

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
export function naturalCaptainStarters(players,settings={}){
  return [...new Set(players.map(player=>player.position))].flatMap(position=>
    rankDepthPlayers(players,position).filter(player=>player.position===position)
      .slice(0,starterSlots(position,players.filter(player=>player.position===position).length,settings)));
}
export function assignRosterCaptains(players,team={},settings={}){
  if(new Set(players.map(player=>player.row)).size!==players.length)throw Error('Duplicate player in captain selection.');
  const year={Freshman:0,Sophomore:1,Junior:2,Senior:3};
  const score=player=>Number(player.fields.OverallRating)+(year[player.fields.SchoolYear]??0)*2+
    (player.fields.Personality==='Leader'?3:0)+Math.min(3,Math.max(0,Number(player.fields.PLYR_CONSECYEARSWITHTEAM)||0))*.5;
  const compare=(a,b)=>score(b)-score(a)||b.fields.OverallRating-a.fields.OverallRating||a.row-b.row;
  const natural=naturalCaptainStarters(players,settings);
  if(team.captainStarterRows!==undefined&&team.captainStarterRows!==null&&(!Array.isArray(team.captainStarterRows)||
      new Set(team.captainStarterRows).size!==team.captainStarterRows.length||team.captainStarterRows.some(row=>!players.some(player=>player.row===row))))throw Error('Invalid captain starter evidence.');
  const starters=new Set(team.captainStarterRows??natural.map(player=>player.row));
  const eligible=players.filter(player=>starters.has(player.row)).sort(compare),selected=[];
  function choose(pool,count){
    while(count-- > 0&&pool.some(player=>!selected.includes(player))){
      const available=pool.filter(player=>!selected.includes(player)),groups=new Set(selected.map(player=>positionGroup(player.position)));
      selected.push(available.find(player=>!groups.has(positionGroup(player.position)))??available[0]);
    }
  }
  choose(eligible.filter(player=>OFFENSE.has(player.position)&&!SPECIALISTS.has(player.position)),2);
  choose(eligible.filter(player=>!OFFENSE.has(player.position)&&!SPECIALISTS.has(player.position)),2);
  const desired=Math.min(ROSTER_CAPTAIN_COUNT,players.length);
  // Other starting units fill shortages before any backup. Backups are only a
  // last resort for tiny/degenerate rosters with fewer than four starting roles.
  choose(eligible.filter(player=>!SPECIALISTS.has(player.position)),desired-selected.length);
  choose(eligible,desired-selected.length);
  choose([...players].sort(compare),desired-selected.length);
  const rows=new Set(selected.map(player=>player.row));
  for(const player of players){player.fields.PLYR_ISCAPTAIN=rows.has(player.row);player.fields.CaptainsPatch=rows.has(player.row)?'OneYear':'None';}
  return {requested:ROSTER_CAPTAIN_COUNT,policy:'Four captains; normally two offensive and two defensive starters, favoring talent, experience and leadership.',
    selected:selected.map(player=>({row:player.row,position:player.position,classYear:player.fields.SchoolYear,overall:player.fields.OverallRating,personality:player.fields.Personality,starter:starters.has(player.row)}))};
}
