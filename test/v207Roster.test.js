import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {UpdatePrompts} from '../src/main/services/updatePrompts.js';
import {loadObservedCatalog} from '../src/main/tools/rosterGenerator/catalog.js';
import {observedSurnamePool,makeSurname} from '../src/main/tools/rosterGenerator/names.js';
import {toneWeights,normalizeGenerationSettings} from '../src/main/tools/rosterGenerator/settings.js';
import {teamGenerationConfigurations} from '../src/main/tools/rosterGenerator/runner.js';
import {buildAppearancePreview} from '../src/main/tools/rosterGenerator/core.js';
import {rankDepthPlayers,depthScore,planRosterDepthCharts,applyRosterDepthCharts,verifyRosterDepthCharts} from '../src/main/tools/rosterGenerator/depthCharts.js';
import {rosterPreset} from '../src/main/tools/rosterGenerator/presets.js';
import TALENT from '../src/shared/rosterTalent.cjs';
test('update consent belongs to one live window and is single-use',async()=>{
 const sender=new EventEmitter();sender.send=(channel,request)=>{sender.request=request;assert.equal(channel,'updates:prompt-request');};const window={isDestroyed:()=>false,webContents:sender},broker=new UpdatePrompts(),promise=broker.request(window,'install',{version:'20.7.0'});
 assert.equal(broker.respond({}, {id:sender.request.id,accepted:true}),false);assert.equal(broker.respond(sender,{id:sender.request.id,accepted:'true'}),false);assert.equal(broker.respond(sender,{id:sender.request.id,accepted:true}),true);assert.equal(await promise,true);assert.equal(broker.respond(sender,{id:sender.request.id,accepted:true}),false);assert.equal(broker.pending.size,0);
 const cancel=broker.request(window,'download',{version:'20.7.0'});sender.emit('did-start-loading');assert.equal(await cancel,false);assert.equal(sender.listenerCount('destroyed'),0);assert.equal(await broker.request(null,'install',{}),false);
});
test('surname pools follow observed head-tone associations, including suffixes and hyphens',()=>{
 const {catalog}=loadObservedCatalog(),appearance=tone=>({skinTone:tone,fields:{}}),light=observedSurnamePool(catalog,appearance(2)),dark=observedSurnamePool(catalog,appearance(7));
 assert.ok(!light.names.includes('Abanikanda'));assert.ok(!light.names.includes('Kamalu'));assert.ok(dark.names.includes('Abanikanda'));assert.ok(dark.names.includes('Kamalu'));
 let i=0;const surname=makeSurname(['Alpha','Beta'],()=>[0,.9][i++%2],{hyphen:true,suffix:'III'},{Alpha:2,Beta:2});assert.equal(surname.value,'Alpha-Beta III');
 for(const [bucket,pool]of Object.entries(catalog.names.lastByTone)){assert.ok(Object.keys(pool).length>300,bucket);assert.ok(Object.keys(pool).every(name=>catalog.names.last.includes(name)));}
});
test('HB and CB have modest darker-tone adjustments without excluding tone 8',()=>{
 for(const position of ['HB','CB'])for(const preset of ['standard','big-sky']){const weights=toneWeights(preset,position,[]),base=toneWeights(preset,'QB',[]);assert.equal(Object.values(weights).reduce((a,b)=>a+b,0),100);assert.equal(weights[6]+weights[7]+weights[8],base[6]+base[7]+base[8]+10);assert.ok(weights[8]>0);assert.equal(weights[5],0);}
 assert.deepEqual(toneWeights('hbcu','K',[]),toneWeights('hbcu','QB',[]));
});
test('team overrides are independent, compose with shared settings and reject unknown keys',()=>{
 const options={preset:'competitive',skinTonePreset:'standard',teamConfigurations:{A:{preset:'startup',rosterAge:'youth',reorderDepthChart:false},B:{preset:'all-time',rosterPotential:'sky',skinTonePreset:'hbcu'}}},resolved=teamGenerationConfigurations(options,['A','B','C']);
 assert.equal(resolved.A.preset,'startup');assert.equal(resolved.B.preset,'all-time');assert.equal(resolved.C.preset,'competitive');assert.equal(resolved.A.settings.reorderDepthChart,false);assert.equal(resolved.C.settings.reorderDepthChart,true);assert.equal(resolved.B.settings.skinTonePreset,'hbcu');assert.equal(resolved.A.settings.skinTonePreset,'standard');
 assert.throws(()=>teamGenerationConfigurations(options,['A']));assert.throws(()=>teamGenerationConfigurations({teamConfigurations:{A:{seed:1}}},['A']));assert.equal(rosterPreset('all-time').targetAverage,83);assert.equal(normalizeGenerationSettings().reorderDepthChart,true);
});
test('safe Base tattoo slots are supported, while unknown appearance layers still block',()=>{
 const {catalog}=loadObservedCatalog(),appearance=catalog.appearances[0],base={loadoutCategory:'Base',loadoutElements:[{slotType:'LeftArmTattoo',itemAssetName:'ArmTattoo_None'},{slotType:'RightLegTattoo',itemAssetName:'LegTattoo_Generic1'}]},raw={loadouts:[base,{loadoutType:'PlayerOnField',loadoutElements:[]}]},result=buildAppearancePreview(raw,appearance,'nike');assert.deepEqual(result.unknownLayers,[]);assert.equal(JSON.parse(result.raw).loadouts[0].loadoutElements[1].itemAssetName,'LegTattoo_None');assert.equal(raw.loadouts[0].loadoutElements[1].itemAssetName,'LegTattoo_Generic1');
 for(const bad of [{...base,extra:1},{loadoutCategory:'Base',loadoutElements:[{slotType:'Head',itemAssetName:'Unknown'}]},{loadoutType:'Portrait',loadoutElements:[]}])assert.ok(buildAppearancePreview({loadouts:[bad,raw.loadouts[1]]},appearance,'nike').unknownLayers.length);
});
test('depth chart ranking uses natural positions and specialist skills, not raw OVR alone',()=>{
 const players=[{row:1,position:'QB',fields:{OverallRating:70}},{row:2,position:'WR',fields:{OverallRating:99,KickReturnRating:20,SpeedRating:80,AgilityRating:80}},{row:3,position:'HB',fields:{OverallRating:65,KickReturnRating:99,SpeedRating:99,AgilityRating:99}},{row:4,position:'TE',fields:{OverallRating:70,LongSnapRating:95}},{row:5,position:'C',fields:{OverallRating:90,LongSnapRating:20}}];
 assert.equal(rankDepthPlayers(players,'QB')[0].row,1);assert.equal(rankDepthPlayers(players,'KR')[0].row,3);assert.equal(rankDepthPlayers(players,'LS')[0].row,4);assert.equal(depthScore(players[3],'LS'),95);assert.deepEqual(rankDepthPlayers(players,'Unknown'),[]);
});
test('displayed position targets use the same zero-sum calculation as generation',()=>{
 const counts={QB:3,HB:5,FB:1,OL:15,WR:8,CB:8,EDGE:6,DT:5,LB:8,FS:4,SS:4,TE:5,'K/P':4},shares=TALENT.redistribute(TALENT.baseline(counts),'QB',35,counts),targets=TALENT.targets(counts,69,shares),total=Object.values(counts).reduce((a,b)=>a+b,0);assert.ok(targets.QB>69);assert.ok(Object.values(targets).some(value=>value<69));assert.ok(Math.abs(Object.entries(targets).reduce((sum,[p,target])=>sum+counts[p]*target,0)/total-69)<1e-8);
});
const ref=(table,row)=>table.toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
function fakeDepth(){
 const record={isEmpty:false,arraySize:1,bytes:Buffer.alloc(8)};record.bytes[7]=1;Object.defineProperty(record,'hexData',{get(){return this.bytes;}});Object.defineProperty(record,'Player0',{get(){return this.bytes.readUInt32BE(0).toString(2).padStart(32,'0');},set(value){this.bytes.writeUInt32BE(parseInt(value,2),0);}});record.Player0=ref(1,0);
 const array={name:'Player[]',header:{tableId:3},offsetTable:[{name:'Player0',isReference:true,length:32,offset:0}],records:[record],readRecords:async()=>{}},chart={name:'DepthChart',header:{tableId:2},offsetTable:[{name:'QB'},{name:'LockedEntries'}],records:[{isEmpty:false,QB:ref(3,0),LockedEntries:ref(4,0)}],readRecords:async()=>{}},locks={name:'ForcedDepthChartEntry[]',header:{tableId:4},records:[{isEmpty:false,arraySize:0}],readRecords:async()=>{}},players=[{row:0,position:'QB',fields:{OverallRating:60,FirstName:'A',LastName:'A'}},{row:1,position:'QB',fields:{OverallRating:90,FirstName:'B',LastName:'B'}}];
 return {loaded:{players:{header:{tableId:1}},teams:{records:[{isEmpty:false,TeamIndex:1,DepthChart:ref(2,0)}]},franchise:{tables:[array,chart,locks]}},rosters:[{team:{name:'Team',teamIndex:1},players,summary:{settings:{reorderDepthChart:true}}}],array,chart,locks};
}
test('depth writes change only planned reference bits and preserve list metadata',async()=>{
 const {loaded,rosters,array}=fakeDepth(),plans=await planRosterDepthCharts(loaded,rosters);assert.equal(plans[0].status,'reordered');assert.equal(plans[0].changes.length,1);const guards=applyRosterDepthCharts(loaded,plans);assert.equal(array.records[0].Player0,ref(1,1));assert.equal(array.records[0].bytes[7],1);verifyRosterDepthCharts(loaded,guards);array.records[0].bytes[7]=2;assert.throws(()=>verifyRosterDepthCharts(loaded,guards),/Unexpected depth-chart/);
});
test('shared arrays, manual locks, unknown slots and off-roster references keep charts unchanged',async()=>{
 for(const mutate of [f=>f.chart.records.push({...f.chart.records[0]}),f=>f.locks.records[0].arraySize=1,f=>f.chart.offsetTable.push({name:'UnknownRole'}),f=>f.array.records[0].Player0=ref(1,55)]){const f=fakeDepth();mutate(f);const before=Buffer.from(f.array.records[0].hexData),plans=await planRosterDepthCharts(f.loaded,f.rosters);assert.equal(plans[0].status,'kept');assert.equal(plans[0].changes.length,0);assert.deepEqual(f.array.records[0].hexData,before);}
});
