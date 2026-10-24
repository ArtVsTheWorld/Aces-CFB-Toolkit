import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {sf} from '../tools/equipment/openSave.js';

const digest=value=>createHash('sha256').update(value).digest('hex');
export function quickstartPlayerKey(record,row){
  // Exclude team, position, class, redshirt and jersey number: normal progression
  // and transfers must not make the same player appear new. A regenerated player
  // gets a new asset/name identity, even if the game reuses the same row.
  const asset=String(sf(record,'PLYR_ASSETNAME')??'').trim();
  const names=['FirstName','LastName'].map(key=>String(sf(record,key)??'').normalize('NFKC').trim().toLowerCase());
  return digest(JSON.stringify([asset,...names,String(sf(record,'PresentationId')??''),...(asset?[]:[row,String(sf(record,'CharacterVisuals')??'')])]));
}
export class QuickstartMemory {
  constructor(filePath){this.filePath=filePath;this.busy=false;}
  scope(savePath){const canonical=fs.realpathSync(savePath);return digest(process.platform==='win32'?canonical.toLowerCase():canonical);}
  load(){
    if(!fs.existsSync(this.filePath))return {version:1,saves:{}};
    let value;try{value=JSON.parse(fs.readFileSync(this.filePath,'utf8'));}catch{throw Error('Equipment tracking could not be read. Restore its tracking file before running this tool. Your save has not been changed.');}
    if(!value||value.version!==1||!value.saves||typeof value.saves!=='object'||Array.isArray(value.saves)||Object.values(value.saves).some(entry=>!entry||typeof entry.revision!=='string'||!Array.isArray(entry.keys)||entry.keys.some(key=>typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key))))throw Error('Equipment tracking is damaged or unsupported. Your save has not been changed.');
    return value;
  }
  snapshot(savePath){const entry=this.load().saves[this.scope(savePath)];return {revision:entry?.revision??'new',keys:new Set(entry?.keys??[])};}
  async exclusive(action){if(this.busy)throw Error('An equipment operation is busy. Wait for the current operation to finish.');this.busy=true;try{return await action();}finally{this.busy=false;}}
  stage(savePath,keys,revision){
    const value=this.load(),scope=this.scope(savePath),current=value.saves[scope];
    if((current?.revision??'new')!==revision)throw Error('Equipment tracking changed after Preview. Generate a new preview before applying.');
    value.saves[scope]={revision:randomUUID(),keys:[...new Set([...(current?.keys??[]),...keys])]};
    fs.mkdirSync(path.dirname(this.filePath),{recursive:true});
    const temporary=this.filePath+'.pending-'+randomUUID();
    fs.writeFileSync(temporary,JSON.stringify(value),'utf8');
    let finished=false;
    return {commit:()=>{fs.renameSync(temporary,this.filePath);finished=true;return value.saves[scope].keys.length;},cancel:()=>{try{if(!finished&&fs.existsSync(temporary))fs.unlinkSync(temporary);}catch{/* A cleanup error must not mask the save/commit outcome. */}}};
  }
  clear(savePath){
    if(this.busy)throw Error('Wait for the equipment operation to finish before clearing player tracking.');
    const value=this.load();value.saves[this.scope(savePath)]={revision:randomUUID(),keys:[]};
    fs.mkdirSync(path.dirname(this.filePath),{recursive:true});const temporary=this.filePath+'.clear-'+randomUUID();
    try{fs.writeFileSync(temporary,JSON.stringify(value),'utf8');fs.renameSync(temporary,this.filePath);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
    return {remembered:0};
  }
}
