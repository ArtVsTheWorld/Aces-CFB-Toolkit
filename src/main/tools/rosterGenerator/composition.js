import Composition from '../../../shared/rosterComposition.cjs';
import {nativePosition} from './schemes.js';
export function composeRosterTargets(targets,settings){
  if(settings.rosterMakeup!=='scheme')return targets;
  if(!settings.schemeContext)throw new Error('Resolve the native schemes before changing roster composition.');
  const counts=Composition.counts(targets.length,settings.schemeContext.requirements),remaining={...counts},assigned=new Map(),unassigned=[];
  for(const target of targets){const position=nativePosition(target.position);if(remaining[position]>0){assigned.set(target.row,position);remaining[position]--;}else unassigned.push(target);}
  const seats=Composition.positions.flatMap(position=>Array(remaining[position]).fill(position));
  unassigned.sort((a,b)=>a.row-b.row).forEach((target,index)=>assigned.set(target.row,seats[index]));
  return targets.map(target=>({...target,position:assigned.get(target.row)}));
}
export function compositionAudit(targets,originals,context){
  const count=values=>values.reduce((counts,position)=>(counts[position]=(counts[position]??0)+1,counts),{});
  return {before:count(originals.map(target=>target.position)),after:count(targets.map(target=>target.position)),changed:targets.filter(target=>target.position!==originals.find(old=>old.row===target.row)?.position).length,requirements:context?.requirements??{}};
}
