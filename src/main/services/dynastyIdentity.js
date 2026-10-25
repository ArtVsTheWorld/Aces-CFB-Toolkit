import {openCfb27Save,inspectSaveSchema} from './save.js';
import {equipmentDynastyId} from './quickstartMemory.js';
import {saveFingerprint} from '../tools/jersey/planStore.js';
import dynastyIdentity from '../../shared/dynastyIdentity.cjs';
const {validDynastyId}=dynastyIdentity;

// Worker-owned, keyed by file contents rather than a filename that may be reused.
const identities=new Map();
export async function readDynastyIdentity(savePath,schemaDirectory){
  const before=saveFingerprint(savePath);
  if(identities.has(before))return identities.get(before);
  const schema=inspectSaveSchema(savePath,schemaDirectory);
  if(!schema.supported||schema.kind==='roster')return null;
  const {franchise}=await openCfb27Save(savePath,schema.path);
  let id=null;
  try{id=await equipmentDynastyId(franchise);}catch{/* Some compatible RTG files have no dynasty table. */}
  if(saveFingerprint(savePath)!==before)throw Error('The save changed while identifying its dynasty. Select it again.');
  const value=validDynastyId(id)?id:null;identities.set(before,value);
  while(identities.size>512)identities.delete(identities.keys().next().value);
  return value;
}
