import {SaveReader} from './saveReader.js';
import path from 'node:path';

// Worker-local, detached metadata only. SaveReader checks current file contents
// on every request; no mutable Franchise or preview state is reused here.
const reader=new SaveReader();
export const readSaveMetadata=(savePath,schemaDirectory,options)=>reader.read(savePath,schemaDirectory,options);

export async function readToolHomeContext(savePath,schemaPath){
  const value=await readSaveMetadata(savePath,path.dirname(schemaPath));
  if(!value.schema.supported)throw new Error(value.schema.error);
  if(!value.context)throw new Error(value.contextError||'Home information is unavailable for this save.');
  return value.context;
}
