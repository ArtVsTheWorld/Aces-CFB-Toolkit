import {WRITE_FIELDS} from './contract.js';

// Ratings generation does not need every history/statistic field expanded into
// JS objects for every player. Their original bits remain in the native table.
export const ROSTER_GENERATION_PLAYER_FIELDS=Object.freeze([...new Set([...WRITE_FIELDS,'TeamIndex','CharacterVisuals','CareerStats','SeasonStats'])]);

export async function readGenerationPlayerStrings(table) {
  // Protected string values live outside the record bits. Include all of them
  // so the existing before/after safety check still verifies the full contract.
  const strings=table.offsetTable.filter(field=>field.type==='string').map(field=>field.name);
  await table.readRecords([...ROSTER_GENERATION_PLAYER_FIELDS,...strings]);
  return table;
}

// Only call after the native candidate has been completely serialized. The
// dependency's table change listeners retain the entire franchise, so dropping
// the outer loaded object alone does not release its millions of field objects.
export function releaseGenerationSource(loaded){
  for(const table of loaded.franchise.tables){
    table.removeAllListeners?.('change');
    table.records=[];table.table2Records=[];table.table3Records=[];
  }
  loaded.franchise.tables=[];
  for(const name of Object.keys(loaded))if(name!=='savePath')loaded[name]=null;
}
