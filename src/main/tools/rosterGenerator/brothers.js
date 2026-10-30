import {mulberry32} from '../longSnap/core.js';
import {observedSurnamePool} from './names.js';

// At most one pair, on eight percent of rosters. Keep each player's complete
// observed head/body package; pair players who already have the exact same tone.
export function planBrothers(players,model,seed,unavailable=[]){
  const rng=mulberry32((seed^0x42524f)>>>0),byRow=new Map();
  if(rng()>=.08)return byRow;
  const rows=[...players].sort((a,b)=>a.row-b.row),blocked=new Set(unavailable.map(name=>name.trim().toLowerCase())),pairs=[];
  for(const a of rows)for(const b of rows){
    if(a.row>=b.row||a.provenance.skinTone!==b.provenance.skinTone||a.fields.FirstName===b.fields.FirstName)continue;
    const origin=a.provenance.familyOriginal??{lastName:a.fields.LastName,surname:a.provenance.surname,home:{town:a.fields.PLYR_HOME_TOWN,state:a.fields.PLYR_HOME_STATE,pipeline:a.fields.HomePipeline}};
    // Keep the school's planned state/pipeline distribution intact: relatives
    // can share a town without moving a player to another recruiting region.
    if(origin.home.state!==b.fields.PLYR_HOME_STATE||origin.home.pipeline!==b.fields.HomePipeline)continue;
    const appearance=model.catalog.appearances.find(item=>item.id===b.provenance.appearance),pool=observedSurnamePool(model.catalog,appearance,b.provenance.appearanceMix);
    if(origin.surname.suffix||!origin.home.town||!origin.surname.parts.every(name=>pool.names.includes(name)))continue;
    const newName=`${b.fields.FirstName} ${origin.lastName}`.toLowerCase();
    if(blocked.has(newName)||rows.some(p=>p.row!==b.row&&`${p.fields.FirstName} ${p.fields.LastName}`.toLowerCase()===newName))continue;
    pairs.push({a,b,origin});
  }
  if(!pairs.length)return byRow;
  const {a,b,origin}=pairs[Math.floor(rng()*pairs.length)];
  byRow.set(a.row,{siblingRow:b.row,...structuredClone(origin)});
  byRow.set(b.row,{siblingRow:a.row,...structuredClone(origin)});
  return byRow;
}
