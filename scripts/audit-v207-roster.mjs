// Read-only inspection. No save setters or writes to the source dynasty.
import fs from 'node:fs';
import {loadEquipmentTables} from '../src/main/tools/equipment/shared.js';
import {parseRef} from '../src/main/tools/equipment/openSave.js';
import {buildAppearancePreview} from '../src/main/tools/rosterGenerator/core.js';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
const loaded=await loadEquipmentTables(process.argv[2],'resources/engine-data/C27_486_6.gz',true,false),catalog=loadObservedCatalog(),team=loaded.teams.records.find(t=>!t.isEmpty&&/Jackson/i.test(t.DisplayName)),players=loaded.players.records.filter(p=>!p.isEmpty&&p.TeamIndex===team.TeamIndex),layers={};
const examples=[];for(const p of players){const ref=parseRef(p.CharacterVisuals);if(!ref)continue;const raw=loaded.visuals.records[ref.row].RawData,json=JSON.parse(raw);for(const l of json.loadouts??[]){const key=l.loadoutType+'|'+JSON.stringify(l.loadoutCategory??null);layers[key]=(layers[key]??0)+1;}const appearance=catalog.catalog.appearances.find(a=>a.position===p.Position);if(appearance){const result=buildAppearancePreview(raw,appearance,'nike');if(result.unknownLayers.length&&examples.length<3)examples.push({player:p.index,raw:json,unknown:result.unknownLayers});}}
const depthTables=loaded.franchise.tables.filter(t=>/Depth|Lineup/i.test(t.name));const depths=[];for(const t of depthTables){await t.readRecords();depths.push({name:t.name,uid:t.header.uniqueId,tableId:t.header.tableId,columns:t.offsetTable.slice(0,12),records:t.records.filter(r=>!r.isEmpty).slice(0,2).map(r=>Object.fromEntries(t.offsetTable.slice(0,15).map(f=>[f.name,r[f.name]])))});}
const teamDepthFields=loaded.teams.offsetTable.filter(f=>/Depth|Lineup|Roster/.test(f.name)).map(f=>({name:f.name,value:team[f.name],ref:parseRef(team[f.name])}));
console.log(JSON.stringify({team:team.DisplayName,players:players.length,layers,examples,teamDepthFields,depths},null,2));
