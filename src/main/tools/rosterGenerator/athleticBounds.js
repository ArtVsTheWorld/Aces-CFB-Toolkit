import {RATING_FIELDS} from './contract.js';
import {displayPosition} from '../../../shared/localization.js';

export const ATHLETIC_RATINGS=Object.freeze(['SpeedRating','AccelerationRating','AgilityRating','ChangeOfDirectionRating','JumpingRating','StrengthRating']);
const athletic=new Set(ATHLETIC_RATINGS),observations=new WeakMap();

// Use the original EA and game-generated samples, never the calibrated roster.
// Keep exact positions separate: a tackle's range is not a corner's range.
export function observedAthleticBounds(model,position,profile='balanced') {
  const evidence=model.observedById??model.byId;
  if(!evidence?.size)throw new Error('Missing observed athletic rating ranges.');
  if(!observations.has(evidence)){
    const ranges=new Map();
    for(const player of evidence.values()){
      const key=displayPosition(player.position);
      if(!ranges.has(key))ranges.set(key,RATING_FIELDS.map(field=>athletic.has(field)?{minimum:99,maximum:0}:null));
      const range=ranges.get(key);
      player.ratings.forEach((value,i)=>{if(range[i]){range[i].minimum=Math.min(range[i].minimum,value);range[i].maximum=Math.max(range[i].maximum,value);}});
    }
    observations.set(evidence,ranges);
  }
  const range=observations.get(evidence).get(displayPosition(position));
  if(!range)throw new Error(`No observed athletic rating ranges for ${position}.`);
  const leeway=['freak','outlier'].includes(profile)?2:0;
  return range.map(bound=>bound?{minimum:Math.max(1,bound.minimum-leeway),maximum:Math.min(99,bound.maximum+leeway)}:null);
}
