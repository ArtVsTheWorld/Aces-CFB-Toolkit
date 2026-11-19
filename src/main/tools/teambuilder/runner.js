import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {createBackup} from '../../services/files.js';
import {unpackTeamBuilder} from './container.js';
import {proposeTeamBuilder} from './editor.js';

const reviewedPlans = new WeakMap();
export const fingerprint = bytes => createHash('sha256').update(bytes).digest('hex');
function readSource(savePath) {
  if (typeof savePath !== 'string' || !/^TEAMBUILDER-\d+$/i.test(path.basename(savePath))) throw Error('Choose a TEAMBUILDER- save file.');
  const resolved = path.resolve(savePath), stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Choose a regular TeamBuilder file.');
  // Verified profile has a small fixed container. Bound input before reading.
  if (stat.size > 32 * 1024 * 1024) throw Error('TeamBuilder file exceeds the supported research size.');
  return {resolved, bytes: fs.readFileSync(resolved)};
}
export function previewTeamBuilder(savePath, edits = {}, options = {}) {
  if (Object.keys(options).some(key => key !== 'forceRepack') ||
      Object.hasOwn(options, 'forceRepack') && typeof options.forceRepack !== 'boolean') throw Error('Unsupported preview option.');
  const source = readSource(savePath), sourceHash = fingerprint(source.bytes);
  const reviewedEdits = JSON.stringify(edits);
  const candidate = proposeTeamBuilder(unpackTeamBuilder(source.bytes), edits, options);
  const preview = Object.freeze({savePath: source.resolved, sourceHash,
    candidateHash: fingerprint(candidate.bytes), changed: !candidate.bytes.equals(source.bytes),
    changes: Object.freeze(candidate.changes.map(Object.freeze)), warnings: Object.freeze(candidate.warnings)});
  reviewedPlans.set(preview, {path: source.resolved, sourceHash, candidateHash: preview.candidateHash,
    reviewedEdits, forceRepack: options.forceRepack === true});
  return preview;
}
export function applyTeamBuilder(preview) {
  const plan = reviewedPlans.get(preview);
  if (!plan) throw Error('Preview these TeamBuilder changes again before applying.');
  const source = readSource(plan.path);
  if (fingerprint(source.bytes) !== plan.sourceHash) throw Error('The TeamBuilder file changed after Preview. Preview it again.');
  const candidate = proposeTeamBuilder(unpackTeamBuilder(source.bytes), JSON.parse(plan.reviewedEdits), {forceRepack: plan.forceRepack});
  if (fingerprint(candidate.bytes) !== plan.candidateHash) throw Error('TeamBuilder changes differ from the reviewed preview.');
  if (candidate.bytes.equals(source.bytes)) { reviewedPlans.delete(preview); return {changed: false, backupPath: null, hash: plan.sourceHash}; }
  const backupPath = createBackup(plan.path);
  if (fingerprint(fs.readFileSync(backupPath)) !== plan.sourceHash) throw Error('The TeamBuilder backup could not be verified. No changes were applied.');
  const temporary = `${plan.path}.writing-${randomUUID()}`;
  let ownedTemporary = false;
  try {
    const fd = fs.openSync(temporary, 'wx'); ownedTemporary = true;
    try { fs.writeFileSync(fd, candidate.bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    const staged = fs.readFileSync(temporary);
    unpackTeamBuilder(staged);
    if (fingerprint(staged) !== plan.candidateHash) throw Error('The staged TeamBuilder file failed verification.');
    if (fingerprint(readSource(plan.path).bytes) !== plan.sourceHash) throw Error('The TeamBuilder file changed while applying. No changes were applied.');
    fs.renameSync(temporary, plan.path); ownedTemporary = false;
    const written = fs.readFileSync(plan.path);
    unpackTeamBuilder(written);
    if (fingerprint(written) !== plan.candidateHash) throw Error(`The written file failed verification. The original backup is at ${backupPath}.`);
    reviewedPlans.delete(preview);
    return {changed: true, backupPath, hash: plan.candidateHash};
  } finally { if (ownedTemporary) fs.unlinkSync(temporary); }
}
