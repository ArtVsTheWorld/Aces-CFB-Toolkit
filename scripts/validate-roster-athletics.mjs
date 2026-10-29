// Read-only sampling audit. Does not open, create, or Apply a dynasty save.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {ROSTER_PRESETS,modelForPreset} from '../src/main/tools/rosterGenerator/presets.js';
import {normalizeGenerationSettings,positionTalentTargets} from '../src/main/tools/rosterGenerator/settings.js';
import {solveFootballProfiles} from '../src/main/tools/rosterGenerator/core.js';
import {ATHLETIC_RATINGS,observedAthleticBounds} from '../src/main/tools/rosterGenerator/athleticBounds.js';
import {RATING_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {calculateOverall} from '../src/main/tools/rosterGenerator/ratings.js';
const number=Number(process.argv.find(a=>a.startsWith('--seeds='))?.slice(8)??100);assert.ok(Number.isInteger(number)&&number>0);
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9),base=loadObservedCatalog(),sizes={QB:4,HB:6,FB:1,WR:9,TE:5,LT:4,LG:3,C:4,RG:3,RT:3,LE:5,RE:4,DT:6,LOLB:4,MLB:4,ROLB:5,CB:8,FS:4,SS:3,K:2,P:1},targets=[];
for(const [position,count]of Object.entries(sizes))for(let i=0;i<count;i++)targets.push({row:targets.length,position});
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length,index=f=>RATING_FIELDS.indexOf(f),summaries=[],extra=[];
function inspect(model,preset,seed){
 const run=solveFootballProfiles(targets,model,seed,preset);assert.ok(Math.abs(run.actualSum/targets.length-preset.targetAverage)<=1,`${preset.id} seed ${seed} target`);
 for(const item of run.selected){
  const native=base.byId.get(item.profile.id),bounds=observedAthleticBounds(model,item.target.position,item.athleticProfile);assert.ok(native.source>0);assert.equal(native.position,item.target.position);assert.equal(calculateOverall(item.profile,model.formulas),item.profile.overall);
  for(const field of ATHLETIC_RATINGS){const value=item.profile.ratings[index(field)],bound=bounds[index(field)];assert.ok(Number.isInteger(value)&&value>=bound.minimum&&value<=bound.maximum,`${preset.id}/${item.target.position}/${field}`);}
  if(native.physical.some(t=>t!=='None'))assert.ok(item.profile.ratings.every((value,i)=>value>=native.ratings[i]),'No unknown ability requirements weakened');
  for(const alternate of item.pool){assert.equal(alternate.id,item.profile.id);for(const field of ATHLETIC_RATINGS)assert.equal(alternate.ratings[index(field)],item.profile.ratings[index(field)],'Balancing cannot replace physical package');}
  if(item.target.position==='DT')assert.ok(item.profile.ratings[index('SpeedRating')]<99,'No 99-speed defensive tackles');
 }
 return run;
}
for(const preset of ROSTER_PRESETS){
 const settings=normalizeGenerationSettings(),model=modelForPreset(base,preset,settings,positionTalentTargets(targets,preset,settings)),byPosition=new Map(),averages=[];
 for(let seed=1;seed<=number;seed++){
  const run=inspect(model,preset,seed*1009+246);averages.push(run.actualSum/targets.length);
  for(const item of run.selected){const rows=byPosition.get(item.target.position)??[];rows.push(item);byPosition.set(item.target.position,rows);}
 }
 const summary={preset:preset.id,seeds:number,players:targets.length*number,averageRange:[Math.min(...averages),Math.max(...averages)],positions:Object.fromEntries([...byPosition].map(([position,items])=>[position,{players:items.length,overall:mean(items.map(p=>p.profile.overall)),physical:Object.fromEntries(ATHLETIC_RATINGS.map(field=>{const values=items.map(p=>p.profile.ratings[index(field)]);return [field,{mean:mean(values),minimum:Math.min(...values),maximum:Math.max(...values),at99:values.filter(v=>v===99).length}];})),meanNativeOverallShift:mean(items.map(p=>p.profile.overall-base.byId.get(p.profile.id).overall))}]))};summaries.push(summary);console.log(`PASS ${preset.id}: ${number} seeds, ${summary.players} players; average ${summary.averageRange.map(v=>v.toFixed(3)).join('–')}`);
}
const corners=[{rosterAge:'seniors',rosterPotential:'dead-end'},{rosterAge:'youth',rosterPotential:'sky',talentMix:'playmakers'},{rosterAge:'veteran',rosterPotential:'low',offensiveScheme:'OFF_AIR_RAID',defensiveScheme:'DEF_BASE4_3'},{talentMix:'custom',talentShares:{QB:5,HB:3,FB:1,WR:12,TE:4,OL:22,EDGE:15,DT:12,LB:8,CB:8,FS:3,SS:5,'K/P':2}}];
for(const options of corners)for(const preset of [ROSTER_PRESETS[0],ROSTER_PRESETS.at(-1)]){const settings=normalizeGenerationSettings(options),model=modelForPreset(base,preset,settings,positionTalentTargets(targets,preset,settings));for(let seed=1;seed<=10;seed++)inspect(model,preset,seed*2767);extra.push({preset:preset.id,settings,seeds:10});console.log('PASS settings corner '+preset.id+' '+JSON.stringify(options));}
const result={verified:true,source:'unmodified EA athletic references; generated native packages; read-only football selection',presetSeeds:number,totalRosters:summaries.length*number+extra.length*10,totalPlayers:(summaries.length*number+extra.length*10)*targets.length,summaries,extra};if(output)fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(`PASS ${result.totalRosters} rosters / ${result.totalPlayers} players`);
