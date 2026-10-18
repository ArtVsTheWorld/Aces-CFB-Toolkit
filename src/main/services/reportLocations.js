import fs from 'node:fs';
import path from 'node:path';

export function validateReportLocation(target,directory){
  if(typeof target!=='string'||!path.isAbsolute(target)||path.extname(target).toLowerCase()!=='.csv')throw new Error('Choose an existing CSV report.');
  const root=fs.realpathSync(directory),file=fs.realpathSync(target),relative=path.relative(root,file);
  if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||!fs.statSync(file).isFile())throw new Error('That file is outside the Toolkit reports folder.');
  return file;
}
