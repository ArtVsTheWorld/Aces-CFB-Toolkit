import test from 'node:test';import assert from 'node:assert/strict';
import {validateEquipmentSeason} from '../src/main/tools/equipment/shared.js';
import {validateRosterGeneratorSeason} from '../src/main/tools/rosterGenerator/season.js';
import {getTool} from '../src/shared/toolRegistry.js';
test('all equipment tools accept season metadata without a week or stage gate',()=>{
 for(const type of ['PreSeason','RegularSeason','BowlSeason1','BowlSeason2','BowlSeason3','NationalChampionship','PostSeason','OffSeason','Draft','Recruiting','FutureStage'])for(const week of [0,1,16,21,40]){
  const season=validateEquipmentSeason({CurrentWeekType:type,CurrentWeek:week,PostSeasonNumWeeks:5});assert.equal(season.currentWeekType,type);assert.equal(season.currentWeek,week);
 }
 assert.doesNotThrow(()=>validateEquipmentSeason(undefined));assert.equal(validateEquipmentSeason({}).currentWeek,null);
});
test('equipment descriptions advertise year-round use without changing their accepted save types',()=>{
 for(const id of ['equipment-quickstart','freshman-equipment','equipment-patcher','equipment-mapper']){
  const tool=getTool(id);assert.match(tool.description,/Available any time, including the offseason/);assert.doesNotMatch(tool.description,/through National Championship/);
  assert.ok(tool.input.accepted.includes('dynasty'));assert.ok(tool.input.accepted.includes('road-to-glory'));assert.ok(!tool.input.accepted.includes('roster'));
 }
});
test('Roster Generator retains its separate season rules when equipment is made year-round',()=>{
 assert.doesNotThrow(()=>validateRosterGeneratorSeason({CurrentWeekType:'PreSeason',CurrentWeek:0}));
 assert.doesNotThrow(()=>validateRosterGeneratorSeason({CurrentWeekType:'NationalChampionship',CurrentWeek:21}));
 assert.throws(()=>validateRosterGeneratorSeason({CurrentWeekType:'OffSeason',CurrentWeek:0}),/Roster Generator is available/);
});
