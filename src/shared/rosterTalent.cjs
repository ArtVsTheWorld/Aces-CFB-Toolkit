/* One implementation for the browser editor and generation budget. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RosterTalent=factory();})(globalThis,function(){
  const importance=Object.freeze({QB:6,EDGE:3,OL:2.6,CB:2.2,WR:2,DT:1.8,LB:1.6,HB:1.4,SS:1.2,FS:1.1,TE:1,'K/P':.55,FB:.25});
  const groups=Object.keys(importance);
  function apportion(weights,total){
    const sum=Object.values(weights).reduce((a,b)=>a+b,0),rows=Object.entries(weights).map(([key,weight],index)=>({key,index,raw:sum?weight*total/sum:total/Object.keys(weights).length}));
    rows.forEach(row=>row.value=Math.floor(row.raw));let left=total-rows.reduce((n,row)=>n+row.value,0);
    for(const row of [...rows].sort((a,b)=>(b.raw-b.value)-(a.raw-a.value)||a.index-b.index)){if(left-->0)row.value++;}
    return Object.fromEntries(rows.map(row=>[row.key,row.value]));
  }
  function baseline(counts){
    const present=groups.filter(group=>counts[group]>0),weights=Object.fromEntries(present.map(group=>[group,counts[group]*importance[group]]));
    const divided=apportion(weights,100-present.length);
    return Object.fromEntries(groups.map(group=>[group,present.includes(group)?1+divided[group]:0]));
  }
  function redistribute(shares,group,value,counts,locked=[]){
    const present=groups.filter(key=>counts[key]>0);if(!present.includes(group))return {...shares};
    const fixed=present.filter(key=>key!==group&&locked.includes(key)),fixedTotal=fixed.reduce((sum,key)=>sum+(shares[key]??0),0),others=present.filter(key=>key!==group&&!locked.includes(key)),remaining=100-fixedTotal;
    value=others.length?Math.max(0,Math.min(remaining,Math.round(value))):remaining;
    const defaults=baseline(counts),weights=Object.fromEntries(others.map(key=>[key,Math.max(0,shares[key]??0)]));
    if(!Object.values(weights).some(Boolean))others.forEach(key=>weights[key]=defaults[key]);
    return {...Object.fromEntries(groups.map(key=>[key,0])),...Object.fromEntries(fixed.map(key=>[key,shares[key]])),...apportion(weights,remaining-value),[group]:value};
  }
  function editShare(shares,group,value,counts){
    if(!groups.includes(group)||!(counts[group]>0))return {...shares};
    return {...shares,[group]:Math.max(0,Math.min(100,Math.round(value)))};
  }
  function allocationError(shares){
    if(shares===null||shares===undefined)return '';
    if(!shares||typeof shares!=='object'||Array.isArray(shares)||Object.keys(shares).some(group=>!groups.includes(group))||Object.values(shares).some(value=>!Number.isInteger(value)||value<0||value>100))return 'Talent shares must use whole percentages from 0 to 100.';
    return Object.values(shares).reduce((sum,value)=>sum+value,0)===100?'':'Talent shares must total exactly 100%.';
  }
  function fromLegacy(counts,strength){
    const base=baseline(counts),scale=Object.values(counts).reduce((a,b)=>a+b,0)*.12;
    const weights=Object.fromEntries(groups.filter(group=>counts[group]>0).map(group=>[group,Math.max(0,base[group]+(strength[group]??0)*counts[group]*importance[group]/scale)]));
    return {...Object.fromEntries(groups.map(group=>[group,0])),...apportion(weights,100)};
  }
  function resolvedShares(counts,shares){const present=groups.filter(group=>counts[group]>0);return shares&&present.some(group=>shares[group]>0)?{...Object.fromEntries(groups.map(group=>[group,0])),...apportion(Object.fromEntries(present.map(group=>[group,shares[group]??0])),100)}:baseline(counts);}
  function targets(counts,average,shares){
    const base=baseline(counts),present=groups.filter(group=>counts[group]>0),total=Object.values(counts).reduce((a,b)=>a+b,0),scale=total*.12;
    const effective=resolvedShares(counts,shares);
    const raw=Object.fromEntries(present.map(group=>[group,average+(effective[group]-base[group])*scale/(counts[group]*importance[group])]));
    let low=-1000,high=1000;
    const value=(group,offset)=>Math.max(30,Math.min(99,raw[group]-offset));
    for(let i=0;i<70;i++){const offset=(low+high)/2,mean=present.reduce((sum,group)=>sum+counts[group]*value(group,offset),0)/total;if(mean>average)low=offset;else high=offset;}
    return Object.fromEntries(present.map(group=>[group,value(group,(low+high)/2)]));
  }
  return Object.freeze({importance,groups,baseline,redistribute,editShare,allocationError,targets,fromLegacy,resolvedShares});
});
