(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.EquipmentPoolMigration=value;})(globalThis,()=>{
  const idOf=item=>item.itemName??item.value;
  function migrate(value,definitions,defaultPercent=10){
    if(!value||typeof value!=='object'||Array.isArray(value)||(value._version!==undefined&&value._version!==2))return value;
    const result=structuredClone(value),legacy=!Object.hasOwn(value,'vanilla');
    const category=(origin,id)=>definitions[origin]?.find(c=>c.id===id);
    const effective=(origin,id,choice)=>({...choice,items:Object.hasOwn(choice,'items')?choice.items:category(origin,id)?.[origin==='unlocked'?'previousUnlockedDefaultItems':'previousVanillaDefaultItems']??category(origin,id)?.defaultItems??[]});
    function merge(origin,id,incoming){
      result[origin]??={};const old=result[origin][id];
      if(!old){result[origin][id]=incoming;return;}
      const existing=effective(origin,id,old);
      if(!Array.isArray(existing.items))return;
      if(!existing.items.length){result[origin][id]=incoming;return;}
      const additions=incoming.items.filter(id=>!existing.items.includes(id));
      if(!additions.length)return;
      const chance=existing.chance??category(origin,id)?.defaultChance??defaultPercent,other=incoming.chance??category(origin,id)?.defaultChance??defaultPercent;
      const combined={chance,items:[...existing.items,...additions]};
      if(chance!==other||existing.rollGroups||incoming.rollGroups){
        const first=existing.rollGroups??[{chance,items:existing.items}],second=incoming.rollGroups??[{chance:other,items:incoming.items}];
        combined.rollGroups=[...first,...second.map(g=>({...g,items:g.items.filter(id=>additions.includes(id))})).filter(g=>g.items.length)];
      }
      result[origin][id]=combined;
    }
    // The audited review mislabeled plain Scrunched/Tight turtlenecks.
    // Repair only displaced choices, including presets already marked version 2.
    if(value._version===2){
      const choice=value.unlocked?.neckwear,stock=category('vanilla','neckwear'),mod=category('unlocked','neckwear');
      if(choice&&typeof choice==='object'&&!Array.isArray(choice)){
        const source=Object.hasOwn(choice,'items')?choice.items:mod?.legacyDefaultItems;
        if(Array.isArray(source)){
          const stockIds=new Set((stock?.items??[]).map(idOf)),modIds=new Set((mod?.items??[]).map(idOf));
          const moved=source.filter(n=>stockIds.has(n)&&!modIds.has(n));
          const subset=items=>({...choice,items,...(choice.rollGroups?{rollGroups:choice.rollGroups.map(g=>({...g,items:g.items.filter(n=>items.includes(n))})).filter(g=>g.items.length)}:{})});
          if(!Object.hasOwn(result.vanilla??{},'neckwear')){
            result.vanilla??={};result.vanilla.neckwear=subset(moved);
          }else if(moved.length)merge('vanilla','neckwear',subset(moved));
          if(moved.length)result.unlocked.neckwear=subset(source.filter(n=>!moved.includes(n)));
        }
      }
      return result;
    }
    if(legacy&&value.unlocked&&typeof value.unlocked==='object'&&!Array.isArray(value.unlocked)){
      result.unlocked={};result.vanilla={};
      for(const[id,choice]of Object.entries(value.unlocked)){
        const mod=category('unlocked',id),stock=category('vanilla',id);
        if(!mod||!choice||typeof choice!=='object'||Array.isArray(choice)){result.unlocked[id]=choice;continue;}
        const items=Object.hasOwn(choice,'items')?choice.items:mod.legacyDefaultItems;
        if(!Array.isArray(items)){result.unlocked[id]=choice;continue;}
        const stockIds=new Set((stock?.items??[]).filter(i=>!i.replacedByUnlocked).map(idOf));
        const a={...choice,items:items.filter(n=>stockIds.has(n))},b={...choice,items:items.filter(n=>!stockIds.has(n))};
        if(stock)result.vanilla[id]=a;result.unlocked[id]=b;
      }
    }else if(result.vanilla&&typeof result.vanilla==='object'&&!Array.isArray(result.vanilla)){
      // Repair the unpublished first split. Known shared base/replacement IDs
      // retain base choices and copy their former mod-style choices to Unlocked.
      for(let[id,choice]of Object.entries(value.vanilla)){
        if(!choice||typeof choice!=='object'||Array.isArray(choice))continue;
        const source=Object.hasOwn(choice,'items')?choice.items:category('unlocked',id)?.previousVanillaDefaultItems??category('vanilla',id)?.defaultItems;
        if(!Array.isArray(source))continue;
        const originalChoice=choice;choice={...choice,items:source};
        const stock=category('vanilla',id),mod=category('unlocked',id);
        const stockIds=new Set((stock?.items??[]).map(idOf)),modIds=new Set((mod?.items??[]).map(idOf));
        const moved=choice.items.filter(n=>modIds.has(n)&&(!stockIds.has(n)||stock.items.find(i=>idOf(i)===n)?.replacedByUnlocked));
        if(moved.length)merge('unlocked',id,{...choice,items:moved,...(choice.rollGroups?{rollGroups:choice.rollGroups.map(g=>({...g,items:g.items.filter(n=>moved.includes(n))})).filter(g=>g.items.length)}:{})});
        if(stock)result.vanilla[id]={...choice,items:choice.items.filter(n=>stockIds.has(n)||!modIds.has(n))};
        else if(mod&&choice.items.every(n=>modIds.has(n)))delete result.vanilla[id];
      }
    }
    result._version=2;return result;
  }
  return {migrate};
});
