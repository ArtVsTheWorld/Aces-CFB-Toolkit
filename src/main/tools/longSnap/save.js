import fs from 'node:fs';import path from 'node:path';import{createHash,randomUUID}from'node:crypto';
import{openCfb27Save}from'../../services/save.js';
import{validateSaveContainer,writeFixedSaveCandidate}from'../../services/saveContainer.js';
import{saveFingerprint}from'../jersey/planStore.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function saveLongSnapCandidate(loaded,schemaPath,fingerprint){
  const temporary=path.join(path.dirname(loaded.savePath),`.ace-long-snap-${randomUUID()}.tmp`);
  if(saveFingerprint(loaded.savePath)!==fingerprint)throw Error('The save changed after Preview. No save was written.');
  loaded.players.updateBuffer?.();
  const expected=new Map(loaded.franchise.tables.map(table=>[table.header.tableId,hash(table.data)])),length=validateSaveContainer(fs.readFileSync(loaded.savePath)).fileLength;
  try{
    await writeFixedSaveCandidate(loaded.franchise,temporary);validateSaveContainer(fs.readFileSync(temporary),length);
    const candidate=await openCfb27Save(temporary,schemaPath);
    if(candidate.franchise.tables.length!==expected.size||candidate.franchise.tables.some(table=>hash(table.data)!==expected.get(table.header.tableId)))throw Error('Saved Long Snap data differs from the reviewed changes. The original save was kept unchanged.');
    if(saveFingerprint(loaded.savePath)!==fingerprint)throw Error('The save changed during Apply. The original save was kept unchanged.');
    fs.renameSync(temporary,loaded.savePath);
  }finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
