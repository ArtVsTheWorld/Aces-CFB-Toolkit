import {RATING_FIELDS} from './contract.js';

let ratingIndices;
function indices() {
  // Initialize on first use so the shared write-contract imports can finish.
  if(!ratingIndices){ratingIndices=new Map();for(let i=0;i<RATING_FIELDS.length;i++)ratingIndices.set(RATING_FIELDS[i],i);}
  return ratingIndices;
}

export function formulaIndex(formulas) {return new Map(formulas.map(formula=>[`${formula.position}|${formula.playerType}`,formula]));}
export function calculateOverall(profile,formulas) {
  const formula=formulas.get(`${profile.position}|${profile.archetype}`);
  if(!formula)throw new Error(`No verified OVR formula for ${profile.position}/${profile.archetype}.`);
  // Full-dynasty generation evaluates these vectors repeatedly. Read only the
  // contributing ratings instead of allocating 54 pairs and a temporary object
  // on every call. This also avoids the Object.fromEntries runtime crash site.
  const fields=indices();
  let raw=formula.intercept;
  for(const field in formula.coefficients){
    if(!Object.hasOwn(formula.coefficients,field))continue;
    const index=fields.get(field),rating=index===undefined?undefined:profile.ratings[index];
    if(!Number.isFinite(rating))throw new Error(`Missing ${field} in ${profile.id}.`);
    raw+=rating*formula.coefficients[field];
  }
  return Math.max(formula.minimumOverall,Math.min(formula.maximumOverall,Math.ceil(raw-.5-1e-9)));
}
