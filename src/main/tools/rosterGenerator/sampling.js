import {developmentReferenceProfiles} from './cohorts.js';
import {mulberry32} from '../longSnap/core.js';
import {DEVELOPMENT} from './contract.js';

const YEARS=['Freshman','Sophomore','Junior','Senior'];
function rngFor(seed,label){let hash=2166136261^seed;for(const c of label)hash=Math.imul(hash^c.charCodeAt(0),16777619);return mulberry32(hash>>>0);}
function shuffle(items,rng){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function quotaCounts(weights,total){
  const entries=Object.entries(weights),sum=entries.reduce((n,[,v])=>n+v,0);
  if(!sum||entries.some(([,v])=>!Number.isFinite(v)||v<0))throw new Error('Invalid roster distribution weights.');
  const rows=entries.map(([key,weight],index)=>({key,index,raw:total*weight/sum,count:Math.floor(total*weight/sum)}));
  let remaining=total-rows.reduce((n,row)=>n+row.count,0);
  for(const row of [...rows].sort((a,b)=>(b.raw-b.count)-(a.raw-a.count)||a.index-b.index)){if(!remaining)break;row.count++;remaining--;}
  return Object.fromEntries(rows.map(row=>[row.key,row.count]));
}
export function rosterSamplingPolicy(model,settings){
  const generated=developmentReferenceProfiles(model),ea=model.profiles.filter(profile=>profile.source===0),reference=ea.length?ea:generated;
  const development=Object.fromEntries(DEVELOPMENT.map(tier=>[tier,100*generated.filter(profile=>profile.development===tier).length/generated.length]));
  const overrides={'dead-end':[100,0,0,0],low:[88,11.5,.4,.1],high:[45,25,10,5],sky:[25,35,15,10]};
  if(overrides[settings.rosterPotential])DEVELOPMENT.forEach((tier,i)=>development[tier]=overrides[settings.rosterPotential][i]);
  const classes=settings.rosterAge==='seniors'?{Senior:1}:settings.rosterAge==='youth'?{Freshman:40,Sophomore:30,Junior:20,Senior:10}:settings.rosterAge==='veteran'?{Freshman:10,Sophomore:20,Junior:30,Senior:40}:Object.fromEntries(YEARS.map(year=>[year,reference.filter(profile=>profile.classYear===year).length]));
  const redshirts=Object.fromEntries(YEARS.map(year=>[year,Object.fromEntries(['Eligible','Ineligible','Previous'].map(status=>[status,settings.rosterAge==='seniors'?(status==='Previous'?1:0):settings.rosterAge==='youth'?(status==='Eligible'?75:status==='Previous'?25:0):reference.filter(profile=>profile.classYear===year&&profile.redshirt===status).length*(settings.rosterAge==='veteran'&&status==='Previous'?1.6:1)]))]));
  return {development,classes,redshirts,age:settings.rosterAge,potential:settings.rosterPotential,classPolicy:'Roster Age controls class years and redshirt experience.',developmentPolicy:'Roster Potential controls development and rating limits.'};
}

// Age and potential are independent of caliber and each other. Development
// availability comes from the unfiltered potential catalog, not rating donors.
export function createRosterStrata(targets,model,seed){
  if(!model.sampling)return null;
  const byRow=new Map(),warnings=[],groups=new Map();
  const labels=(weights,n,rng)=>{const entries=Object.entries(weights).filter(([,w])=>w>0),sum=entries.reduce((a,[,w])=>a+w,0),offset=rng();if(!sum)throw new Error('No valid roster age choices are available.');return shuffle(Array.from({length:n},(_,i)=>{let cumulative=0;return entries.find(([,w])=>(cumulative+=w/sum)>(i+offset)/n)?.[0]??entries.at(-1)[0];}),rng);};
  for(const target of [...targets].sort((a,b)=>a.row-b.row)){if(!groups.has(target.position))groups.set(target.position,[]);groups.get(target.position).push(target);}
  for(const [position,room]of groups){
    const pool=model.byPosition.get(position),rng=rngFor(seed,'classes:'+position),years=labels(Object.fromEntries(Object.entries(model.sampling.classes).filter(([year,w])=>w>0&&pool.some(profile=>profile.classYear===year))),room.length,rng);
    for(const year of new Set(years)){
      const sameYear=room.filter((_,i)=>years[i]===year),allowed=Object.fromEntries(Object.entries(model.sampling.redshirts?.[year]??{Eligible:1,Ineligible:1,Previous:1}).filter(([status,w])=>w>0&&pool.some(profile=>profile.classYear===year&&profile.redshirt===status))),statuses=labels(allowed,sameYear.length,rng);
      sameYear.forEach((target,i)=>byRow.set(target.row,{classYear:year,redshirt:statuses[i],pool:pool.filter(profile=>profile.classYear===year&&profile.redshirt===statuses[i]),potentialPool:model.potentialByPosition?.get(position)??pool}));
    }
  }
  const devRandom=rngFor(seed,'development-quota'),weights=Object.fromEntries(DEVELOPMENT.map(tier=>[tier,model.sampling.development[tier]*(1+(devRandom()*2-1)*.08)])),tokens=labels(weights,targets.length,devRandom),expected=Object.fromEntries(DEVELOPMENT.map(tier=>[tier,tokens.filter(value=>value===tier).length]));
  const order=shuffle([...targets].sort((a,b)=>a.row-b.row),rngFor(seed,'development-slots')),owners=new Map(),assigned=new Map();
  const available=(target,tier)=>byRow.get(target.row).potentialPool.some(profile=>profile.development===tier);
  tokens.sort((a,b)=>order.filter(target=>available(target,a)).length-order.filter(target=>available(target,b)).length||DEVELOPMENT.indexOf(b)-DEVELOPMENT.indexOf(a));
  function place(index,visited){for(const target of order){if(visited.has(target.row)||!available(target,tokens[index]))continue;visited.add(target.row);const old=owners.get(target.row);if(old===undefined||place(old,visited)){owners.set(target.row,index);assigned.set(index,target.row);return true;}}return false;}
  for(let i=0;i<tokens.length;i++)if(!place(i,new Set())){
    const original=tokens[i],remaining=order.find(target=>!owners.has(target.row));if(!remaining)throw new Error('Development allocation lost a roster slot.');
    tokens[i]=available(remaining,'Normal')?'Normal':byRow.get(remaining.row).potentialPool[0].development;
    if(!place(i,new Set()))throw new Error('No valid observed development allocation.');
    warnings.push(`${original} could not fit this roster's available position packages; used ${tokens[i]} instead.`);
  }
  for(const [index,row]of assigned)byRow.get(row).development=tokens[index];
  return {byRow,expectedDevelopment:expected,warnings,policy:model.sampling};
}
