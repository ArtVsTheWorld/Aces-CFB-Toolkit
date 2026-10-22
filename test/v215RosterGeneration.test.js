import test from 'node:test';import assert from 'node:assert/strict';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {modelForPreset,rosterPreset} from '../src/main/tools/rosterGenerator/presets.js';
import {generateRosterPreview,validateRosterPreview} from '../src/main/tools/rosterGenerator/core.js';
import {VALID_POSITIONS} from '../src/main/tools/equipment/shared.js';import {WRITE_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
test('rare brothers survive complete generation and exact validation without touching appearance or ability packages',()=>{
  const base=loadObservedCatalog(),preset=rosterPreset('building-blocks'),model=modelForPreset(base,preset),targets=VALID_POSITIONS.flatMap(position=>Array.from({length:2},()=>position)).map((position,row)=>({row,position,visualRow:row,visualOwners:[row],rawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[]}]}),original:{...Object.fromEntries(WRITE_FIELDS.map(field=>[field,0])),FirstName:'Old',LastName:String(row),OverallRating:70,CurrentNILCompensation:30}}));
  const preview=generateRosterPreview({team:{name:'Test',teamIndex:1,branding:'nike'},targets,model,preset,seed:4});assert.equal(preview.summary.brothers.length,1);
  const [a,b]=preview.summary.brothers[0].map(row=>preview.players.find(player=>player.row===row));assert.equal(a.fields.LastName,b.fields.LastName);assert.equal(a.provenance.skinTone,b.provenance.skinTone);for(const field of ['PLYR_HOME_TOWN','PLYR_HOME_STATE','HomePipeline'])assert.equal(a.fields[field],b.fields[field]);assert.equal(validateRosterPreview(preview,targets,model),true);
  const changed=structuredClone(preview);changed.players.find(player=>player.row===b.row).fields.PLYR_HOME_TOWN='Not Their Town';assert.throws(()=>validateRosterPreview(changed,targets,model),/Brother|brother/);
  const nilTamper=structuredClone(preview);nilTamper.players[0].fields.CurrentNILCompensation++;assert.throws(()=>validateRosterPreview(nilTamper,targets,model),/NIL compensation/);
});
