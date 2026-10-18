import {RATING_FIELDS} from './contract.js';

export function formulaIndex(formulas) {return new Map(formulas.map(formula=>[`${formula.position}|${formula.playerType}`,formula]));}
export function calculateOverall(profile,formulas) {
  const formula=formulas.get(`${profile.position}|${profile.archetype}`);
  if(!formula)throw new Error(`No verified OVR formula for ${profile.position}/${profile.archetype}.`);
  const ratings=Object.fromEntries(RATING_FIELDS.map((field,i)=>[field,profile.ratings[i]]));
  let raw=formula.intercept;
  for(const [field,coefficient]of Object.entries(formula.coefficients)){
    if(!Number.isFinite(ratings[field]))throw new Error(`Missing ${field} in ${profile.id}.`);
    raw+=ratings[field]*coefficient;
  }
  return Math.max(formula.minimumOverall,Math.min(formula.maximumOverall,Math.ceil(raw-.5-1e-9)));
}
