import test from 'node:test';
import assert from 'node:assert/strict';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {modelForPreset,rosterPreset} from '../src/main/tools/rosterGenerator/presets.js';
import {normalizeGenerationSettings} from '../src/main/tools/rosterGenerator/settings.js';
import {generateRosterPreview,validateRosterPreview} from '../src/main/tools/rosterGenerator/core.js';
import {ATHLETICISM_PROFILES,athleticVariant,appearancePoolForAthletics,appearancePoolForCaliber} from '../src/main/tools/rosterGenerator/athletics.js';
import {BACKSTORIES,assignBackstories,backstoryContext,storyEligible} from '../src/main/tools/rosterGenerator/backstories.js';
import {mulberry32} from '../src/main/tools/longSnap/core.js';
import {WRITE_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {rosterGeneratorCsv} from '../src/main/tools/rosterGenerator/report.js';

const base=loadObservedCatalog(),positions={QB:4,HB:5,FB:2,WR:9,TE:5,LT:4,LG:4,C:3,RG:4,RT:4,LE:4,RE:4,DT:6,LOLB:4,MLB:4,ROLB:4,CB:7,FS:3,SS:3,K:1,P:1};
function targets(){let id=0;return Object.entries(positions).flatMap(([position,n])=>Array.from({length:n},()=>{const row=id++;return {row,position,visualRow:row,visualOwners:[row],rawData:'{"loadouts":[{"loadoutType":"PlayerOnField","loadoutElements":[]}]}',original:{...Object.fromEntries(WRITE_FIELDS.map(field=>[field,0])),FirstName:'Old',LastName:String(row),OverallRating:70,RecruitingDealbreaker:'Invalid'}};}));}
const input=targets(),team={name:'Test Team',teamIndex:1,branding:'nike'};
function make(id='building-blocks',options={},seed=205){const preset=rosterPreset(id),model=modelForPreset(base,preset,normalizeGenerationSettings(options));return {model,preview:generateRosterPreview({team,targets:input,model,preset,seed})};}

test('bank contains exactly 565 individually authored, unique 2–4 sentence stories',()=>{
  assert.equal(BACKSTORIES.length,565);assert.equal(new Set(BACKSTORIES.map(s=>s.id)).size,565);assert.equal(new Set(BACKSTORIES.map(s=>s.text)).size,565);assert.equal(new Set(BACKSTORIES.map(s=>s.title)).size,565);
  for(const story of BACKSTORIES){const sentences=story.text.match(/[^.!?]+[.!?](?:\s|$)/g)??[];assert.ok(sentences.length>=2&&sentences.length<=4,story.id);assert.ok(story.rule);assert.ok(!/five.star|all.american|transferred|three seasons at|career touchdowns|scholarship/i.test(story.text),story.id);}
});
test('story eligibility rejects contradictory age, talent, size, skill and position claims',()=>{
  const freshman={year:'Freshman',redshirt:'Eligible',overall:58,development:'Normal',athletic:'balanced',small:false,large:false,fast:false,strong:false,limited:false,position:'QB',personality:'Intense'};
  for(const story of BACKSTORIES)assert.equal(storyEligible(story,freshman),['any','true-freshman','young','low-overall','qb','reserved','driven'].includes(story.rule),story.id);
  const veteran={...freshman,year:'Senior',redshirt:'Previous',overall:92,development:'College_Elite',athletic:'technical',fast:true,strong:true,large:true,position:'OL'};
  for(const story of BACKSTORIES)assert.equal(storyEligible(story,veteran),['any','veteran','rs-senior','redshirted','high-overall','high-potential','technical','fast','strong','large-build','ol','reserved','driven','experienced'].includes(story.rule),story.id);
  assert.throws(()=>storyEligible({rule:'invented'},freshman));
});
test('Balanced is 75% and Outlier is 1%, with no hidden rating boost for outliers',()=>{
  assert.equal(ATHLETICISM_PROFILES.reduce((sum,p)=>sum+p.weight,0),100);assert.equal(ATHLETICISM_PROFILES.find(p=>p.id==='balanced').weight,75);assert.equal(ATHLETICISM_PROFILES.find(p=>p.id==='outlier').weight,1);
  const rng=mulberry32(205),counts={};for(let n=0;n<100000;n++){let roll=rng()*100;const picked=ATHLETICISM_PROFILES.find(p=>(roll-=p.weight)<0);counts[picked.id]=(counts[picked.id]??0)+1;}assert.ok(counts.balanced>74000&&counts.balanced<76000);assert.ok(counts.outlier>850&&counts.outlier<1150);
  const model=modelForPreset(base,rosterPreset()),source=model.profiles[0];assert.deepEqual(athleticVariant(model,source,'outlier').ratings,source.ratings);
});
test('lower-caliber builds are smaller within each position; outliers use both observed size tails',()=>{
  let heightReduction=0,weightReduction=0,groups=0;const mean=(items,field)=>items.reduce((sum,item)=>sum+item.fields[field],0)/items.length;
  for(const position of Object.keys(positions)){const all=base.catalog.appearances.filter(p=>p.position===position),low=appearancePoolForCaliber(all,'startup'),fcs=appearancePoolForCaliber(all,'fcs');assert.ok(mean(low,'Weight')<mean(all,'Weight'),position);assert.ok(mean(fcs,'Weight')<mean(all,'Weight'),position);assert.ok(mean(low,'Weight')<=mean(fcs,'Weight'));heightReduction+=mean(all,'Height')-mean(low,'Height');weightReduction+=mean(all,'Weight')-mean(low,'Weight');groups++;
    const small=appearancePoolForAthletics(all,'outlier','small'),large=appearancePoolForAthletics(all,'outlier','large');assert.ok(mean(small,'Weight')<mean(large,'Weight'));assert.ok(mean(small,'Height')<mean(large,'Height'));assert.ok([...small,...large].every(item=>all.includes(item)));
  }
  assert.ok(weightReduction/groups>10,`Average reduction ${weightReduction/groups} lb`);assert.ok(heightReduction/groups>.3,`Average reduction ${heightReduction/groups} inches`);
});
test('stories are deterministic, eligible, varied, reportable and protected against tampering',{timeout:90000},()=>{
  for(const [id,options]of [['startup',{rosterAge:'youth',rosterPotential:'low'}],['building-blocks',{rosterAge:'seniors',rosterPotential:'dead-end'}],['all-time',{rosterAge:'standard',rosterPotential:'sky'}]]){
    const {model,preview}=make(id,options),before=JSON.stringify(preview.players),assigned=assignBackstories(preview.players,model,preview.seed),reordered=assignBackstories([...preview.players].reverse(),model,preview.seed);assert.deepEqual(assigned,reordered);assert.equal(JSON.stringify(preview.players),before);assert.ok(preview.summary.targetAchieved);assert.equal(new Set(preview.players.map(p=>p.backstory.id)).size,preview.players.length);
    for(const player of preview.players){assert.deepEqual(player.backstory,assigned.get(player.row));assert.ok(storyEligible(player.backstory,backstoryContext(player,model)));assert.deepEqual(player.backstory.eligibility,backstoryContext(player,model));assert.ok(!Object.keys(player.fields).some(field=>/backstory/i.test(field)));}
    const csv=rosterGeneratorCsv(preview);assert.equal(csv.headings.length,csv.rows[0].length);for(const field of ['BackstoryID','BackstoryTitle','BackstoryText','BackstoryJSON','OutlierSize'])assert.ok(csv.headings.includes(field));
    for(const mutation of [p=>p.backstory.text='A fabricated college transfer history.',p=>p.backstory.id='invented',p=>p.backstory.eligibility.year='Invented',p=>p.provenance.outlierSize='invented']){const changed=structuredClone(preview);mutation(changed.players[0]);assert.throws(()=>validateRosterPreview(changed,input,model));}
  }
});
