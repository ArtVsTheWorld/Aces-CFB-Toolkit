import test from 'node:test';
import assert from 'node:assert/strict';
import {BACKSTORY_GROUPS,BACKSTORIES} from '../src/main/tools/rosterGenerator/backstoryBank.js';
import {EXPANSION_GROUPS,EXTRA_BACKSTORIES} from '../src/main/tools/rosterGenerator/backstoryExpansion.js';
import {EASTER_EGG_BACKSTORIES} from '../src/main/tools/rosterGenerator/backstoryEasterEggs.js';
import {storyEligible} from '../src/main/tools/rosterGenerator/backstories.js';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {modelForPreset,rosterPreset} from '../src/main/tools/rosterGenerator/presets.js';
import {RATING_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {ATHLETICISM_PROFILES,MENTAL_RATINGS,athleticProfilePool,athleticVariant} from '../src/main/tools/rosterGenerator/athletics.js';
import {OFFENSIVE_SCHEMES,DEFENSIVE_SCHEMES,normalizeGenerationSettings,archetypeWeight,toneWeights} from '../src/main/tools/rosterGenerator/settings.js';

test('expansion preserves 250 originals and adds the exact 300-category breakdown plus 15 easter eggs',()=>{
  assert.equal(BACKSTORY_GROUPS.reduce((sum,g)=>sum+g.stories.length,0),250);
  assert.equal(EXTRA_BACKSTORIES.length,300);
  assert.deepEqual(EXPANSION_GROUPS.map(g=>[g.category,g.stories.length]),[
    ['Off the Field',40],['Personality & Character',40],['Relationships & Dating',30],['Friendships & Social Circles',25],['Academics & Career Goals',30],['Money & Lifestyle',25],['Social Media & Reputation',25],['Hobbies & Hidden Talents',25],['Personal Struggles & Growth',20],['Campus Stories & Antics',25],['Beliefs, Values & Motivations',15]
  ]);
  assert.equal(EASTER_EGG_BACKSTORIES.length,15);assert.equal(BACKSTORIES.length,565);
  assert.ok(EASTER_EGG_BACKSTORIES.some(s=>s.text.includes('making mods for the college football video game')));
  for(const story of EASTER_EGG_BACKSTORIES){assert.equal(story.easterEgg,true);assert.equal(story.rule,'any');if(story.id!=='easter-game-modder')assert.match(story.source,/^https:\/\//);}
});

test('personality stories require compatible game personalities, without inventing academic or NIL requirements',()=>{
  const accepted={performer:['Entertainer','Unpredictable'],unpredictable:['Entertainer','Unpredictable'],'team-first':['TeamPlayer','Leader'],reserved:['TeamPlayer','Intense'],driven:['Intense','Leader']};
  for(const [rule,personalities]of Object.entries(accepted))for(const personality of ['Intense','TeamPlayer','Unpredictable','Entertainer','Leader'])assert.equal(storyEligible({rule},{personality}),personalities.includes(personality),`${rule}/${personality}`);
  assert.equal(storyEligible({rule:'experienced'},{year:'Freshman',redshirt:'Eligible'}),false);
  assert.equal(storyEligible({rule:'experienced'},{year:'Freshman',redshirt:'Previous'}),true);
  for(const year of ['Sophomore','Junior','Senior'])assert.equal(storyEligible({rule:'experienced'},{year,redshirt:'Eligible'}),true);
});

test('rare mental/execution profiles trade positional skill against reading the game at comparable OVR',()=>{
  const model=modelForPreset(loadObservedCatalog(),rosterPreset()),athletic=new Set(['SpeedRating','AccelerationRating','AgilityRating','ChangeOfDirectionRating','JumpingRating','StrengthRating']);
  for(const id of ['cerebral','drill'])assert.equal(ATHLETICISM_PROFILES.find(p=>p.id===id).weight,1);
  for(const [position,pool]of model.byPosition){
    const available=athleticProfilePool(pool,'cerebral');assert.ok(available.every(p=>p.physical.every(tier=>tier==='None')));
    const source=available[Math.floor(available.length/2)],formula=model.formulas.get(`${position}|${source.archetype}`),before=[...source.ratings],savant=athleticVariant(model,source,'cerebral'),drill=athleticVariant(model,source,'drill');
    const indices=RATING_FIELDS.map((field,i)=>[field,i]),mental=indices.filter(([f])=>MENTAL_RATINGS.has(f)),skill=indices.filter(([f])=>formula.coefficients[f]>0&&!MENTAL_RATINGS.has(f)&&!athletic.has(f));
    const mean=(player,fields)=>fields.reduce((sum,[,i])=>sum+player.ratings[i],0)/fields.length;
    assert.ok(mental.every(([,i])=>savant.ratings[i]>=88),position);
    assert.ok(mental.every(([,i])=>drill.ratings[i]<=55),position);
    assert.ok(mean(savant,skill)<mean(drill,skill),position);
    assert.ok(Math.abs(savant.overall-source.overall)<=1,position);
    assert.ok(Math.abs(drill.overall-source.overall)<=1,position);
    assert.deepEqual(source.ratings,before);assert.strictEqual(athleticVariant(model,source,'cerebral'),savant);
    const protectedSource=pool.find(p=>model.observedById.get(p.id).physical.some(t=>t!=='None'));
    if(protectedSource)for(const id of ['cerebral','drill']){
      const result=athleticVariant(model,protectedSource,id),observed=model.observedById.get(protectedSource.id);
      assert.ok(result.ratings.every((rating,i)=>rating>=observed.ratings[i]),`${position}/${id}/ability floor`);
    }
  }
});

test('six defensive options include soft run-defense preferences with stable preset round trips',()=>{
  assert.equal(DEFENSIVE_SCHEMES.length,OFFENSIVE_SCHEMES.length);assert.equal(DEFENSIVE_SCHEMES.length,6);
  const settings=normalizeGenerationSettings({defensiveScheme:'run-first'});assert.deepEqual(normalizeGenerationSettings(JSON.parse(JSON.stringify(settings))),settings);
  for(const [position,archetype]of [['DT','DT_NoseTackle'],['DT','DT_PurePower'],['MLB','MLB_RunStopper'],['SS','S_RunSupport']])assert.equal(archetypeWeight(position,archetype,settings),3);
  assert.equal(archetypeWeight('CB','CB_MantoMan',settings),1);assert.equal(archetypeWeight('QB','QB_Scrambler',settings),1);
});

test('appearance distribution resolves specialist overrides without affecting other preset defaults',()=>{
  for(const position of ['K','P']){const weights=toneWeights('hbcu',position,[]);assert.ok(weights[4]+weights[5]>weights[6]+weights[7]);assert.equal(Object.values(weights).reduce((a,b)=>a+b,0),100);}
  assert.equal(toneWeights('hbcu','WR',[])[7],98.5);assert.equal(toneWeights('big-sky','QB',[])[1],18);
});
