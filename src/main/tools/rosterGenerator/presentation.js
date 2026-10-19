// Fresh IDs above the recorded full-name bank force surname-only fallback.
// Check every live Player row and reserve earlier teams' new IDs as well.
export const PRESENTATION_RANGE=Object.freeze({first:500000,last:1048575});
export function presentationAssetName(first,last,id){
  const clean=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]/g,'');
  const suffix='_'+id,prefix=(clean(last)+clean(first)).slice(0,41-suffix.length);
  return prefix+suffix;
}
export function rosterPresentations(targets,seed,reserved=[]){
  const used=new Set(reserved);for(const p of targets)if(Number.isSafeInteger(p.original?.PresentationId))used.add(p.original.PresentationId);
  const {first,last}=PRESENTATION_RANGE,span=last-first+1,result=new Map();let next=first+(seed>>>0)%span;
  for(const p of [...targets].sort((a,b)=>a.row-b.row)){
    let tries=0;while(used.has(next)&&tries<span){next=next===last?first:next+1;tries++;}
    if(tries>=span)throw new Error('No unused surname-only presentation IDs remain. The save has not been written.');
    result.set(p.row,next);used.add(next);next=next===last?first:next+1;
  }
  return result;
}
