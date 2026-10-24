import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),asar=require('@electron/asar'),build=path.resolve(process.argv[2]??'dist/v22.5-test'),archive=path.join(build,'win-unpacked/resources/app.asar'),extracted=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-v225-packaged-'));
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):[path.join(dir,entry.name)]),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
asar.extractAll(archive,extracted);let checked=0;
for(const file of files(path.resolve('src'))){const relative=path.relative(process.cwd(),file);assert.equal(hash(fs.readFileSync(file)),hash(fs.readFileSync(path.join(extracted,relative))),relative);checked++;}
assert.equal(JSON.parse(fs.readFileSync(path.join(extracted,'package.json'))).version,JSON.parse(fs.readFileSync('package.json')).version);
for(const relative of ['engine-data/C27_486_6.gz','commentary-data/PlayerCommentaryidMap.txt'])assert.equal(hash(fs.readFileSync(path.join('resources',relative))),hash(fs.readFileSync(path.join(build,'win-unpacked/resources',relative))));
console.log(`Verified ${checked} packaged source files/assets, native tuning, version, schema and commentary map.`);
const checks=[['scripts/smoke-v225.cjs']];
if(process.argv.includes('--filter-polish'))checks.push(['scripts/smoke-v190-configuration.cjs','--paged-filters','--alignment','--tooltip-redshirt','--scope-force-alignment']);
if(process.argv.includes('--mod-pool-layout'))checks.push(['scripts/smoke-v190-configuration.cjs','--mod-pool-layout-only']);
if(process.argv.includes('--roster-review'))checks.push(['scripts/smoke-v190-configuration.cjs','--roster-review-only']);
if(process.argv.includes('--quickstart'))checks.push(['scripts/smoke-v190-configuration.cjs','--quickstart-only']);
if(process.argv.includes('--frequency'))checks.push(['scripts/smoke-v190-configuration.cjs','--frequency-only']);
if(process.argv.includes('--equipment-pages'))checks.push(['scripts/smoke-v190-configuration.cjs','--equipment-pages-only']);
if(process.argv.includes('--compact-progress'))checks.push(['scripts/smoke-v190-configuration.cjs','--compact-progress-only']);
let status=0;
for(const [script,...flags]of checks){
 const result=spawnSync(require('electron'),[path.resolve(script),'--ui-root='+extracted,...flags],{stdio:'inherit',timeout:240000});
 if(result.status!==0){status=result.status??1;console.error('Failed extraction retained:',extracted,result.error??'');break;}
}
if(status===0){if(path.dirname(extracted)!==path.resolve(os.tmpdir())||!path.basename(extracted).startsWith('cfb-v225-packaged-'))throw Error('Unsafe cleanup');fs.rmSync(extracted,{recursive:true,force:true});}
process.exitCode=status;
