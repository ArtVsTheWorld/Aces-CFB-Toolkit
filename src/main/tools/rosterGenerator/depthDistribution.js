import {positionGroup,POSITION_GROUPS} from '../../../shared/positionGroups.js';
import {roomRatingTargets} from './roomTargets.js';
export const DEPTH_MODES=Object.freeze([{id:'balanced',name:'Balanced',description:'A natural mix of stronger and weaker players.'},{id:'starters',name:'Starters First',description:'Put more talent in the leading players, with a bigger drop to backups.'},{id:'deep',name:'Deep Roster',description:'Keep backups closer to the leading players.'}]);
export function normalizeDepth(options={}){
 const mode=options.talentDistribution??'balanced',overrides=options.positionDistributions??{};
 if(!DEPTH_MODES.some(m=>m.id===mode)||!overrides||typeof overrides!=='object'||Array.isArray(overrides)||Object.entries(overrides).some(([g,m])=>!POSITION_GROUPS.includes(g)||!DEPTH_MODES.some(v=>v.id===m)))throw Error('Choose a supported talent distribution for each position.');
 return {talentDistribution:mode,positionDistributions:{...overrides}};
}
export const depthMode=(settings,position)=>settings?.positionDistributions?.[positionGroup(position)]??settings?.talentDistribution??'balanced';
export function starterSlots(position,n,settings={}){
 const offense=settings.schemeContext?.offense?.id??settings.schemeContext?.offense?.enum??settings.offensiveScheme??'',defense=settings.schemeContext?.defense?.id??settings.schemeContext?.defense?.enum??settings.defensiveScheme??'';
 const roles={WR:/OPTION|FLEXBONE/.test(offense)?2:3,TE:/PRO_STYLE|POWER_RUN/.test(offense)?2:1,DT:/3_4/.test(defense)?1:2,MLB:/3_4/.test(defense)?2:1,CB:2};return Math.min(n,roles[position]??1);
}
export function depthRoomTargets(rows,average,spread,rng,settings={}){
 const mode=depthMode(settings,rows[0]?.position);
 if(mode==='balanced')return roomRatingTargets(rows,average,spread,rng);
 if(!rows.length)return new Map();
 const shuffled=[...rows];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 const n=rows.length,k=starterSlots(rows[0].position,n,settings),width=Math.min(12,spread),raw=shuffled.map((_,i)=>average+(mode==='deep'||k===n?width*.35*(n===1?0:1-2*i/(n-1)):width*(i<k?1.6+.3*(k===1?0:1-2*i/(k-1)):-.25-1.1*(n-k===1?0:(i-k)/(n-k-1)))));
 // Project onto the valid OVR range while preserving the requested room mean.
 const goal=Math.max(30,Math.min(99,average))*n;let low=-100,high=100;
 for(let i=0;i<60;i++){const mid=(low+high)/2,sum=raw.reduce((s,v)=>s+Math.max(30,Math.min(99,v+mid)),0);if(sum<goal)low=mid;else high=mid;}
 return new Map(shuffled.map((row,i)=>[row.row,Math.max(30,Math.min(99,raw[i]+(low+high)/2))]));
}
export function depthAudit(players,settings={}){
 const groups={};for(const p of players){const g=positionGroup(p.position);(groups[g]??=[]).push(p);}
 return Object.fromEntries(Object.entries(groups).map(([group,room])=>{const leading=[],backups=[];for(const pos of new Set(room.map(p=>p.position))){const sorted=room.filter(p=>p.position===pos).sort((a,b)=>b.fields.OverallRating-a.fields.OverallRating||a.row-b.row),k=starterSlots(pos,sorted.length,settings);leading.push(...sorted.slice(0,k));backups.push(...sorted.slice(k));}const mean=r=>r.length?r.reduce((s,p)=>s+p.fields.OverallRating,0)/r.length:null;return[group,{mode:depthMode(settings,room[0].position),average:mean(room),leading:leading.map(p=>p.fields.OverallRating).sort((a,b)=>b-a),backupAverage:mean(backups),players:room.length}];}));
}
