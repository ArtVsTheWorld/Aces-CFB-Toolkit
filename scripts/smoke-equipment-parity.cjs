const {app}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),argument=name=>process.argv.find(value=>value.startsWith(name+'='))?.slice(name.length+1);
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const oldRoot=path.resolve(argument('--baseline-root')),source=path.resolve(argument('--save')||path.join(root,'../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN')),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),before=hash(fs.readFileSync(source));
 const old=await import(pathToFileURL(path.join(oldRoot,'src/main/tools/equipment/core/patcher.js'))),current=await import(pathToFileURL(path.join(root,'src/main/tools/equipment/core/patcher.js'))),shared=await import(pathToFileURL(path.join(root,'src/main/tools/equipment/shared.js'))),{normalizeModPools}=await import(pathToFileURL(path.join(root,'src/main/tools/equipment/core/modPools.js')));
 const loaded=await shared.loadEquipmentTables(source,path.join(root,'resources/engine-data/C27_486_6.gz')),names=shared.buildTeamNames(loaded.teams.records),brands=shared.buildTeamApparel(loaded.teams.records),roster=shared.buildRosterPlayerRows(loaded.players,loaded.teams,loaded.rosters);
 // The production runner snapshots these before generation too. Warm both
 // algorithms' shared read-only inputs so decoding is not charged to one side.
 shared.snapshotVisualRawData(loaded.visuals.records);
 // Explicitly identical pools isolate performance changes from the requested
 // default change. No Apply/write or equipment-memory store is used here.
 const options={teamNames:names,teamApparel:brands,playerApparel:shared.buildRosterPlayerApparel(loaded.players,loaded.teams,loaded.rosters),recipientRosterRows:roster,donorRosterRows:roster,fcsTeamIndexes:shared.buildFcsTeamIndexes(loaded.teams.records),protectOriginalEaPlayers:false,noDripProfile:true,usingUnlockedMod:true,usingRawAccessoriesMod:true,usingEquipmentTruckMod:true,modPools:normalizeModPools(),seed:1776,apply:false};
 let start=Date.now(),prior=old.patchFreshmanEquipment(loaded.players.records,loaded.visuals.records,loaded.visuals.header.tableId,options);const priorMs=Date.now()-start,expected=hash(JSON.stringify(prior)),rows=prior.changes.length;prior=null;
 start=Date.now();const updated=current.patchFreshmanEquipment(loaded.players.records,loaded.visuals.records,loaded.visuals.header.tableId,options),updatedMs=Date.now()-start;
 assert.equal(hash(JSON.stringify(updated)),expected,'Complete seeded recipients, donors, equipment, metadata, skipped players and audits must match');assert.equal(hash(fs.readFileSync(source)),before);
 const result={players:rows,seed:1776,baselineMs:priorMs,optimizedMs:updatedMs,speedupPercent:Math.round((1-updatedMs/priorMs)*100),exactFullResultMatch:true,sourceUnchanged:true};fs.writeFileSync(path.resolve(argument('--output')||'outputs/equipment-parity.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}).then(()=>app.quit()).catch(error=>{console.error(error.message);app.exit(1);});
