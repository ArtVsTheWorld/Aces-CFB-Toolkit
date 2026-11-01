import path from 'node:path';
import {getTool} from '../../shared/toolRegistry.js';

const allKinds=['dynasty','road-to-glory','roster'];
const prefixes={dynasty:'DYNASTY-', 'road-to-glory':'RTG-',roster:'ROSTER-'};
export function acceptedSaveKinds(purpose){
  // Donor inputs can use native rosters as well as either career save type.
  if(purpose==='equipment-donor')return [...allKinds];
  return [...(getTool(purpose)?.input?.accepted??allKinds)];
}
export function validatePickedSaveName(file,purpose){
  const kinds=acceptedSaveKinds(purpose),names=kinds.map(kind=>prefixes[kind]),base=path.win32.basename(String(file??'').replaceAll('/','\\'));
  const kind=allKinds.find(kind=>base.toUpperCase().startsWith(prefixes[kind])&&base.length>prefixes[kind].length);
  if(!kind||path.win32.extname(base))throw Error(`Choose a CFB 27 game save named ${names.join(' or ')} followed by its save name, with no file extension. Mod files (.fbmod), reports and archives cannot be opened as saves.`);
  if(!kinds.includes(kind))throw Error(`${getTool(purpose)?.name??'This tool'} accepts ${names.join(' or ')} files. Choose a supported save for this tool.`);
  return file;
}
export async function chooseGameSave(dialog,purpose){
  const names=acceptedSaveKinds(purpose).map(kind=>prefixes[kind]);
  // Electron filters by extension, not filename prefix. Native game saves have
  // no extension; validate the returned name before any parser or worker sees it.
  const result=await dialog.showOpenDialog({title:purpose==='equipment-donor'?'Select a CFB 27 donor save or roster':`Select a CFB 27 Save (${names.join(', ')})`,properties:['openFile'],filters:[{name:'CFB 27 Saves',extensions:['*']}]});
  if(result.canceled||!result.filePaths?.length)return null;
  try{return validatePickedSaveName(result.filePaths[0],purpose);}
  catch(error){await dialog.showMessageBox({type:'warning',title:'Choose a Game Save',message:'That file cannot be used here.',detail:error.message,buttons:['OK'],defaultId:0});return null;}
}
