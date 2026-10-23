(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./rosterTalent.cjs'));else root.RosterBatch=factory(root.RosterTalent);})(globalThis,function(Talent){
  const dimensions={caliber:'roster-caliber',age:'roster-age',potential:'roster-potential',offense:'roster-offense',defense:'roster-defense',spending:'roster-talent-shares'};
  const defaultCaliberWeights=Object.freeze({startup:0,fcs:10,'building-blocks':30,competitive:30,contender:20,'blue-blood':10,'all-time':0});
  const pick=(values,rng)=>values[Math.min(values.length-1,Math.floor(rng()*values.length))];
  function weighted(weights,valid,rng){const entries=Object.entries(weights).filter(([id,weight])=>valid.includes(id)&&Number.isInteger(weight)&&weight>0),sum=entries.reduce((n,[,w])=>n+w,0);if(!sum)throw Error('Give at least one caliber a positive frequency.');let draw=rng()*sum;for(const [id,weight]of entries){draw-=weight;if(draw<0)return id;}return entries.at(-1)[0];}
  function build({teams,shared,existing={},presets,schemes,mode='identity',locks={},pools={},caliberWeights=defaultCaliberWeights,preserveExisting=true,countsFor=team=>team.positionCounts,rng=Math.random}){
    if(!['identity','variety','shuffle'].includes(mode))throw Error('Choose a batch generation approach.');
    const ids=presets.map(p=>p.id),allowed=side=>schemes.filter(s=>s.side===side).map(s=>s.enum),result={};
    for(const team of [...teams].sort((a,b)=>a.teamIndex-b.teamIndex)){
      if(preserveExisting&&existing[team.name]){result[team.name]=structuredClone(existing[team.name]);continue;}
      const values=structuredClone(shared);
      if(!locks.caliber){values['roster-caliber']=mode==='identity'&&Number.isFinite(team.averageOverall)?[...presets].sort((a,b)=>Math.abs(a.targetAverage-team.averageOverall)-Math.abs(b.targetAverage-team.averageOverall)||a.targetAverage-b.targetAverage)[0].id:mode==='variety'?weighted(caliberWeights,ids,rng):pick(ids,rng);}
      for(const [dimension,defaults]of [['age',['standard','youth','veteran','seniors']],['potential',['standard','dead-end','low','high','sky']]])if(!locks[dimension]){const choices=mode==='identity'?['standard']:pools[dimension]?.length?pools[dimension].filter(id=>defaults.includes(id)):defaults;if(!choices.length)throw Error('Select at least one '+dimension+' option.');values[dimensions[dimension]]=pick(choices,rng);}
      for(const side of ['offense','defense'])if(!locks[side]){const detected=team.schemes?.available&&team.schemes[side];values[dimensions[side]]=mode==='identity'&&detected?'auto':pick(allowed(side),rng);}
      if(!locks.spending){const choices=mode==='identity'?['balanced']:pools.spending?.length?pools.spending:Talent.spendingPresets.map(p=>p.id);values['roster-talent-mix']=pick(choices,rng);}
      const mix=values['roster-talent-mix']??values.batchSpending??(values['roster-talent-shares']?'custom':'balanced');values['roster-talent-mix']=mix;delete values.batchSpending;
      if(mix!=='custom'){const counts=countsFor(team,values);values['roster-talent-shares']=JSON.stringify(Talent.presetShares(counts,mix));values['roster-talent-counts']=JSON.stringify(Talent.groups.map(g=>counts[g]??0));}
      result[team.name]=values;
    }
    return result;
  }
  return {dimensions,defaultCaliberWeights,build};
});
