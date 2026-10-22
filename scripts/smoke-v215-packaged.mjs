import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),asar=require('@electron/asar'),build=path.resolve(process.argv[2]??'dist/v22.0-test'),archive=path.join(build,'win-unpacked/resources/app.asar'),extracted=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-v215-packaged-'));
const files=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)]),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
asar.extractAll(archive,extracted);let checked=0;
for(const file of files(path.resolve('src'))){const relative=path.relative(process.cwd(),file);assert.equal(hash(fs.readFileSync(file)),hash(fs.readFileSync(path.join(extracted,relative))),`Packaged source mismatch: ${relative}`);checked++;}
assert.equal(JSON.parse(fs.readFileSync(path.join(extracted,'package.json'))).version,'22.0.0');
for(const relative of ['engine-data/C27_486_6.gz','commentary-data/PlayerCommentaryidMap.txt'])assert.equal(hash(fs.readFileSync(path.join('resources',relative))),hash(fs.readFileSync(path.join(build,'win-unpacked/resources',relative))));
console.log(`Verified ${checked} packaged source/assets, schema, commentary map, version.`);
const result=spawnSync(require('electron'),[path.resolve('scripts/smoke-v215.cjs'),'--ui-root='+extracted],{stdio:'inherit',timeout:180000});
if(result.status===0){if(path.dirname(extracted)!==path.resolve(os.tmpdir())||!path.basename(extracted).startsWith('cfb-v215-packaged-'))throw Error('Unsafe cleanup');fs.rmSync(extracted,{recursive:true,force:true});}else console.error('Packaged test failed; extraction retained:',extracted,result.error??'');
process.exitCode=result.status??1;
