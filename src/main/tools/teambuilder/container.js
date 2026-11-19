import zlib from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {decodeRosterTdf} from '../equipment/rosterTdf.js';
import {encodeRosterTdf} from '../equipment/rosterCodec.js';

// Research profile verified against nine local CFB 27 TeamBuilder files.
// Container support does not imply in-game acceptance of edited fields.
export const TEAMBUILDER_PROFILE=Object.freeze({version:1,headerLength:17932,payloadOffset:17950,maxUnpacked:64*1024*1024});
export const HEADER_FIELDS=Object.freeze({compactName:[264,64],assetName:[328,64],name:[392,64],nickname:[456,64],pipelines:[542,4096],records:[4638,8192],topPlayers:[12830,1024],rivals:[13854,4096]});
export function namedMap(value,label){
 if(!Array.isArray(value)||value.some(pair=>!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string')||new Set(value.map(pair=>pair[0])).size!==value.length)throw Error(`Unsupported ${label} map. No file was changed.`);
 return new Map(value);
}
export function headerText(bytes,key){const [start,length]=HEADER_FIELDS[key],field=bytes.subarray(start,start+length),end=field.indexOf(0);if(end<0||!field.subarray(end).every(n=>n===0))throw Error(`Unsupported TeamBuilder ${key} header field.`);const text=field.subarray(0,end).toString('utf8');if(!Buffer.from(text).equals(field.subarray(0,end)))throw Error('Invalid TeamBuilder header text.');return text;}
export function setHeaderText(bytes,key,value){const [start,length]=HEADER_FIELDS[key],text=Buffer.from(value,'utf8');if(text.length>=length||value.includes('\0'))throw Error(`${key} exceeds its ${length-1}-byte header limit.`);bytes.fill(0,start,start+length);text.copy(bytes,start);}
export function unpackTeamBuilder(bytes){
 const p=TEAMBUILDER_PROFILE;
 if(!Buffer.isBuffer(bytes)||bytes.length<=p.payloadOffset||bytes.subarray(0,8).toString()!=='FBCHUNKS'||bytes.readUInt16LE(8)!==p.version||bytes.readUInt32LE(10)!==p.headerLength)throw Error('Unsupported TeamBuilder container. No file was changed.');
 const capacity=bytes.readUInt32LE(14);
 if(capacity!==bytes.length-p.payloadOffset||bytes.readUInt32LE(62)!==capacity||!bytes.subarray(18,62).every(n=>n===0))throw Error('Unsupported TeamBuilder lengths or integrity metadata. No file was changed.');
 const inflated=zlib.inflateSync(bytes.subarray(p.payloadOffset),{info:true,maxOutputLength:p.maxUnpacked});
 if(!bytes.subarray(p.payloadOffset+inflated.engine.bytesWritten).every(n=>n===0))throw Error('Unknown data follows the TeamBuilder stream. No file was changed.');
 const document=decodeRosterTdf(inflated.buffer,{typed:true});
 if(!encodeRosterTdf(document).equals(inflated.buffer))throw Error('Unsupported TeamBuilder serialization variant.');
 if(!isDeepStrictEqual(Object.keys(document.value),['DMAP','TDAT','TMDA']))throw Error('Unknown TeamBuilder root structure.');
 const team=namedMap(document.value.TDAT?.TINF,'team information'),metadata=namedMap(document.value.TMDA,'metadata');
 for(const [key]of Object.entries(HEADER_FIELDS))headerText(bytes,key);
 const discrepancies=[];
 for(const [a,b]of [['teamDisplayName','TEAM_NAME'],['teamNickname','TEAM_NICKNAME'],['yearFounded','YEAR_FOUNDED'],['mySchoolTemplateId','MY_SCHOOL_TEMPLATE_ID'],['pipelines','DYNASTY_PIPELINE_INFO'],['rivals','RIVALRY_INFO'],['teamRecords','RECORD_DETAILS']])if(metadata.get(a)!==team.get(b))discrepancies.push({field:a,metadata:metadata.get(a),team:team.get(b)});
 for(const [key,m]of [['name','teamDisplayName'],['nickname','teamNickname'],['pipelines','pipelines'],['records','teamRecords'],['rivals','rivals']])if(headerText(bytes,key)!==metadata.get(m))discrepancies.push({field:key,header:headerText(bytes,key),metadata:metadata.get(m)});
 if(String(bytes.readUInt32LE(530))!==metadata.get('yearFounded'))discrepancies.push({field:'yearFounded',header:bytes.readUInt32LE(530),metadata:metadata.get('yearFounded')});
 if(String(bytes.readUInt32LE(538))!==metadata.get('mySchoolTemplateId'))discrepancies.push({field:'mySchoolTemplateId',header:bytes.readUInt32LE(538),metadata:metadata.get('mySchoolTemplateId')});
 return {bytes:Buffer.from(bytes),document,unpacked:inflated.buffer,compressedLength:inflated.engine.bytesWritten,capacity,discrepancies};
}
export function packTeamBuilder(container,document=container.document,header=container.bytes.subarray(0,TEAMBUILDER_PROFILE.payloadOffset),{forceRepack=false}={}){
 const unpacked=encodeRosterTdf(document),offset=TEAMBUILDER_PROFILE.payloadOffset;
 if(unpacked.length>TEAMBUILDER_PROFILE.maxUnpacked||header.length!==offset)throw Error('TeamBuilder candidate exceeds supported limits.');
 if(!forceRepack&&unpacked.equals(container.unpacked)&&header.equals(container.bytes.subarray(0,offset)))return Buffer.from(container.bytes);
 const compressed=zlib.deflateSync(unpacked,{level:9});
 if(compressed.length>container.capacity)throw Error('Updated TeamBuilder data will not fit its original file capacity.');
 const candidate=Buffer.from(container.bytes);header.copy(candidate);candidate.fill(0,offset);compressed.copy(candidate,offset);
 const reopened=unpackTeamBuilder(candidate);
 if(!reopened.unpacked.equals(unpacked)||!isDeepStrictEqual(reopened.document.value,document.value)||!candidate.subarray(0,offset).equals(header))throw Error('TeamBuilder candidate failed full verification.');
 return candidate;
}
