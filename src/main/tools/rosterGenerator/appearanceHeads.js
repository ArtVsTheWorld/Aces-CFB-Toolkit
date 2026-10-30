// Portraits are an offline curation aid. Runtime reads only this small ID list.
import fs from 'node:fs';
const reviewed=JSON.parse(fs.readFileSync(new URL('./data/portrait-reviewed-heads.json',import.meta.url),'utf8'));
export const PORTRAIT_REVIEWED_HEADS=Object.freeze([...reviewed.heads]);
const allowed=new Set(PORTRAIT_REVIEWED_HEADS);
export function portraitHeadFamily(head){return /^Generic_\d+_P_(T\d+)_[A-Z]_4_[1-4]$/.exec(head)?.[1]??null;}
if(allowed.size!==PORTRAIT_REVIEWED_HEADS.length||PORTRAIT_REVIEWED_HEADS.some(head=>!portraitHeadFamily(head)))throw Error('Invalid portrait-reviewed head list.');
export const createMixHeadHistory=()=>({heads:new Set(),families:new Map()});
export function selectPortraitReviewedAppearance(pool,history,rng){
 const candidates=pool.filter(a=>allowed.has(a.fields.GenericHeadAssetName));
 if(!candidates.length)throw Error('No portrait-reviewed medium-tone head fits this player’s existing appearance rules.');
 const seen=history??createMixHeadHistory(),count=a=>seen.families.get(portraitHeadFamily(a.fields.GenericHeadAssetName))??0,min=Math.min(...candidates.map(count)),leastUsed=candidates.filter(a=>count(a)===min),fresh=leastUsed.filter(a=>!seen.heads.has(a.fields.GenericHeadAssetName)),choices=fresh.length?fresh:leastUsed,appearance=choices[Math.floor(rng()*choices.length)],head=appearance.fields.GenericHeadAssetName,family=portraitHeadFamily(head);
 seen.heads.add(head);seen.families.set(family,(seen.families.get(family)??0)+1);
 return appearance;
}
