// Hypothesis testing only. Fitted coefficients are NOT recovered game code.
import fs from 'node:fs';
import path from 'node:path';
import {NATIVE_SCHEMES} from '../src/main/tools/rosterGenerator/schemes.js';
const directory=path.resolve('outputs/team-component-investigation'),snapshots=JSON.parse(fs.readFileSync(path.join(directory,'snapshots.json'))),units={offense:{QB:1,HB:1,FB:0,WR:3,TE:1,LT:1,LG:1,C:1,RG:1,RT:1},defense:{LE:1,RE:1,DT:2,LOLB:1,MLB:1,ROLB:1,CB:2,FS:1,SS:1}},mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const summary=[];
function solve(a,b){const m=a.map((r,i)=>[...r,b[i]]),n=b.length;for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(m[r][c])>Math.abs(m[p][c]))p=r;[m[c],m[p]]=[m[p],m[c]];if(Math.abs(m[c][c])<1e-10)return null;const divisor=m[c][c];for(let j=c;j<=n;j++)m[c][j]/=divisor;for(let r=0;r<n;r++)if(r!==c){const factor=m[r][c];for(let j=c;j<=n;j++)m[r][j]-=factor*m[c][j];}}return m.map(r=>r[n]);}
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
function fit(x,y){const n=x[0].length,a=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0);for(let r=0;r<x.length;r++)for(let i=0;i<n;i++){b[i]+=x[r][i]*y[r];for(let j=0;j<n;j++)a[i][j]+=x[r][i]*x[r][j];}return solve(a,b);}
function metrics(rows,side,predict){const errors=rows.map(t=>Math.max(0,Math.min(99,Math.round(predict(t))))-t[side]);return{samples:errors.length,exact:errors.filter(e=>!e).length,withinOne:errors.filter(e=>Math.abs(e)<=1).length,mae:mean(errors.map(Math.abs)),maxError:Math.max(...errors.map(Math.abs))};}
for(const side of ['offense','defense']){
 const train=snapshots[0].teams.filter(t=>!t.directionalFcs),validation=snapshots.slice(1).flatMap(s=>s.teams.filter(t=>!t.directionalFcs)),candidates=[];
 const evaluate=(name,features)=>{const x=train.map(features),coefficients=fit(x,train.map(t=>t[side]));if(!coefficients)return;const predict=t=>dot(features(t),coefficients);candidates.push({name,coefficients,training:metrics(train,side,predict),validation:metrics(validation,side,predict)});};
 const playerValues=t=>t.roster.map(r=>t.players[r]).filter(p=>p&&Object.hasOwn(units[side],p.position)).map(p=>p.overall).sort((a,b)=>b-a);
 evaluate('Affine full-unit roster mean',t=>[1,mean(playerValues(t))]);
 for(let top=8;top<=45;top++)evaluate('Affine best '+top+' unit players',t=>[1,mean(playerValues(t).slice(0,top))]);
 for(const source of ['depth','best-position'])for(const includeFB of [false,true])for(let backupSteps=0;backupSteps<=10;backupSteps++){
  const decay=backupSteps/10,getRoom=(t,p)=>source==='depth'?(t.depth[p]??[]).map(r=>t.players[r]?.overall).filter(Number.isFinite):t.roster.map(r=>t.players[r]).filter(x=>x.position===p).map(x=>x.overall).sort((a,b)=>b-a);
  const weighted=t=>{let total=0,weight=0;for(const [p,count]of Object.entries(units[side])){const starters=p==='FB'&&includeFB?1:count;if(!starters)continue;getRoom(t,p).forEach((v,i)=>{const w=i<starters?1:decay**(i-starters+1);total+=v*w;weight+=w;});}return total/weight;};
  evaluate('Affine '+source+' decay '+decay+(includeFB?' with FB':''),t=>[1,weighted(t)]);
 }
 for(const source of ['depth','best-position'])for(let top=1;top<=4;top++){
  const positions=Object.keys(units[side]).filter(p=>p!=='FB');
  evaluate('Fitted position weights '+source+' top '+top,t=>[1,...positions.map(p=>mean((source==='depth'?(t.depth[p]??[]).map(r=>t.players[r]?.overall).filter(Number.isFinite):t.roster.map(r=>t.players[r]).filter(x=>x.position===p).map(x=>x.overall).sort((a,b)=>b-a)).slice(0,top)))]);
 }
 candidates.sort((a,b)=>a.validation.mae-b.validation.mae);
 summary.push({side,trainingFile:snapshots[0].file,validationFiles:snapshots.slice(1).map(s=>s.file),hypothesesTested:candidates.length,bestHeldOutCandidates:candidates.slice(0,8)});
}
fs.writeFileSync(path.join(directory,'fitted-candidates.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
// A separate, parameter-free test of the 40..80 tuning remap. Integer
// quantization before scaling and rounding only after scaling are not the same.
const tuning=JSON.parse(fs.readFileSync('outputs/team-overall-investigation/evidence.json')).tables.find(t=>t.name==='RosterTuning').records[0].values,min=tuning.DesiredMinTeamRatingValue,max=tuning.DesiredMaxTeamRatingValue;
const remap=value=>Math.max(0,Math.min(99,Math.trunc((value-min)*99/(max-min)))),inverse=new Map(Array.from({length:max-min+1},(_,i)=>[remap(min+i),min+i])),rows=snapshots.flatMap(s=>s.teams.filter(t=>!t.directionalFcs));
const discrete={min,max,inverse:Object.fromEntries(inverse),matches:0,total:rows.length*2,exceptions:[],candidates:[]};
for(const team of rows)for(const side of ['offense','defense'])if(inverse.has(team[side]))discrete.matches++;else discrete.exceptions.push({team:team.name,side,rating:team[side]});
for(const side of ['offense','defense']){
 const tests=[],evaluate=(name,raw)=>{for(const rounding of ['floor','round']){const perSave=snapshots.map(s=>({file:s.file,...metrics(s.teams.filter(t=>!t.directionalFcs),side,t=>remap(Math[rounding](raw(t))))}));tests.push({name:name+' / raw '+rounding,perSave,mae:mean(perSave.map(m=>m.mae)),exact:perSave.reduce((n,m)=>n+m.exact,0)});}};
 for(const includeFB of [false,true]){
  const positions=Object.keys(units[side]).filter(p=>p!=='FB'||includeFB),room=(t,p,source)=>source==='depth'?(t.depth[p]??[]).map(r=>t.players[r]?.overall).filter(Number.isFinite):t.roster.map(r=>t.players[r]).filter(x=>x.position===p).map(x=>x.overall).sort((a,b)=>b-a);
  evaluate('All unit roster players'+(includeFB?' with FB':''),t=>mean(positions.flatMap(p=>room(t,p,'best-position'))));
  for(const source of ['depth','best-position'])for(const count of [1,2,3,4,5,6,100])for(const roundRoom of [false,true])evaluate(source+' equal position weights top '+count+(roundRoom?' integer room means':'')+(includeFB?' with FB':''),t=>mean(positions.map(p=>{const r=room(t,p,source).slice(0,count);return r.length?(roundRoom?Math.floor(mean(r)):mean(r)):null;}).filter(v=>v!==null)));
  for(const source of ['depth','best-position'])evaluate(source+' chosen scheme depth importance'+(includeFB?' with FB':''),t=>{const scheme=NATIVE_SCHEMES.find(s=>s.enum===t.schemes[side]);let sum=0,weights=0;for(const p of positions){const r=room(t,p,source);for(const want of scheme?.positions[p]?.wants??[]){const v=r[want.depthSlot-1];if(Number.isFinite(v)){sum+=v*want.importance;weights+=want.importance;}}}return sum/weights;});
 }
 for(let count=8;count<=50;count++)evaluate('Best '+count+' unit players',t=>mean(t.roster.map(r=>t.players[r]).filter(p=>Object.hasOwn(units[side],p.position)).map(p=>p.overall).sort((a,b)=>b-a).slice(0,count)));
 tests.sort((a,b)=>a.mae-b.mae);discrete.candidates.push({side,hypothesesTested:tests.length,best:tests.slice(0,8)});
}
fs.writeFileSync(path.join(directory,'quantized-candidates.json'),JSON.stringify(discrete,null,2));console.log('40..80 integer scaling levels:',discrete.matches,'/',discrete.total);for(const result of discrete.candidates)console.log(result.side,result.best.slice(0,3));
const outerMatches=rows.filter(t=>Math.trunc((60*t.offense+40*t.defense)/100)===t.overall).length;
fs.writeFileSync(path.join(directory,'findings.txt'),`OFFENSE / DEFENSE RATING INVESTIGATION

Inputs
${snapshots.map(s=>path.basename(s.file)+' — '+s.teams.filter(t=>!t.directionalFcs).length+' FBS teams\nSHA256: '+s.sha256).join('\n')}
All three inputs were opened read-only and their hashes checked unchanged.

Confirmed saved-data observations
- ${rows.length} FBS team snapshots, spanning 2026, 2032 and 2038.
- ${outerMatches}/${rows.length} cached overall ratings equal trunc((60*OFF + 40*DEF)/100).
- ${discrete.matches}/${discrete.total} OFF/DEF values lie on the discrete scale generated by trunc((integerScore - ${min}) * 99 / (${max} - ${min})), with scores bounded to ${min}..${max}. Examples: 70 -> 74, 75 -> 86, 78 -> 94, 79 -> 96, 80 -> 99.

Interpretation, NOT recovered source code
The stepped values strongly support integer quantization and a 40..80-to-0..99 scale, rather than OFF/DEF being ordinary average player ratings. The existing static tuning inspection reports the same 40 and 80 bounds. Matching the attainable output levels does NOT establish what the underlying score represents, when it is truncated, or which players enter it.

Tests that did not recover the exact component formula
- Straight roster averages, best-player/starter averages, different starter counts, FB inclusion/exclusion, depth order versus best natural-position order.
- Backup depth decay, per-position averages, intermediate rounding, native scheme depth-slot importance and alternative top-N player pools.
- ${summary[0].hypothesesTested} fitted models per side; coefficients trained on 2026, checked separately against 2032/2038. These are fitted hypotheses, not verified game formulas.
- ${discrete.candidates[0].hypothesesTested} parameter-free quantized candidates per side. Best across all saves: offense ${discrete.candidates[0].best[0].exact}/${rows.length} exact; defense ${discrete.candidates[1].best[0].exact}/${rows.length} exact. They still miss real teams, so none was installed as an exact calculator.

Unresolved
How CalculateOffensiveRating / CalculateDefensiveRating produce the underlying score. Their implementation bodies were not recovered from the supplied schema/expression assets. The evidence does not distinguish all possible weighting, eligibility, cached-rating timing, grade recalculation or coach-modifier effects. No particular cause is asserted without proof.

Next useful evidence
The runtime implementation, or controlled in-game before/after saves with a known isolated rating/depth-chart change and confirmed recalculation, would discriminate these remaining possibilities. Ordinary snapshots alone do not uniquely determine the native algorithm.

No app team-rating formula was changed and no example save was written.
Artifacts: snapshots.json (rosters, depth charts, saved ratings and numeric player ratings); candidate-results.json; fitted-candidates.json; quantized-candidates.json.
`);
