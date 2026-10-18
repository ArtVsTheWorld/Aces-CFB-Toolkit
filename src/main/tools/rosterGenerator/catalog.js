import fs from 'node:fs';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {CATALOG_VERSION,RATING_FIELDS,CAP_BOUNDS,validateFootballProfile} from './contract.js';
import {formulaIndex,calculateOverall} from './ratings.js';

let cached;
export function prepareObservedCatalog(catalog) {
  if(catalog?.version!==CATALOG_VERSION||JSON.stringify(catalog.ratingFields)!==JSON.stringify(RATING_FIELDS)||JSON.stringify(catalog.capBounds)!==JSON.stringify(CAP_BOUNDS))throw new Error('Unsupported Roster Generator observation catalog.');
  if(!catalog.profiles?.length||!catalog.appearances?.length||!catalog.names?.first?.length||!catalog.names?.last?.length)throw new Error('Incomplete Roster Generator observations.');
  if(!Array.isArray(catalog.sources)||catalog.sources.length<2||new Set(catalog.sources.map(source=>source.id)).size!==catalog.sources.length)throw new Error('Missing or duplicate observation sources.');
  const validSource=value=>Number.isInteger(value)&&value>=0&&value<catalog.sources.length;
  const formulas=formulaIndex(catalog.formulas),profiles=catalog.profiles.map(profile=>({...validateFootballProfile(profile),overall:calculateOverall(profile,formulas)}));
  const byPosition=new Map(),byId=new Map();
  for(const profile of profiles){if(byId.has(profile.id)||!validSource(profile.source))throw new Error('Duplicate or unproven football profile.');byId.set(profile.id,profile);if(!byPosition.has(profile.position))byPosition.set(profile.position,[]);byPosition.get(profile.position).push(profile);}
  for(const appearance of catalog.appearances){
    if(appearance.source!==undefined&&(!validSource(appearance.source)||appearance.source===0))throw new Error('Unproven generated appearance source.');
    if(appearance.firstToken!==undefined&&(!catalog.names.first.includes(appearance.firstToken)||Buffer.byteLength(appearance.firstToken,'utf8')>17))throw new Error('Unverified fictional first-name/appearance pairing.');
    if(!/^Generic_/.test(appearance.fields?.GenericHeadAssetName)||appearance.fields.PLYR_GENERICHEAD!=='NoHead'||!appearance.loadouts?.length)throw new Error(`Unverified generic appearance ${appearance.id}.`);
    if(appearance.loadouts.some(loadout=>loadout.loadoutType!=='PlayerOnField'||!Array.isArray(loadout.loadoutElements)))throw new Error('Invalid observed on-field loadout.');
  }
  if(catalog.styles.some(style=>!validSource(style.source)))throw new Error('Unproven playing-style source.');
  return {catalog,formulas,profiles,byPosition,byId};
}
export function loadObservedCatalog() {
  if(!cached){const bytes=fs.readFileSync(new URL('./data/observed-v1.json.gz',import.meta.url));cached=prepareObservedCatalog(JSON.parse(zlib.gunzipSync(bytes)));cached.sha256=createHash('sha256').update(bytes).digest('hex');}
  return cached;
}
