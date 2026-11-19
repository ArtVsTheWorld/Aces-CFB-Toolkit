import {unpackTeamBuilder, packTeamBuilder, namedMap, headerText, setHeaderText, TEAMBUILDER_PROFILE} from './container.js';
import {patchJsonScalars} from './jsonPatch.js';

// Provisional research limits. Game acceptance and dynasty recalculation still
// need controlled tests; these are not promises of permanently locked grades.
export const GRADE_FIELDS = Object.freeze([
  'ACADEMIC_PRESTIGE', 'ATHLETIC_FACILITIES_GRADE', 'BRAND_EXPOSURE_GRADE',
  'CAMPUS_LIFESTYLE_GRADE', 'CHAMPIONSHIP_CONTENDER_GRADE', 'COACH_PRESTIGE_GRADE',
  'COACH_STABILITY_GRADE', 'CONFERENCE_PRESTIGE_GRADE', 'PROGRAM_TRADITION_GRADE',
  'PRO_POTENTIAL_GRADE', 'STADIUM_ATMOSTPHERE_GRADE',
]);
const observedTemplates = [1, 2, 6, 7, 14];
const observedPipelineValues = [1, 30, 90, 175, 300];
const recordStats = ['PASSING_YARDS', 'RUSHING_YARDS', 'RECEIVING_YARDS', 'RECEPTIONS',
  'PASSING_TOUCHDOWNS', 'RUSHING_TOUCHDOWNS', 'SACKS', 'RECEIVING_TOUCHDOWNS', 'INTERCEPTIONS'];
function object(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key))) throw Error(`Unsupported ${label} setting.`);
}
function integer(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw Error(`${label} must be a whole number from ${min} to ${max}.`);
}
function text(value, maxBytes, label) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() ||
      /[\u0000-\u001f\u007f]/u.test(value) || Buffer.byteLength(value) > maxBytes) throw Error(`${label} must contain 1–${maxBytes} UTF-8 bytes without control characters or outside spaces.`);
}
function list(value, label) { if (!Array.isArray(value) || value.length > 100) throw Error(`Invalid ${label} list.`); }

export function proposeTeamBuilder(source, edits = {}, {forceRepack = false} = {}) {
  object(edits, ['name', 'nickname', 'abbreviation', 'foundingYear', 'prestige', 'template',
    'grades', 'pipelineChanges', 'rivalryChanges', 'recordChanges'], 'TeamBuilder');
  // Decode a fresh copy, including typed maps and binary blobs. Never mutate the
  // caller's original document or normalize an unrelated existing discrepancy.
  const candidate = unpackTeamBuilder(source.bytes);
  const document = candidate.document;
  const header = Buffer.from(source.bytes.subarray(0, TEAMBUILDER_PROFILE.payloadOffset));
  const team = document.value.TDAT.TINF, metadata = document.value.TMDA;
  const changes = [], touched = new Set();
  function setHeader(key, value, label) {
    const before = headerText(header, key);
    setHeaderText(header, key, value);
    if (before !== value) changes.push({field: label, path: `header.${key}`, before, after: value});
  }
  function setHeaderInteger(offset, value, label) {
    const before = header.readUInt32LE(offset);
    header.writeUInt32LE(value, offset);
    if (before !== value) changes.push({field: label, path: `header.${offset}`, before, after: value});
  }
  function set(map, key, value, label) {
    const pair = map.find(pair => pair[0] === key);
    if (!pair || typeof pair[1] !== 'string') throw Error(`Missing or unsupported ${key}.`);
    const path = `${map === team ? 'TDAT.TINF' : 'TMDA'}.${key}`;
    if (touched.has(path)) throw Error(`Repeated edit to ${key}.`);
    touched.add(path);
    if (pair[1] !== value) changes.push({field: label, path, before: pair[1], after: value});
    pair[1] = value;
  }
  function mirrored(teamKey, metaKey, headerKey, value, label) {
    set(team, teamKey, value, label); set(metadata, metaKey, value, label);
    if (headerKey) setHeader(headerKey, value, label);
  }
  function editJson(teamKey, metaKey, headerKey, updates, label) {
    const t = namedMap(team, 'team information').get(teamKey), m = namedMap(metadata, 'metadata').get(metaKey);
    if (t !== m || t !== headerText(source.bytes, headerKey)) throw Error(`${label} copies disagree. This field needs investigation before editing.`);
    const updated = patchJsonScalars(t, updates);
    mirrored(teamKey, metaKey, headerKey, updated, label);
  }
  if (Object.hasOwn(edits, 'name')) {
    text(edits.name, 63, 'Team name');
    mirrored('TEAM_NAME', 'teamDisplayName', 'name', edits.name, 'Team name');
    setHeader('compactName', edits.name.replace(/\s/gu, ''), 'Compact team name');
  }
  if (Object.hasOwn(edits, 'nickname')) {
    text(edits.nickname, 63, 'Nickname');
    mirrored('TEAM_NICKNAME', 'teamNickname', 'nickname', edits.nickname, 'Nickname');
  }
  if (Object.hasOwn(edits, 'abbreviation')) {
    // Start within the maximum observed sample length; expand after menu tests.
    text(edits.abbreviation, 4, 'Abbreviation');
    set(team, 'TEAM_SHORTNAME', edits.abbreviation, 'Abbreviation');
  }
  if (Object.hasOwn(edits, 'foundingYear')) {
    integer(edits.foundingYear, 1000, 9999, 'Founding year');
    mirrored('YEAR_FOUNDED', 'yearFounded', null, String(edits.foundingYear), 'Founding year');
    setHeaderInteger(530, edits.foundingYear, 'Founding year');
  }
  if (Object.hasOwn(edits, 'prestige')) {
    if (typeof edits.prestige !== 'number' || edits.prestige < 0 || edits.prestige > 5 ||
        !Number.isInteger(edits.prestige * 2)) throw Error('Prestige must be between 0 and 5 in half-star steps.');
    set(metadata, 'teamPrestige', String(edits.prestige), 'Stored prestige');
  }
  if (Object.hasOwn(edits, 'template')) {
    if (!observedTemplates.includes(edits.template)) throw Error('Use a My School template observed in the verified samples.');
    mirrored('MY_SCHOOL_TEMPLATE_ID', 'mySchoolTemplateId', null, String(edits.template), 'My School template');
    setHeaderInteger(538, edits.template, 'My School template');
  }
  if (Object.hasOwn(edits, 'grades')) {
    object(edits.grades, GRADE_FIELDS, 'school grade');
    const current = namedMap(team, 'team information');
    for (const [grade, bounds] of Object.entries(edits.grades)) {
      object(bounds, ['min', 'max'], grade);
      const min = Object.hasOwn(bounds, 'min') ? bounds.min : Number(current.get(`${grade}_MIN`));
      const max = Object.hasOwn(bounds, 'max') ? bounds.max : Number(current.get(`${grade}_MAX`));
      integer(min, 0, 100, `${grade} minimum`); integer(max, 0, 100, `${grade} maximum`);
      if (min > max) throw Error('A school grade minimum cannot exceed its maximum.');
      if (Object.hasOwn(bounds, 'min')) set(team, `${grade}_MIN`, String(min), `${grade} minimum`);
      if (Object.hasOwn(bounds, 'max')) set(team, `${grade}_MAX`, String(max), `${grade} maximum`);
    }
  }
  if (Object.hasOwn(edits, 'pipelineChanges')) {
    list(edits.pipelineChanges, 'pipeline changes');
    const pipelines = JSON.parse(namedMap(team, 'team information').get('DYNASTY_PIPELINE_INFO')).pipelineInfluences;
    if (!Array.isArray(pipelines) || new Set(pipelines.map(p => p.pipelineId)).size !== pipelines.length) throw Error('Unsupported pipeline list.');
    const updates = edits.pipelineChanges.map(change => {
      object(change, ['id', 'value'], 'pipeline');
      integer(change.id, 0, 65535, 'Pipeline ID');
      const index = pipelines.findIndex(p => p.pipelineId === change.id);
      if (index < 0 || typeof pipelines[index].pipelineValue !== 'number' || !observedPipelineValues.includes(change.value)) throw Error('Change an existing pipeline using an observed influence value.');
      return {path: ['pipelineInfluences', index, 'pipelineValue'], value: change.value};
    });
    editJson('DYNASTY_PIPELINE_INFO', 'pipelines', 'pipelines', updates, 'Recruiting pipelines');
  }
  if (Object.hasOwn(edits, 'rivalryChanges')) {
    list(edits.rivalryChanges, 'rivalry changes');
    const rivals = JSON.parse(namedMap(team, 'team information').get('RIVALRY_INFO')).rivalries;
    if (!Array.isArray(rivals)) throw Error('Unsupported rivalry list.');
    const updates = [];
    for (const change of edits.rivalryChanges) {
      object(change, ['index', 'teamOneWins', 'teamTwoWins'], 'rivalry');
      integer(change.index, 0, rivals.length - 1, 'Rivalry index');
      // Winner/side and streak conventions remain unverified. First tests only
      // change an existing win count; no invented IDs or reordered opponents.
      for (const field of ['teamOneWins', 'teamTwoWins']) if (Object.hasOwn(change, field)) {
        if (typeof rivals[change.index][field] !== 'number') throw Error('Unsupported rivalry value type.');
        integer(change[field], 0, 9999, 'Rivalry wins');
        updates.push({path: ['rivalries', change.index, field], value: change[field]});
      }
    }
    editJson('RIVALRY_INFO', 'rivals', 'rivals', updates, 'Rivalry history');
  }
  if (Object.hasOwn(edits, 'recordChanges')) {
    list(edits.recordChanges, 'record changes');
    const updates = edits.recordChanges.map(change => {
      object(change, ['period', 'stat', 'value'], 'school record');
      if (!['GAME', 'SEASON', 'CAREER'].includes(change.period) || !recordStats.includes(change.stat) ||
          typeof change.value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.5)?$/.test(change.value) ||
          !Number.isSafeInteger(Number(change.value) * 2) || Number(change.value) > 99999999 ||
          change.stat !== 'SACKS' && change.value.includes('.')) throw Error('Invalid school record value. Only sacks support half points.');
      return {path: ['teamBuilderRecords', `GC_RECORDS_${change.period}`, `GC_TEAM_RECORD_${change.stat}`, 'GC_TEAM_STAT_VALUE'], value: change.value};
    });
    editJson('RECORD_DETAILS', 'teamRecords', 'records', updates, 'School records');
  }
  const bytes = packTeamBuilder(source, document, header, {forceRepack});
  return {bytes, changes, warnings: [
    'Research copy: check this change in game before using it in a real dynasty.',
    ...(source.discrepancies.length ? ['This file already contains differing metadata copies. Unrelated differences were preserved.'] : []),
    ...('prestige' in edits || 'template' in edits || 'grades' in edits ?
      ['Prestige, My School templates, and grade ranges are separate here. The game may recalculate them after import.'] : []),
  ]};
}
