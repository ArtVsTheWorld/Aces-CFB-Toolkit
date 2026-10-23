(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RosterComposition=factory();})(globalThis,function(){
  const positions=['QB','HB','FB','WR','TE','LT','LG','C','RG','RT','LE','RE','DT','LOLB','MLB','ROLB','CB','FS','SS','K','P'];
  function counts(size,requirements){
    if(!Number.isInteger(size)||size<1||size>200)throw Error('Unsupported roster size.');
    const rows=positions.map((position,index)=>{const entry=requirements[position]??{idealOnRoster:position==='K'||position==='P'?2:0,minimum:position==='K'||position==='P'?1:0};const minimum=Number(entry.minimum),ideal=Number(entry.idealOnRoster);if(!Number.isInteger(minimum)||!Number.isInteger(ideal)||minimum<0||ideal<minimum||ideal>85)throw Error('Invalid native roster requirements for '+position);return {position,index,minimum,ideal,weight:Math.max(0,ideal-minimum)};});
    const minimum=rows.reduce((sum,row)=>sum+row.minimum,0);if(minimum>size)throw Error('This roster is too small to satisfy the scheme’s positional minimums.');
    const available=size-minimum,total=rows.reduce((sum,row)=>sum+row.weight,0);if(!total)throw Error('The selected requirements have no usable roster distribution.');
    for(const row of rows){row.exact=available*row.weight/total;row.extra=Math.floor(row.exact);}
    let remaining=available-rows.reduce((sum,row)=>sum+row.extra,0);
    for(const row of [...rows].sort((a,b)=>(b.exact-b.extra)-(a.exact-a.extra)||a.index-b.index)){if(remaining-->0)row.extra++;}
    return Object.fromEntries(rows.map(row=>[row.position,row.minimum+row.extra]));
  }
  return {positions,counts};
});
