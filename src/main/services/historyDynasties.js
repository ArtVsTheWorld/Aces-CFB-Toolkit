import fs from 'node:fs';
import path from 'node:path';
import dynastyIdentity from '../../shared/dynastyIdentity.cjs';
const {validDynastyId}=dynastyIdentity;

function reportAudit(entry,directory){
  try{
    const root=fs.realpathSync(directory),file=fs.realpathSync(entry.reportPath+'.meta.json'),relative=path.relative(root,file);
    if(!relative||relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative)||fs.statSync(file).size>524288)return null;
    const audit=JSON.parse(fs.readFileSync(file,'utf8')).audit;return audit?.runId===entry.id?audit:null;
  }catch{return null;}
}
export async function recoverHistoryDynasties(entries,resolveIdentity,reportsDirectory){
  const identities=new Map(entries.filter(entry=>validDynastyId(entry.dynastyId)).map(entry=>[entry.id,entry.dynastyId])),links=new Map(entries.map(entry=>[entry.id,new Set()])),reads=new Map();
  const read=file=>{if(!reads.has(file))reads.set(file,Promise.resolve().then(()=>resolveIdentity(file)).catch(()=>null));return reads.get(file);};
  for(const entry of entries){
    const audit=reportAudit(entry,reportsDirectory);
    if(links.has(audit?.previewRunId)){links.get(entry.id).add(audit.previewRunId);links.get(audit.previewRunId).add(entry.id);}
    if(identities.has(entry.id))continue;
    let id=validDynastyId(audit?.dynastyId)?audit.dynastyId:null;
    if(!validDynastyId(id)&&entry.backupPath)id=await read(entry.backupPath);
    if(!validDynastyId(id)&&entry.inputPath){
      // A filename alone is not evidence when the file has been replaced or
      // modified since the old run. Keep those entries unassigned and visible.
      try{const stat=fs.statSync(entry.inputPath),when=Date.parse(entry.timestamp);if(Number.isFinite(when)&&Math.max(stat.mtimeMs,stat.ctimeMs,stat.birthtimeMs)<=when)id=await read(entry.inputPath);}catch{}
    }
    if(validDynastyId(id))identities.set(entry.id,id);
  }
  const seen=new Set();
  for(const entry of entries){
    if(seen.has(entry.id))continue;const stack=[entry.id],component=[],known=new Set();
    while(stack.length){const id=stack.pop();if(seen.has(id))continue;seen.add(id);component.push(id);if(identities.has(id))known.add(identities.get(id));stack.push(...links.get(id));}
    if(known.size===1){const [dynastyId]=known;for(const id of component)if(!identities.has(id))identities.set(id,dynastyId);}
  }
  return identities;
}
