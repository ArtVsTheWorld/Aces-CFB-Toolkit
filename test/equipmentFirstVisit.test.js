import test from 'node:test';import assert from 'node:assert/strict';
import {collectEquipmentDonors} from '../src/main/tools/equipment/core/patcher.js';

test('limited settings donor validation finds the same top usable donors, including ties and broken high-rated outfits',()=>{
 const ref=row=>(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0'),players=[],visuals=[];let reads=0;
 for(let row=0;row<240;row++){
  const raw=row%29===0?'broken':JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'InnerSocks',itemAssetName:'Gear_Socks_Low'}]}]});
  players.push({isEmpty:false,FirstName:'Player',LastName:String(row),SchoolYear:row%11===0?'Freshman':'Senior',Position:row%2?'WR':'P',OverallRating:99-Math.floor(row/8),TeamIndex:row%17===0?9:1,CharacterVisuals:ref(row),CharacterBodyType:'Thin'});
  visuals.push({isEmpty:false,get RawData(){reads++;return raw;}});
 }
 const rosterRows=new Set(players.map((p,row)=>row).filter(row=>row%13)),options={rosterRows,fcsTeamIndexes:new Set([9])},full=collectEquipmentDonors(players,visuals,10,options),fullReads=reads,groups=new Map();for(const donor of full){if(!groups.has(donor.position))groups.set(donor.position,[]);groups.get(donor.position).push(donor);}
 const expected=[...groups.values()].flatMap(group=>group.sort((a,b)=>b.overall-a.overall||a.row-b.row).slice(0,3)).map(d=>d.row).sort((a,b)=>a-b);reads=0;
 const limited=collectEquipmentDonors(players,visuals,10,{...options,topPerPosition:3});assert.deepEqual(limited.map(d=>d.row).sort((a,b)=>a-b),expected);assert.ok(reads<fullReads/4,'Lower-ranked outfits are not decoded after the quota is satisfied');assert.equal(limited.length,6);
 assert.deepEqual(collectEquipmentDonors(players,visuals,10,{...options,topPerPosition:500}).map(d=>d.row).sort((a,b)=>a-b),full.map(d=>d.row).sort((a,b)=>a-b));
 for(const topPerPosition of [0,-1,1.5,NaN])assert.throws(()=>collectEquipmentDonors(players,visuals,10,{topPerPosition}),/positive whole/);
});
