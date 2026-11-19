// Replace only selected existing scalar tokens. Unknown JSON, including number
// spellings, whitespace and property order, stays byte-for-byte intact.
export function patchJsonScalars(text,updates){
 JSON.parse(text);let at=0;const spans=new Map();
 const ws=()=>{while(/\s/.test(text[at]??'')&&at<text.length)at++;};
 const string=()=>{const start=at++;while(at<text.length){if(text[at]==='\\'){at+=2;continue;}if(text[at++]==='"')return JSON.parse(text.slice(start,at));}throw Error('Unterminated JSON string.');};
 const walk=path=>{ws();const start=at;
  if(text[at]==='{'){at++;ws();const keys=new Set();if(text[at]!=='}')while(true){const key=string();if(keys.has(key))throw Error('Duplicate JSON properties are not safely editable.');keys.add(key);ws();if(text[at++]!==':')throw Error('Invalid JSON object.');walk([...path,key]);ws();if(text[at]!==',')break;at++;ws();}at++;return;}
  if(text[at]==='['){at++;ws();let index=0;if(text[at]!==']')while(true){walk([...path,index++]);ws();if(text[at]!==',')break;at++;}at++;return;}
  if(text[at]==='"')string();else{const token=/^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(at));if(!token)throw Error('Invalid JSON scalar.');at+=token[0].length;}
  spans.set(JSON.stringify(path),[start,at]);
 };walk([]);ws();if(at!==text.length)throw Error('Unexpected JSON data.');
 const changed=new Set(),patches=updates.map(({path,value})=>{const key=JSON.stringify(path),span=spans.get(key);if(!span||changed.has(key))throw Error('Requested JSON field is missing or repeated.');changed.add(key);if(value!==null&&!['string','number','boolean'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))throw Error('Unsupported JSON replacement.');return {start:span[0],end:span[1],value:JSON.stringify(value)};});
 let result=text;for(const p of patches.sort((a,b)=>b.start-a.start))result=result.slice(0,p.start)+p.value+result.slice(p.end);JSON.parse(result);return result;
}
