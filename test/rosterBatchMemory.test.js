import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {rosterGeneratorCsv} from '../src/main/tools/rosterGenerator/report.js';
import {rosterGenerationReport} from '../src/main/tools/rosterGenerator/runner.js';
import {ReportService} from '../src/main/services/reports.js';
import {parseCsv} from '../src/main/services/reportAudit.js';
import {ReviewSnapshots} from '../src/main/services/reviewSnapshots.js';
import {ROSTER_GENERATION_PLAYER_FIELDS,readGenerationPlayerStrings,releaseGenerationSource} from '../src/main/tools/rosterGenerator/sourceFields.js';
import {WRITE_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {schemeRecord} from '../src/main/tools/rosterGenerator/schemes.js';

function roster(team='Test Team',offset=0){
  const fields={FirstName:'New',LastName:'Player',Position:'WR',Height:74,Weight:40,OverallRating:70,CurrentNILCompensation:20};
  const player={row:offset,position:'WR',before:{...fields,FirstName:'Old',OverallRating:65},fields,rawData:'{"loadouts":[]}',beforeRawData:'{"loadouts":[]}',changes:[{field:'FirstName',oldValue:'Old',newValue:'New'}],provenance:{football:'football',appearance:'appearance',style:'style',firstNamePool:['Alex','Jóse'],calibration:{offset:2}},appearanceAudit:{},fallbacks:['A comma, a quote " and\na newline']};
  return {team:{name:team},seed:1,preset:{id:'building-blocks'},catalog:{version:1,sha256:'abc'},players:[player],summary:{settings:{schemeContext:{offense:null}},composition:{changed:0}},warnings:[],blocking:[]};
}

test('roster CSV streaming keeps every cell, order and repeated Preview/Apply iteration',t=>{
  const rosters=[roster('First'),roster('Second',1)],standard=rosterGeneratorCsv(rosters[0]),streamed=rosterGeneratorCsv(rosters[0],{streamRows:true});
  assert.deepEqual([...streamed.rows],standard.rows);assert.deepEqual([...streamed.rows],standard.rows);
  const report=rosterGenerationReport(rosters),rows=[...report.rows];
  assert.equal(rows.length,2);assert.deepEqual(rows[0].slice(0,standard.headings.length),standard.rows[0]);
  assert.deepEqual([...report.rows],rows);for(const row of rows)assert.equal(row.length,report.headings.length);
  assert.equal(JSON.parse(rows[0][report.headings.indexOf('CalibrationJSON')]).offset,2);
  assert.equal(rows[1][report.headings.indexOf('Team')],'Second');
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'roster-stream-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const audit={runId:randomUUID(),appVersion:'25.6.0',mode:'preview',savePath:'DYNASTY-TEST',options:{teams:['First','Second']}},service=new ReportService(directory,audit);
  const first=fs.readFileSync(service.create(report),'utf8'),second=fs.readFileSync(service.create(report),'utf8');
  assert.equal(first,second);const parsed=parseCsv(first);assert.equal(parsed.length,3);assert.equal(parsed[1].length,report.headings.length+5);
  assert.deepEqual(parsed.slice(1).map(row=>row.slice(0,standard.headings.length)),rosters.flatMap(r=>rosterGeneratorCsv(r).rows).map(row=>row.map(cell=>String(cell??''))));
});

test('all-team roster reports format players on demand instead of retaining formatted CSV rows',()=>{
  let reads=0;const rosters=Array.from({length:138},(_,i)=>{const r=roster('Team '+i,i*85);r.players=Array.from({length:85},(_,j)=>({...r.players[0],row:i*85+j,get rawData(){reads++;return '{"loadouts":[]}';}}));return r;});
  const report=rosterGenerationReport(rosters);assert.equal(reads,0);const iterator=report.rows[Symbol.iterator]();iterator.next();assert.equal(reads,1);
  assert.equal([...report.rows].length,11730);assert.equal(reads,11731);
});

test('large multi-member review snapshots round trip every row without mutating the reviewed data',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'review-chunks-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const snapshots=new ReviewSnapshots(directory),id=randomUUID(),rows=Array.from({length:1200},(_,row)=>Object.freeze({row,player:'José 🏈 '+row,detail:'quoted "value"\n'.repeat(180)})),result={resultKind:'roster-generator',mode:'preview',planId:'temporary',details:{changes:rows.slice(0,100),totalPreviewRows:rows.length}};
  assert.equal(snapshots.save(id,result,rows),true);const saved=snapshots.get(id);
  assert.deepEqual(saved.rows,rows);assert.equal(saved.result.planId,null);assert.equal(result.planId,'temporary');assert.equal(saved.result.details.changes.length,100);
  assert.deepEqual(fs.readdirSync(directory),[id+'.json.gz']);
  const sparseId=randomUUID(),sparse=[undefined,,{player:'Last'}];snapshots.save(sparseId,result,sparse);
  assert.deepEqual(snapshots.get(sparseId).rows,[null,null,{player:'Last'}]);
});

test('bounded generator reads retain all writable fields and every protected native string',async()=>{
  for(const field of [...WRITE_FIELDS,'CharacterVisuals','TeamIndex'])assert.ok(ROSTER_GENERATION_PLAYER_FIELDS.includes(field));
  let selected;await readGenerationPlayerStrings({offsetTable:[{name:'UnwrittenHistoryLabel',type:'string'},{name:'UnwrittenHistoryCount',type:'int'}],async readRecords(fields){selected=fields;}});
  assert.ok(selected.includes('UnwrittenHistoryLabel'));assert.ok(!selected.includes('UnwrittenHistoryCount'));
});

test('saved commit lookups never expand the entire Player table during settings preparation',async()=>{
  let selected;const table={name:'Player',header:{tableId:1},records:[{Position:'WR',isEmpty:false}],async readRecords(fields){selected=fields;}},loaded={franchise:{tables:[table]}};
  const found=await schemeRecord(loaded,(0x20000).toString(2).padStart(32,'0'),'Player');
  assert.equal(found.record.Position,'WR');assert.deepEqual(selected,['Position']);
});
test('after serialization the write-side native graph can be released without dropping independent verification snapshots',()=>{
 let detached=0;const bytes=Buffer.from([1,2,3]),table={records:[{value:1}],table2Records:[{}],table3Records:[{}],data:bytes,removeAllListeners(event){assert.equal(event,'change');detached++;}},loaded={savePath:'DYNASTY-TEST',franchise:{tables:[table]},players:table},snapshot=Buffer.from(table.data);
 releaseGenerationSource(loaded);assert.equal(detached,1);assert.equal(loaded.savePath,'DYNASTY-TEST');assert.equal(loaded.franchise,null);assert.equal(loaded.players,null);assert.equal(table.records.length,0);assert.equal(table.table2Records.length,0);assert.equal(table.table3Records.length,0);assert.deepEqual(snapshot,bytes);
});
