import fs from 'node:fs';
import {createHash} from 'node:crypto';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/originalEaRoster.json',import.meta.url),'utf8'));
if(catalog.metadata?.version!=='ea-2026-reference-1'||catalog.real?.length!==catalog.metadata.realPlayers||catalog.fictional?.length!==catalog.metadata.fictionalFillers||createHash('sha256').update(JSON.stringify({real:catalog.real,fictional:catalog.fictional})).digest('hex')!==catalog.metadata.identitiesSha256)throw Error('The original EA player reference is missing or damaged. Reinstall the Toolkit before applying player changes.');
const original=new Map(),fictional=new Map();
for(const [rows,index]of [[catalog.real,original],[catalog.fictional,fictional]])for(const row of rows){if(!Array.isArray(row)||row.length!==3||row.some(v=>typeof v!=='string'||!v.trim())||original.has(row[0])||fictional.has(row[0]))throw Error('The original EA player reference contains an ambiguous identity.');index.set(row[0],Object.freeze({asset:row[0],first:row[1],last:row[2]}));}
export const ORIGINAL_EA_REFERENCE=Object.freeze({...catalog.metadata});
const value=(record,key)=>{try{return record?.[key];}catch{return undefined;}};
const name=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const assetKey=record=>String(value(record,'PLYR_ASSETNAME')??'').trim();
// No row/team/class/number/portrait matching, no name-only fallback and no
// PresentationId-only fallback: game-generated players reuse those IDs.
export function originalEaIdentity(record){
 const asset=assetKey(record),entry=original.get(asset),filler=fictional.get(asset);
 if(entry){const matches=name(value(record,'FirstName'))===name(entry.first)&&name(value(record,'LastName'))===name(entry.last);return {status:matches?'original':'conflict',label:matches?'Original EA Roster Player':'Identity Conflict — Original EA Asset',protected:true,reason:matches?'Asset identity and full name match the original EA reference.':'An original EA asset remains, but the name differs. Conservatively protected; review before overriding.',referenceVersion:ORIGINAL_EA_REFERENCE.version};}
 return {status:filler?'fictional':'unknown',label:filler?'EA Fictional Filler':'Unknown — Not in Reference',protected:false,reason:filler?'Marked fictional in the pristine EA reference.':'No original EA asset match. Names, presentation IDs and the current NIL flag do not establish identity.',referenceVersion:ORIGINAL_EA_REFERENCE.version};
}
// The hot path needs only the exact asset lookup. Both original matches and
// conflicting retained original assets are protected; detailed labels are
// resolved separately for reports. Avoid allocating diagnostics in jersey loops.
export const isOriginalEaPlayer=record=>original.has(assetKey(record));
export function originalEaProtectionEnabled(options={},fallback=true){const v=options.protectOriginalEaPlayers??options.skipNilPlayers??(options.renumberNilPlayers===undefined?fallback:!options.renumberNilPlayers);if(typeof v!=='boolean')throw Error('Protect Original EA Roster Players must be on or off.');return v;}
export const protectOriginalEaPlayer=(record,options={},fallback=true)=>originalEaProtectionEnabled(options,fallback)&&isOriginalEaPlayer(record);
export function originalEaProtectionAudit(records,enabled=true){const counts={original:0,fictional:0,conflict:0,unknown:0};for(const record of records)if(record&&!record.isEmpty)counts[originalEaIdentity(record).status]++;return{reference:ORIGINAL_EA_REFERENCE,enabled,counts,protectedPlayers:enabled?counts.original+counts.conflict:0,unknownPolicy:'Unmatched identities are reported as unknown, not asserted to be generated. Conflicting original EA assets are conservatively protected.'};}
