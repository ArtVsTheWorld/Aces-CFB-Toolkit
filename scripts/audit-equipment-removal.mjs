import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {EQUIPMENT_ITEMS,RAW_314} from '../src/main/tools/equipment/catalog.js';
import {UNLOCKED_TATTOO_POOL} from '../src/main/tools/equipment/core/tattoos.js';
import {REMOVAL_NAMED_ITEMS} from '../src/main/tools/equipment/core/removalInventory.js';
import {removalCatalog} from '../src/main/tools/equipment/core/removal.js';
import MapperEditor from '../src/shared/mapperEditor.cjs';

const root=fileURLToPath(new URL('../',import.meta.url));
export function auditRemovalCatalog(){
  const names=new Map(),add=(id,label,source)=>{
    if(typeof id!=='string'||typeof label!=='string')return;
    const row=names.get(id)??{id,labels:[],sources:[]};
    if(!row.labels.includes(label))row.labels.push(label);
    if(!row.sources.includes(source))row.sources.push(source);
    names.set(id,row);
  };
  const walk=(value,source,key='')=>{
    if(!value||typeof value!=='object')return;
    if(value.itemName&&value.displayName)add(value.itemName,value.displayName,source);
    if(/displayNames|observedDisplayNames/i.test(key))for(const [id,label]of Object.entries(value))add(id,label,source);
    for(const [k,v]of Object.entries(value))if(typeof v==='object')walk(v,source,k);
  };
  const directory=path.join(root,'src/main/tools/equipment');
  for(const file of fs.readdirSync(directory).filter(file=>file.endsWith('.json')))walk(JSON.parse(fs.readFileSync(path.join(directory,file),'utf8')),file);
  const reference='docs/catalogs/gear-catalog-readable.md';
  const markdown=fs.readFileSync(path.join(root,reference),'utf8');
  for(const row of markdown.split('\n')){
    const match=/^\| (.*?)<br>`([^`]+)`/.exec(row);
    if(match)add(match[2],match[1],reference);
  }
  const htmlReference='docs/catalogs/gear-catalog-readable.html';
  const html=fs.readFileSync(path.join(root,htmlReference),'utf8');
  for(const match of html.matchAll(/<tr id="gear-([^"]+)"[^>]*><td><strong>(.*?)<\/strong>/g))add(match[1],match[2].replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"'),htmlReference);
  for(const item of UNLOCKED_TATTOO_POOL)add(item.value,item.label,'tattoos.js');
  const offered=new Map(removalCatalog().map(item=>[item.value,item]));
  const definitions=new Map([...EQUIPMENT_ITEMS,...REMOVAL_NAMED_ITEMS,...RAW_314.jamoItems].map(item=>[item.itemName.toLowerCase(),item]));
  const blocked=new Set(MapperEditor.protectedRemovalSlots);
  const nonOptional=new Set(['InnerSocks','OuterShirt','OuterPants','Shoulderpads','HeadBand']);
  const rows=[...names.values()].map(row=>{
    const item=definitions.get(row.id.toLowerCase());
    let reason;
    if(offered.has(row.id))reason='Offered';
    else if(/(?:^|_)None$/i.test(row.id)||['FaceGear_BalaclavaNone','waistband_none_v36','LegTattoo_TEST','GuardianCap_RawLongDreadlocksNone'].includes(row.id))reason='Empty/default choice';
    else if(item?.slots?.some(slot=>blocked.has(slot))||/^gearhelmet_/i.test(row.id))reason='Protected required equipment';
    else if(item?.slots?.some(slot=>nonOptional.has(slot))||/^(?:Gear_JerseyStyle_|GearPants_|Socks_)/i.test(row.id))reason='Category has no supported None option';
    else reason='MISSING';
    return {...row,reason,slots:item?.slots??[]};
  }).sort((a,b)=>a.id.localeCompare(b.id));
  return {namedAssets:rows.length,offered:offered.size,missing:rows.filter(row=>row.reason==='MISSING'),counts:Object.fromEntries([...new Set(rows.map(row=>row.reason))].map(reason=>[reason,rows.filter(row=>row.reason===reason).length])),rows};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const audit=auditRemovalCatalog(),target=process.argv[2];
  if(target)fs.writeFileSync(target,JSON.stringify(audit,null,2));
  console.log(JSON.stringify({namedAssets:audit.namedAssets,offered:audit.offered,counts:audit.counts,missing:audit.missing},null,2));
  if(audit.missing.length)process.exitCode=1;
}
