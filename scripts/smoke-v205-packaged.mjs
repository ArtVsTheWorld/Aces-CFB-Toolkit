import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';

const require=createRequire(import.meta.url),asar=require('@electron/asar'),build=path.resolve(process.argv[2]??'dist/v20.5-roster-generator');
const extracted=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-v205-packaged-'));
asar.extractAll(path.join(build,'win-unpacked/resources/app.asar'),extracted);
if(!fs.existsSync(path.join(extracted,'src/main/tools/rosterGenerator/data/observed-v1.json.gz')))throw new Error('Packaged generation catalog is missing.');
const result=spawnSync(require('electron'),[path.resolve('scripts/smoke-v205-roster-generator.cjs'),'--ui-root='+extracted,...(process.argv.includes('--v207')?['--v207']:[])],{stdio:'inherit',timeout:180000});
if(result.status===0){
  if(path.dirname(extracted)!==path.resolve(os.tmpdir())||!path.basename(extracted).startsWith('cfb-v205-packaged-'))throw new Error('Unexpected extraction directory.');
  fs.rmSync(extracted,{recursive:true,force:true});
}else console.error('Packaged test failed; extraction retained:',extracted,result.error??'');
process.exitCode=result.status??1;
