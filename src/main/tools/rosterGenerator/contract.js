// Explicit generation/write contract. Age, identity bindings and references
// outside this allowlist must never be changed by Roster Generator.
import {STATE_FIELDS} from './playerState.js';
import {RATING_LABELS} from '../teamBoost/ratingWeights.js';

export const CATALOG_VERSION = 1;
export const RATING_FIELDS = Object.freeze(Object.keys(RATING_LABELS));
export const CAP_FIELDS = Object.freeze(Array.from({length:6},(_,i)=>`SkillGroupCap${i+1}`));
export const PHYSICAL_FIELDS = Object.freeze(Array.from({length:5},(_,i)=>`PhysicalAbility${i+1}`));
export const MENTAL_FIELDS = Object.freeze(Array.from({length:3},(_,i)=>`MentalAbility${i+1}`));
export const MENTAL_RANK_FIELDS = Object.freeze(Array.from({length:3},(_,i)=>`MentalAbilityRank${i+1}`));
export const CAP_BOUNDS = Object.freeze([[2,20],[3,20],[2,20],[2,20],[2,20],[2,20]].map(Object.freeze));
export const TIERS = Object.freeze(['None','Bronze','Silver','Gold','Platinum']);
export const DEVELOPMENT = Object.freeze(['Normal','College_Impact','College_Star','College_Elite']);
export const CLASS_PAIRS = Object.freeze(['Freshman|Eligible','Freshman|Previous',...['Sophomore','Junior','Senior'].flatMap(year=>['Eligible','Ineligible','Previous'].map(status=>`${year}|${status}`))]);
export const STYLE_FIELDS = Object.freeze(['PLYR_QBSTYLE','PLYR_STYLE','RunningStyleRating']);
// PresentationId is separately allocated; never copy a source player's ID.
export const PORTRAIT_FIELDS = Object.freeze(['PLYR_PORTRAIT','PortraitForceSilhouette','PortraitSwappableLibraryPath']);
export const APPEARANCE_FIELDS = Object.freeze(['GenericHeadAssetName','PLYR_GENERICHEAD','CharacterBodyType','Height','Weight',...PORTRAIT_FIELDS]);
export const WRITE_FIELDS = Object.freeze(['FirstName','LastName','JerseyNum','IsNIL','PLYR_ASSETNAME','PLYR_COMMENT','PlayerType','SchoolYear','RedshirtStatus','TraitDevelopment','OverallRating','ExperiencePoints','SkillPoints','Personality','RecruitingDealbreaker',...STATE_FIELDS,...RATING_FIELDS,...CAP_FIELDS,...PHYSICAL_FIELDS,...MENTAL_FIELDS,...MENTAL_RANK_FIELDS,...STYLE_FIELDS,...APPEARANCE_FIELDS]);
export const BUILDING_BLOCKS = Object.freeze({id:'building-blocks',name:'Building Blocks',minimumAverage:68,maximumAverage:70,targetAverage:69,spread:8});

export function validateFootballProfile(profile) {
  if(!profile||!profile.id||!profile.position||!profile.archetype)throw new Error('Observed profile is missing its identity, position or archetype.');
  if(!CLASS_PAIRS.includes(`${profile.classYear}|${profile.redshirt}`))throw new Error(`Unobserved class/redshirt pair in ${profile.id}.`);
  if(!DEVELOPMENT.includes(profile.development))throw new Error(`Unsupported development encoding in ${profile.id}.`);
  if(!Array.isArray(profile.ratings)||profile.ratings.length!==RATING_FIELDS.length||profile.ratings.some(value=>!Number.isInteger(value)||value<0||value>99))throw new Error(`Invalid rating vector in ${profile.id}.`);
  if(!Array.isArray(profile.caps)||profile.caps.length!==6||profile.caps.some((value,i)=>!Number.isInteger(value)||value<CAP_BOUNDS[i][0]||value>CAP_BOUNDS[i][1]))throw new Error(`Cap outside the observed bounds in ${profile.id}.`);
  if(!Array.isArray(profile.physical)||profile.physical.length!==5||profile.physical.some(tier=>!TIERS.includes(tier)))throw new Error(`Invalid physical ability package in ${profile.id}.`);
  if(!Array.isArray(profile.mental)||profile.mental.length!==3||profile.mental.some(pair=>!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||!TIERS.includes(pair[1])||((pair[0]==='None')!==(pair[1]==='None'))))throw new Error(`Invalid mental ability package in ${profile.id}.`);
  const active=profile.mental.map(pair=>pair[0]).filter(name=>name!=='None');
  if(new Set(active).size!==active.length)throw new Error(`Duplicate mental abilities in ${profile.id}.`);
  if(profile.handedness!==undefined&&!['Left','Right'].includes(profile.handedness))throw new Error(`Invalid observed handedness in ${profile.id}.`);
  if(profile.consecutiveYears!==undefined&&(!Number.isInteger(profile.consecutiveYears)||profile.consecutiveYears<0||profile.consecutiveYears>31))throw new Error(`Invalid observed eligibility history in ${profile.id}.`);
  if(profile.home!==undefined&&(!profile.home||['town','state','pipeline'].some(key=>typeof profile.home[key]!=='string')||Buffer.byteLength(profile.home.town,'utf8')>26))throw new Error(`Invalid observed hometown package in ${profile.id}.`);
  if(!Array.isArray(profile.progression)||profile.progression.length!==2||profile.progression.some(value=>!Number.isInteger(value)||value<0))throw new Error(`Invalid progression package in ${profile.id}.`);
  return profile;
}
export function validateProposedFields(fields) {
  for(const field of Object.keys(fields))if(!WRITE_FIELDS.includes(field))throw new Error(`Roster Generator cannot propose changes to ${field}.`);
}
