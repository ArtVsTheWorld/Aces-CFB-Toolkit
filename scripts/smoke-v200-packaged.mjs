import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url), asar = require('@electron/asar');
const build = path.resolve(process.argv[2] ?? 'dist/v20.0-refinement');
const extracted = fs.mkdtempSync(path.join(os.tmpdir(), 'cfb-v200-packaged-ui-'));
asar.extractAll(path.join(build, 'win-unpacked/resources/app.asar'), extracted);
let result = spawnSync(require('electron'), [path.resolve('scripts/smoke-v190-configuration.cjs'), '--refinements', ...(process.argv.includes('--uniforms') ? ['--uniforms'] : []), ...(process.argv.includes('--colors') ? ['--colors'] : []), '--ui-root=' + extracted], { stdio: 'inherit', timeout: 180000 });
if (result.status === 0) result = spawnSync(require('electron'), [path.resolve('scripts/smoke-v200-commentary.cjs'), '--ui-root=' + extracted], { stdio: 'inherit', timeout: 60000 });
if (result.status === 0) {
  // Only our freshly created, absolute temporary extraction is removed.
  if (path.dirname(extracted) !== path.resolve(os.tmpdir()) || !path.basename(extracted).startsWith('cfb-v200-packaged-ui-')) throw new Error('Unexpected temporary extraction path.');
  fs.rmSync(extracted, { recursive: true, force: true });
  console.log('Packaged renderer/preload passed all v20.0 interaction and responsive smoke checks.');
} else console.error('Packaged UI test failed; extraction preserved:', extracted, result.error ?? '');
process.exitCode = result.status ?? 1;
