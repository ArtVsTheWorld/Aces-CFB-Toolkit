import fs from 'node:fs';
import zlib from 'node:zlib';
import {sf,parseRef} from '../equipment/openSave.js';

export const NATIVE_SCHEME_DATA=JSON.parse(fs.readFileSync(new URL('./data/native-schemes.json',import.meta.url),'utf8'));
export const NATIVE_SCHEMES=Object.freeze(NATIVE_SCHEME_DATA.schemes);
export const schemeById=id=>NATIVE_SCHEMES.find(scheme=>scheme.enum===id);
export const NATIVE_POSITIONS=Object.freeze(['QB','HB','FB','WR','TE','LT','LG','C','RG','RT','LE','RE','DT','LOLB','MLB','ROLB','CB','FS','SS','K','P']);
const normalPosition=position=>({LEDG:'LE',REDG:'RE',SAM:'LOLB',MIKE:'MLB',WILL:'ROLB'})[position]??position;
const offensive=new Set(['QB','HB','FB','WR','TE','LT','LG','C','RG','RT']);
export const nativePosition=normalPosition;
const schemaCache=new Map();
export function schemeSchema(schemaPath){
  if(schemaCache.has(schemaPath))return schemaCache.get(schemaPath);
  const schema=JSON.parse(zlib.gunzipSync(fs.readFileSync(schemaPath)));
  const members=(table,field)=>schema.schemas.find(entry=>entry.name===table)?.attributes.find(entry=>entry.name===field)?.enum?._members??[];
  const types=Object.fromEntries(members('Player','PlayerType').map(member=>[member._name,member._value]));
  const schemes=Object.fromEntries(members('Team','CurrentOffensiveScheme').map(member=>[member._name,member._value]));
  for(const scheme of NATIVE_SCHEMES){
    if(!Object.hasOwn(schemes,scheme.enum))throw new Error(`Native scheme ${scheme.enum} is not supported by this save schema.`);
    for(const entry of Object.values(scheme.positions))for(const want of entry.wants)if(!Object.hasOwn(types,want.archetype)||/_$/.test(want.archetype))throw new Error(`Native archetype ${want.archetype} is not supported by this save schema.`);
  }
  const result={types,schemes};schemaCache.set(schemaPath,result);return result;
}
export function schemeChoices(side){
  return [{id:'auto',name:"Use Team’s Current Scheme",description:'Use the team’s saved scheme and player preferences. Dynasty files only.'},{id:'random',name:'Randomized Archetypes',description:'Keep a varied archetype mix without a scheme preference.'},{id:'shuffle',name:'Random Native Scheme',description:'Choose one native scheme for this team when generating the preview.'},...NATIVE_SCHEMES.filter(s=>s.side===side).map(s=>({id:s.enum,name:s.scheme,description:s.description}))];
}
const reads=new WeakMap();
export async function schemeRecord(loaded,value,expected){
  if(typeof value!=='string'||! /^[01]{32}$/.test(value)||!value.includes('1'))return null;
  let ref;
  if(value[0]==='1'){
    const asset=loaded.franchise?.getReferenceFromAssetId?.(parseInt(value,2)&0x7fffffff);
    if(asset)ref={tableId:asset.tableId,row:asset.rowNumber};
  }else ref=parseRef(value);
  const table=loaded.franchise?.tables.find(table=>table.header.tableId===ref?.tableId);
  if(!table||expected&&table.name!==expected)return null;
  if(!reads.has(table))reads.set(table,table.readRecords());await reads.get(table);
  const record=table.records[ref.row];return record&&!record.isEmpty?{table,record}:null;
}
async function arrayReferences(loaded,value,expected){
  const array=await schemeRecord(loaded,value,expected+'[]');if(!array)return null;
  const size=Number(sf(array.record,'arraySize'));if(!Number.isInteger(size)||size<0||size>200)return null;
  const columns=array.table.offsetTable.filter(column=>column.name!=='arraySize'&&column.isReference);
  const result=[];for(const column of columns.slice(0,size)){const record=await schemeRecord(loaded,sf(array.record,column.name),expected);if(!record)return null;result.push(record.record);}
  return result.length===size?result:null;
}
function declaredScheme(value,bindings,side){
  const number=typeof value==='number'?value:bindings.schemes[value];
  return NATIVE_SCHEMES.find(scheme=>scheme.side===side&&bindings.schemes[scheme.enum]===number)??null;
}
export async function inspectTeamSchemes(loaded,team,schemaPath){
  const bindings=schemeSchema(schemaPath),warnings=[],notes=[],result={available:loaded.kind!=='roster',offense:null,defense:null,preferences:{},requirements:{},commits:{},commitsKnown:false,warnings,notes};
  if(loaded.kind==='roster')return result;
  for(const [side,field]of [['offense','CurrentOffensiveScheme'],['defense','CurrentDefensiveScheme']])result[side]=declaredScheme(sf(team.record,field),bindings,side)?.enum??null;
  const philosophy=await schemeRecord(loaded,sf(team.record,'Philosophy'),'TeamPhilosophy');
  for(const [side,field,type]of [['offense','DepthChartOffensivePhilosophy','DepthChartOffensivePhilosophy'],['defense','DepthChartDefensivePhilosophy','DepthChartDefensivePhilosophy']]){
    const record=philosophy&&await schemeRecord(loaded,sf(philosophy.record,field),type);
    if(record)for(const position of NATIVE_POSITIONS.filter(p=>side==='offense'?offensive.has(p):!offensive.has(p)&&!['K','P'].includes(p))){
      const entries=await arrayReferences(loaded,sf(record.record,position),'DepthChartPositionPhilosophy');
      if(entries)result.preferences[position]=entries.map((entry,index)=>({depthSlot:index+1,archetypeValue:bindings.types[sf(entry,'PlayerType')]??Number(sf(entry,'PlayerType')),importance:Number(sf(entry,'Importance'))})).filter(entry=>Number.isInteger(entry.archetypeValue)&&Number.isFinite(entry.importance)&&entry.importance>=0);
    }
  }
  if(!Object.keys(result.preferences).length)notes.push('Saved player preferences could not be resolved; named-scheme tuning will be used.');
  const config=await schemeRecord(loaded,sf(team.record,'DepthChartConfig'),'DepthChartConfig');
  const configs=config?[config,await schemeRecord(loaded,sf(config.record,'OffensiveDepthChartConfigRef'),'OffensiveDepthChartConfig'),await schemeRecord(loaded,sf(config.record,'DefensiveDepthChartConfigRef'),'DefensiveDepthChartConfig')].filter(Boolean):[];
  for(const source of configs)for(const position of NATIVE_POSITIONS){
    const entry=await schemeRecord(loaded,sf(source.record,position),'DepthChartConfigEntry');if(!entry)continue;
    const values={idealOnRoster:Number(sf(entry.record,'IdealNumberOnRoster')),minimum:Number(sf(entry.record,'MinimumCount')),starters:Number(sf(entry.record,'StarterCount')),extraStarters:Number(sf(entry.record,'AdditionalStarterCount'))};
    if(Object.values(values).every(value=>Number.isInteger(value)&&value>=0&&value<=85))result.requirements[position]=values;
  }
  if(!Object.keys(result.requirements).length)notes.push('Saved roster requirements could not be resolved; native scheme counts are available instead.');
  const coach=await schemeRecord(loaded,sf(team.record,'HeadCoach'),'Coach');
  if(coach&&Number(sf(coach.record,'TeamIndex'))!==team.teamIndex)warnings.push('Head-coach ownership does not match this team; coach data was not used.');
  // Team scheme/Philosophy is authoritative. Coach records are corroboration,
  // never inferred from the team table's row number.
  result.coachMatched=Boolean(coach&&Number(sf(coach.record,'TeamIndex'))===team.teamIndex);
  const committed=await arrayReferences(loaded,sf(team.record,'CommittedPlayers'),'Player');
  if(committed){result.commitsKnown=true;const seen=new Set();for(const record of committed){if(seen.has(record))continue;seen.add(record);const position=normalPosition(sf(record,'Position'));if(NATIVE_POSITIONS.includes(position))result.commits[position]=(result.commits[position]??0)+1;else result.commitsKnown=false;}if(!result.commitsKnown)warnings.push('Some commitments could not be read; recruiting-need estimates are unavailable.');}
  return result;
}
export function resolveSchemeContext(settings,evidence,bindings,rng){
  const usesSaved=settings.offensiveScheme==='auto'||settings.defensiveScheme==='auto';
  const warnings=usesSaved?[...evidence.warnings]:[],notes=usesSaved?[...(evidence.notes??[])]:[],resolved={types:bindings.types,offense:null,defense:null,preferences:{},preferenceSources:{},requirements:{},commits:evidence.commits,commitsKnown:evidence.commitsKnown,warnings,notes,sources:{},tuningVersion:NATIVE_SCHEME_DATA.source};
  for(const side of ['offense','defense']){
    const choice=settings[side==='offense'?'offensiveScheme':'defensiveScheme'];
    if(choice==='random'){resolved.sources[side]='No scheme preference';continue;}
    const id=choice==='auto'?evidence[side]:choice==='shuffle'?NATIVE_SCHEMES.filter(s=>s.side===side)[Math.floor(rng()*NATIVE_SCHEMES.filter(s=>s.side===side).length)].enum:choice;
    const scheme=schemeById(id);if(!scheme||scheme.side!==side)throw new Error(`Choose a ${side==='offense'?'offensive':'defensive'} scheme: this file has no supported team scheme to detect.`);
    resolved[side]={id:scheme.enum,name:scheme.scheme};resolved.sources[side]=choice==='auto'?'Team scheme; saved preferences where readable, native tuning otherwise':'Native scheme tuning';
    for(const [position,entry]of Object.entries(scheme.positions)){
      resolved.preferences[position]=choice==='auto'&&evidence.preferences[position]?.length?evidence.preferences[position]:entry.wants.map(want=>({...want,archetypeValue:bindings.types[want.archetype]}));
      resolved.preferenceSources[position]=choice==='auto'&&evidence.preferences[position]?.length?'Saved Team.Philosophy':'Native scheme tuning';
      if(NATIVE_POSITIONS.includes(position))resolved.requirements[position]={...entry};
    }
  }
  for(const position of ['K','P'])resolved.requirements[position]={idealOnRoster:2,minimum:1,starters:1,extraStarters:0};
  resolved.requirementSources=Object.fromEntries(Object.keys(resolved.requirements).map(position=>[position,'Native scheme tuning']));
  // Position counts always follow the chosen schemes, including team detection.
  // Older DepthChartConfig needs may describe a different coaching scheme.
  resolved.sources.counts='Chosen schemes’ native position needs';
  if(settings.rosterMakeup==='scheme'&&(!resolved.offense||!resolved.defense))throw new Error('Build to Scheme Needs requires an offensive and defensive scheme. Choose native schemes or team detection.');
  return resolved;
}
export function schemeFitAudit(players,context,model){
  return Object.fromEntries([...new Set(players.map(player=>player.position))].map(position=>{
    const wants=context.preferences[normalPosition(position)]??[],room=players.filter(player=>player.position===position),preferred=new Set(wants.map(want=>want.archetypeValue)),available=new Set((model.byPosition.get(position)??[]).map(profile=>context.types[profile.archetype]));
    return [position,{players:room.length,preferred:room.filter(player=>preferred.has(context.types[player.fields.PlayerType])).length,archetypes:room.reduce((counts,player)=>(counts[player.fields.PlayerType]=(counts[player.fields.PlayerType]??0)+1,counts),{}),unavailablePreferred:[...new Set(wants.filter(want=>!available.has(want.archetypeValue)).map(want=>want.archetype??String(want.archetypeValue)))]}];
  }));
}
export function nativeArchetypeWeight(position,archetype,settings){
  const context=settings.schemeContext;if(!context)return 1;
  const wants=context.preferences[normalPosition(position)]??[],value=context.types[archetype];
  const total=wants.reduce((n,want)=>n+want.importance,0),matched=wants.filter(want=>want.archetypeValue===value).reduce((n,want)=>n+want.importance,0);
  return total?1+8*matched/total:1;
}
export function recruitingNeeds(players,context){
  return Object.fromEntries(Object.entries(context.requirements).map(([position,entry])=>{
    const returning=players.filter(player=>normalPosition(player.position)===position&&player.fields.SchoolYear!=='Senior').length,commits=context.commits[position]??0;
    return[position,{ideal:entry.idealOnRoster,returning,commits:context.commitsKnown?commits:null,need:context.commitsKnown?Math.max(0,Math.min(entry.idealOnRoster,entry.idealOnRoster-returning-commits)):null}];
  }));
}
