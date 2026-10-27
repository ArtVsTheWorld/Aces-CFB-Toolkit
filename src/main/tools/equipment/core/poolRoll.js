// Preserve the eager filter's order and exact random draws. Failed rolls only
// need proof that one legal item exists; successful rolls check the full pool.
export function rollCompatibleItem(pool,isCompatible,random,chance){
  const first=pool.findIndex(item=>isCompatible(item));
  if(first<0||random()>=chance)return undefined;
  const available=[pool[first]];
  for(let index=first+1;index<pool.length;index++)if(isCompatible(pool[index]))available.push(pool[index]);
  return available[Math.floor(random()*available.length)];
}
