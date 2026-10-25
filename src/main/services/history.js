import fs from "node:fs";
import path from "node:path";
import dynastyIdentity from '../../shared/dynastyIdentity.cjs';
const {validDynastyId}=dynastyIdentity;

export class HistoryStore {
  constructor(filePath) { this.filePath = filePath; this.entries = []; }
  load() { try { const value = JSON.parse(fs.readFileSync(this.filePath, "utf8")); this.entries = Array.isArray(value) ? value : []; } catch { this.entries = []; } return this.list(); }
  persist(entries){fs.mkdirSync(path.dirname(this.filePath),{recursive:true});const temporary=this.filePath+'.tmp';fs.writeFileSync(temporary,JSON.stringify(entries,null,2)+'\n','utf8');fs.renameSync(temporary,this.filePath);this.entries=entries;}
  add(entry) { const stored = { id: entry.id, timestamp: entry.timestamp, toolId: entry.toolId, toolName: entry.toolName, ...(entry.appVersion ? { appVersion: entry.appVersion } : entry.toolVersion ? { toolVersion: entry.toolVersion } : {}), inputPath: entry.inputPath,...(validDynastyId(entry.dynastyId)?{dynastyId:entry.dynastyId}:{}), mode: entry.mode, status: entry.status, summary: entry.summary ?? [], backupPath: entry.backupPath ?? null, reportPath: entry.reportPath ?? null, reviewAvailable: Boolean(entry.reviewAvailable), logReference: entry.logReference ?? entry.id }; this.persist([stored,...this.entries].slice(0,250)); return stored; }
  assignDynasties(identities){
    const next=this.entries.map(entry=>!validDynastyId(entry.dynastyId)&&validDynastyId(identities.get(entry.id))?{...entry,dynastyId:identities.get(entry.id)}:entry);
    if(!next.some((entry,index)=>entry!==this.entries[index]))return;
    if(fs.existsSync(this.filePath)&&!fs.existsSync(this.filePath+'.before-dynasty-ids.bak'))fs.copyFileSync(this.filePath,this.filePath+'.before-dynasty-ids.bak',fs.constants.COPYFILE_EXCL);
    this.persist(next);
  }
  list(limit = 100) { return structuredClone(this.entries.slice(0, limit)); }
  get(id) { return structuredClone(this.entries.find(entry => entry.id === id) ?? null); }
}
