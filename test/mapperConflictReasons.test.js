import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
import MapperEditor from '../src/shared/mapperEditor.cjs';
const catalog=mapperCatalog({confirmed:true,unlocked:true}),e=(slotType,itemAssetName)=>({slotType,itemAssetName});
const find=(slot,asset)=>{const i=catalog.items.find(i=>i.slot===slot&&i.asset===asset);assert.ok(i,asset);return i.id;};
const copy=(slot,asset)=>({action:'copy',replacementId:find(slot,asset),scope:'all'});
const player=elements=>({row:7,visualRow:7,player:'Test Player',team:'Test',position:'WR',branding:'nike',rawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:elements}]})});
const cutoff=[e('OuterShirt','Gear_JerseyStyle_RolledLowest_Untucked'),e('OuterPants','GearPants_Cutoff'),e('InnerShirt','G_CompressionT_Crew_ShortSleeve_Basic_WHI')];
test('removing a required cutoff undershirt reports the specific reason without dropping changes',()=>{
 const p=player(cutoff),original=structuredClone(p),result=buildMapperPreview([p],catalog,[{action:'replace',sourceId:find('InnerShirt','G_CompressionT_Crew_ShortSleeve_Basic_WHI'),replacementId:find('InnerShirt','Undershirt_None'),matchMode:'item',scope:'all'}]);
 assert.equal(result.changes.length,1);assert.equal(result.blocked.length,0);assert.equal(result.compatibilityWarnings[0].reason,'Cutoff pants require an undershirt');assert.deepEqual(p,original);
 const safe=buildMapperPreview([p],catalog,[copy('InnerShirt','Gear_Undershirt_CompressionTCrewSleeveless_White')]);assert.equal(safe.changes.length,1);assert.equal(safe.compatibilityWarnings.length,0);
});
test('active item and correction checks explain jersey, arm, mask and leg conflicts',()=>{
 const cases=[
  [cutoff,copy('OuterShirt','Gear_JerseyStyle_RolledLowest'),/Cutoff pants require a compatible untucked jersey/],
  [cutoff,copy('InnerPants',catalog.items.find(i=>i.slot==='InnerPants'&&!/None$/.test(i.asset)).asset),/Cutoff pants require no leg base layer/],
  [[e('OuterShirt','Gear_JerseyStyle_RolledLowest_Untucked')],copy('InnerShirt','G_CompressionT_Crew_ShortSleeve_99Club_B_GOL'),/Relaxed tees.*jersey/],
  [[e('LeftArmWear','GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_White')],copy('InnerShirt','G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD'),/Longsleeve undershirts.*arm sleeves/],
  [[e('MouthWear','GearMouthpiece_PacifierDual_White')],copy(catalog.items.find(i=>i.asset==='GearNeckpad_VintageNeckRoll').slot,'GearNeckpad_VintageNeckRoll'),/Masks and balaclavas require a hanging mouthpiece/]
 ];
 for(const [elements,rule,expected] of cases){const result=buildMapperPreview([player(elements)],catalog,[rule]);assert.equal(result.changes.length,1);assert.equal(result.blocked.length,0);assert.match(result.compatibilityWarnings[0].reason,expected);}
});
test('existing incompatibilities do not become new warnings for unrelated edits',()=>{
 const p=player([...cutoff.filter(e=>e.slotType!=='InnerShirt'),e('InnerShirt','Undershirt_None')]),paint=catalog.items.find(i=>i.slot==='FacePaint'&&!/None$/.test(i.asset));assert.ok(paint);
 assert.equal(buildMapperPreview([p],catalog,[copy(paint.slot,paint.asset)]).compatibilityWarnings.length,0);
});
const renderer=()=>{const c=vm.createContext({escapeHtml:s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))});vm.runInContext(fs.readFileSync('src/renderer/results-ui.js','utf8'),c);return c;};
test('327 identical warnings collapse to one short reason and count while other tools keep their player details',()=>{
 const c=renderer(),warnings=Array.from({length:327},(_,row)=>({row,player:'Player '+row,team:'Team',reason:'Cutoff pants require an undershirt'})),result={resultKind:'equipment-mapper',details:{compatibilityWarnings:warnings,warnings:['Mappings match the original equipment. Other equipment stays unchanged.']}};
 const summary=c.mapperCompatibilitySummary(result);assert.equal(summary.length,1);assert.equal(summary[0],'Cutoff pants require an undershirt. (327 players)');assert.equal(c.runIssues(result).compatibility.length,1);assert.equal(c.runIssues(result).notes.length,1);assert.equal(c.runIssues(result).warnings.length,0);assert.doesNotMatch(c.runIssueMarkup(result),/Player 0|326 more notices/);
 assert.match(c.runIssues({...result,resultKind:'equipment-patcher'}).compatibility[0],/Team.*Player 0/);
 warnings.push({...warnings[0]});assert.equal(c.mapperCompatibilitySummary(result)[0],summary[0]);
 warnings.push({row:5,reason:'<unsafe text>'});assert.match(c.runIssueMarkup(result),/&lt;unsafe text&gt;/);
});
test('Apply confirmation includes brief reasons and keeps its explicit Apply Anyway action',async()=>{
 const c=renderer();let message;c.appConfirm=(title,text,button)=>{message=text;assert.equal(button,'Apply Anyway');return Promise.resolve(false);};c.document={querySelector:()=>null};vm.runInContext(fs.readFileSync('src/renderer/equipment-mapper.js','utf8'),c);
 const warnings=Array.from({length:5},(_,row)=>({row,reason:'Conflict '+row}));assert.equal(await c.confirmMapperCompatibility({details:{compatibilityWarnings:warnings}}),false);assert.match(message,/Conflict 0.*Conflict 1.*Conflict 2/);assert.doesNotMatch(message,/Conflict 3|Conflict 4/);assert.match(message,/Plus 2 other conflicts listed in the preview/);
});

test('rule sentences explain color matching, wearing conditions, removal and assignment',()=>{
 const items=catalog.items,sourceId=find('InnerShirt','G_CompressionT_Crew_ShortSleeve_Basic_WHI'),replacementId=find('InnerShirt','Undershirt_None'),wearingItemId=find('OuterShirt','Gear_JerseyStyle_RolledLowest_Untucked');
 const rule={action:'replace',sourceId,replacementId,wearingItemId,matchMode:'item'};
 assert.match(MapperEditor.describe(rule,items).sentence,/Remove White Compression Tee \(any color\), only from players wearing Jersey Rolled Lowest Untucked\./);
 const assigned=MapperEditor.describe({...rule,action:'copy',replacementId:sourceId,preserveColor:true},items).sentence;assert.match(assigned,/Assign White Compression Tee/);assert.match(assigned,/only to players wearing/);assert.match(assigned,/keeping each player's current color/);
});

test('impact counts unique players across outfits/rules and explains frequency, no-ops and blocked players',()=>{
 const input=Array.from({length:10},(_,row)=>({...player(cutoff),row,visualRow:row,player:'Test '+row})),same=copy('InnerShirt','G_CompressionT_Crew_ShortSleeve_Basic_WHI'),change=copy('InnerShirt','Gear_Undershirt_CompressionTCrewSleeveless_White');
 const half=buildMapperPreview(input,catalog,[{...change,frequency:50,fillToFrequency:true}]);assert.equal(half.impact.matching,10);assert.equal(half.impact.changing,5);assert.equal(half.impact.unchanged,5);assert.equal(half.impact.unchangedReasons[0].reason,'Not selected by the frequency setting');
 const noop=buildMapperPreview(input,catalog,[same]);assert.equal(noop.impact.unchanged,10);assert.equal(noop.impact.unchangedReasons[0].reason,'Already has the requested equipment');
 const twice=input.map(p=>({...p,rawData:JSON.stringify({loadouts:[...JSON.parse(p.rawData).loadouts,...JSON.parse(p.rawData).loadouts]})}));
 const double=buildMapperPreview(twice,catalog,[change,change]);assert.equal(double.impact.matching,10);assert.equal(double.impact.changing,10);assert.equal(double.impact.unchanged,0);
 const blocked=buildMapperPreview(input.map(p=>({...p,shared:true})),catalog,[change]);assert.equal(blocked.impact.changing,0);assert.equal(blocked.impact.unchanged,10);assert.match(blocked.impact.unchangedReasons[0].reason,/Blocked/);
 const unrelated={action:'replace',sourceId:find('InnerShirt','Undershirt_None'),replacementId:same.replacementId,scope:'all'};
 const excluded=buildMapperPreview(input,catalog,[{...change,frequency:0},unrelated]);assert.equal(excluded.impact.unchanged,10);assert.equal(excluded.impact.unchangedReasons[0].reason,'Not selected by the frequency setting');
});

test('conflict badge uses the roster red asterisk and impact metrics remain stable when rows are paged',()=>{
 const c=renderer();vm.runInContext(fs.readFileSync('src/renderer/equipment-mapper.js','utf8'),c);
 const badge=c.mapperConflictBadge({compatibilityReason:'Cutoff pants require an undershirt'});assert.match(badge,/class="roster-position-change mapper-conflict-badge"/);assert.match(badge,/>\*<\/span>/);assert.match(badge,/tabindex="0"/);assert.match(badge,/title="Cutoff pants require an undershirt"/);assert.equal(c.mapperConflictBadge({}),'');
 const result={resultKind:'equipment-mapper',mode:'preview',details:{impact:{matching:327,changing:200,unchanged:127,unchangedReasons:[{reason:'Not selected by the frequency setting',players:127}]},ruleSummaries:['Remove Compression Tee.'],changes:[]}};
 assert.equal(c.runPrimaryMetrics(result).map(i=>i.value).join(','),'327,200,127');assert.match(c.mapperPreviewExplanation(result),/127 players/);assert.match(c.mapperPreviewExplanation(result),/Remove Compression Tee/);
});
