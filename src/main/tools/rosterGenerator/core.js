import {isOriginalEaPlayer} from '../../services/originalEaPlayers.js';
import {isGeneratedProfile} from './cohorts.js';
import {ALLOWED_DEALBREAKERS} from '../dealbreaker/core.js';
import {observedPlayerState} from './playerState.js';
import {rosterPresentations,presentationAssetName} from './presentation.js';
import {mulberry32,boundedNormal} from '../longSnap/core.js';
import {standardRosterNumbers,finishGeneratedRoster} from './finishing.js';
import {normalizeGenerationSettings,archetypeWeight,toneWeights,observedFirstNames,describeTalentBudget} from './settings.js';
import {positionGroup} from '../../../shared/positionGroups.js';
import {guardBrandEquipment,isBrandCompatibleItem,BRAND_SLOTS} from '../equipment/core/brandCompatibility.js';
import {enforceEquipmentCompatibility} from '../equipment/core/compatibility.js';
import {RATING_FIELDS,CAP_FIELDS,PHYSICAL_FIELDS,MENTAL_FIELDS,MENTAL_RANK_FIELDS,STYLE_FIELDS,APPEARANCE_FIELDS,WRITE_FIELDS,BUILDING_BLOCKS,validateProposedFields,validateFootballProfile} from './contract.js';
import {calculateOverall} from './ratings.js';
import {createRosterStrata} from './sampling.js';
import {ATHLETICISM_PROFILES,athleticVariant,athleticProfilePool,appearancePoolForAthletics,appearancePoolForCaliber,potentialCandidates} from './athletics.js';
import {surnameVariant,makeSurname,validSurname,observedSurnamePool} from './names.js';
import {assignBackstories} from './backstories.js';
import {roomRatingTargets} from './roomTargets.js';
import {generatedRecruitStars} from './recruiting.js';
import {planRosterHomes} from './geography.js';
import {rosterNilBudget,NIL_FIELDS} from './nilBudget.js';
import {planBrothers} from './brothers.js';

const originalDealbreaker=target=>ALLOWED_DEALBREAKERS.includes(target.original.RecruitingDealbreaker)?target.original.RecruitingDealbreaker:'Invalid';
const count=items=>{const out={};for(const item of items)out[item]=(out[item]??0)+1;return out;};
const mean=items=>items.reduce((a,b)=>a+b,0)/items.length;
const choose=(items,rng)=>{if(!items.length)throw new Error('No observed candidates are available.');return items[Math.floor(rng()*items.length)];};
const normalizedName=value=>String(value).normalize('NFKC').trim().toLocaleLowerCase('en-US');
function stream(seed,label){let hash=2166136261^seed;for(const character of label)hash=Math.imul(hash^character.charCodeAt(0),16777619);return mulberry32(hash>>>0);}
function shuffled(items,rng){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}

export const allocateRosterNumbers=standardRosterNumbers;
function weightedChoice(items,weight,rng){const total=items.reduce((n,item)=>n+weight(item),0);if(!(total>0))throw new Error('No supported choices for this setting.');let roll=rng()*total;return items.find(item=>(roll-=weight(item))<0)??items.at(-1);}
function selectAppearance(model,position,branding,rng,athleticProfile='balanced',presetId='building-blocks'){
  const all=model.catalog.appearances.filter(item=>item.position===position),settings=model.settings??normalizeGenerationSettings(),weights=toneWeights(settings.skinTonePreset,position,all),toneOf=item=>item.skinTone??Number(item.fields.GenericHeadAssetName.split('_').at(-2)),allowed=all.filter(item=>weights[toneOf(item)]>0),outlierSize=athleticProfile==='outlier'?(rng()<.5?'small':'large'):null;
  // Keep complete observed bodies. Small-caliber rosters favor the lower size
  // range; rare outliers deliberately use either tail of the position's range.
  const sized=athleticProfile==='outlier'?appearancePoolForAthletics(allowed,'outlier',outlierSize):appearancePoolForAthletics(appearancePoolForCaliber(allowed,presetId),athleticProfile),available=[...new Set(sized.map(toneOf))];
  const tone=weightedChoice(available,tone=>weights[tone],rng),matching=sized.filter(item=>toneOf(item)===tone),branded=matching.filter(item=>item.branding===branding);
  return {appearance:choose(branded.length?branded:matching,rng),sameBrand:branded.length,tone,outlierSize};
}

function sampleNear(pool,target,rng){const nearby=pool.filter(profile=>Math.abs(profile.overall-target)<=2);if(nearby.length)return choose(nearby,rng);const distance=Math.min(...pool.map(profile=>Math.abs(profile.overall-target)));return choose(pool.filter(profile=>Math.abs(profile.overall-target)===distance),rng);}
function solveFootballProfiles(targets,model,seed,preset) {
  const strata=createRosterStrata(targets,model,seed);
  const roomTargets=new Map();for(const position of new Set(targets.map(t=>t.position))){const room=targets.filter(t=>t.position===position),average=model.talentTargets?.[positionGroup(position)]??preset.targetAverage;for(const [row,target]of roomRatingTargets(room,average,preset.spread,stream(seed,`room:${position}`)))roomTargets.set(row,target);}
  const selected=targets.map(target=>{
    const pool=model.byPosition.get(target.position)??[],generated=pool.filter(isGeneratedProfile),base=generated.length?generated:pool,stratum=strata?.byRow.get(target.row),effectiveBase=stratum?base.filter(profile=>profile.classYear===stratum.classYear&&profile.redshirt===stratum.redshirt):base,athleticProfile=model.observedById?weightedChoice(ATHLETICISM_PROFILES,profile=>profile.weight,stream(seed,`athletic:${target.row}`)).id:'balanced',effective=athleticProfilePool(effectiveBase,athleticProfile).map(profile=>athleticVariant(model,profile,athleticProfile));
    if(!effective.length)throw new Error(`No observed football profiles for ${target.position}.`);
    const rng=stream(seed,`football:${target.row}`),desired=roomTargets.get(target.row);
    const settings=model.settings??normalizeGenerationSettings(),scheme=['QB','HB','FB','WR','TE','OL'].includes(positionGroup(target.position))?settings.offensiveScheme:settings.defensiveScheme;
    const archetypes=[...new Set(effective.map(profile=>profile.archetype))],archetype=scheme==='random'?null:weightedChoice(archetypes,type=>effective.filter(profile=>profile.archetype===type).length*archetypeWeight(target.position,type,settings),rng);
    const profile=sampleNear(archetype?effective.filter(profile=>profile.archetype===archetype):effective,desired,rng);
    const balancingPool=archetype?effective.filter(candidate=>candidate.archetype===archetype):effective;
    return {target,profile,desired,athleticProfile,development:stratum?.development??profile.development,pool:balancingPool,fallbacks:generated.length?[]:['No generated-cohort examples for this position; used the EA cohort.']};
  });
  const targetSum=Math.round(preset.targetAverage*selected.length);let iterations=0;
  const order=shuffled(selected,stream(seed,'balance'));
  function balance(room,goalSum){
    let sum=room.reduce((n,item)=>n+item.profile.overall,0);
    for(let guard=0;guard<room.length*8&&sum!==goalSum;guard++){
      let best=null;
      for(const item of room)for(const candidate of item.pool){
        if(Math.abs(candidate.overall-item.profile.overall)>3)continue;
        const next=sum+candidate.overall-item.profile.overall,improvement=Math.abs(goalSum-sum)-Math.abs(goalSum-next);
        const cost=Math.abs(candidate.overall-item.desired)-Math.abs(item.profile.overall-item.desired)+(candidate.archetype===item.profile.archetype?0:5);
        if(improvement>0&&(!best||improvement>best.improvement||improvement===best.improvement&&cost<best.cost))best={item,candidate,next,improvement,cost};
      }
      if(!best)break;best.item.profile=best.candidate;sum=best.next;iterations++;
    }
  }
  if(Object.keys(model.talentTargets??{}).length)for(const group of new Set(order.map(item=>positionGroup(item.target.position)))){const room=order.filter(item=>positionGroup(item.target.position)===group);balance(room,Math.round(model.talentTargets[group]*room.length));}
  balance(order,targetSum);
  const sum=selected.reduce((n,item)=>n+item.profile.overall,0);
  return {selected,strata,iterations,targetSum,actualSum:sum,reachableMinimum:mean(selected.map(item=>Math.min(...item.pool.map(profile=>profile.overall)))),reachableMaximum:mean(selected.map(item=>Math.max(...item.pool.map(profile=>profile.overall))))};
}

function generateName(names,unavailable,rng,preferredFirst,surnamePool){
  const first=(preferredFirst?.length?(Array.isArray(preferredFirst)?preferredFirst:[preferredFirst]):names.first).filter(name=>name&&Buffer.byteLength(name,'utf8')<=17),last=surnamePool?.counts?surnamePool.names:(surnamePool?.names??names.last).filter(name=>name&&Buffer.byteLength(name,'utf8')<=21),variant=surnameVariant(last,rng);
  if(!first.length||!last.length)throw new Error('No names fit the supported schema lengths.');
  for(let attempt=0;attempt<500;attempt++){const surname=makeSurname(last,rng,variant,surnamePool?.counts);if(!surname)break;const f=choose(first,rng),key=normalizedName(f+' '+surname.value);if(!unavailable.has(key)){unavailable.add(key);return[f,surname.value,{parts:surname.parts,suffix:surname.suffix,pool:surnamePool?.bucket??'legacy'}];}}
  for(const f of first)for(const l of last){const value=l+(variant.suffix?' '+variant.suffix:'');if(variant.hyphen||Buffer.byteLength(value,'utf8')>21)continue;const key=normalizedName(f+' '+value);if(!unavailable.has(key)){unavailable.add(key);return[f,value,{parts:[l],suffix:variant.suffix}];}}
  throw new Error('The available name combinations are exhausted.');
}

export function buildAppearancePreview(originalRaw,appearance,branding) {
  const parsed=typeof originalRaw==='string'?JSON.parse(originalRaw):structuredClone(originalRaw);
  if(!parsed||!Array.isArray(parsed.loadouts))throw new Error('Target has no valid appearance loadouts.');
  const tattooSlots=new Map([['LeftArmTattoo','ArmTattoo_None'],['RightArmTattoo','ArmTattoo_None'],['LeftLegTattoo','LegTattoo_None'],['RightLegTattoo','LegTattoo_None']]);
  const knownBase=loadout=>loadout.loadoutCategory==='Base'&&Object.keys(loadout).every(key=>['loadoutCategory','loadoutElements'].includes(key))&&(!loadout.loadoutElements||Array.isArray(loadout.loadoutElements)&&loadout.loadoutElements.every(item=>tattooSlots.has(item.slotType)&&typeof item.itemAssetName==='string'&&/^(ArmTattoo|LegTattoo)_/.test(item.itemAssetName)&&Object.keys(item).every(key=>['itemAssetName','slotType'].includes(key))));
  const unknownLayers=parsed.loadouts.filter(loadout=>loadout.loadoutType!=='PlayerOnField'&&!knownBase(loadout)).map(loadout=>loadout.loadoutType??loadout.loadoutCategory??'[missing type]');
  const source=structuredClone(appearance.loadouts),brandCorrections=guardBrandEquipment(source,{branding},[]).filter(change=>change.oldItem!==change.newItem),compatibility=[];
  for(const loadout of source)compatibility.push(...enforceEquipmentCompatibility(loadout.loadoutElements));
  for(const loadout of source)for(const element of loadout.loadoutElements){if(BRAND_SLOTS.has(element.slotType)&&!/(?:^|_)None$/.test(element.itemAssetName)&&!isBrandCompatibleItem(element.slotType,element.itemAssetName,branding))throw new Error(`Unverified brand-sensitive generated item ${element.itemAssetName}.`);}
  // The generated cohort omits these overrides. Retaining the original skin or
  // build here would conflict with the newly selected generic appearance.
  const removedOverrides=['skinTone','bodyType','jerseyName'].filter(key=>Object.hasOwn(parsed,key));for(const key of removedOverrides)delete parsed[key];
  const loadouts=[];let inserted=false;
  for(const loadout of parsed.loadouts){if(loadout.loadoutType==='PlayerOnField'){if(!inserted){loadouts.push(...source);inserted=true;}}else loadouts.push(knownBase(loadout)&&loadout.loadoutElements?{...loadout,loadoutElements:loadout.loadoutElements.map(item=>({...item,itemAssetName:tattooSlots.get(item.slotType)}))}:loadout);}
  if(!inserted)throw new Error('Target has no PlayerOnField loadout.');parsed.loadouts=loadouts;
  return {raw:JSON.stringify(parsed),removedOverrides,unknownLayers,brandCorrections,compatibility};
}

export function generateRosterPreview({team,targets,model,seed=1,preset=BUILDING_BLOCKS,unavailableNames=[],matchCommentary=()=>({id:0,method:'none'}),equipmentGenerator=null,reservedPresentationIds=[]}) {
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('Seed must be a whole number from 0 through 4,294,967,295.');
  if(!team?.name||!Array.isArray(targets)||!targets.length)throw new Error('Select one populated team.');
  if(targets.length>100||new Set(targets.map(target=>target.row)).size!==targets.length)throw new Error('Duplicate or oversized target roster.');
  const ordered=[...targets].sort((a,b)=>a.row-b.row),solved=solveFootballProfiles(ordered,model,seed,preset),names=new Set(unavailableNames.map(normalizedName)),warnings=[...(solved.strata?.warnings??[])],blocking=[];
  const presentations=rosterPresentations(ordered,seed,reservedPresentationIds);
  const homePlan=planRosterHomes(ordered,model.catalog,team.geography,seed);
  const players=solved.selected.map(item=>{
    const {target,profile}=item,rng=stream(seed,`appearance:${target.row}`),selectedAppearance=selectAppearance(model,target.position,team.branding,rng,item.athleticProfile,preset.id),{appearance,sameBrand,tone,outlierSize}=selectedAppearance;
    const [firstName,lastName,surname]=generateName(model.catalog.names,names,stream(seed,`name:${target.row}`),observedFirstNames(model.catalog,appearance),observedSurnamePool(model.catalog,appearance));
    const potential=model.potentialByPosition?choose(potentialCandidates(model,target.position,profile.archetype,item.development),stream(seed,`potential:${target.row}`)):profile;
    const matched=matchCommentary(firstName,lastName),sameTypeStyles=model.catalog.styles.filter(candidate=>candidate.source===0&&candidate.position===target.position&&candidate.archetype===profile.archetype),samePositionStyles=model.catalog.styles.filter(candidate=>candidate.position===target.position),style=choose(sameTypeStyles.length?sameTypeStyles:samePositionStyles,stream(seed,`style:${target.row}`));
    const fields={...observedPlayerState(profile,homePlan.byRow.get(target.row)?.home),PresentationId:presentations.get(target.row),FirstName:firstName,LastName:lastName,IsNIL:false,PLYR_ASSETNAME:presentationAssetName(firstName,lastName,presentations.get(target.row)),PLYR_COMMENT:matched.id,PlayerType:profile.archetype,SchoolYear:profile.classYear,RedshirtStatus:profile.redshirt,TraitDevelopment:potential.development,OverallRating:profile.overall,ExperiencePoints:profile.progression[0],SkillPoints:profile.progression[1],Personality:profile.personality,RecruitingDealbreaker:originalDealbreaker(target),...Object.fromEntries(RATING_FIELDS.map((field,i)=>[field,profile.ratings[i]])),...Object.fromEntries(CAP_FIELDS.map((field,i)=>[field,potential.caps[i]])),...Object.fromEntries(PHYSICAL_FIELDS.map((field,i)=>[field,profile.physical[i]])),...Object.fromEntries(MENTAL_FIELDS.map((field,i)=>[field,profile.mental[i][0]])),...Object.fromEntries(MENTAL_RANK_FIELDS.map((field,i)=>[field,profile.mental[i][1]])),...Object.fromEntries(STYLE_FIELDS.map((field,i)=>[field,style.values[i]])),...Object.fromEntries(APPEARANCE_FIELDS.map(field=>[field,appearance.fields[field]]))};
    fields.Position=target.position;
    for(const field of NIL_FIELDS)fields[field]=0;
    fields.ProspectStarRating=generatedRecruitStars(fields,seed,target.row);
    validateProposedFields(fields);
    if(Object.values(fields).some(value=>value===undefined))throw new Error('Generated profile is missing a required field.');
    const visual=buildAppearancePreview(target.rawData,appearance,team.branding),fallbacks=[...item.fallbacks];
    if(item.pool.length<20)fallbacks.push(`Only ${item.pool.length} player profiles fit this position and class.`);
    if(!sameTypeStyles.length)fallbacks.push('Used playing styles from another player at the same position.');
    if(!sameBrand)fallbacks.push('Brand-specific equipment was adjusted to match the team.');
    if(target.visualOwners?.some(row=>row!==target.row))blocking.push({row:target.row,reason:'This player shares appearance data with another player. Apply is blocked to protect both.'});
    if(visual.unknownLayers.length)blocking.push({row:target.row,reason:'This player has additional appearance layers that cannot yet be safely replaced.',layers:visual.unknownLayers});
    return {row:target.row,position:target.position,visualRow:target.visualRow,before:Object.fromEntries(WRITE_FIELDS.map(field=>[field,target.original[field]])),beforeRawData:target.rawData,fields,rawData:visual.raw,provenance:{football:profile.id,home:homePlan.byRow.get(target.row)??null,potential:potential.id,athleticProfile:item.athleticProfile,outlierSize,athleticName:ATHLETICISM_PROFILES.find(profile=>profile.id===item.athleticProfile)?.name??'Balanced',surname,appearance:appearance.id,style:style.id,sourceStoredOverall:profile.storedOverall,calculatedOverall:profile.overall,calibration:profile.calibration??null,commentary:matched.method,nameMethod:'observed same-head first-name pool',skinTone:tone,firstNamePool:observedFirstNames(model.catalog,appearance),requestedPositionAverage:model.talentTargets?.[positionGroup(target.position)]??preset.targetAverage},fallbacks,appearanceAudit:{removedOverrides:visual.removedOverrides,brandCorrections:visual.brandCorrections,compatibility:visual.compatibility}};
  });
  const generatedFirstNames=new Set(players.map(player=>player.fields.FirstName.toLowerCase()));
  const familyNameExclusions=unavailableNames.filter(name=>generatedFirstNames.has(name.trim().split(' ')[0].toLowerCase()));
  const brothers=planBrothers(players,model,seed,familyNameExclusions);
  for(const player of players){
    const family=brothers.get(player.row);if(!family)continue;
    player.provenance.familyOriginal={lastName:player.fields.LastName,surname:structuredClone(player.provenance.surname),home:{town:player.fields.PLYR_HOME_TOWN,state:player.fields.PLYR_HOME_STATE,pipeline:player.fields.HomePipeline}};
    player.provenance.brother=family.siblingRow;
    player.fields.LastName=family.lastName;player.provenance.surname=family.surname;
    player.fields.PLYR_HOME_TOWN=family.home.town;player.fields.PLYR_HOME_STATE=family.home.state;player.fields.HomePipeline=family.home.pipeline;
    player.fields.PLYR_ASSETNAME=presentationAssetName(player.fields.FirstName,player.fields.LastName,player.fields.PresentationId);
    const matched=matchCommentary(player.fields.FirstName,player.fields.LastName);player.fields.PLYR_COMMENT=matched.id;player.provenance.commentary=matched.method;
  }
  const nilBudget=rosterNilBudget(players,targets,seed);
  for(const player of players)for(const field of NIL_FIELDS)player.fields[field]=nilBudget.byRow.get(player.row);
  const equipment=equipmentGenerator?.(players,seed,team);
  if(equipment)for(const player of players){const generated=equipment.byRow.get(player.row);if(!generated)throw new Error('Generated equipment is missing a player.');player.rawData=generated.rawData;player.appearanceAudit.randomizer=generated.audit;}
  const finishing=finishGeneratedRoster(players,team,seed),backstories=assignBackstories(players,model,seed);
  for(const player of players)player.backstory=backstories.get(player.row);
  for(const player of players){validateProposedFields(player.fields);player.changes=Object.entries(player.fields).filter(([field,value])=>JSON.stringify(value)!==JSON.stringify(player.before[field])).map(([field,newValue])=>({field,oldValue:player.before[field],newValue}));}
  const oldAverage=mean(players.map(player=>player.before.OverallRating)),newAverage=mean(players.map(player=>player.fields.OverallRating)),targetAchieved=newAverage>=preset.minimumAverage&&newAverage<=preset.maximumAverage;
  if(!targetAchieved)blocking.push({reason:'This mix could not reach the target average using valid player profiles. Reduce extreme position-strength settings or generate another preview.',reachableMinimum:solved.reachableMinimum,reachableMaximum:solved.reachableMaximum});
  warnings.push('The OVR target is the average across your roster, not the game’s team rating.','Existing statistics, awards and roster links are kept. Review the depth-chart summary before Apply. Test a copied save in-game before continuing.');
  const deviations=Object.entries(model.talentTargets??{}).filter(([group,target])=>Math.abs(mean(players.filter(player=>positionGroup(player.position)===group).map(player=>player.fields.OverallRating))-target)>1);
  if(deviations.length)warnings.push(`Some position targets could not be reached exactly using valid player profiles: ${deviations.map(([group])=>group).join(', ')}. The team-average target still applies.`);
  const originalEaReplacements=targets.filter(player=>isOriginalEaPlayer(player.original)).length;if(originalEaReplacements)warnings.push(`${originalEaReplacements} original EA roster players will be replaced. Apply asks you to confirm first.`);
  const preview={prototypeVersion:1,mode:'preview',canApply:false,team:structuredClone(team),seed,preset,catalog:{version:model.catalog.version,sha256:model.sha256??null,sources:model.catalog.sources},summary:{players:players.length,geography:homePlan.summary,oldAverage,newAverage,targetAchieved,positionCounts:count(players.map(player=>player.position)),classRedshirtCounts:count(players.map(player=>`${player.fields.SchoolYear}|${player.fields.RedshirtStatus}`)),developmentCounts:count(players.map(player=>player.fields.TraitDevelopment)),athleticismCounts:count(players.map(player=>player.provenance.athleticProfile)),originalEaReplacements,retiredNumbers:[],finishing,equipment:equipment?.summary??null,talentBudget:describeTalentBudget(targets,model.settings??normalizeGenerationSettings()),settings:model.settings??normalizeGenerationSettings(),positionStrength:Object.fromEntries([...new Set(players.map(player=>positionGroup(player.position)))].map(group=>[group,{target:model.talentTargets?.[group]??preset.targetAverage,actual:mean(players.filter(player=>positionGroup(player.position)===group).map(player=>player.fields.OverallRating)),players:players.filter(player=>positionGroup(player.position)===group).length}])),skinToneCounts:count(players.map(player=>player.provenance.skinTone)),sampling:solved.strata?{expectedDevelopment:solved.strata.expectedDevelopment,policy:solved.strata.policy}:null,solverIterations:solved.iterations,midpointResidual:(solved.actualSum-solved.targetSum)/players.length},warnings,blocking,players};
  preview.summary.nilBudget=nilBudget.summary;
  preview.familyNameExclusions=familyNameExclusions;
  preview.summary.brothers=[...brothers].filter(([row,family])=>row<family.siblingRow).map(([row,family])=>[row,family.siblingRow]);
  validateRosterPreview(preview,targets,model,equipmentGenerator,reservedPresentationIds);return preview;
}

export function validateRosterPreview(preview,targets,model,equipmentGenerator=null,reservedPresentationIds=[]) {
  if(preview.canApply!==false||preview.players.length!==targets.length)throw new Error('Invalid preview-only roster plan.');
  const homePlan=planRosterHomes(targets,model.catalog,preview.team.geography,preview.seed);
  const familyBase=preview.players.map(player=>{
    const original=player.provenance.familyOriginal;
    return original?{...player,fields:{...player.fields,LastName:original.lastName,PLYR_HOME_TOWN:original.home.town,PLYR_HOME_STATE:original.home.state,HomePipeline:original.home.pipeline},provenance:{...player.provenance,surname:original.surname}}:player;
  });
  const brothers=planBrothers(familyBase,model,preview.seed,preview.familyNameExclusions??[]);
  if(JSON.stringify(preview.summary.brothers)!==JSON.stringify([...brothers].filter(([row,family])=>row<family.siblingRow).map(([row,family])=>[row,family.siblingRow])))throw new Error('Generated brother pairs differ from the seeded family plan.');
  const nilBudget=rosterNilBudget(preview.players,targets,preview.seed);
  if(JSON.stringify(preview.summary.nilBudget)!==JSON.stringify(nilBudget.summary))throw new Error('The team NIL budget changed after generation.');
  if(JSON.stringify(preview.summary.geography)!==JSON.stringify(homePlan.summary))throw new Error('School hometown allocation differs from the validated geography plan.');
  const presentations=rosterPresentations(targets,preview.seed,reservedPresentationIds),byRow=new Map(targets.map(target=>[target.row,target])),names=new Set(),strata=createRosterStrata(targets,model,preview.seed),backstories=assignBackstories(preview.players,model,preview.seed);
  const expected=preview.players.map(player=>{const base=model.byId.get(player.provenance.football),source=base?athleticVariant(model,base,player.provenance.athleticProfile??'balanced'):null,target=byRow.get(player.row);if(!source||!target)throw new Error('Missing generation evidence.');return {row:player.row,position:player.position,fields:{...player.fields,...observedPlayerState(source,homePlan.byRow.get(player.row)?.home),LongSnapRating:source.ratings[RATING_FIELDS.indexOf('LongSnapRating')],RecruitingDealbreaker:originalDealbreaker(target)}};});
  finishGeneratedRoster(expected,preview.team,preview.seed);
  // Family hometowns override only the seeded hometown of the two relatives.
  // All other health, eligibility, captain and finishing checks stay unchanged.
  for(const player of preview.players){
    const sibling=preview.players.find(other=>other.row===player.provenance.brother);
    const family=brothers.get(player.row);
    if(family){
      if(player.provenance.brother!==family.siblingRow||player.fields.LastName!==family.lastName||player.fields.PLYR_HOME_TOWN!==family.home.town||player.fields.PLYR_HOME_STATE!==family.home.state||player.fields.HomePipeline!==family.home.pipeline)throw new Error('Brother identity or hometown differs from its generation plan.');
      if(!sibling||sibling.row===player.row||sibling.provenance.brother!==player.row||sibling.provenance.skinTone!==player.provenance.skinTone||['LastName','PLYR_HOME_TOWN','PLYR_HOME_STATE','HomePipeline'].some(field=>sibling.fields[field]!==player.fields[field]))throw new Error('Invalid generated brother pairing.');
      const planned=expected.find(other=>other.row===player.row);for(const field of ['PLYR_HOME_TOWN','PLYR_HOME_STATE','HomePipeline'])planned.fields[field]=player.fields[field];
    }else if(player.provenance.brother!==undefined||player.provenance.familyOriginal)throw new Error('Unplanned generated brother pairing.');
  }
  const finished=new Map(expected.map(player=>[player.row,player.fields]));
  const equipment=equipmentGenerator?.(preview.players.map(player=>{const target=byRow.get(player.row),appearance=model.catalog.appearances.find(item=>item.id===player.provenance.appearance);if(!target||!appearance)throw new Error('Missing appearance evidence.');return {...player,fields:{...player.fields},rawData:buildAppearancePreview(target.rawData,appearance,preview.team.branding).raw};}),preview.seed,preview.team);
  for(const player of preview.players){
    for(const field of NIL_FIELDS)if(player.fields[field]!==nilBudget.byRow.get(player.row))throw new Error(`Generated NIL compensation (${field}) differs from the validated team budget.`);
    if(JSON.stringify(player.provenance.home??null)!==JSON.stringify(homePlan.byRow.get(player.row)??null))throw new Error('Generated hometown differs from the seeded school geography plan.');
    if(JSON.stringify(player.backstory)!==JSON.stringify(backstories.get(player.row)))throw new Error('Player backstory differs from its eligible, validated generation plan.');
    const target=byRow.get(player.row),base=model.byId.get(player.provenance.football),source=base?athleticVariant(model,base,player.provenance.athleticProfile??'balanced'):null,potential=(model.potentialById??model.byId).get(player.provenance.potential??player.provenance.football);if(!target||target.position!==player.position||!source||source.position!==player.position)throw new Error('Roster position or source evidence changed.');
    if(player.provenance.familyOriginal){const original=player.provenance.familyOriginal,home=homePlan.byRow.get(player.row)?.home??source.home;if(home&&JSON.stringify(original.home)!==JSON.stringify(home))throw new Error('Family original hometown evidence changed.');}
    if(player.visualRow!==target.visualRow||player.beforeRawData!==target.rawData||WRITE_FIELDS.some(field=>player.before[field]!==target.original[field]))throw new Error('Original player/appearance evidence changed.');
    validateProposedFields(player.fields);validateFootballProfile(source);
    if(player.fields.Position!==player.position)throw new Error('Generated player position differs from its validated roster assignment.');
    if(player.fields.ProspectStarRating!==generatedRecruitStars(player.fields,preview.seed,player.row))throw new Error('Recruiting stars differ from the validated generation plan.');
    const stratum=strata?.byRow.get(player.row);if(stratum&&(player.fields.SchoolYear!==stratum.classYear||player.fields.RedshirtStatus!==stratum.redshirt||player.fields.TraitDevelopment!==stratum.development))throw new Error('Generated class/development differs from its planned distribution.');
    if(WRITE_FIELDS.some(field=>!Object.hasOwn(player.fields,field)))throw new Error('Generated profile has missing fields.');
    const vector=RATING_FIELDS.map(field=>player.fields[field]);if(JSON.stringify(vector)!==JSON.stringify(source.ratings.map((value,i)=>RATING_FIELDS[i]==='LongSnapRating'?finished.get(player.row).LongSnapRating:value))||player.fields.PlayerType!==source.archetype||calculateOverall(source,model.formulas)!==player.fields.OverallRating)throw new Error('Rating/archetype profile no longer matches its observed package.');
    for(const [fields,values]of [[PHYSICAL_FIELDS,source.physical],[MENTAL_FIELDS,source.mental.map(pair=>pair[0])],[MENTAL_RANK_FIELDS,source.mental.map(pair=>pair[1])]])if(JSON.stringify(fields.map(field=>player.fields[field]))!==JSON.stringify(values))throw new Error('Cap or ability package was modified independently of its observed profile.');
    if(!potential||potential.position!==player.position||player.fields.TraitDevelopment!==potential.development||JSON.stringify(CAP_FIELDS.map(field=>player.fields[field]))!==JSON.stringify(potential.caps)||(model.potentialByPosition&&!potentialCandidates(model,player.position,source.archetype,potential.development).some(item=>item.id===potential.id)))throw new Error('Development/caps differ from the selected potential package.');
    if(player.fields.SchoolYear!==source.classYear||player.fields.RedshirtStatus!==source.redshirt||player.fields.ExperiencePoints!==source.progression[0]||player.fields.SkillPoints!==source.progression[1])throw new Error('Eligibility/development/progression package differs from its observation.');
    const expectedAthletic=model.observedById?weightedChoice(ATHLETICISM_PROFILES,profile=>profile.weight,stream(preview.seed,`athletic:${player.row}`)).id:'balanced';
    if(player.provenance.athleticProfile!==expectedAthletic)throw new Error('Athleticism profile differs from the seeded generation plan.');
    const expectedAppearance=selectAppearance(model,player.position,preview.team.branding,stream(preview.seed,`appearance:${player.row}`),expectedAthletic,preview.preset.id);
    if(player.provenance.appearance!==expectedAppearance.appearance.id||player.provenance.outlierSize!==expectedAppearance.outlierSize||player.provenance.skinTone!==expectedAppearance.tone)throw new Error('Build or outlier direction differs from the selected caliber/profile plan.');
    const appearance=model.catalog.appearances.find(item=>item.id===player.provenance.appearance),style=model.catalog.styles.find(item=>item.id===player.provenance.style);
    if(!appearance||appearance.position!==player.position||APPEARANCE_FIELDS.some(field=>player.fields[field]!==appearance.fields[field]))throw new Error('Generic head/body/portrait package differs from its observation.');
    if(!style||style.position!==player.position||STYLE_FIELDS.some((field,i)=>player.fields[field]!==style.values[i]))throw new Error('Animation package differs from its observed position.');
    if(player.fields.Personality!==source.personality||player.fields.IsNIL!==false||player.fields.PresentationId!==presentations.get(player.row)||player.fields.PLYR_ASSETNAME!==presentationAssetName(player.fields.FirstName,player.fields.LastName,presentations.get(player.row))||!Number.isSafeInteger(player.fields.PLYR_COMMENT)||player.fields.PLYR_COMMENT<0)throw new Error('Invalid generated identity/personality fields.');
    if(!observedFirstNames(model.catalog,appearance).includes(player.fields.FirstName)&&appearance.firstToken)throw new Error('First name differs from its observed same-head name pool.');
    const surnamePool=observedSurnamePool(model.catalog,appearance);if(!player.provenance.surname.parts.every(name=>surnamePool.names.includes(name)))throw new Error('Surname differs from the observed appearance name pool.');
    if(!model.catalog.names.first.includes(player.fields.FirstName)||!validSurname(player.fields.LastName,player.provenance.surname,model.catalog.names.last)||Buffer.byteLength(player.fields.FirstName,'utf8')>17||Buffer.byteLength(player.fields.LastName,'utf8')>21)throw new Error('Generated name is not supported by the observed dictionary/schema.');
    if([...Object.keys(observedPlayerState(source)),'LongSnapRating','RecruitingDealbreaker','JerseyNum'].some(field=>player.fields[field]!==finished.get(player.row)[field]))throw new Error('Generated finishing passes do not match the validated Standard jersey/long-snap/dealbreaker plan.');
    const name=normalizedName(`${player.fields.FirstName} ${player.fields.LastName}`);if(names.has(name))throw new Error('Duplicate generated name.');names.add(name);
    const expectedVisual=buildAppearancePreview(target.rawData,appearance,preview.team.branding);
    if(player.rawData!==(equipment?.byRow.get(player.row)?.rawData??expectedVisual.raw))throw new Error('Generated visual data differs from its observed/compatibility-checked proposal.');
    const parsed=JSON.parse(player.rawData);if(Object.hasOwn(parsed,'skinTone')||Object.hasOwn(parsed,'bodyType')||!parsed.loadouts?.some(loadout=>loadout.loadoutType==='PlayerOnField'))throw new Error('Conflicting appearance override in the preview.');
    byRow.delete(player.row);
  }
  if(byRow.size)throw new Error('A selected roster player was lost.');return true;
}
