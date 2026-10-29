(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.NoDrip=value;})(globalThis,()=>{
  const rows=[['QB','QB','offense',1],['HB','HB','offense',1],['FB','FB','offense',15],['WR','WR','offense',1],['TE','TE','offense',10],['LT','LT','offense',75],['LG','LG','offense',80],['C','C','offense',80],['RG','RG','offense',80],['RT','RT','offense',75],['LE','LEDGE','defense',25],['RE','REDGE','defense',25],['DT','DT','defense',40],['LOLB','SAM','defense',15],['MLB','MIKE','defense',10],['ROLB','WILL','defense',15],['CB','CB','defense',1],['FS','FS','defense',1],['SS','SS','defense',1],['K','K','special',50],['P','P','special',50]].map(([position,label,section,chance])=>Object.freeze({position,label,section,chance}));
  const defaults=Object.freeze(Object.fromEntries(rows.map(row=>[row.position,row.chance]))),legacy={skill:['WR','CB','FS','SS'],balanced:['HB','TE','QB','LOLB','MLB','ROLB'],heavy:['LT','LG','C','RG','RT','LE','RE','DT','FB','K','P']},oldDefaults={skill:1,balanced:3,heavy:6};
  const aliases={RB:['HB'],OL:['LT','LG','C','RG','RT'],DL:['LE','RE','DT'],EDGE:['LE','RE'],LEDGE:['LE'],REDGE:['RE'],LB:['LOLB','MLB','ROLB'],SAM:['LOLB'],MIKE:['MLB'],WILL:['ROLB'],S:['FS','SS'],SAFETY:['FS','SS'],'K/P':['K','P']};
  function normalize(value={}){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid No Drip position chances.');
    const keys=Object.keys(value),allowed=new Set([...Object.keys(defaults),...Object.keys(legacy),...Object.keys(aliases)]);
    for(const key of keys)if(!allowed.has(key)||value[key]===''||!Number.isInteger(Number(value[key]))||Number(value[key])<0||Number(value[key])>100)throw Error('No Drip chance must be a whole percentage from 0 through 100 for a supported position.');
    const result={...defaults};
    if(keys.some(key=>key in legacy))for(const [group,positions]of Object.entries(legacy))for(const position of positions)result[position]=Number(value[group]??oldDefaults[group]);
    for(const [key,positions]of Object.entries(aliases))if(Object.hasOwn(value,key))for(const position of positions)result[position]=Number(value[key]);
    for(const position of Object.keys(defaults))if(Object.hasOwn(value,position))result[position]=Number(value[position]);
    return result;
  }
  const chance=(position,value)=>{const key=String(position??'').toUpperCase(),actual=Object.hasOwn(defaults,key)?key:aliases[key]?.[0];return actual?normalize(value)[actual]/100:0;};
  function migrateSettings(values){
    const groups=Object.fromEntries(Object.keys(legacy).filter(key=>Object.hasOwn(values,'equipment-no-drip-'+key)).map(key=>[key,values['equipment-no-drip-'+key]]));
    if(Object.keys(groups).length){const expanded=normalize(groups);for(const [position,value]of Object.entries(expanded))values['equipment-no-drip-'+position]??=String(value);for(const key of Object.keys(groups))delete values['equipment-no-drip-'+key];}
    return values;
  }
  return Object.freeze({rows:Object.freeze(rows),defaults,normalize,chance,migrateSettings});
});
