(function(root){
 const positions={QB:['QB'],HB:['HB'],FB:['FB'],WR:['WR'],TE:['TE'],OL:['LT','LG','C','RG','RT'],EDGE:['LE','RE'],DT:['DT'],MIKE:['MLB','LB'],SAM:['LOLB'],WILL:['ROLB'],CB:['CB'],FS:['FS'],SS:['SS','SAFETY'],K:['K'],P:['P']};
 const groups=Object.keys(positions),label=g=>g;
 const groupFor=p=>({MLB:'MIKE',LB:'MIKE',LOLB:'SAM',ROLB:'WILL',SAFETY:'SS',LE:'EDGE',RE:'EDGE',LT:'OL',LG:'OL',C:'OL',RG:'OL',RT:'OL'})[p]??p;
 function normalize(value){if(value==null)return{};if(typeof value!=='object'||Array.isArray(value))throw Error('Choose valid donor sources.');const result={};for(const[g,sources]of Object.entries(value)){if(!groups.includes(g)||!Array.isArray(sources)||sources.some(s=>!groups.includes(s)))throw Error('Choose valid donor positions.');result[g]=[...new Set(sources)];}return result;}
 const expand=values=>[...new Set(values.flatMap(g=>positions[g]))];
 function defaults(group,legacy={},crossPercent=10){
   if(Number(crossPercent)===0)return[group];
   const old=['MIKE','SAM','WILL'].includes(group)?'LB':['FS','SS'].includes(group)?'S':group;
   const base=old==='LB'?['SAM','MIKE','WILL']:['K','P'].includes(group)?['K','P']:['CB','FS','SS'].includes(group)?['CB','FS','SS']:['DT','EDGE'].includes(group)?['DT','EDGE']:[group];
   return [...new Set([...base,...(legacy[old]??[]).flatMap(g=>g==='LB'?['SAM','MIKE','WILL']:g==='S'?['FS','SS']:[g])])];
 }
 const api={groups,positions,label,groupFor,normalize,expand,defaults};if(typeof module==='object'&&module.exports)module.exports=api;else root.ToolkitDonorSources=api;
})(typeof globalThis!=='undefined'?globalThis:this);
