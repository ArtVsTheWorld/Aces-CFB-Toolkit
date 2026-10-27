(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ToolkitPreviewPages=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const PAGE_SIZE=100,FIELDS=['team','position','classYear'];
  // Commentary has a separate decision/review flow rather than a cached plan.
  // Force Win similarly keeps its schedule decision controls intact.
  const KINDS=new Set(['equipment-quickstart','freshman-equipment','equipment-patcher','equipment-mapper','jersey-renumber','jersey-no-duplicates','team-boost','roster-generator','dealbreaker-fixer','long-snap','nil-toggle','white-helmet-fix']);
  const supports=kind=>KINDS.has(kind);
  function compare(a,b){return String(a.team??'').localeCompare(String(b.team??''))||String(a.player??'').localeCompare(String(b.player??''))||String(a.position??'').localeCompare(String(b.position??''))||String(a.type??'').localeCompare(String(b.type??''));}
  function createIndex(rows){return {rows:[...rows].map((row,index)=>({row,index})).sort((a,b)=>compare(a.row,b.row)||a.index-b.index).map(item=>item.row),text:new Map(),key:null,matches:null};}
  function page(index,{query='',filters={},page=0,size=PAGE_SIZE}={}){
    const needle=String(query??'').trim().toLowerCase(),selected=FIELDS.map(field=>String(filters?.[field]??'').trim()),key=JSON.stringify([needle,...selected]);
    if(index.key!==key){
      index.matches=index.rows.filter(row=>{
        if(!FIELDS.every((field,i)=>!selected[i]||String(row?.[field]??'').trim()===selected[i]))return false;
        if(!needle)return true;
        if(!index.text.has(row))index.text.set(row,JSON.stringify(row).toLowerCase());
        return index.text.get(row).includes(needle);
      });index.key=key;
    }
    const total=index.matches.length,length=Math.max(1,Math.min(1000,Math.trunc(Number(size))||PAGE_SIZE)),pages=Math.max(1,Math.ceil(total/length)),number=Math.max(0,Math.min(pages-1,Math.trunc(Number(page))||0)),start=number*length;
    return {changes:index.matches.slice(start,start+length),totalMatches:total,totalPreviewRows:index.rows.length,previewPage:{index:number,size:length,pages,total,start:total?start+1:0,end:Math.min(total,start+length)}};
  }
  return {PAGE_SIZE,FIELDS,supports,createIndex,page};
});
