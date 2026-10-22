import zlib from 'node:zlib';
import {decodeRosterTdf} from './rosterTdf.js';
import {rosterChecksum} from './rosterChecksum.js';
const MAX_UNPACKED_SIZE=256*1024*1024;
const integer=value=>{if(typeof value!=='bigint'&&!Number.isSafeInteger(value))throw new Error('Invalid roster integer.');let n=BigInt(value),negative=n<0n;if(negative)n=-n;const out=[Number(n&63n)|(negative?64:0)];n>>=6n;while(n){out[out.length-1]|=128;out.push(Number(n&127n));n>>=7n;}return Buffer.from(out);};
export function encodeRosterTdf(document){
 const {value,types,rootTerminated}=document;
 const data=(value,location)=>{
  const schema=types.get(location);if(!schema)throw new Error(`No verified roster encoding for ${location}.`);const type=schema.type;
  if(type===0)return integer(value);
  if(type===1||type===2){if(type===1&&typeof value!=='string'||type===2&&!Buffer.isBuffer(value))throw new Error('Invalid roster string or blob.');const bytes=type===1?Buffer.from(value+'\0','utf8'):value;return Buffer.concat([integer(bytes.length),bytes]);}
  if(type===3)return fields(value,location,true);
  if(type===4){if(!Array.isArray(value))throw new Error('Invalid roster list.');return Buffer.concat([Buffer.from([schema.element]),integer(value.length),...value.map(item=>data(item,location+'[]'))]);}
  if(type===5){if(!Array.isArray(value))throw new Error('Invalid roster map.');return Buffer.concat([Buffer.from([schema.keyType,schema.valueType]),integer(value.length),...value.flatMap(pair=>[data(pair[0],location+'{key}'),data(pair[1],location+'{value}')])]);}
  if(type===6)return value===null?Buffer.from([127]):Buffer.concat([Buffer.from([value.active]),field(value.tag,value.value,location+'|'+value.active)]);
  if(type===10){if(!Number.isFinite(value))throw new Error('Invalid roster float.');const bytes=Buffer.alloc(4);bytes.writeFloatBE(value);return bytes;}
  throw new Error('Unsupported roster encoding type.');
 };
 const field=(tag,value,location)=>{if(!/^[A-Z0-9_]{1,4}$/.test(tag))throw new Error('Invalid roster field tag.');const key=location+'.'+tag,schema=types.get(key);if(!schema)throw new Error(`Roster field ${key} has no verified type.`);let packed=0;for(const char of tag.padEnd(4,' '))packed=(packed<<6)|(char.charCodeAt(0)-32);const header=Buffer.alloc(4);header.writeUIntBE(packed,0,3);header[3]=schema.type;return Buffer.concat([header,data(value,key)]);};
 const fields=(value,location,terminated)=>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid roster structure.');return Buffer.concat([...Object.keys(value).sort().map(tag=>field(tag,value[tag],location)),...(terminated?[Buffer.from([0])]:[])]);};
 return fields(value,'$',rootTerminated);
}
export function isRosterContainer(bytes){return Buffer.isBuffer(bytes)&&bytes.length>=74&&bytes.subarray(0,8).toString()==='FBCHUNKS'&&/^College-27-RL\d+(?:_\d+)?-\d+\0/.test(bytes.subarray(46,74).toString());}
export function unpackRosterContainer(bytes){
 if(!isRosterContainer(bytes))throw new Error('Not a supported CFB 27 roster file.');
 const declaredSize=bytes.readUInt32LE(0x12);
 if(declaredSize<=0||declaredSize>MAX_UNPACKED_SIZE)throw new Error('Roster header declares an invalid unpacked size. No file was changed.');
 const decoded=zlib.inflateSync(bytes.subarray(74),{maxOutputLength:MAX_UNPACKED_SIZE,info:true});
 if(decoded.buffer.length!==declaredSize)throw new Error('Roster header size does not match its unpacked data. No file was changed.');
 if(rosterChecksum(decoded.buffer)!==bytes.readUInt32LE(0x1a))throw new Error('Roster integrity checksum does not match its data. No file was changed.');
 const document=decodeRosterTdf(decoded.buffer,{typed:true});
 if(!encodeRosterTdf(document).equals(decoded.buffer))throw new Error('This roster uses an unsupported serialization variant. No file was changed.');
 return {bytes,document,unpacked:decoded.buffer,compressedLength:decoded.engine.bytesWritten};
}
export function packRosterContainer(container){
 const unpacked=encodeRosterTdf(container.document),compressed=zlib.deflateSync(unpacked,{level:9});
 if(unpacked.length>MAX_UNPACKED_SIZE)throw new Error('Generated roster exceeds the supported unpacked size. The original file was kept unchanged.');
 if(compressed.length>container.bytes.length-74)throw new Error('Generated roster exceeds the original file capacity. Select fewer teams. The original file was kept unchanged.');
 const result=Buffer.from(container.bytes);result.fill(0,74);compressed.copy(result,74);
 result.writeUInt32LE(unpacked.length,0x12);
 result.writeUInt32LE(rosterChecksum(unpacked),0x1a);
 const reopened=unpackRosterContainer(result);if(!reopened.unpacked.equals(unpacked))throw new Error('Roster container did not preserve the planned data.');return result;
}
