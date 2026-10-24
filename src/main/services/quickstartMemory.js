import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {sf} from '../tools/equipment/openSave.js';

const digest=value=>createHash('sha256').update(value).digest('hex');
const FRANCHISE_TABLE_UID=2226370608;
const normalizeName=value=>String(value??'').normalize('NFKC').trim().toLowerCase();

export async function equipmentDynastyId(franchise){
  const table=franchise.tables.find(table=>table.header?.uniqueId===FRANCHISE_TABLE_UID);
  if(!table)throw Error('This save has no supported dynasty identifier. Equipment tracking cannot safely identify it.');
  await table.readRecords();
  const records=table.records.filter(record=>record&&!record.isEmpty);
  const id=records.length===1?sf(records[0],'LeagueID'):undefined;
  if(!Number.isInteger(id)||id===0||id< -2147483648||id>2147483647)throw Error('This save has no valid dynasty identifier. Equipment tracking cannot safely identify it.');
  return id;
}

// The row distinguishes otherwise identical players. Identity fields distinguish
// replacements when the game reuses a row. Team, position, class, redshirt and
// jersey number deliberately do not participate.
export function quickstartPlayerKey(record,row){
  if(!Number.isInteger(row)||row<0)throw Error('Equipment tracking requires a valid player row.');
  return digest(JSON.stringify(['player-v2',row,String(sf(record,'PLYR_ASSETNAME')??'').trim(),normalizeName(sf(record,'FirstName')),normalizeName(sf(record,'LastName')),String(sf(record,'PresentationId')??'')]));
}

// Only for recovering old path-based history, never for identifying new players.
export function legacyQuickstartPlayerKey(record,row){
  const asset=String(sf(record,'PLYR_ASSETNAME')??'').trim();
  return digest(JSON.stringify([asset,normalizeName(sf(record,'FirstName')),normalizeName(sf(record,'LastName')),String(sf(record,'PresentationId')??''),...(asset?[]:[row,String(sf(record,'CharacterVisuals')??'')])]));
}

const validEntries=entries=>entries&&typeof entries==='object'&&!Array.isArray(entries)&&Object.values(entries).every(entry=>entry&&typeof entry.revision==='string'&&Array.isArray(entry.keys)&&entry.keys.every(key=>typeof key==='string'&&/^[a-f0-9]{64}$/.test(key))&&(entry.ignoreLegacy===undefined||typeof entry.ignoreLegacy==='boolean'));
const legacyPathScope=savePath=>{
  const canonical=fs.realpathSync(savePath);
  return digest(process.platform==='win32'?canonical.toLowerCase():canonical);
};

export class QuickstartMemory {
  constructor(filePath){this.filePath=filePath;this.busy=false;}
  scope(dynastyId){
    if(!Number.isInteger(dynastyId)||dynastyId===0||dynastyId< -2147483648||dynastyId>2147483647)throw Error('Equipment tracking requires a valid dynasty identifier.');
    return digest(JSON.stringify(['cfb27-dynasty',dynastyId]));
  }
  load(){
    if(!fs.existsSync(this.filePath))return {version:2,saves:{},legacySaves:{}};
    let value;try{value=JSON.parse(fs.readFileSync(this.filePath,'utf8'));}catch{throw Error('Equipment tracking could not be read. Restore its tracking file before running this tool. Your save has not been changed.');}
    if(!value||![1,2].includes(value.version)||!validEntries(value.saves)||(value.version===2&&!validEntries(value.legacySaves)))throw Error('Equipment tracking is damaged or unsupported. Your save has not been changed.');
    return value.version===1?{version:2,saves:{},legacySaves:value.saves}:value;
  }
  snapshot(dynastyId,{savePath,players}={}){
    const value=this.load(),entry=value.saves[this.scope(dynastyId)],keys=new Set(entry?.keys??[]);
    const legacyScope=savePath&&!entry?.ignoreLegacy?legacyPathScope(savePath):null;
    const legacy=legacyScope?value.legacySaves[legacyScope]:null,migratedKeys=[];
    if(legacy&&players){
      const candidates=new Map();
      players.records.forEach((record,row)=>{
        if(!record||record.isEmpty)return;
        const oldKey=legacyQuickstartPlayerKey(record,row),newKey=quickstartPlayerKey(record,row);
        candidates.set(oldKey,candidates.has(oldKey)?null:newKey);
      });
      for(const oldKey of legacy.keys){const key=candidates.get(oldKey);if(key){keys.add(key);migratedKeys.push(key);}}
      if(this.busy)throw Error('Wait for the equipment operation to finish before recovering old player tracking.');
      // Recover only previously completed players, never mark Preview recipients.
      // Persist immediately so an all-completed save can be renamed afterward
      // without requiring another equipment Apply just to migrate its history.
      const stage=this.stage(dynastyId,[],entry?.revision??'new',{migratedKeys,legacyScope,legacyRevision:legacy.revision});
      try{stage.commit();}catch(error){stage.cancel();throw error;}
      return this.snapshot(dynastyId);
    }
    return {dynastyId,revision:entry?.revision??'new',keys,migratedKeys,legacyScope:legacy&&players?legacyScope:null,legacyRevision:legacy&&players?legacy.revision:null};
  }
  async exclusive(action){if(this.busy)throw Error('An equipment operation is busy. Wait for the current operation to finish.');this.busy=true;try{return await action();}finally{this.busy=false;}}
  stage(dynastyId,keys,revision,migration={}){
    const value=this.load(),scope=this.scope(dynastyId),current=value.saves[scope];
    const legacy=migration.legacyScope?value.legacySaves[migration.legacyScope]:null;
    if((current?.revision??'new')!==revision||(migration.legacyScope&&(legacy?.revision??null)!==migration.legacyRevision))throw Error('Equipment tracking changed after Preview. Generate a new preview before applying.');
    value.saves[scope]={revision:randomUUID(),keys:[...new Set([...(current?.keys??[]),...(migration.migratedKeys??[]),...keys])],ignoreLegacy:current?.ignoreLegacy??false};
    if(migration.legacyScope)delete value.legacySaves[migration.legacyScope];
    fs.mkdirSync(path.dirname(this.filePath),{recursive:true});
    const temporary=this.filePath+'.pending-'+randomUUID();
    fs.writeFileSync(temporary,JSON.stringify(value),'utf8');
    let finished=false;
    return {commit:()=>{fs.renameSync(temporary,this.filePath);finished=true;return value.saves[scope].keys.length;},cancel:()=>{try{if(!finished&&fs.existsSync(temporary))fs.unlinkSync(temporary);}catch{/* A cleanup error must not mask the save/commit outcome. */}}};
  }
  clear(dynastyId){
    if(this.busy)throw Error('Wait for the equipment operation to finish before clearing player tracking.');
    const value=this.load();value.saves[this.scope(dynastyId)]={revision:randomUUID(),keys:[],ignoreLegacy:true};
    fs.mkdirSync(path.dirname(this.filePath),{recursive:true});const temporary=this.filePath+'.clear-'+randomUUID();
    try{fs.writeFileSync(temporary,JSON.stringify(value),'utf8');fs.renameSync(temporary,this.filePath);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
    return {remembered:0};
  }
}
