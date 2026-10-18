// Confirmed independently in the save editors: Height is inches; Weight stores
// pounds minus 160. Conversion is presentation-only; never write these strings.
export function formatHeight(value){return Number.isInteger(Number(value))&&Number(value)>0?`${Math.floor(Number(value)/12)}′ ${Number(value)%12}″`:'Unknown';}
export function weightPounds(value){return Number.isInteger(Number(value))&&Number(value)>=0?Number(value)+160:null;}
export function formatWeight(value){const pounds=weightPounds(value);return pounds===null?'Unknown':`${pounds} lb`;}
export function playerMeasurements(fields){return {height:formatHeight(fields.Height),weight:formatWeight(fields.Weight)};}
