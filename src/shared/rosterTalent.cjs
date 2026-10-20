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
    return {...shares,[group]:Math.max(minimumShare(group,counts),Math.min(100,Math.round(value)))};
  }
  function minimumShare(group,counts){return group==='K/P'&&counts?.[group]>0?baseline(counts)[group]:0;}
  function allocationError(shares,counts){
    if(shares===null||shares===undefined)return '';
    if(!shares||typeof shares!=='object'||Array.isArray(shares)||Object.keys(shares).some(group=>!groups.includes(group))||Object.values(shares).some(value=>!Number.isInteger(value)||value<0||value>100))return 'Talent shares must use whole percentages from 0 to 100.';
    if(counts?.['K/P']>0&&(shares['K/P']??0)<minimumShare('K/P',counts))return 'Keep the specialist minimum, or Normalize to 100% to rebalance this mix.';
    return Object.values(shares).reduce((sum,value)=>sum+value,0)===100?'':'Talent shares must total exactly 100%.';
  }
  function fromLegacy(counts,strength){
    const base=baseline(counts),scale=Object.values(counts).reduce((a,b)=>a+b,0)*.12;
    const weights=Object.fromEntries(groups.filter(group=>counts[group]>0).map(group=>[group,Math.max(0,base[group]+(strength[group]??0)*counts[group]*importance[group]/scale)]));
    return {...Object.fromEntries(groups.map(group=>[group,0])),...apportion(weights,100)};
  }
  function resolvedShares(counts,shares){
    const present=groups.filter(group=>counts[group]>0),empty=Object.fromEntries(groups.map(group=>[group,0]));
    if(!shares||!present.some(group=>shares[group]>0))return baseline(counts);
    let result={...empty,...apportion(Object.fromEntries(present.map(group=>[group,shares[group]??0])),100)};
    const floor=minimumShare('K/P',counts);
    if(result['K/P']<floor){const others=present.filter(group=>group!=='K/P');result={...empty,...apportion(Object.fromEntries(others.map(group=>[group,shares[group]??0])),100-floor),'K/P':floor};}
    return result;
  }
  const spendingPresets=Object.freeze([{id:'balanced',name:'Balanced Roster'},{id:'offense',name:'Light Up the Scoreboard'},{id:'defense',name:'Lockdown Defense'},{id:'playmakers',name:'Open-Field Playmakers'},{id:'trenches',name:'Win the Trenches'}]);
  function presetShares(counts,id){
    if(!spendingPresets.some(preset=>preset.id===id))throw Error('Choose a supported talent budget preset.');
    const base=baseline(counts);if(id==='balanced')return base;
    const offense=new Set(['QB','HB','FB','WR','TE','OL']),playmakers=new Set(['HB','WR','TE','CB','FS','SS']),trenches=new Set(['OL','EDGE','DT']);
    const factor=group=>id==='offense'?(offense.has(group)?1.55:.65):id==='defense'?(offense.has(group)?.65:1.55):id==='playmakers'?(playmakers.has(group)?1.8:.75):(trenches.has(group)?1.8:.75);
    const floor=minimumShare('K/P',counts),present=groups.filter(group=>counts[group]>0&&group!=='K/P');
    return {...Object.fromEntries(groups.map(group=>[group,0])),...apportion(Object.fromEntries(present.map(group=>[group,base[group]*factor(group)])),100-floor),'K/P':floor};
  }
  function randomShares(counts,rng=Math.random){
    const base=baseline(counts),floor=minimumShare('K/P',counts),present=groups.filter(group=>counts[group]>0&&group!=='K/P');
    if(!present.length)return base;
    // Perturb baseline spending, rather than rewarding tiny rooms with huge
    // shares. Keep specialist protection and whole-number 100% validation.
    const weights=Object.fromEntries(present.map(group=>[group,base[group]*(.4+rng()*1.6)]));
    return {...Object.fromEntries(groups.map(group=>[group,0])),...apportion(weights,100-floor),'K/P':floor};
  }
  function targets(counts,average,shares){
    const base=baseline(counts),present=groups.filter(group=>counts[group]>0),total=Object.values(counts).reduce((a,b)=>a+b,0),scale=total*.12;
    const effective=resolvedShares(counts,shares);
    // Premium talent has diminishing returns: buying the next few OVR points
    // costs increasingly more, on top of position importance and room size.
    const raw=Object.fromEntries(present.map(group=>{const gain=(effective[group]-base[group])*scale/(counts[group]*importance[group]);return [group,average+(gain>0?12*(Math.sqrt(1+gain/6)-1):gain)];}));
    let low=-1000,high=1000;
    const value=(group,offset)=>Math.max(30,Math.min(99,raw[group]-offset));
    for(let i=0;i<70;i++){const offset=(low+high)/2,mean=present.reduce((sum,group)=>sum+counts[group]*value(group,offset),0)/total;if(mean>average)low=offset;else high=offset;}
    return Object.fromEntries(present.map(group=>[group,value(group,(low+high)/2)]));
  }
  return Object.freeze({importance,groups,baseline,redistribute,editShare,minimumShare,allocationError,targets,fromLegacy,resolvedShares,spendingPresets,presetShares,randomShares});
});
