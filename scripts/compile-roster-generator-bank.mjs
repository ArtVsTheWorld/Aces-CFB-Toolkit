// Compile authorized observations, not source saves, into a versioned catalog.
// No record setters, save calls, Age/birth dates, paired names or unique faces.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {openCfb27Save,readTables,PLAYER_TABLE_UID,TEAM_TABLE_UID,isDirectionalFcsTeam} from '../src/main/services/save.js';
import {ROSTER_TABLE_UID,VISUALS_TABLE_UID,SEASON_INFO_TABLE_UID,VALID_POSITIONS} from '../src/main/tools/equipment/shared.js';
import {parseRef,sf} from '../src/main/tools/equipment/openSave.js';
import {CATALOG_VERSION,RATING_FIELDS,CAP_FIELDS,PHYSICAL_FIELDS,MENTAL_FIELDS,MENTAL_RANK_FIELDS,STYLE_FIELDS,APPEARANCE_FIELDS,CAP_BOUNDS,validateFootballProfile} from '../src/main/tools/rosterGenerator/contract.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),[eaFile,...generatedFiles]=process.argv.slice(2);
if(!eaFile||!generatedFiles.length)throw new Error('Usage: node scripts/compile-roster-generator-bank.mjs <2026 base dynasty> <2032 generated dynasty> [additional generated dynasty ...]');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex'),sources=[],profiles=[],appearances=[],styles=[],firstNames=new Set(),lastNames=new Set(),capValues=CAP_FIELDS.map(()=>[]),dropped=[];
for(const [sourceIndex,file]of [eaFile,...generatedFiles].entries()){
  const before=digest(fs.readFileSync(file)),opened=await openCfb27Save(file,path.join(root,'resources/engine-data/C27_486_6.gz'));
  const {players,teams,rosters,visuals,season}=await readTables(opened.franchise,{players:PLAYER_TABLE_UID,teams:TEAM_TABLE_UID,rosters:ROSTER_TABLE_UID,visuals:VISUALS_TABLE_UID,season:SEASON_INFO_TABLE_UID});
  const year=sf(season.records.find(record=>record&&!record.isEmpty),'CurrentSeasonYear'),source={id:sourceIndex===0?'ea-2026':`generated-${year}`,kind:sourceIndex===0?'ea':'generated',developmentReference:sourceIndex===1,sha256:before,year,rosterPlayers:0,mainProfiles:0};
  if(sourceIndex<2&&year!==(sourceIndex===0?2026:2032)||sourceIndex>=2&&(!Number.isInteger(year)||year<=2032)||sources.some(item=>item.id===source.id||item.sha256===before))throw new Error('Supply the 2026/2032 baselines first, then distinct later generated cohorts.');
  const seen=new Set();
  for(const team of teams.records){
    if(!team||team.isEmpty)continue;const rosterRef=parseRef(sf(team,'Roster'));if(rosterRef?.tableId!==rosters.header.tableId)continue;
    const roster=rosters.records[rosterRef.row];if(!roster||roster.isEmpty)throw new Error('Missing referenced roster.');
    const size=Number(roster.arraySize),directional=isDirectionalFcsTeam(team);
    for(let index=0;index<size;index++){
      const ref=parseRef(sf(roster,`Player${index}`));if(!ref)continue;if(ref.tableId!==players.header.tableId||!players.records[ref.row]||players.records[ref.row].isEmpty)throw new Error('Invalid baseline roster reference.');
      if(seen.has(ref.row))throw new Error('Baseline player belongs to multiple rosters.');seen.add(ref.row);
      const player=players.records[ref.row];if(!VALID_POSITIONS.includes(sf(player,'Position'))||!sf(player,'FirstName')||!sf(player,'LastName'))continue;
      source.rosterPlayers++;
      CAP_FIELDS.forEach((field,i)=>capValues[i].push(sf(player,field)));
      if(directional)continue;
      const id=`${source.id}:${ref.row}`,profile={id,source:sourceIndex,position:sf(player,'Position'),archetype:sf(player,'PlayerType'),classYear:sf(player,'SchoolYear'),redshirt:sf(player,'RedshirtStatus'),development:sf(player,'TraitDevelopment'),storedOverall:sf(player,'OverallRating'),ratings:RATING_FIELDS.map(field=>sf(player,field)),caps:CAP_FIELDS.map(field=>sf(player,field)),physical:PHYSICAL_FIELDS.map(field=>sf(player,field)),mental:MENTAL_FIELDS.map((field,i)=>[sf(player,field),sf(player,MENTAL_RANK_FIELDS[i])]),progression:[sf(player,'ExperiencePoints'),sf(player,'SkillPoints')],personality:sf(player,'Personality')};
      validateFootballProfile(profile);profiles.push(profile);source.mainProfiles++;
      styles.push({id,source:sourceIndex,position:profile.position,archetype:profile.archetype,values:STYLE_FIELDS.map(field=>sf(player,field))});
      if(sourceIndex===0)continue;
      if(sf(player,'IsNIL')!==false||sf(player,'PLYR_ASSETNAME')||!/^Generic_/.test(sf(player,'GenericHeadAssetName')??''))throw new Error('Generated FBS cohort contains an original-player identity; review the source before compiling.');
      firstNames.add(String(sf(player,'FirstName')).trim());lastNames.add(String(sf(player,'LastName')).trim());
      const vr=parseRef(sf(player,'CharacterVisuals'));if(vr?.tableId!==visuals.header.tableId||!visuals.records[vr.row]||visuals.records[vr.row].isEmpty)throw new Error('Missing generated appearance row.');
      const raw=JSON.parse(sf(visuals.records[vr.row],'RawData')),loadouts=raw.loadouts?.filter(loadout=>loadout.loadoutType==='PlayerOnField');
      if(Object.hasOwn(raw,'skinTone')||Object.hasOwn(raw,'bodyType')||!loadouts?.length||loadouts.some(loadout=>!Array.isArray(loadout.loadoutElements))){dropped.push({id,reason:'Unexpected generic appearance representation'});continue;}
      const fields=Object.fromEntries(APPEARANCE_FIELDS.map(field=>[field,sf(player,field)]));
      if(Object.values(fields).some(value=>value===undefined))throw new Error('Generated portrait/body fields are not present in this schema.');
      appearances.push({id,source:sourceIndex,firstToken:String(sf(player,'FirstName')).trim(),skinTone:Number(/_(\d+)_\d+$/.exec(fields.GenericHeadAssetName)?.[1])||null,position:profile.position,branding:String(sf(team,'TeamApparel')??'').trim().toLowerCase(),fields,loadouts});
    }
  }
  if(digest(fs.readFileSync(file))!==before)throw new Error('A source save changed during compilation.');sources.push(source);
}
const actualBounds=capValues.map(values=>[Math.min(...values),Math.max(...values)]);
if(JSON.stringify(actualBounds)!==JSON.stringify(CAP_BOUNDS))throw new Error('Observed cap bounds changed; review rather than silently expanding generation limits.');
const sourceFormulas=JSON.parse(fs.readFileSync(path.join(root,'docs/reference/CFB27_OVR_Formulas.json'),'utf8')).formulas;
const catalog={version:CATALOG_VERSION,sources,capBounds:actualBounds,ratingFields:RATING_FIELDS,profiles,appearances,styles,names:{first:[...firstNames].sort(),last:[...lastNames].sort()},formulas:sourceFormulas.map(({position,playerType,intercept,coefficients,minimumOverall,maximumOverall})=>({position,playerType,intercept,coefficients,minimumOverall,maximumOverall})),evidence:{generatedAppearance:'Generic head/body/portrait and on-field equipment packages observed in the user-confirmed default simulated cohort. No source save blobs or original real-player identities are distributed.',weights:'All audited generated cohorts supply football, potential, appearance and same-head name variety. The 2032 cohort remains the development-distribution reference; EA observations retain the class/redshirt baseline and animation variety.',dropped}};
const bytes=Buffer.from(JSON.stringify(catalog)),destination=path.join(root,'src/main/tools/rosterGenerator/data/observed-v1.json.gz');
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,zlib.gzipSync(bytes,{level:9}));
console.log(JSON.stringify({destination,sha256:digest(fs.readFileSync(destination)),sources,profiles:profiles.length,appearances:appearances.length,styles:styles.length,firstNames:firstNames.size,lastNames:lastNames.size,dropped,bytes:fs.statSync(destination).size,inputSavesUnchanged:true},null,2));
