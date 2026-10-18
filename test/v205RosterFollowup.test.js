import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ReportService} from '../src/main/services/reports.js';
import {validateReportLocation} from '../src/main/services/reportLocations.js';
import {formatHeight,formatWeight,weightPounds} from '../src/shared/playerMeasurements.js';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {modelForPreset,rosterPreset} from '../src/main/tools/rosterGenerator/presets.js';
import {generateRosterPreview,allocateRosterNumbers,validateRosterPreview} from '../src/main/tools/rosterGenerator/core.js';
import {createRosterStrata,quotaCounts} from '../src/main/tools/rosterGenerator/sampling.js';
import {WRITE_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {getTool} from '../src/shared/toolRegistry.js';
import {observedFirstNames} from '../src/main/tools/rosterGenerator/settings.js';

function targets(){const positions=['QB','QB','QB','QB','HB','HB','FB','WR','WR','WR','WR','TE','TE','LT','LT','LG','LG','C','RG','RG','RT','RT','LE','LE','RE','RE','DT','DT','DT','LOLB','LOLB','MLB','MLB','ROLB','ROLB','CB','CB','CB','FS','FS','SS','SS','K','P'];return positions.map((position,row)=>({row,position,visualRow:row,visualOwners:[row],rawData:'{"loadouts":[{"loadoutType":"PlayerOnField","loadoutElements":[]}]}',original:{...Object.fromEntries(WRITE_FIELDS.map(field=>[field,0])),FirstName:'Old',LastName:String(row),OverallRating:80}}));}
test('height and encoded weight display as feet/inches and pounds without changing stored values',()=>{
  assert.equal(formatHeight(74),'6′ 2″');assert.equal(formatHeight(71),'5′ 11″');assert.equal(formatWeight(57),'217 lb');assert.equal(weightPounds(0),160);assert.equal(formatHeight(undefined),'Unknown');assert.equal(formatWeight(undefined),'Unknown');
});
test('approved roster targets stay near the actual observed team-average envelope',()=>{
  const expected={startup:60,fcs:64,'building-blocks':69,competitive:72,contender:75,'blue-blood':79,'all-time':83};
  for(const [id,target]of Object.entries(expected))assert.equal(rosterPreset(id).targetAverage,target);
});
test('class/development strata are order-independent, conservative and not selected by target OVR',()=>{
  const base=loadObservedCatalog(),input=targets();
  for(const id of ['startup','fcs','building-blocks','all-time']){
    const preset=rosterPreset(id),model=modelForPreset(base,preset),a=createRosterStrata(input,model,205),b=createRosterStrata([...input].reverse(),model,205);
    assert.deepEqual(a,b);
    const p=generateRosterPreview({team:{name:'Test Team',teamIndex:1,branding:'nike'},targets:input,model,seed:205,preset});
    assert.ok(p.summary.developmentCounts.Normal/p.players.length>.60,id);
    assert.ok(new Set(p.players.filter(player=>player.position==='QB').map(player=>player.fields.SchoolYear)).size>=3);
    for(const player of p.players){assert.ok(player.fields.JerseyNum<=19||player.position!=='QB');assert.ok(observedFirstNames(model.catalog,model.catalog.appearances.find(appearance=>appearance.id===player.provenance.appearance)).includes(player.fields.FirstName));const source=base.byId.get(player.provenance.potential);assert.deepEqual(source.caps,Array.from({length:6},(_,i)=>player.fields[`SkillGroupCap${i+1}`]));assert.equal(player.fields.TraitDevelopment,source.development);}
    const tampered=structuredClone(p),qb=tampered.players.find(player=>player.position==='QB');qb.fields.JerseyNum=29;assert.throws(()=>validateRosterPreview(tampered,input,model));
  }
  assert.deepEqual(quotaCounts({Normal:71.756,College_Impact:21.466,College_Star:5.703,College_Elite:1.075},85),{Normal:61,College_Impact:18,College_Star:5,College_Elite:1});
});
test('Standard jersey allocation keeps QBs in the preferred ranges for a normal roster',()=>{
  for(let seed=0;seed<20;seed++){const players=targets().map(target=>({...target,overall:75})),numbers=allocateRosterNumbers(players,'Test Team',seed).assigned;assert.equal(numbers.size,players.length);for(const player of players.filter(player=>player.position==='QB'))assert.ok(numbers.get(player.row)<=19);}
});
test('new reports carry Preview/Apply in their names and remain discoverable; CSV location is safely bounded',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-v205-reports-'));t.after(()=>{if(path.dirname(dir)!==path.resolve(os.tmpdir())||!path.basename(dir).startsWith('cfb-v205-reports-'))throw new Error('Unexpected cleanup path');fs.rmSync(dir,{recursive:true,force:true});});
  const reports=new ReportService(path.join(dir,'reports')),definition={prefix:'test-report',toolId:'roster-generator',toolName:'Roster Generator',headings:['A'],rows:[[1]]};
  for(const mode of ['preview','apply']){const file=reports.forRun({mode,runId:'test',toolVersion:'1.0',savePath:'test',options:{}}).create(definition);assert.ok(path.basename(file).includes(`-${mode}-`));assert.equal(validateReportLocation(file,path.join(dir,'reports')),fs.realpathSync(file));}
  assert.equal(reports.list().length,2);const outside=path.join(dir,'outside.csv');fs.writeFileSync(outside,'test');assert.throws(()=>validateReportLocation(outside,path.join(dir,'reports')),/outside/);assert.throws(()=>validateReportLocation('relative.csv',path.join(dir,'reports')),/existing CSV/);
});
test('three tool icons are distinct from each other and from the equipment header',()=>{
  const icons=['roster-generator','nil-toggle','equipment-patcher'].map(id=>getTool(id).icon);assert.equal(new Set(icons).size,3);assert.ok(!icons.includes('shuffle'));assert.ok(!icons.includes('shoulder-pads'));
});
