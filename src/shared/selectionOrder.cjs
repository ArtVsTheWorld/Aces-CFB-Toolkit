(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ToolkitSelectionOrder=factory();})(globalThis,function(){
  const positionOrder=['QB','HB','FB','WR','TE','OL','OT','LT','OG','LG','C','RG','RT','EDGE','LEDG','REDG','DT','LB','SAM','MIKE','WILL','CB','S','FS','SS','K/P','K','P'];
  const aliases={RB:'HB',LE:'LEDG',RE:'REDG',DE:'EDGE',LOLB:'SAM',MLB:'MIKE',ROLB:'WILL'};
  const position=value=>aliases[String(value).toUpperCase()]??String(value).toUpperCase();
  const alpha=(a,b)=>String(a).localeCompare(String(b),'en',{numeric:true,sensitivity:'base'});
  const positionCompare=(a,b)=>{const rank=v=>{const i=positionOrder.indexOf(position(v));return i<0?positionOrder.length:i;};return rank(a)-rank(b)||alpha(a,b);};
  const yearRank=value=>{const s=String(value).toLowerCase();return /fresh|\bfr\b/.test(s)?0:/soph|\bso\b/.test(s)?1:/junior|\bjr\b/.test(s)?2:/senior|\bsr\b/.test(s)?3:4;};
  const classCompare=(a,b)=>yearRank(a)-yearRank(b)||Number(/redshirt|\brs\b/i.test(a))-Number(/redshirt|\brs\b/i.test(b))||alpha(a,b);
  const orders={
    'roster-age':['youth','standard','veteran','seniors'], 'roster-potential':['dead-end','low','standard','high','sky'],
    'roster-caliber':['startup','fcs','building-blocks','competitive','contender','blue-blood','all-time'],
    'text-size':['standard','large','extra'],'theme-select':['light','dark'],
    'equipment-redshirt-group':['all','true','redshirt'],'equipment-donor-mode':['top','selected'],
    'force-involvement':['minimum','low','medium','high','protect','maximum'],
    'force-scope':['next','week','regular'],'force-clear-scope':['remaining','week','team'],
    'force-action':['evaluate','clear'],
    'history-mode':['','preview','apply'],'player-scope':['all','below-average','above-average'],
    'rating-mode':['all','nonphysical','physical','specific'],
    'selection-mode':['all','user','selected','none'],
    'unlocked-color-theme':['weighted','team','random','white','black','primary','secondary'],
    'undershirt-color':['weighted','custom','white','black','primary','secondary'],
    'roster-makeup':['preserve','scheme'],'roster-requirements-source':['saved','scheme'],
    'jersey-page':['locks','retired','traditions'],
    'redshirt':['Eligible','Current','Previous'],
    'body':['Thin','Lean','Standard','Muscular','Heavy'],
    'severity':['none','low','medium','high','extreme']
  };
  const label=item=>String(item.label??item.text??item.name??item.value??item),value=item=>String(item.value??item.id??item.name??item);
  function comparator(key,items){
    key=String(key??'').replace(/^(?:team-draft|draft)-\d+-/,'');
    const substantive=items.filter(item=>!sentinel(item)),values=substantive.map(value);
    if(/class|year/i.test(key)||substantive.length&&substantive.every(item=>/^(?:RS |Redshirt |True )?(?:Freshman|Sophomore|Junior|Senior)$/i.test(label(item))))return(a,b)=>sentinelCompare(a,b)||classCompare(label(a),label(b));
    if(/position|receiver/i.test(key)&&values.some(v=>positionOrder.includes(position(v)))||values.length&&values.every(v=>positionOrder.includes(position(v))))return(a,b)=>sentinelCompare(a,b)||positionCompare(value(a),value(b));
    let order=orders[key]??(key.startsWith('selection-mode-')?orders['selection-mode']:null);
    if(!order&&/redshirt/i.test(key))order=orders.redshirt;
    if(!order&&/bod(?:y|ies)/i.test(key))order=orders.body;
    if(!order&&/mismatch/i.test(key))order=orders.severity;
    if(!order&&/caliber/i.test(key))order=orders['roster-caliber'];
    if(!order&&/jersey-page/i.test(key))order=orders['jersey-page'];
    if(order){const rank=item=>{const n=order.indexOf(value(item));return n<0?order.length:n;};return(a,b)=>rank(a)-rank(b)||alpha(label(a),label(b));}
    if(/week/i.test(key))return(a,b)=>sentinelCompare(a,b)||(Number.isFinite(Number(value(a)))&&Number.isFinite(Number(value(b)))?Number(value(a))-Number(value(b)):alpha(label(a),label(b)));
    return(a,b)=>sentinelCompare(a,b)||alpha(label(a),label(b));
  }
  function sentinel(item){const v=value(item),s=label(item);return v===''||/^(?:all|any|none|auto|random|shuffle|default|custom)$/.test(v)||/^(?:All |Any |Choose |Select |Use Team|Team:|Toolkit Defaults|No Teams|Keep Current)/i.test(s);}
  function sentinelCompare(a,b){const rank=item=>{const v=value(item),s=label(item);return v===''?0:/^All |^all$/.test(s)||v==='all'?1:v==='auto'||/^Team:/.test(s)?2:v==='random'?3:v==='shuffle'?4:sentinel(item)?5:10;};return rank(a)-rank(b);}
  function sortChoices(key,items){return [...items].sort(comparator(key,items));}
  return {positionOrder,position,positionCompare,classCompare,comparator,sortChoices,alpha};
});
