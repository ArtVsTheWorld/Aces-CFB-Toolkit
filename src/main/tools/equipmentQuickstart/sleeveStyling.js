import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {quickstartPlayerKey} from '../../services/quickstartMemory.js';
import {isOriginalEaPlayer} from '../../services/originalEaPlayers.js';
import {equipmentItem,isRawJamoItem} from '../equipment/catalog.js';
import {enforceEquipmentCompatibility} from '../equipment/core/compatibility.js';
import {parseRef,sf} from '../equipment/openSave.js';

const sleeveless=new Map([
  ['G_CompressionT_Crew_ShortSleeve_Basic_WHI','Gear_Undershirt_CompressionTCrewSleeveless_White'],
  ['G_CompressionT_Crew_ShortSleeve_Basic_BLA','Gear_Undershirt_CompressionTCrewSleeveless_Black'],
  ['G_CompressionT_Crew_ShortSleeve_Basic_PRI','Gear_Undershirt_CompressionTCrewSleeveless'],
  ['G_CompressionT_Crew_ShortSleeve_Basic_SEC','Gear_Undershirt_CompressionTCrewSleeveless_Secondary'],
  ['G_CompressionT_Crew_ShortSleeve_BasicJ_JER','Gear_Undershirt_CompressionTCrewSleeveless_White']
]);

// One stable preference per player, independent of run seed, outfit and filename.
// Keep a quarter of the layered looks; this is styling, not a compatibility rule.
export function keepQuickstartDoubleSleeves(record,row,dynastyId){
  const hash=createHash('sha256').update(JSON.stringify(['quickstart-sleeve-style-v1',dynastyId,quickstartPlayerKey(record,row)])).digest();
  return hash.readUInt32BE(0)<0x40000000;
}

export function simplifyQuickstartSleeves(loadouts,options={}){
  const edits=[];
  for(const loadout of Array.isArray(loadouts)?loadouts:[]){
    if(loadout?.loadoutType!=='PlayerOnField'||!Array.isArray(loadout.loadoutElements))continue;
    const elements=loadout.loadoutElements,shirts=elements.filter(e=>e?.slotType==='InnerShirt');
    if(shirts.length!==1||!sleeveless.has(shirts[0].itemAssetName))continue;
    const hasSleeve=elements.some(element=>{
      if(!['LeftArmWear','RightArmWear'].includes(element?.slotType))return false;
      const asset=element.itemAssetName,item=equipmentItem(asset,options);
      if(options.usingRawAccessoriesMod&&isRawJamoItem(asset))return true;
      return item?.category==='Arm Wear'&&/sleeve|^Undershirt /i.test(item.displayName)&&!/tape|bands/i.test(item.displayName)&&item.slots.includes(element.slotType);
    });
    if(!hasSleeve)continue;
    const oldItem=shirts[0].itemAssetName,newItem=sleeveless.get(oldItem),replacement=equipmentItem(newItem,options);
    if(!replacement?.slots.includes('InnerShirt'))continue;
    const proposed=structuredClone(elements),at=elements.indexOf(shirts[0]);proposed[at].itemAssetName=newItem;
    const existing=enforceEquipmentCompatibility(structuredClone(elements),options);
    if(!enforceEquipmentCompatibility(proposed,options).every(issue=>existing.some(old=>isDeepStrictEqual(old,issue))))continue;
    shirts[0].itemAssetName=newItem;edits.push({slot:'InnerShirt',oldItem,newItem});
  }
  return edits;
}

export function applyQuickstartSleeveStyling({changes,players,visuals,visualsTableId,dynastyId,donorRows=new Set(),protectOriginalEaPlayers=true,unlocked=false,raw=false}){
  const owners=new Map(),corrections=[];
  for(const record of players){if(!record||record.isEmpty)continue;const ref=parseRef(sf(record,'CharacterVisuals'));if(ref?.tableId===visualsTableId)owners.set(ref.row,(owners.get(ref.row)??0)+1);}
  for(const change of changes){
    const row=change.target.row,record=players[row];
    if(!record||record.isEmpty||donorRows.has(row)||['K','P'].includes(String(sf(record,'Position')).toUpperCase())||(protectOriginalEaPlayers&&isOriginalEaPlayer(record)))continue;
    const ref=parseRef(sf(record,'CharacterVisuals'));
    if(ref?.tableId!==visualsTableId||ref.row!==change.visualsRow||owners.get(ref.row)!==1||keepQuickstartDoubleSleeves(record,row,dynastyId))continue;
    const visual=visuals[ref.row];if(!visual||visual.isEmpty)continue;
    let parsed;try{parsed=JSON.parse(sf(visual,'RawData'));}catch{continue;}
    const edits=simplifyQuickstartSleeves(parsed?.loadouts,{usingUnlockedMod:unlocked,usingRawAccessoriesMod:raw});
    if(edits.length){visual.RawData=JSON.stringify(parsed);change.sleeveStyleCorrections=edits;corrections.push({row,visualsRow:ref.row,changes:edits});}
  }
  return corrections;
}
