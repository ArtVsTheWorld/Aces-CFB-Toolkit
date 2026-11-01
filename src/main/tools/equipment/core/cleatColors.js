import {EQUIPMENT_ITEMS} from '../catalog.js';
export const CLEAT_COLORS_UNCHANGED='unchanged';
// Exact Unlocked definitions verified in its ItemInfo registry. Custom Color
// Cleats needs additional user-defined palette data and is not a fixed choice.
export const CLEAT_COLOR_OVERRIDES=Object.freeze(EQUIPMENT_ITEMS.filter(item=>/^GearSpats_override_(?:blapri|blasec|blawhi|blabla|prisec|secpri|whibla|whipri|whisec|whiwhi)$/.test(item.itemName)).map(item=>Object.freeze({value:item.itemName,label:item.displayName})));
const allowed=new Set(CLEAT_COLOR_OVERRIDES.map(item=>item.value));
const key=name=>String(name??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const blackTeams=new Set(['Alabama','Alabama Crimson Tide','Bama','Georgia','Georgia Bulldogs','UGA','USC','Southern California','USC Trojans','Penn State','Penn St','Penn State Nittany Lions','Nebraska','Nebraska Cornhuskers'].map(key));
export function defaultTeamCleatColor(name){return blackTeams.has(key(name))?'GearSpats_override_blabla':CLEAT_COLORS_UNCHANGED;}
export function normalizeCleatColorMode(value='leave'){
  if(!['leave','override'].includes(value))throw Error('Choose Leave Cleats Untouched or Apply Cleat Color Overrides.');return value;
}
export function normalizeTeamCleatColors(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Choose one cleat color override for each team.');
  return Object.fromEntries(Object.entries(value).map(([name,asset])=>{
    if(!name.trim()||typeof asset!=='string'||asset!==CLEAT_COLORS_UNCHANGED&&!allowed.has(asset))throw Error(`Cleat colors for ${name}: choose No Change or a supported Unlocked cleat color override.`);
    return [name.trim().toLowerCase(),asset];
  }));
}
export function teamCleatColor(name,choices={}){return choices[String(name??'').trim().toLowerCase()]??defaultTeamCleatColor(name);}
export function applyCleatColorOverride(loadouts,asset){
  if(asset===CLEAT_COLORS_UNCHANGED)return [];
  if(!allowed.has(asset))throw Error('Unsupported cleat color override.');
  const changes=[];
  for(const [loadoutIndex,loadout]of loadouts.entries()){
    if(loadout.loadoutType!=='PlayerOnField'||!Array.isArray(loadout.loadoutElements))continue;
    for(const slot of ['LeftSpat','RightSpat']){
      const at=loadout.loadoutElements.findIndex(e=>(e.slotType??e.slot)===slot),before=at<0?null:loadout.loadoutElements[at],after={slotType:slot,itemAssetName:asset};
      if(before&&JSON.stringify(before)===JSON.stringify(after))continue;
      if(at<0)loadout.loadoutElements.push(after);else loadout.loadoutElements[at]=after;
      changes.push({loadout:loadoutIndex,slot,oldItem:before?.itemAssetName??'Not Equipped',newItem:asset});
    }
  }
  return changes;
}
