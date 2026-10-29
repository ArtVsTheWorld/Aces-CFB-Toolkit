import {readSaveMetadata} from './saveMetadata.js';
import dynastyIdentity from '../../shared/dynastyIdentity.cjs';
const {validDynastyId}=dynastyIdentity;

export async function readDynastyIdentity(savePath,schemaDirectory){
  const {dynastyId}=await readSaveMetadata(savePath,schemaDirectory,{identityOnly:true});
  return validDynastyId(dynastyId)?dynastyId:null;
}
