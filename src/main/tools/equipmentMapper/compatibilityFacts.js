import {equipmentItem,equipmentSemantics} from '../equipment/catalog.js';
import {enforceEquipmentCompatibility} from '../equipment/core/compatibility.js';
import {generatedItemConflict} from '../equipment/core/generatedCompatibility.js';
import {CUTOFF_PANTS,CUTOFF_JERSEYS,CUTOFF_TOWEL_CONFLICT} from '../equipment/core/uniformCompatibility.js';
import {facemaskFitsHelmet,helmetModel} from '../equipment/core/helmets.js';

const active=asset=>Boolean(asset)&&!/(?:^|_)None$/i.test(asset)&&asset!=='FaceGear_BalaclavaNone';
export function mapperCorrectionReason(issue){
  return issue.reason??({
    'jersey-undershirt':'Relaxed tees cannot be worn with this jersey style',
    'relaxed-tee-neckwear':'Relaxed tees cannot be worn with turtlenecks, ski masks or balaclavas',
    arm:`${issue.side} sleeve or undershirt overlaps wrist/elbow gear`,
    'wrist-overlap':`${issue.side} wrist accessories overlap`,
    'mask-mouthpiece':'Masks and balaclavas require a hanging mouthpiece or no mouthpiece'
  })[issue.kind]??'These equipment items overlap';
}
const pairs=new Set([
  ['InnerShirt','OuterShirt'],
  ...['Left','Right'].flatMap(side=>[
    [side+'ArmWear','InnerShirt'],[side+'ArmWear',side+'WristWear'],[side+'ArmWear',side+'ElbowWear'],
    ['InnerShirt',side+'WristWear'],['InnerShirt',side+'ElbowWear'],[side+'WristWear',side+'ElbowWear']
  ]),
  ...['NeckWear','Neckpad','FaceWear'].flatMap(slot=>[[slot,'InnerShirt'],[slot,'MouthWear']]),
  ['HeadWear','MouthWear'],['HeadWear','GuardianCap']
].map(slots=>slots.sort().join('|')));

// Track the actual participants in a conflict, rather than a repair pass's
// incidental changes. A new shirt must not turn an unchanged sleeve/wrist
// conflict into a new problem. Test both directions to catch new conflicts
// even when an older conflict in the same outfit has the same explanation.
export function mapperCompatibilityFacts(elements,position,options={}){
  const facts=new Map(),get=slot=>elements.find(e=>e.slotType===slot)?.itemAssetName;
  const key=(kind,slots)=>JSON.stringify([kind,[...new Set(slots)].sort().map(slot=>[slot,get(slot)??null])]);
  const add=(kind,reason,slots)=>facts.set(key(kind,slots),reason);
  const reasonFor=(context,entry)=>{
    if(!entry.item)return null;
    const reason=generatedItemConflict(context,entry.item,[entry.element.slotType],position,options);
    return reason&&!reason.startsWith('Item is not eligible')?reason:null;
  };
  const entries=elements.filter(e=>typeof e.slotType==='string'&&active(e.itemAssetName)&&e.slotType!=='OuterPants').map(element=>({element,item:equipmentItem(element.itemAssetName,options),semantic:equipmentSemantics(element.itemAssetName,options)}));
  for(const entry of entries){
    entry.singleReason=reasonFor([entry.element],entry);
    if(entry.singleReason)add('generated:'+entry.singleReason,entry.singleReason,[entry.element.slotType]);
  }
  for(let left=0;left<entries.length;left++)for(let right=left+1;right<entries.length;right++){
    const a=entries[left],b=entries[right],slots=[a.element.slotType,b.element.slotType];
    if(slots[0]===slots[1])continue;
    const sharedGroup=a.semantic?.groups.some(group=>b.semantic?.groups.includes(group));
    const unknownNeck=(a.semantic?.groups.includes('neckwear')&&['NeckWear','Neckpad'].includes(slots[1])&&!b.semantic)||(b.semantic?.groups.includes('neckwear')&&['NeckWear','Neckpad'].includes(slots[0])&&!a.semantic);
    const backplate=(a.semantic?.actualType==='raw-backplate'&&slots[1]==='FlakJacket')||(b.semantic?.actualType==='raw-backplate'&&slots[0]==='FlakJacket');
    if(!pairs.has([...slots].sort().join('|'))&&!sharedGroup&&!unknownNeck&&!backplate)continue;
    const context=[a.element,b.element];
    for(const entry of [a,b]){
      const reason=reasonFor(context,entry);
      if(reason&&reason!==entry.singleReason)add('generated:'+reason,reason,slots);
    }
    for(const issue of enforceEquipmentCompatibility(structuredClone(context),options))add('correction:'+issue.kind+':'+(issue.reason??''),mapperCorrectionReason(issue),slots);
  }
  if(get('OuterPants')===CUTOFF_PANTS){
    if(!options.allowCutoffLegLayers&&active(get('InnerPants')))add('cutoff-legs','Cutoff pants require no leg base layer',['OuterPants','InnerPants']);
    if(!active(get('InnerShirt')))add('cutoff-shirt','Cutoff pants require an undershirt',['OuterPants','InnerShirt']);
    if(!CUTOFF_JERSEYS.has(get('OuterShirt')))add('cutoff-jersey','Cutoff pants require a compatible untucked jersey',['OuterPants','OuterShirt']);
    if(active(get('Towel')))add('cutoff-towel',CUTOFF_TOWEL_CONFLICT,['OuterPants','Towel']);
  }
  const helmet=get('HeadWear'),mask=get('FaceMask'),model=helmetModel(helmet);
  if(!model||!facemaskFitsHelmet(mask,helmet))add('helmet-mask','The helmet and facemask do not have a verified compatible pairing.',['HeadWear','FaceMask']);
  if(active(get('HelmetAccessory'))&&!model?.guardianCap)add('helmet-accessory','This helmet does not support the equipped helmet accessory.',['HeadWear','HelmetAccessory']);
  if(/^GuardianCap_GuardianXT/.test(get('GuardianCap')??'')&&!model?.guardianCap)add('helmet-guardian','This helmet does not support the equipped helmet accessory.',['HeadWear','GuardianCap']);
  if(active(get('MouthWear'))&&/PacifierDualHanging/i.test(get('MouthWear'))&&!model?.hangingMouthpiece)add('helmet-mouthpiece','This helmet does not support the hanging mouthpiece.',['HeadWear','MouthWear']);
  return facts;
}

export function introducedMapperConflicts(elements,originalElements,position,options={}){
  const existing=mapperCompatibilityFacts(originalElements,position,options);
  return [...mapperCompatibilityFacts(elements,position,options)].filter(([key])=>!existing.has(key)).map(([,reason])=>reason);
}
