// Preserve the eager filter's order and exact random draws. Failed rolls only
// need proof that one legal item exists; successful rolls check the full pool.
export function rollCompatibleItem(pool,isCompatible,random,chance){
  const first=pool.findIndex(item=>isCompatible(item));
  if(first<0||random()>=chance)return undefined;
  const available=[pool[first]];
  for(let index=first+1;index<pool.length;index++)if(isCompatible(pool[index]))available.push(pool[index]);
  return available[Math.floor(random()*available.length)];
}

// Rare migrated presets may have kept different chances for two sets of items
// that now share one category. Roll those sets fairly, then apply one winner.
export function rollConfiguredItem(pool,isCompatible,random,chance,choice){
  if(!choice?.rollGroups)return rollCompatibleItem(pool,isCompatible,random,chance);
  const selected=new Set(choice.items),winners=[];
  for(const group of choice.rollGroups){const ids=new Set(group.items.filter(id=>selected.has(id))),item=rollCompatibleItem(pool.filter(i=>ids.has(i.itemName)),isCompatible,random,group.chance/100);if(item)winners.push(item);}
  return winners.length===1?winners[0]:winners.length?winners[Math.floor(random()*winners.length)]:undefined;
}
