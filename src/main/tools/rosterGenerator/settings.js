import {POSITION_GROUPS,positionGroup} from '../../../shared/positionGroups.js';
import TALENT from '../../../shared/rosterTalent.cjs';
import {schemeChoices,nativeArchetypeWeight} from './schemes.js';
export {TALENT};

export const OFFENSIVE_SCHEMES=Object.freeze(schemeChoices('offense'));
export const DEFENSIVE_SCHEMES=Object.freeze(schemeChoices('defense'));
const LEGACY_SCHEMES={'air-raid':'OFF_AIR_RAID',spread:'OFF_SPREAD',option:'OFF_OPTION','4-3':'DEF_BASE4_3','3-4':'DEF_BASE3_4'};
export const TONE_PRESETS=Object.freeze([
  {id:'standard',name:'Standard',description:'A varied mix of lighter and darker skin tones.'},
  {id:'big-sky',name:'Big Sky',description:'Mostly lighter skin tones; darker tones are more common at skill positions.'},
  {id:'hbcu',name:'HBCU',description:'Almost entirely the darkest skin tones.'}
]);
export const ROSTER_AGES=Object.freeze([
  {id:'standard',name:'Standard',description:'A balanced mix of class years and redshirt experience.'},
  {id:'youth',name:'Youth Movement',description:'Mostly freshmen and sophomores, with some juniors and a smaller senior class.'},
  {id:'veteran',name:'Veteran Heavy',description:'Mostly juniors and seniors, with more redshirt experience.'},
  {id:'seniors',name:'One Last Ride',description:'Every player is a redshirt senior.'}
]);
export const ROSTER_POTENTIALS=Object.freeze([
  {id:'standard',name:'Standard',description:'A typical mix of development traits and room to improve.'},
  {id:'dead-end',name:'Dead End',description:'Normal development only, with strict rating limits.'},
  {id:'low',name:'Low Potential',description:'Mostly Normal development; Star and Elite are very rare.'},
  {id:'high',name:'High Potential',description:'More Impact, Star and Elite players, with higher ceilings.'},
  {id:'sky',name:"Sky’s the Limit",description:'Plenty of high-development talent with very few rating limits.'}
]);
export function normalizeGenerationSettings(options={}) {
  const choice=(key,values,fallback)=>{const input=options[key]??fallback,value=/Scheme$/.test(key)?LEGACY_SCHEMES[input]??input:input;if(!values.some(item=>item.id===value))throw new Error(`Choose a supported ${{offensiveScheme:'offensive scheme',defensiveScheme:'defensive scheme',skinTonePreset:'skin-tone mix',rosterAge:'roster age',rosterPotential:'roster potential'}[key]} option. Older handmade schemes must be replaced with a native scheme.`);return value;};
  const strength=options.positionStrength??{};
  if(!strength||typeof strength!=='object'||Array.isArray(strength)||Object.keys(strength).some(key=>!POSITION_GROUPS.includes(key)))throw new Error('Unknown position strength group.');
  const positionStrength=Object.fromEntries(POSITION_GROUPS.map(group=>{const value=strength[group]??0;if(!Number.isInteger(value)||value< -10||value>10)throw new Error('Position strength must be a whole number from −10 to +10.');return[group,value];}));
  const talentShares=options.talentShares??null;
  if(talentShares!==null&&(!talentShares||typeof talentShares!=='object'||Array.isArray(talentShares)||Object.keys(talentShares).some(key=>!POSITION_GROUPS.includes(key))||Object.values(talentShares).some(value=>!Number.isInteger(value)||value<0||value>100)||Object.values(talentShares).reduce((a,b)=>a+b,0)!==100))throw new Error('Talent shares must be whole percentages totaling 100%.');
  // Old explicit percentages remain custom; never infer a named preset from
  // numbers that merely happen to match it at the original roster size.
  const talentMix=options.talentMix??(talentShares||Object.values(positionStrength).some(Boolean)?'custom':'balanced');
  if(talentMix!=='custom'&&!TALENT.spendingPresets.some(p=>p.id===talentMix))throw new Error('Choose a supported talent mix.');
  const rosterMakeup=options.rosterMakeup??'preserve';
  if(!['preserve','scheme'].includes(rosterMakeup))throw new Error('Choose a supported roster makeup.');
  return {positionStrength,talentShares,talentMix,rosterAge:choice('rosterAge',ROSTER_AGES,'standard'),rosterPotential:choice('rosterPotential',ROSTER_POTENTIALS,'standard'),offensiveScheme:choice('offensiveScheme',OFFENSIVE_SCHEMES,'random'),defensiveScheme:choice('defensiveScheme',DEFENSIVE_SCHEMES,'random'),skinTonePreset:choice('skinTonePreset',TONE_PRESETS,'standard'),reorderDepthChart:options.reorderDepthChart!==false,rosterMakeup,requirementsSource:'scheme',schemeContext:options.schemeContext??null};
}

// Shares fund position strength at different costs. The final projection keeps
// the arithmetic player average fixed, including when rating bounds are hit.
export function positionTalentTargets(targets,preset,settings) {
  const counts={};for(const player of targets){const group=positionGroup(player.position);counts[group]=(counts[group]??0)+1;}
  const shares=resolvedTalentShares(counts,settings);
  return TALENT.targets(counts,preset.targetAverage,shares);
}

function resolvedTalentShares(counts,settings){return settings.talentMix&&settings.talentMix!=='custom'?TALENT.presetShares(counts,settings.talentMix):settings.talentShares??(Object.values(settings.positionStrength??{}).some(Boolean)?TALENT.fromLegacy(counts,settings.positionStrength):null);}
export function describeTalentBudget(targets,settings){const counts={};for(const player of targets){const group=positionGroup(player.position);counts[group]=(counts[group]??0)+1;}return {mix:settings.talentMix??'custom',importance:TALENT.importance,playerCounts:counts,baseline:TALENT.baseline(counts),shares:TALENT.resolvedShares(counts,resolvedTalentShares(counts,settings))};}

export function archetypeWeight(position,archetype,settings) {
  return nativeArchetypeWeight(position,archetype,settings);
}
export function toneWeights(preset,position,appearances) {
  if(preset!=='hbcu'&&['HB','CB'].includes(positionGroup(position)))return preset==='big-sky'?{1:2,2:2,3:4,4:7,5:20,6:30,7:35,8:0}:{1:1,2:1,3:1,4:2,5:25,6:30,7:40,8:0};
  if(preset==='standard'){const weights={};for(const item of appearances){const tone=item.skinTone??Number(item.fields.GenericHeadAssetName.split('_').at(-2));if(tone>=1&&tone<=8)weights[tone]=(weights[tone]??0)+1;}return weights;}
  if(preset==='hbcu')return positionGroup(position)==='K/P'?{1:0,2:1,3:4,4:55,5:25,6:10,7:4,8:1}:{1:0,2:0,3:0,4:.1,5:.1,6:1,7:98.5,8:.3};
  return Object.fromEntries((['QB','HB','WR','TE','CB','FS','SS'].includes(positionGroup(position))?[18,20,20,14,8,12,7,1]:[24,25,22,14,5,6,3,1]).map((weight,i)=>[i+1,weight]));
}
const nameIndexes=new WeakMap();
export function observedFirstNames(catalog,appearance) {
  if(!nameIndexes.has(catalog)){const index=new Map();for(const item of catalog.appearances){const head=item.fields.GenericHeadAssetName;if(!index.has(head))index.set(head,new Set());if(item.firstToken)index.get(head).add(item.firstToken);}nameIndexes.set(catalog,index);}
  return [...(nameIndexes.get(catalog).get(appearance.fields.GenericHeadAssetName)??[])].sort();
}
