import fs from 'node:fs';
import dynastyIdentity from '../../shared/dynastyIdentity.cjs';
import {readTeamArtwork,copyLegacyTeamArtwork} from './teamArtwork.js';
import {recoverHistoryDynasties} from './historyDynasties.js';
const {validDynastyId,dynastyKey}=dynastyIdentity;

export class DynastyProfiles{
  constructor({settings,history,dataDirectory,reportsDirectory,resolveIdentity,log=()=>{}}){
    Object.assign(this,{settings,history,dataDirectory,reportsDirectory,resolveIdentity,log});this.historyAttempted=new Set();
    const value=settings.get();
    if(Object.keys(value.teamArtwork??{}).length&&!value.legacyArtworkMigration){
      if(fs.existsSync(settings.filePath)&&!fs.existsSync(settings.filePath+'.before-dynasty-profiles.bak'))fs.copyFileSync(settings.filePath,settings.filePath+'.before-dynasty-profiles.bak',fs.constants.COPYFILE_EXCL);
      settings.update({legacyArtworkMigration:{sourcePath:value.activeSave??value.recentSaves?.[0]??null,ownerDynastyId:null,completed:false}});
    }
  }
  async migrateHistory(){
    if(this.historyMigration)return this.historyMigration;
    const pending=this.history.entries.filter(entry=>!validDynastyId(entry.dynastyId)&&!this.historyAttempted.has(entry.id));if(!pending.length)return;
    const entries=this.history.list(250);pending.forEach(entry=>this.historyAttempted.add(entry.id));
    this.historyMigration=(async()=>{try{this.history.assignDynasties(await recoverHistoryDynasties(entries,this.resolveIdentity,this.reportsDirectory));}catch(error){this.log('dynasty-history-recovery-failed',error);}})();
    try{await this.historyMigration;}finally{this.historyMigration=null;}
  }
  profile(id){return validDynastyId(id)?this.settings.get().dynastyArtwork?.[dynastyKey(id)]??{}:{};}
  readArtwork(id,teamNames){return validDynastyId(id)?readTeamArtwork(this.dataDirectory,this.profile(id),teamNames,id):{};}
  canImportLegacy(){const migration=this.settings.get().legacyArtworkMigration;return Boolean(migration&&!migration.completed&&!validDynastyId(migration.ownerDynastyId));}
  prepareKnown(id,savePath){
    if(!validDynastyId(id))return;
    const migration=this.settings.get().legacyArtworkMigration;
    if(!migration||migration.completed)return;
    // Selection has already verified this file's native identifier. Uncertain
    // prior owners are resolved separately, never by blocking Home rendering.
    if(migration.ownerDynastyId===id||(!validDynastyId(migration.ownerDynastyId)&&migration.sourcePath===savePath))this.importLegacy(id);
  }
  async prepare(id){
    if(!validDynastyId(id))return;
    if(this.artworkMigration)await this.artworkMigration;
    this.artworkMigration=(async()=>{
      const value=this.settings.get(),migration=value.legacyArtworkMigration;if(!migration||migration.completed)return;
      let owner=migration.ownerDynastyId;
      if(!validDynastyId(owner)&&migration.sourcePath){
        try{owner=await this.resolveIdentity(migration.sourcePath);}catch{}
        if(!validDynastyId(owner)){
          const recovered=new Set(this.history.entries.filter(entry=>entry.inputPath===migration.sourcePath&&validDynastyId(entry.dynastyId)).map(entry=>entry.dynastyId));if(recovered.size===1)[owner]=recovered;
        }
      }
      if(validDynastyId(owner)){
        const current=this.settings.get().legacyArtworkMigration;
        if(current?.completed)return;
        if(validDynastyId(current?.ownerDynastyId))owner=current.ownerDynastyId;
        this.settings.update({legacyArtworkMigration:{...current,ownerDynastyId:owner}});
        if(owner===id)this.importLegacy(id);
      }
    })();
    try{await this.artworkMigration;}catch(error){this.log('dynasty-artwork-recovery-failed',error);}finally{this.artworkMigration=null;}
  }
  importLegacy(id){
    if(!validDynastyId(id))throw Error('Select a dynasty before recovering artwork.');
    const value=this.settings.get(),migration=value.legacyArtworkMigration;
    if(migration?.completed&&migration.ownerDynastyId===id)return;
    if(!migration||migration.completed||(validDynastyId(migration.ownerDynastyId)&&migration.ownerDynastyId!==id))throw Error('Previous artwork has already been assigned to another dynasty.');
    const profile=copyLegacyTeamArtwork(this.dataDirectory,value.teamArtwork,this.profile(id),id);
    this.settings.update({dynastyArtwork:{...value.dynastyArtwork,[dynastyKey(id)]:profile},legacyArtworkMigration:{...migration,ownerDynastyId:id,completed:true}});
  }
  setArtwork(id,team,kind,file){
    const value=this.settings.get(),key=dynastyKey(id),profile={...this.profile(id)},entry={...profile[team]};
    if(file)entry[kind]=file;else delete entry[kind];
    if(Object.keys(entry).length)profile[team]=entry;else delete profile[team];
    this.settings.update({dynastyArtwork:{...value.dynastyArtwork,[key]:profile}});
  }
}
