import fs from 'node:fs';
import path from 'node:path';
import maddenPkg from 'madden-franchise';
import {resolveBundledSchemaForHeader,inspectSaveSchema} from './save.js';
import {readHomeContext,homeContextFromFranchise} from './homeContext.js';
import {equipmentDynastyId} from './quickstartMemory.js';
import {saveFingerprint} from '../tools/jersey/planStore.js';
import {isRosterContainer} from '../tools/equipment/rosterCodec.js';
import {toolProgress} from './toolProgress.js';
const Franchise=maddenPkg.default||maddenPkg;

// Detached metadata only. Every request hashes current bytes, so a rewritten
// file or another dynasty at the same filename cannot inherit cached identity.
export class SaveReader {
  constructor(){this.cache=new Map();}
  async read(savePath,schemaDirectory,{identityOnly=false}={}){
    toolProgress(5,'Checking selected save…');
    const fingerprint=saveFingerprint(savePath),key=path.resolve(schemaDirectory)+'|'+fingerprint;
    const cached=this.cache.get(key);
    if(cached&&(!cached.schema.supported||identityOnly||cached.context!==undefined||cached.contextError))return structuredClone(cached);
    const descriptor=fs.openSync(savePath,'r'),header=Buffer.alloc(80);
    try{fs.readSync(descriptor,header,0,80,0);}finally{fs.closeSync(descriptor);}
    let schema,context,contextError,dynastyId=null;
    if(isRosterContainer(header)){
      schema=inspectSaveSchema(savePath,schemaDirectory);
      if(schema.supported&&!identityOnly)context=await readHomeContext(savePath,schema.path);
    }else{
      let franchise;
      try{
        // Constructor inflates once. Public settings + parse reuse that same
        // instance after checking the bundled schema, instead of opening again.
        franchise=new Franchise(savePath,{autoParse:false,saveOnChange:false});
        const meta=franchise.expectedSchemaVersion??{},match=resolveBundledSchemaForHeader(franchise.gameYear,meta.major,meta.minor);
        const part=value=>Number.isFinite(Number(value))?Number(value):'?';
        const detected=`C${part(franchise.gameYear)}_${part(meta.major)}_${part(meta.minor)}`;
        if(!match){schema={version:detected,supported:false,error:`Save Version: ${detected} · Unsupported. Ace's CFB Toolkit will not guess a schema or modify this save.`};}
        else{
          const schemaPath=path.join(schemaDirectory,`${match.version}.gz`);
          if(!fs.existsSync(schemaPath))throw Error(`The bundled ${match.version} schema is missing. Reinstall Ace's CFB Toolkit.`);
          schema={...match,saveHeader:detected,path:schemaPath,supported:true};
        }
      }catch(error){schema={version:'Unknown',supported:false,error:error.message};}
      if(schema.supported){
        toolProgress(35,'Reading dynasty information…');
        franchise.settings={schemaDirectory,schemaOverride:{major:schema.major,minor:schema.minor,gameYear:schema.gameYear,path:schema.path}};
        await new Promise((resolve,reject)=>{franchise.once('ready',resolve);franchise.once('error',reject);try{franchise.parse();}catch(error){reject(error);}});
        if(identityOnly){try{dynastyId=await equipmentDynastyId(franchise);}catch{}}
        else{
          toolProgress(65,'Reading teams and season…');
          try{context=await homeContextFromFranchise(franchise);dynastyId=context.dynastyId;}
          catch(error){contextError=error.message;try{dynastyId=await equipmentDynastyId(franchise);}catch{}}
        }
      }
    }
    toolProgress(92,'Verifying selected save…');
    if(saveFingerprint(savePath)!==fingerprint)throw Error('The save changed while loading. Select it again.');
    const value={schema,dynastyId,context,contextError};this.cache.set(key,value);
    while(this.cache.size>64)this.cache.delete(this.cache.keys().next().value);
    return structuredClone(value);
  }
}
