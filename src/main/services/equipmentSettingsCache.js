import fs from 'node:fs';
import path from 'node:path';
import {saveFingerprint} from '../tools/jersey/planStore.js';

const tools=new Set(['freshman-equipment','equipment-quickstart','equipment-patcher']);
// Only detached settings DTOs are retained. Preview/Apply never use this cache.
export class EquipmentSettingsCache {
  constructor(memoryFile,{maxEntries=8,maxBytes=16*1024*1024}={}){
    this.memoryFile=memoryFile;this.maxEntries=maxEntries;this.maxBytes=maxBytes;this.entries=new Map();this.bytes=0;this.epoch=0;
  }
  clear(){this.entries.clear();this.bytes=0;this.epoch++;}
  signature(payload){
    return JSON.stringify([path.resolve(payload.savePath),saveFingerprint(payload.savePath),path.resolve(payload.schemaPath),saveFingerprint(payload.schemaPath),this.memoryFile&&fs.existsSync(this.memoryFile)?saveFingerprint(this.memoryFile):null,payload.toolId,payload.options??{}]);
  }
  async read(payload,prepare,onHit=()=>{}){
    if(!tools.has(payload.toolId))return prepare();
    const signature=this.signature(payload),cached=this.entries.get(signature);
    if(cached){this.entries.delete(signature);this.entries.set(signature,cached);onHit();return structuredClone(cached.value);}
    const epoch=this.epoch,value=await prepare();
    const after=this.signature(payload);
    // A first read can migrate tracking. Do not cache across any such change.
    if(after!==signature||epoch!==this.epoch)return value;
    const copy=structuredClone(value),bytes=Buffer.byteLength(JSON.stringify(copy));
    if(bytes>this.maxBytes)return value;
    this.bytes-=this.entries.get(signature)?.bytes??0;
    this.entries.set(signature,{value:copy,bytes});this.bytes+=bytes;
    while(this.entries.size>this.maxEntries||this.bytes>this.maxBytes){const key=this.entries.keys().next().value;this.bytes-=this.entries.get(key).bytes;this.entries.delete(key);}
    return value;
  }
}
