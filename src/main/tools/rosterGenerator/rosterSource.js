// Play Now rosters use tagged records and separate gzip visual blobs, not
// franchise tables. Only corroborated roster tags are writable here.
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {randomUUID} from 'node:crypto';import {isDeepStrictEqual} from 'node:util';
import {isRosterContainer,unpackRosterContainer,packRosterContainer,encodeRosterTdf} from '../equipment/rosterCodec.js';
import {decodeRosterTdf} from '../equipment/rosterTdf.js';import {decodeRosterDonors} from '../equipment/donorSource.js';
import {equipmentItem,itemBrand} from '../equipment/catalog.js';import {WRITE_FIELDS} from './contract.js';
import {createBackup} from '../../services/files.js';import {saveFingerprint} from '../jersey/planStore.js';
export const ROSTER_FIELD_TAGS=Object.freeze({FirstName:'PFNA',LastName:'PLNA',JerseyNum:'PJEN',PresentationId:'POID',PLYR_ASSETNAME:'PEPS',IsNIL:'PICN',PLYR_COMMENT:'PCMT',PlayerType:'PLTY',SchoolYear:'PYEA',RedshirtStatus:'PRSD',TraitDevelopment:'PROL',OverallRating:'POVR',Height:'PHGT',Weight:'PWGT',PLYR_HOME_TOWN:'PHTN',PLYR_HOME_STATE:'PHSN',PLYR_QBSTYLE:'PQBS',RunningStyleRating:'PRSE',PLYR_ISCAPTAIN:'ISCN',CaptainsPatch:'PLCP',PLYR_PORTRAIT:'PSXP',AccelerationRating:'PACC',AgilityRating:'PAGI',AwarenessRating:'PAWR',BCVisionRating:'PBCV',BlockSheddingRating:'PBSG',BreakSackRating:'PBSK',BreakTackleRating:'PBKT',CarryingRating:'PCAR',CatchInTrafficRating:'PLCI',CatchingRating:'PCTH',ChangeOfDirectionRating:'PELU',DeepRouteRunningRating:'PDRR',FinesseMovesRating:'PFMS',HitPowerRating:'PLHT',ImpactBlockingRating:'PLIB',InjuryRating:'PINJ',JukeMoveRating:'PLJM',JumpingRating:'PJMP',KickAccuracyRating:'PKAC',KickPowerRating:'PKPR',KickReturnRating:'PKRT',LeadBlockRating:'PLBK',ManCoverageRating:'PLMC',MediumRouteRunningRating:'PMRR',PassBlockFinesseRating:'PPBF',PassBlockPowerRating:'PPBS',PassBlockRating:'PPBK',PlayActionRating:'PPLA',PlayRecognitionRating:'PLPR',PowerMovesRating:'PLPM',PressRating:'PLPE',PursuitRating:'PLPU',ReleaseRating:'PLRL',RunBlockFinesseRating:'PRBF',RunBlockPowerRating:'PRBS',RunBlockRating:'PRBK',ShortRouteRunningRating:'SRRN',SpectacularCatchRating:'PLSC',SpeedRating:'PSPD',SpinMoveRating:'PLSM',StaminaRating:'PSTA',StiffArmRating:'PLSA',StrengthRating:'PSTR',TackleRating:'PTAK',ThrowAccuracyDeepRating:'PTAD',ThrowAccuracyMidRating:'PTAM',ThrowAccuracyShortRating:'PTAS',ThrowOnTheRunRating:'PTOR',ThrowPowerRating:'PTHP',ThrowUnderPressureRating:'PTUP',ToughnessRating:'PTGH',TruckingRating:'PLTR',ZoneCoverageRating:'PLZC'});
const enums=JSON.parse(fs.readFileSync(new URL('../equipment/rosterEnums.json',import.meta.url)));
const ref=(id,row)=>id.toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
export function rosterFile(savePath){const fd=fs.openSync(savePath,'r'),header=Buffer.alloc(80);try{fs.readSync(fd,header,0,80,0);}finally{fs.closeSync(fd);}return isRosterContainer(header);}
export function loadRosterGenerationSource(savePath,schemaPath){
 const bytes=fs.readFileSync(savePath),container=unpackRosterContainer(bytes),data=container.document.value,loaded=decodeRosterDonors(bytes);
 // Synthetic references are table references, never high-bit asset IDs.
 loaded.players.header.tableId=10000;loaded.teams.header.tableId=10001;loaded.visuals.header.tableId=10002;loaded.rosters.header.tableId=10003;
 loaded.players.records.forEach((record,row)=>record.CharacterVisuals=ref(10002,row));loaded.teams.records.forEach((record,row)=>record.Roster=ref(10003,row));for(const roster of loaded.rosters.records)for(let i=0;i<roster.arraySize;i++)roster['Player'+i]=ref(10000,parseInt(roster['Player'+i].slice(15),2));
 if(loaded.warnings.length)throw new Error(`This roster contains ${loaded.warnings.length} unsupported player/equipment records. No players will be silently omitted. First issue: ${loaded.warnings[0].player}: ${loaded.warnings[0].reason}.`);
 const schema=JSON.parse(zlib.gunzipSync(fs.readFileSync(schemaPath))).schemas.find(table=>table.name==='Player'),columns=new Map(schema.attributes.map(field=>[field.name,field])),maps={};
 for(const [name,column]of columns)if(column.enum){const members=column.enum._members.filter(member=>!/_$/.test(member._name));maps[name]={decode:new Map(members.map(member=>[member._value,member._name])),encode:new Map(members.map(member=>[member._name,member._value]))};}
 const decode=(field,value)=>columns.get(field)?.type==='bool'?Boolean(value):maps[field]?.decode.get(value)??value;
 const originalById=new Map(data.PLAY.map(player=>[player.PGID,player])),blobMap=data.BLOB.BLOB.find(entry=>(entry.OTID??0)===0).BLBM,blobs=new Map(blobMap),visualDocuments=new Map();
 const defaultValue=field=>{const column=columns.get(field);if(column?.type==='bool')return false;if(column?.enum){const name=String(column.default??'').split(':').at(-1);return maps[field]?.encode.has(name)?name:maps[field]?.decode.get(0)??'None';}return column?.type==='string'?'':Number(column?.default)||0;};
 const available=new Set(['GenericHeadAssetName','CharacterBodyType']);
 loaded.players.records.forEach((record,row)=>{
  const source=originalById.get(record.RosterPlayerId),visual=decodeRosterTdf(zlib.gunzipSync(blobs.get(source.PGID)),{typed:true});visualDocuments.set(source.PGID,visual);
  for(const field of WRITE_FIELDS)if(record[field]===undefined)record[field]=defaultValue(field);
  for(const [field,tag]of Object.entries(ROSTER_FIELD_TAGS)){if(container.document.types.has('$.PLAY[].'+tag)){available.add(field);record[field]=decode(field,source[tag]??0);}}
  Object.assign(record,{PresentationId:source.POID??source.PGID,GenericHeadAssetName:visual.value.CHVI.GENR??'',PLYR_ASSETNAME:source.PEPS??'',CurrentNILCompensation:0,HomePipeline:'International'});
  // The original adapter reads only on-field equipment. Body layers are
  // rebuilt separately using observed roster body assets during serialization.
  record.index=row;
 });
 loaded.players.offsetTable=WRITE_FIELDS.map(name=>({name}));
 for(const table of [loaded.players,loaded.visuals,loaded.teams,loaded.rosters]){table.name=table===loaded.rosters?'Player[]':table===loaded.players?'Player':table===loaded.teams?'Team':'CharacterVisuals';table.readRecords=async()=>{};}
 const bodyAssets=new Map(),visualTypes=new Map();for(const document of visualDocuments.values()){for(const [key,value]of document.types)if(!visualTypes.has(key))visualTypes.set(key,value);const v=document.value.CHVI;for(const loadout of v.LOUT??[])if(loadout.LDCT===5)for(const pin of loadout.PINS??[])if(/^(Standard|Thin|Muscular|Heavy|Lean)_BodyType$/.test(pin.ITAN??''))bodyAssets.set(v.BTYP??0,pin);}
 for(const team of loaded.teams.records){const original=data.TEAM.find(record=>record.TGID===team.TeamIndex);team.AssetName=original.TUAN??'';team.UniformAssetName=original.TUAN??'';const counts=new Map();for(const record of loaded.players.records.filter(p=>p.TeamIndex===team.TeamIndex)){const raw=JSON.parse(loaded.visuals.records[parseInt(record.CharacterVisuals.slice(15),2)].RawData);for(const e of raw.loadouts.flatMap(l=>l.loadoutElements))if(/^(Left|Right)Shoe$/.test(e.slotType)){const brand=itemBrand(equipmentItem(e.itemAssetName));if(brand)counts.set(brand,(counts.get(brand)??0)+1);}}team.TeamApparel=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]??'';team.DesiredTeamCaptains=loaded.players.records.filter(p=>p.TeamIndex===team.TeamIndex&&p.PLYR_ISCAPTAIN).length||4;}
 return {...loaded,kind:'roster',savePath,container,data,columns,maps,available,originalById,blobMap,visualDocuments,visualTypes,bodyAssets,franchise:{tables:[loaded.players,loaded.visuals,loaded.teams,loaded.rosters]}};
}
export const ROSTER_WARNINGS=['Play Now roster file: dynasty-only skill caps, ability packages, NIL budgets, recruiting dealbreakers, and progression/history fields are not stored in this format and are not written. Only fields with verified roster mappings are written.','Roster depth-chart ordering is kept unchanged; reorder the generated teams in-game.'];
export function buildRosterGenerationCandidate(loaded,rosters){
 const {container,data,maps,available}=loaded,slotValues=Object.fromEntries(Object.entries(enums.LoadoutSlotEnum).map(([name,value])=>[name.replace('LoadoutSlot_',''),value])),bodyValues=Object.fromEntries(Object.entries(enums.CharacterBodyType_DBE).map(([name,value])=>[name.replace('CharacterBodyType_',''),value]));
 const changes=[];
 for(const roster of rosters)for(const player of roster.players){
  const original=loaded.players.records[player.row],source=loaded.originalById.get(original.RosterPlayerId);if(!source||source.TGID!==roster.team.teamIndex)throw new Error('Roster player ownership changed.');
  const before=structuredClone(source);
  for(const [field,tag]of Object.entries(ROSTER_FIELD_TAGS))if(available.has(field)){const value=player.fields[field],column=loaded.columns.get(field);if(column?.type==='bool')source[tag]=Number(value);else if(maps[field]){if(!maps[field].encode.has(value))throw new Error(`Unsupported roster ${field} value.`);source[tag]=maps[field].encode.get(value);}else source[tag]=value;}
  const document=loaded.visualDocuments.get(source.PGID),v=document.value.CHVI,oldVisual=zlib.gunzipSync(new Map(loaded.blobMap).get(source.PGID)),body=bodyValues[player.fields.CharacterBodyType],bodyPin=loaded.bodyAssets.get(body);if(!bodyPin)throw new Error('The generated body type has no verified roster body layer.');
  const name=player.fields.PLYR_ASSETNAME;
  source.PEPS=name;v.ASNM=name;v.CFNM=source.PFNA;v.CLNM=source.PLNA;v.CJNO=source.PJEN;v.GENR=player.fields.GenericHeadAssetName;v.BTYP=body;v.HINC=source.PHGT;v.WLBS=source.PWGT+160;v.SKNT=player.provenance.skinTone;
  if((v.LOUT??[]).some(loadout=>loadout.LDTY!==1&&loadout.LDCT!==5))throw new Error('This roster has an unsupported extra appearance layer. No file was changed.');
  // USKT is a packed user skin-color override; the new head supplies its tone.
  delete v.USKT;
  const generated=JSON.parse(player.rawData).loadouts.filter(l=>l.loadoutType==='PlayerOnField'),visualTypes=document.types;
  const pinSchema='$.CHVI.LOUT[].PINS[]';
  const pins=elements=>elements.map(e=>{const known=equipmentItem(e.itemAssetName),slot=e.slotType??(known?.slots.length===1?known.slots[0]:null);if(slotValues[slot]===undefined)throw new Error(`Unmapped roster equipment slot ${slot}.`);const pin={ITAN:e.itemAssetName,SLOT:slotValues[slot]};if(e.blends)pin.IBLD=e.blends.map(b=>({BARY:b.barycentricBlend??0,BASE:b.baseBlend??0}));if(e.paletteMods){const paletteTypes=['Custom','TeamPrimary','TeamSecondary','TeamTertiary','AlphaOnly','Preset','DetRandom','Random','Black','White','Default'];pin.PALM=e.paletteMods.map(p=>{const type=paletteTypes.indexOf(p.paletteType);if(type<0)throw new Error('Unsupported generated roster palette.');return{PLAN:'ItemPalette',PALV:p.paletteValue,PLTY:type};});}if(Object.keys(e).some(key=>!['slotType','itemAssetName','blends','paletteMods'].includes(key)))throw new Error('Unsupported generated equipment metadata.');return pin;});
  // Every new pin/list field must have a type observed in the roster's visuals.
  for(const [key,value]of loaded.visualTypes)if(!visualTypes.has(key))visualTypes.set(key,value);
  v.LOUT=[{LDCT:5,PINS:[structuredClone(bodyPin)]},...generated.map(l=>({LDTY:1,PINS:pins(l.loadoutElements)}))];
  source.PCBT=body;const encoded=encodeRosterTdf(document);if(!isDeepStrictEqual(decodeRosterTdf(encoded),document.value))throw new Error('Roster appearance failed exact encoding verification.');
  const entry=loaded.blobMap.find(([id])=>id===source.PGID);entry[1]=zlib.gzipSync(encoded,{level:9});changes.push({playerId:source.PGID,before,after:structuredClone(source),beforeVisual:decodeRosterTdf(oldVisual),afterVisual:structuredClone(document.value)});
 }
 return {bytes:packRosterContainer(container),changes};
}
export async function saveRosterGeneration(loaded,plan,context){
 const before=saveFingerprint(context.savePath);if(before!==plan.saveFingerprint)throw new Error('Roster changed after Preview.');const candidate=buildRosterGenerationCandidate(loaded,plan.rosters),temporary=path.join(path.dirname(context.savePath),'.toolkit-roster-'+randomUUID()),backupPath=createBackup(context.savePath);
 try{await fs.promises.writeFile(temporary,candidate.bytes,{flag:'wx'});const reopened=unpackRosterContainer(await fs.promises.readFile(temporary));if(!isDeepStrictEqual(reopened.document.value,loaded.data))throw new Error('Roster candidate differs from the validated plan.');if(saveFingerprint(context.savePath)!==before)throw new Error('Roster changed while applying. Original file was not replaced.');await fs.promises.rename(temporary,context.savePath);}finally{if(fs.existsSync(temporary))await fs.promises.unlink(temporary);}
 return {backupPath};
}
