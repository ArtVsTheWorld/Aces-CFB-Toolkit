import {patchLongSnapRatings,mulberry32} from '../longSnap/core.js';
import {matchingPitch} from '../dealbreaker/pitches.js';
import {assignRosterCaptains} from './playerState.js';
import {patchDealbreakers} from '../dealbreaker/core.js';
import {runRenumberEngine} from '../jersey/core/renumberEngine.js';
import {OFFENSE,SPECIALISTS} from '../jersey/shared.js';
import RULES from '../jersey/core/rules.js';
import {resolveDuplicates} from '../jersey/core/duplicateResolver.js';

export function standardRosterNumbers(players,team,seed) {
  const random=mulberry32(seed),sides={offense:[],defense:[],specialists:[]};
  for(const input of players){
    const fields=input.fields??{Position:input.position,OverallRating:input.overall};
    const position=input.position??fields.Position,rule=RULES[position];
    if(!rule)throw new Error(`No jersey rules for ${position}.`);
    const pool=rule.preferred.flat(),number=pool[Math.floor(random()*pool.length)];
    // Deliberately no Age: the shared engine falls through to class/redshirt.
    const player={...fields,Position:position,TeamIndex:0,IsNIL:false,JerseyNum:number,originalJerseyNum:number,row:input.row};
    sides[SPECIALISTS.has(position)?'specialists':OFFENSE.has(position)?'offense':'defense'].push(player);
  }
  const {stats}=runRenumberEngine(new Map([[0,sides]]),new Map([[0,team]]),{enableTeamRules:false,enableRetiredNumbers:false,enablePromotions:true,random});
  const assigned=new Map(),reasons={};
  for(const roster of Object.values(sides)){
    resolveDuplicates(roster);
    for(const player of roster){if(player.mustRenumberDuplicate||!Number.isInteger(player.JerseyNum)||player.JerseyNum<0||player.JerseyNum>99)throw new Error('Standard jersey allocation could not safely number this roster.');assigned.set(player.row,player.JerseyNum);reasons[player.row]=player.assignmentReason??'Standard position allocation';}
  }
  return {assigned,retired:[],stats,reasons};
}

export function finishGeneratedRoster(players,team,seed) {
  const records=players.map(player=>({...player.fields,Position:player.position,TeamIndex:team.teamIndex??0}));
  const longSnap=patchLongSnapRatings(records,{apply:true,random:mulberry32((seed^0x1952)>>>0)});
  const dealbreakers=patchDealbreakers(records,{teamNames:new Map([[team.teamIndex??0,team.name]]),restrictPlayingStylePositions:true,fixInvalidPlayingStyle:true,seed:(seed^0xdecaf)>>>0,apply:true});
  records.forEach((record,i)=>{players[i].fields.LongSnapRating=record.LongSnapRating;players[i].fields.RecruitingDealbreaker=record.RecruitingDealbreaker;players[i].fields.IdealRecruitingPitch=matchingPitch(record.RecruitingDealbreaker,record.IdealRecruitingPitch,(seed^0xdecaf)>>>0,players[i].row);});
  const captains=assignRosterCaptains(players,team);
  // Numbers are the last mutation, after the final ratings and identities.
  const numbers=standardRosterNumbers(players,team.name,(seed^0x4a455253)>>>0);
  for(const player of players)player.fields.JerseyNum=numbers.assigned.get(player.row);
  return {captains,longSnap:longSnap.map(({row,oldRating,newRating,reason})=>({row:players[row].row,oldRating,newRating,reason})),dealbreakers:dealbreakers.outcomes.map(({row,oldValue,newValue,oldPitch,newPitch,reasons})=>({row:players[row].row,oldValue,newValue,oldPitch,newPitch,reasons})),dealbreakerPopulation:dealbreakers.population,jersey:{stats:numbers.stats,reasons:numbers.reasons,teamTraditions:false,retiredProtection:false}};
}
