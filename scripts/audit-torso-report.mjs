// Read-only streaming audit: tolerate spreadsheet-added empty columns without
// materializing a huge sparse workbook. Never edit the supplied CSV or save.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const source=process.argv[2];
let quoted=false,pendingQuote=false,value='',row=[],headings,count=0,blankRows=0,extraCells=0;
const hash=createHash('sha256'),matches=[],types={},rawFailures=[],visuals=new Set();
const torsoTransitions={},layerChanges=[],identityChanges=[];
let options=null,version=null,inputOptions=null;
function consume(){
 if(!headings){headings=row.map(v=>v.replace(/^\uFEFF/,''));row=[];return;}
 if(!row.some(Boolean)){blankRows++;row=[];return;}
 count++;const entry={};for(let i=0;i<row.length;i++){if(headings[i])entry[headings[i]]=row[i];else if(row[i])extraCells++;}row=[];
 types[entry.ChangeType]=(types[entry.ChangeType]??0)+1;visuals.add(entry.CharacterVisualsRow);
 if(entry.ResolvedOptionsJSON&&!options)try{options=JSON.parse(entry.ResolvedOptionsJSON);}catch{}
 if(entry.AuditInputOptionsJSON&&!inputOptions)try{inputOptions=JSON.parse(entry.AuditInputOptionsJSON);}catch{}
 if(!version&&/^\d+\.\d+\.\d+$/.test(entry.AuditAppVersion||entry.AuditToolVersion||''))version=entry.AuditAppVersion||entry.AuditToolVersion;
 let before,after;try{before=JSON.parse(entry.BeforeRawData);after=JSON.parse(entry.AfterRawData);}catch{rawFailures.push(count+1);}
 if(before&&after){
  const layers=p=>(p.loadouts??[]).map(l=>Object.fromEntries(Object.entries(l).filter(([key])=>key!=='loadoutElements')));
  if(JSON.stringify(layers(before))!==JSON.stringify(layers(after)))layerChanges.push({csvRow:count+1,team:entry.Team,player:entry.Player});
  if(['skinTone','bodyType'].some(key=>JSON.stringify(before[key])!==JSON.stringify(after[key])))identityChanges.push({csvRow:count+1,team:entry.Team,player:entry.Player});
  for(const [i,layer]of (before.loadouts??[]).entries())for(const slot of ['InnerShirt','OuterShirt','Shoulderpads']){
   const old=layer.loadoutElements?.find(e=>e.slotType===slot)?.itemAssetName,next=after.loadouts?.[i]?.loadoutElements?.find(e=>e.slotType===slot)?.itemAssetName;
   if(old===next)continue;const key=`${slot}: ${old??'(missing)'} -> ${next??'(missing)'}`;
   const transition=torsoTransitions[key]??={count:0,examples:[]};transition.count++;if(transition.examples.length<3)transition.examples.push({csvRow:count+1,team:entry.Team,player:entry.Player});
  }
 }
 if(/robinson/i.test(entry.Player??'')&&/virginia|uva/i.test(entry.Team??''))matches.push({csvRow:count+1,...Object.fromEntries(Object.entries(entry).filter(([key])=>!['BeforeRawData','AfterRawData','ResolvedOptionsJSON','AuditInputOptionsJSON','HelmetDistributionAuditJSON','UniformPopulationAuditJSON','PopulationCapsAuditJSON'].includes(key))),before,after});
}
for await(const chunk of fs.createReadStream(source,{encoding:'utf8'})){
 hash.update(chunk);
 for(const char of chunk){
  if(pendingQuote){pendingQuote=false;if(char==='"'){value+=char;continue;}quoted=false;}
  if(quoted){if(char==='"')pendingQuote=true;else value+=char;}
  else if(char==='"'&&!value)quoted=true;
  else if(char===','){row.push(value);value='';}
  else if(char==='\n'){row.push(value.replace(/\r$/,''));value='';consume();}
  else value+=char;
 }
}
if(quoted&&!pendingQuote)throw Error('Unclosed CSV field');
if(row.length||value){row.push(value);consume();}
console.log(JSON.stringify({source,sha256:hash.digest('hex'),rows:count,blankRows,namedColumns:headings.filter(Boolean),columns:headings.length,extraCells,visualRows:visuals.size,types,rawFailures,version,torsoTransitions,layerChanges,identityChanges,options,inputOptions,matches},null,2));
