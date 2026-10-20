import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import TALENT from '../src/shared/rosterTalent.cjs';
import {roomRatingTargets} from '../src/main/tools/rosterGenerator/roomTargets.js';
import {generatedRecruitStars,RECRUIT_STARS} from '../src/main/tools/rosterGenerator/recruiting.js';
import {mulberry32} from '../src/main/tools/longSnap/core.js';
import {BACKSTORIES} from '../src/main/tools/rosterGenerator/backstories.js';
import {equipmentDisplayName,recolorEquipmentItem,UNLOCKED_POOLS} from '../src/main/tools/equipment/catalog.js';
import {MOD_FACE_PAINT_ITEMS} from '../src/main/tools/equipment/core/facepaint.js';
import {normalizeModPools} from '../src/main/tools/equipment/core/modPools.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {calibrateProfile,rosterPreset} from '../src/main/tools/rosterGenerator/presets.js';
import {RATING_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
const counts={QB:3,HB:5,FB:1,WR:9,TE:5,OL:15,EDGE:6,DT:5,LB:8,CB:8,SS:4,FS:4,'K/P':4};
test('spending presets are whole-number valid budgets with protected specialists',()=>{
  const baseline=TALENT.baseline(counts),offense=new Set(['QB','HB','FB','WR','TE','OL']),sum=(shares,set)=>Object.entries(shares).reduce((n,[g,v])=>n+(set.has(g)?v:0),0);
  for(const preset of TALENT.spendingPresets){const shares=TALENT.presetShares(counts,preset.id);assert.equal(TALENT.allocationError(shares,counts),'');assert.ok(shares['K/P']>=baseline['K/P']);}
  assert.ok(sum(TALENT.presetShares(counts,'offense'),offense)>sum(baseline,offense));assert.ok(sum(TALENT.presetShares(counts,'defense'),offense)<sum(baseline,offense));
  assert.equal(TALENT.editShare(baseline,'K/P',0,counts)['K/P'],baseline['K/P']);
  const invalid={...baseline,QB:baseline.QB+baseline['K/P'],'K/P':0};assert.match(TALENT.allocationError(invalid,counts),/specialist/);assert.equal(TALENT.allocationError(TALENT.resolvedShares(counts,invalid),counts),'');
});
test('premium ratings have diminishing returns while the roster average remains fixed',()=>{
  const base=TALENT.baseline(counts),a=TALENT.targets(counts,69,TALENT.redistribute(base,'QB',base.QB+10,counts)),b=TALENT.targets(counts,69,TALENT.redistribute(base,'QB',base.QB+20,counts));assert.ok(a.QB>69);assert.ok(b.QB-a.QB<a.QB-69);
  for(const targets of [a,b]){assert.ok(Object.values(targets).some(v=>v<69));const n=Object.values(counts).reduce((a,b)=>a+b,0);assert.ok(Math.abs(Object.entries(targets).reduce((s,[g,v])=>s+counts[g]*v,0)/n-69)<1e-8);}
});
test('a three-QB room uses a graduated centered spread rather than independent extremes',()=>{
  const rows=[{row:1},{row:2},{row:3}];for(let seed=0;seed<50;seed++){const a=roomRatingTargets(rows,82,8,mulberry32(seed)),values=[...a.values()].sort((a,b)=>b-a);assert.ok(values[0]>=89&&values[0]<=91);assert.ok(values[1]>=81&&values[1]<=83);assert.ok(values[2]>=73&&values[2]<=75);assert.ok(Math.abs(values.reduce((a,b)=>a+b,0)/3-82)<1e-8);assert.deepEqual(a,roomRatingTargets(rows,82,8,mulberry32(seed)));}
});
test('speed floors survive downward calibration without inventing ability packages',()=>{
  const model=loadObservedCatalog(),index=RATING_FIELDS.indexOf('SpeedRating'),minimums={WR:74,FS:74,SS:74,HB:75,CB:75,TE:68,FB:68,LOLB:70,MLB:70,ROLB:70};
  for(const [position,floor]of Object.entries(minimums)){const source=model.byPosition.get(position).find(p=>p.physical.every(t=>t==='None'));const profile=calibrateProfile(source,60,model.formulas);assert.ok(profile.ratings[index]>=floor,position);assert.deepEqual(profile.physical,source.physical);}
  assert.equal(rosterPreset('all-time').targetAverage,83);assert.equal(normalizeEquipmentOptions({},false).unlockedTattooCap,40);assert.equal(normalizeEquipmentOptions({unlockedTattooCap:33},false).unlockedTattooCap,33);
});
test('recruit stars favor better players, retain rare surprises and replay exactly',()=>{
  const sample=overall=>Array.from({length:2000},(_,row)=>generatedRecruitStars({OverallRating:overall,SchoolYear:'Freshman',RedshirtStatus:'Eligible'},741,row)),low=sample(55),high=sample(91),mean=a=>a.reduce((s,v)=>s+RECRUIT_STARS.indexOf(v)+1,0)/a.length;
  assert.ok(mean(high)>mean(low)+2);assert.ok(low.some(v=>RECRUIT_STARS.indexOf(v)>=2));assert.ok(high.some(v=>RECRUIT_STARS.indexOf(v)<=2));assert.deepEqual(low,sample(55));assert.ok([...low,...high].every(v=>RECRUIT_STARS.includes(v)));
});
test('565 unique two-sentence stories retain eligibility and a 60/40 topic mix',()=>{
  assert.equal(BACKSTORIES.length,565);assert.equal(new Set(BACKSTORIES.map(s=>s.id)).size,565);assert.equal(new Set(BACKSTORIES.map(s=>s.title)).size,565);assert.equal(new Set(BACKSTORIES.map(s=>s.text)).size,565);assert.equal(BACKSTORIES.filter(s=>s.topic==='football').length,339);
  for(const story of BACKSTORIES){assert.equal(story.text.match(/[^.!?]+[.!?](?:\s|$)/g)?.length,2,story.id);assert.ok(story.rule);assert.ok(!/development outlook|current football profile|meaningful upside|tools available/.test(story.text),story.id);}
});
test('all Irish Jamo colors generate only from Unlocked and recolor as a family',()=>{
  const config=normalizeModPools(),ids={white:'WHI',black:'BLA',primary:'PRI',secondary:'SEC'};assert.equal(UNLOCKED_POOLS.undershirts.length,4);
  for(const item of UNLOCKED_POOLS.undershirts){assert.equal(item.origin,'unlocked');assert.deepEqual(item.slots,['InnerShirt']);assert.match(equipmentDisplayName(item.itemName),/^Irish Jamo Sleeves /);assert.ok(config.unlocked.undershirts.items.includes(item.itemName));for(const [color,suffix]of Object.entries(ids))assert.equal(recolorEquipmentItem(item.itemName,color),'G_CompressionT_Crew_ShortSleeve_BasicJ_'+suffix);}
});
test('Unlocked owns GABOS, Kill Everybody, Trust God and custom 1-10, not the distinct RAW killall design',()=>{
  for(const item of ['FaceMarks_NoseTape_G','FaceMarks_NoseTape_KE','FaceMarks_NoseTape_T',...Array.from({length:10},(_,i)=>'FaceMarks_NoseTape_C'+(i+1))]){assert.ok(MOD_FACE_PAINT_ITEMS.unlocked.includes(item));assert.ok(!MOD_FACE_PAINT_ITEMS.raw.includes(item));}
  assert.ok(MOD_FACE_PAINT_ITEMS.raw.includes('FaceMarks_RawNoseTape_killall'));
});
test('completion notification is central, apply-only and cannot turn success into failure',async()=>{
  let api;
  const listeners=new Map(),electron={contextBridge:{exposeInMainWorld:(_,value)=>api=value},ipcRenderer:{invoke:async()=>({status:'completed'}),on:(name,fn)=>listeners.set(name,fn),removeListener:()=>{}}};
  const context=vm.createContext({require:()=>electron});
  vm.runInContext(fs.readFileSync(new URL('../src/main/preload.cjs',import.meta.url),'utf8'),context);
  let count=0;const remove=api.onToolApplied(()=>count++);api.onToolApplied(()=>{throw Error('Audio unavailable');});await api.runTool({mode:'preview'});assert.equal(count,0);assert.equal((await api.runTool({mode:'apply'})).status,'completed');assert.equal(count,1);remove();await api.runTool({mode:'apply'});assert.equal(count,1);
});
