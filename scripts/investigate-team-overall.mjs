// Read-only inspection of supplied game tuning. Never saves a FranchiseFile.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import franchisePackage from 'madden-franchise';
import assert from 'node:assert/strict';
import {openCfb27Save,readTables,TEAM_TABLE_UID,isDirectionalFcsTeam} from '../src/main/services/save.js';

const root=process.cwd(),directory=path.resolve(process.argv[2]??'C:/Apps/CFB 27/Working/DynastyBinary'),output=path.resolve(root,'outputs/team-overall-investigation');
const schemaPath=path.resolve(root,'resources/engine-data/C27_486_6.gz'),schema=JSON.parse(zlib.gunzipSync(fs.readFileSync(schemaPath))),Franchise=franchisePackage.default??franchisePackage;
const hash=data=>createHash('sha256').update(data).digest('hex');
const decode=text=>String(text??'').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&apos;',"'").replaceAll('&quot;','"').replaceAll('&amp;','&').replaceAll('\r','');
const files=fs.readdirSync(directory).map(name=>({name,bytes:fs.readFileSync(path.join(directory,name))})),before=new Map(files.map(file=>[file.name,hash(file.bytes)]));
fs.mkdirSync(output,{recursive:true});
const report={schema:schema.meta,files:files.map(file=>({name:file.name,size:file.bytes.length,sha256:before.get(file.name)})),definitions:{},expressions:[],tables:[],errors:[]};
const wanted=['RosterEval','RosterTuning','Team','PlayerGradeEval','DepthChartEval','TeamPrestigeEval','Team_GetAvgTeamRating','Team_GetAvgTeamSideRating','RosterEval_CalculateOffensiveRating','RosterEval_CalculateDefensiveRating','RosterEval_CalculateSpecialTeamRating'];
for(const name of wanted){
 const item=schema.schemas.find(item=>item.name===name);if(!item)continue;
 report.definitions[name]={...item,attributes:item.attributes?.map(a=>({...a,...(a.default!==undefined?{default:decode(a.default)}:{})}))};
}
for(const file of files.filter(file=>file.name==='dynasty-expression-binary.FTC')){
 const data=zlib.inflateSync(file.bytes);let offset=-1;
 while((offset=data.indexOf('SPEX',offset+1))>=0){
  const start=offset-148;if(start<0)continue;
  const name=data.subarray(start,start+128).toString('ascii').split('\0')[0];if(!/^[ -~]+$/.test(name))throw Error('Unexpected SPEX name at '+offset);
  report.expressions.push({file:file.name,name,tableId:data.readUInt32BE(start+128),uniqueId:data.readUInt32BE(start+132),nameOffset:start,codeHeaderOffset:offset});
 }
}
for(const filename of ['dynasty-tuning-binary.FTC','dynasty-dynasty-binary.FTC','dynasty-league-binary.FTC']){
 try{
  const file=await Franchise.create(path.join(directory,filename),{saveOnChange:false,gameYearOverride:27,gameTypeOverride:'college',schemaOverride:{gameYear:27,major:486,minor:6,path:schemaPath}});
  for(const table of file.tables.filter(table=>/RosterTuning|RosterEval|TeamPrestigeEval|TeamRating|DepthChart.*(Tuning|Philosophy)|PlayerGradeEval/.test(table.name))){
   const definition=schema.schemas.find(item=>item.name===table.name),entry={file:filename,name:table.name,id:table.header.tableId,uid:table.uniqueId,fields:definition?.attributes?.map(a=>a.name)??[]};
   try{
    await table.readRecords();entry.storedFields=table.offsetTable.map(field=>({name:field.name,offset:field.offset,length:field.length,type:field.type}));
    entry.records=table.records.filter(record=>record&&!record.isEmpty).map(record=>({index:record.index,values:Object.fromEntries(table.offsetTable.map(field=>[field.name,record[field.name]]))}));
    if(table.name==='RosterTuning'){
     entry.assetMappings=file.assetTable.filter(asset=>asset.reference===(table.header.tableId<<17));entry.rawRowHex=table.records[0]._data.toString('hex');
     for(const field of table.offsetTable.filter(field=>['OffensiveWeight','DefensiveWeight'].includes(field.name))){assert.equal(field.length,8);assert.equal(field.offset%8,0);assert.equal(table.records[0]._data[field.offset/8],entry.records[0].values[field.name]);}
    }
   }catch(error){entry.error=error.message;}
   report.tables.push(entry);
  }
 }catch(error){report.errors.push({file:filename,error:error.message});}
}
// Decode and check the entire top-level VM expression against its schema source.
// This deliberately does not guess the semantics of unrelated VM instructions.
const expression=report.expressions.find(entry=>entry.name==='RosterEval_CalculateTeamOverallRating'),expressionData=zlib.inflateSync(files.find(file=>file.name===expression.file).bytes);
let cursor=expression.codeHeaderOffset+0x21;
const localCount=expressionData.readUInt32BE(cursor);cursor+=4;assert.equal(localCount,3);
const locals=[];for(let i=0;i<localCount;i++){const type=expressionData.readInt32BE(cursor),value=expressionData.readInt32BE(cursor+4);cursor+=8;assert.equal(type,2);assert.equal(value,0);locals.push({type:'int',value});}
const count=expressionData.readUInt32BE(cursor);cursor+=4;assert.equal(count,39);
const instructions=[];
for(let i=0;i<count;i++){
 const byteOffset=cursor,type=expressionData.readInt32BE(cursor);cursor+=4;let value=null;
 if(type!==-1){assert.equal(type,2);value=expressionData.readInt32BE(cursor);cursor+=4;}
 const opcode=expressionData.readUInt16BE(cursor),argument=expressionData.readUInt16BE(cursor+2);cursor+=4;instructions.push({index:i,byteOffset,type,value,opcode,argument});
}
const expected=[[9,1],[9,0],[9,1],[1,0],[79,7],[43,357],[9,1],[17,357],[9,0],[20,40],[17,4],[60,0],[48,0],[9,1],[9,0],[9,1],[1,0],[79,6],[43,354],[9,1],[17,354],[9,0],[20,40],[17,1],[60,0],[48,1],[22,0],[22,1],[58,0],[9,0],[20,40],[17,4],[9,0],[20,40],[17,1],[58,0],[61,0],[48,2],[22,2]];
assert.deepEqual(instructions.map(i=>[i.opcode,i.argument]),expected);
assert.deepEqual(instructions.filter(i=>i.type!==-1).map(i=>[i.index,i.value]),[[1,0],[3,1],[8,0],[14,0],[16,1],[21,0],[29,0],[32,0]]);
const member=(name,index)=>report.definitions[name].attributes.find(a=>Number(a.index)===index)?.name;
assert.equal(member('RosterEval',7),'CalculateOffensiveRating');assert.equal(member('RosterEval',6),'CalculateDefensiveRating');assert.equal(member('RosterEval',40),'RosterTuning');
assert.equal(member('RosterTuning',4),'OffensiveWeight');assert.equal(member('RosterTuning',1),'DefensiveWeight');assert.equal(member('Team',357),'TEAM_RATINGOFF');assert.equal(member('Team',354),'TEAM_RATINGDEF');
const tuning=report.tables.find(t=>t.name==='RosterTuning'),module=report.tables.find(t=>t.name==='RosterEval');
assert.ok(!tuning.error&&!module.error);const weights=tuning.records[0].values,reference=module.records[0].values.RosterTuning,assetId=parseInt(reference,2);
assert.ok(tuning.assetMappings.some(asset=>asset.assetId===assetId),'RosterEval must resolve to the inspected tuning record');
report.outerCalculation={schemaSource:report.definitions.RosterEval.attributes.find(a=>a.name==='CalculateTeamOverallRating').default,compiled:expression,locals,instructions,offensiveWeight:weights.OffensiveWeight,defensiveWeight:weights.DefensiveWeight,tuningAssetId:assetId,tuningAssetHex:'0x'+assetId.toString(16),formula:`trunc((OFF * ${weights.OffensiveWeight} + DEF * ${weights.DefensiveWeight}) / ${weights.OffensiveWeight+weights.DefensiveWeight})`,specialTeamsUsed:false};
report.unrecoveredComponents=['CalculateOffensiveRating','CalculateDefensiveRating','CalculateSpecialTeamRating','UpdateTeamRatings'].map(name=>({name,schemaHasBody:!!report.definitions.RosterEval.attributes.find(a=>a.name===name).default,namedCompiledEntryFound:report.expressions.some(e=>e.name==='RosterEval_'+name)}));
if(process.argv[3]){
 const savePath=path.resolve(process.argv[3]),saveHash=hash(fs.readFileSync(savePath)),{franchise}=await openCfb27Save(savePath,schemaPath),{teams}=await readTables(franchise,{teams:TEAM_TABLE_UID});
 const rows=teams.records.filter(r=>!r.isEmpty&&r.DisplayName).map(r=>{const expected=Math.trunc((weights.OffensiveWeight*r.TEAM_RATINGOFF+weights.DefensiveWeight*r.TEAM_RATINGDEF)/(weights.OffensiveWeight+weights.DefensiveWeight));return {team:r.DisplayName,directionalFcs:isDirectionalFcsTeam(r),offense:r.TEAM_RATINGOFF,defense:r.TEAM_RATINGDEF,specialTeams:r.TEAM_RATINGST,stored:r.TEAM_RATINGOVR,expected,matches:expected===r.TEAM_RATINGOVR};});
 const fbs=rows.filter(r=>!r.directionalFcs);
 report.cacheCrosscheck={file:savePath,sha256:saveHash,total:rows.length,matches:rows.filter(r=>r.matches).length,nonDirectionalTeams:fbs.length,nonDirectionalMatches:fbs.filter(r=>r.matches).length,alternativeFbsMatches:{roundToNearest6040:fbs.filter(r=>Math.round((60*r.offense+40*r.defense)/100)===r.stored).length,truncated5050:fbs.filter(r=>Math.trunc((r.offense+r.defense)/2)===r.stored).length},exceptions:rows.filter(r=>!r.matches),rows};
 assert.equal(hash(fs.readFileSync(savePath)),saveHash);
}
for(const file of files)if(hash(fs.readFileSync(path.join(directory,file.name)))!==before.get(file.name))throw Error('Inspection unexpectedly changed '+file.name);
fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(report,null,2));
const note=`TEAM OVERALL INVESTIGATION\n\nVerified outer formula\n${report.outerCalculation.formula}\n\nThe expression uses integer locals and integer division. For nonnegative ratings this truncates downward, rather than rounding to nearest. OFF and DEF are obtained by calling CalculateOffensiveRating(team) and CalculateDefensiveRating(team), then stored in TEAM_RATINGOFF / TEAM_RATINGDEF. Special teams are not referenced by this expression.\n\nVerification\n- Schema source matched against all 39 instructions in the supplied compiled SPEX routine.\n- RosterEval tuning asset ${report.outerCalculation.tuningAssetHex} resolves to RosterTuning row 0.\n- Actual tuning weights read as ${weights.OffensiveWeight} offense / ${weights.DefensiveWeight} defense; both verified directly against raw record bytes.\n${report.cacheCrosscheck?'- Saved-rating crosscheck: '+report.cacheCrosscheck.matches+'/'+report.cacheCrosscheck.total+' rows match, including '+report.cacheCrosscheck.nonDirectionalMatches+'/'+report.cacheCrosscheck.nonDirectionalTeams+' non-directional teams. Exceptions: '+JSON.stringify(report.cacheCrosscheck.exceptions)+'\n':''}\nLimit\nThis is NOT a recovered players-to-team-OVR calculator. Neither the offensive nor defensive component function has a source body in the schema or a named SPEX implementation in the supplied expression file. Their player/depth-chart selection, position weighting, transformations and rounding are unverified. They appear to be runtime/native methods. The supplied files alone have not yielded those implementations. The two directional-FCS cache exceptions are recorded, not silently treated as proof of a different formula.\n\nNo application calculation or save was modified. All supplied input hashes were checked unchanged. Full evidence and disassembly: evidence.json.\n`;
fs.writeFileSync(path.join(output,'findings.txt'),note);
for(const name of ['RosterEval','RosterTuning']){
 console.log('\n'+name);
 const attributes=report.definitions[name]?.attributes??[];
 for(const a of attributes)if(name==='RosterTuning'||/Calculate|UpdateTeamRatings/.test(a.name))console.log(a.name,a.type,a.default??'[no expression body in schema]');
}
console.log('\nRelevant SPEX:',report.expressions.filter(e=>/RosterEval|Team.*Rating|TeamPrestigeEval/.test(e.name)));
console.log('\nRelevant records:',report.tables.filter(t=>/^(RosterTuning|RosterEval)$/.test(t.name)).map(t=>({file:t.file,name:t.name,records:t.records,error:t.error})));
console.log('Errors:',report.errors,'Evidence:',path.join(output,'evidence.json'));
