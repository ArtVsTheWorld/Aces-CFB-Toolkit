import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import zlib from 'node:zlib';
import {reorderVisualIson,encodeStorageFriendlyVisualData} from '../src/main/tools/equipment/visualEncoding.js';

const require=createRequire(import.meta.url),data=path.resolve(path.dirname(require.resolve('madden-franchise')),'../data'),lookup=JSON.parse(fs.readFileSync(path.join(data,'interned-strings/c27/lookup.json'))),dictionary=fs.readFileSync(path.join(data,'zstd-dicts/c27/dict.bin'));
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/equipmentCompactIson.json',import.meta.url))),native=Buffer.from(fixture.originalFrame,'base64'),ison=Buffer.from(fixture.originalIson,'base64'),ordered=Buffer.from(fixture.orderedIson,'base64'),context={gameYear:27,gameType:'college',tableName:'CharacterVisuals'};
const body=frame=>zlib.zstdDecompressSync(frame.subarray(2,2+frame.readUInt16LE()),{dictionary});
// The two accepted ISON byte streams were independently encoded/decoded with
// the native codec. Unknown output bytes cannot silently pass this fixture.
const codec={setUnformattedValueFromFormatted:()=>native,getFormattedValueFromUnformatted:frame=>{const decoded=body(frame);assert.ok(decoded.equals(ison)||decoded.equals(ordered),'Output must match an independently verified native representation');return JSON.stringify(fixture.expected);}};

test('compact object ordering matches the independent native encoding without mutating the original bytes',()=>{
  const before=Buffer.from(ison);assert.deepEqual(reorderVisualIson(ison,lookup),ordered);assert.deepEqual(ison,before);assert.deepEqual(reorderVisualIson(ordered,lookup),ordered);
});
test('a full native appearance saves one storage row with every expected value intact',()=>{
  const original=Buffer.from(native),encoded=encodeStorageFriendlyVisualData(codec,JSON.stringify(fixture.expected),null,fixture.maxLength,context);
  assert.ok(native.length>fixture.maxLength+2);assert.equal(encoded.length,fixture.maxLength+2);assert.deepEqual(body(encoded),ordered);assert.deepEqual(native,original);
  assert.deepEqual(JSON.parse(codec.getFormattedValueFromUnformatted(encoded)),fixture.expected);
});
test('a decoder mismatch fails before publishing instead of accepting missing appearance fields',()=>{
  assert.throws(()=>encodeStorageFriendlyVisualData({...codec,getFormattedValueFromUnformatted:()=>'{"lost":true}'},JSON.stringify(fixture.expected),null,fixture.maxLength,context),/changed appearance data/);
});
test('other codec contexts retain their original representation',()=>{
  assert.equal(encodeStorageFriendlyVisualData(codec,JSON.stringify(fixture.expected),null,fixture.maxLength,{...context,gameYear:26}),native);
});

const literal=text=>{const bytes=Buffer.from(text),header=Buffer.alloc(5);header[0]=11;header.writeUInt32LE(bytes.length,1);return Buffer.concat([header,bytes]);};
const byte=value=>Buffer.from([3,value]),signed=value=>Buffer.from([0,value&255]),double=value=>{const out=Buffer.alloc(9);out[0]=9;out.writeDoubleLE(value,1);return out;};
const pair=(key,value)=>Buffer.concat([Buffer.from([16]),typeof key==='string'?literal(key):Buffer.from([10,key,0]),value]);
const object=pairs=>Buffer.concat([Buffer.from([15]),...pairs,Buffer.from([19])]),array=values=>Buffer.concat([Buffer.from([14]),...values,Buffer.from([18])]),frame=value=>Buffer.concat([Buffer.from([13]),value,Buffer.from([17])]);
test('arrays, duplicate keys, literal/interned strings, prototype names and numeric bits are preserved',()=>{
  const items=array([byte(9),signed(-8),double(-0),object([pair('a',byte(1)),pair('z',double(.6000000000000001))])]);
  const input=frame(object([pair('a',byte(1)),pair('z',items),pair('a',byte(2)),pair('__proto__',literal('keep literal case')),pair(1,literal('last a'))]));
  const expected=frame(object([pair('z',array([byte(9),signed(-8),double(-0),object([pair('z',double(.6000000000000001)),pair('a',byte(1))])])),pair('a',byte(1)),pair('a',byte(2)),pair(1,literal('last a')),pair('__proto__',literal('keep literal case'))]));
  assert.deepEqual(reorderVisualIson(input,{1:'a'}),expected);
});
test('truncated, unknown and trailing ISON data are rejected without modifying input',()=>{
  for(const input of [ison.subarray(0,ison.length-1),Buffer.concat([ison,Buffer.from([0])]),Buffer.from([13,255,17]),frame(object([pair(99,byte(1))])),Buffer.from([13,11,255,255,255,255,17])]){
    const original=Buffer.from(input);assert.throws(()=>reorderVisualIson(input,{}));assert.deepEqual(input,original);
  }
});
