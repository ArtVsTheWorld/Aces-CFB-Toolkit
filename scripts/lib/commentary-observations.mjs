import {normalizeName,stripSuffix} from '../../src/main/tools/commentary/matcher.js';

// Never learn a surname from a first-name fallback, zero ID, conflicting ID,
// another established name's ID, or a lone observation.
export function reviewCommentaryObservations(rows,map){
  const known=new Map([...map].map(([name,id])=>[normalizeName(name),{name,id}])),byID=new Map(),groups=new Map(),mismatches=[];
  for(const [name,id]of map){if(!byID.has(id))byID.set(id,[]);byID.get(id).push(name);}
  const counts={players:0,knownSurname:0,knownSurnameMismatch:0,unknownSurname:0,noID:0,firstNameFallback:0};
  for(const {first,last,id}of rows){
    counts.players++;const existing=known.get(normalizeName(last))??known.get(normalizeName(stripSuffix(last)));
    if(existing){counts.knownSurname++;if(existing.id!==id){counts.knownSurnameMismatch++;mismatches.push({name:last,expected:existing.id,observed:id,existingIDNames:byID.get(id)??[],firstNameFallback:known.get(normalizeName(first))?.id===id});}continue;}
    counts.unknownSurname++;if(!Number.isSafeInteger(id)||id<=0){counts.noID++;continue;}
    if(known.get(normalizeName(first))?.id===id){counts.firstNameFallback++;continue;}
    const key=normalizeName(stripSuffix(last));if(!groups.has(key))groups.set(key,{name:stripSuffix(last),observations:[]});groups.get(key).observations.push({id,first:normalizeName(first)});
  }
  const candidates=[...groups.values()].map(group=>{const ids=[...new Set(group.observations.map(o=>o.id))],firsts=new Set(group.observations.map(o=>o.first)),id=ids.length===1?ids[0]:null;return {name:group.name,id,observations:group.observations.length,distinctFirstNames:firsts.size,ids,existingIDNames:id?byID.get(id)??[]:[]};});
  for(const candidate of candidates)candidate.rejection=candidate.ids.length!==1?'Conflicting observed IDs':candidate.existingIDNames.length?'ID already belongs to another name':candidate.distinctFirstNames<2?'Needs independent repeat observations':candidates.some(other=>other!==candidate&&other.ids.includes(candidate.id))?'ID shared by different unknown surnames':null;
  return {counts,accepted:candidates.filter(c=>!c.rejection).sort((a,b)=>a.name.localeCompare(b.name)),review:candidates.filter(c=>c.rejection).sort((a,b)=>a.name.localeCompare(b.name)),mismatches};
}
