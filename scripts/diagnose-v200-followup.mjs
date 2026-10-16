// Read-only checks; no dynasty writes or personal settings are used.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { prepareCommentary } from '../src/main/tools/commentary/runner.js';
import { openCfb27Save, tableByUniqueId } from '../src/main/services/save.js';
import { SEASON_INFO_TABLE_UID } from '../src/main/tools/equipment/shared.js';

const schemaPath = path.resolve('resources/engine-data/C27_486_6.gz');
const text = zlib.gunzipSync(fs.readFileSync(schemaPath)).toString();
for (const term of ['BowlSeason1', 'NationalChampionship', 'CurrentWeekType']) {
  const at = text.indexOf(term);
  console.log(term, at < 0 ? 'not in schema' : text.slice(Math.max(0, at - 220), at + 800));
}
const savePath = path.resolve(process.argv[2] ?? '../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN');
const opened = await openCfb27Save(savePath, schemaPath), season = tableByUniqueId(opened.franchise, SEASON_INFO_TABLE_UID);
await season.readRecords();
const record = season.records.find(record => record && !record.isEmpty);
console.log('Season', Object.fromEntries(record.fieldsArray.filter(field => /week|stage|season/i.test(field.key)).map(field => [field.key, record[field.key]])));
for (const options of [{ scopeCatalogOnly: true }, {}, { phonetic: true, freshmenOnly: false }]) {
  const start = performance.now();
  const result = await prepareCommentary({ savePath, schemaPath, defaultMapPath: path.resolve('resources/commentary-data/PlayerCommentaryidMap.txt'), options });
  console.log('Commentary', options, Math.round(performance.now() - start) + 'ms', result.summary ?? { players: result.players.length });
}
