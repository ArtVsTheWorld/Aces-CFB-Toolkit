import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {previewRosterGenerator} from '../src/main/tools/rosterGenerator/preview.js';
import {renderRosterGeneratorReport,rosterGeneratorCsv} from '../src/main/tools/rosterGenerator/report.js';
import {writeCsv} from '../src/main/services/files.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),[savePath,team,seedText='1',...extra]=process.argv.slice(2);
if(!savePath||!team||extra.length)throw new Error('Usage: node scripts/preview-roster-generator.mjs <dynasty save> <exact team name> [uint32 seed]. Preview only; no Apply is supported.');
const preview=await previewRosterGenerator({savePath,schemaPath:path.join(root,'resources/engine-data/C27_486_6.gz'),team,seed:Number(seedText)});
fs.mkdirSync(path.join(root,'outputs'),{recursive:true});const output=fs.mkdtempSync(path.join(root,'outputs/roster-generator-preview-'));
fs.writeFileSync(path.join(output,'preview.json'),JSON.stringify(preview,null,2));
fs.writeFileSync(path.join(output,'preview.html'),renderRosterGeneratorReport(preview));
const csv=rosterGeneratorCsv(preview);writeCsv(path.join(output,'preview.csv'),csv.headings,csv.rows);
console.log(JSON.stringify({output,team:preview.team,summary:preview.summary,blocking:preview.blocking,canApply:preview.canApply,source:preview.source},null,2));
