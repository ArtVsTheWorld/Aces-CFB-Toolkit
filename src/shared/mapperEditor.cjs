(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.MapperEditor=value;})(globalThis,()=>{
  const empty=item=>Boolean(item)&&(/(?:^|_)None$/i.test(item.asset)||item.asset==='FaceGear_BalaclavaNone');
  const protectedRemovalSlots=Object.freeze(['HeadWear','FaceMask','LeftShoe','RightShoe','LeftShoeOverride','RightShoeOverride','InnerSocks','OuterPants','OuterShirt']);
  const removalAllowed=slot=>!protectedRemovalSlots.includes(slot);
  const removalRestriction='Helmets, facemasks, cleats, socks, pants and jersey styles cannot be removed.';
  const categoryOf=item=>/turtleneck/i.test(item.name)?'Turtlenecks':item.category;
  const categoryName=category=>'All '+(({Undershirt:'Undershirts',Mouthpiece:'Mouthpieces',Visor:'Visors',Towel:'Towels',Handwarmer:'Handwarmers',Facemask:'Facemasks','Helmet Model':'Helmet Models','Jersey Style':'Jersey Styles','Back Plate':'Back Plates','Chin Cover':'Chin Covers','Flak Jacket':'Flak Jackets','Guardian Cap':'Guardian Caps','Neck Pad':'Neck Pads','Knee Brace':'Knee Braces','Waist Playcall Band':'Waist Playcall Bands',Tattoo:'Tattoos'})[category]??category);
  const categoryCache=new WeakMap();
  function withCategories(items){
    if(categoryCache.has(items))return categoryCache.get(items);
    const sets=new Map();
    for(const item of items){
      if(item.categorySelection||!item.catalog||item.copyable===false||empty(item))continue;
      const category=categoryOf(item),key=category+'|'+item.slot;
      if(!sets.has(key))sets.set(key,{category,slot:item.slot,members:[]});
      sets.get(key).members.push(item);
    }
    const result=[...items,...[...sets.values()].map(({category,slot,members})=>({id:'category:'+encodeURIComponent(category)+':'+slot,name:categoryName(category),category,slot,side:/^(Left|Right)/.exec(slot)?.[1]??'Center',catalog:true,categorySelection:true,copyable:true,memberIds:members.map(i=>i.id),memberAssets:[...new Set(members.map(i=>i.asset))]}))];
    categoryCache.set(items,result);categoryCache.set(result,result);return result;
  }
  const pairedSlot=slot=>({LeftHandWear:'RightHandWear',RightHandWear:'LeftHandWear',LeftShoe:'RightShoe',RightShoe:'LeftShoe',LeftArmWear:'RightArmWear',RightArmWear:'LeftArmWear'})[slot]??null;
  const removalIndexes=new WeakMap(),removalSets=new WeakMap();
  function removeReplacement(source,items,removableAssets){
    if(!removalIndexes.has(items)){
      const slots=new Map();for(const item of items)if(!item.categorySelection&&item.copyable!==false&&empty(item)){if(!slots.has(item.slot))slots.set(item.slot,[]);slots.get(item.slot).push(item);}
      removalIndexes.set(items,{byId:new Map(items.map(i=>[i.id,i])),slots});
    }
    const {byId,slots}=removalIndexes.get(items);
    if(!removalSets.has(removableAssets))removalSets.set(removableAssets,new Set(removableAssets));
    if(source?.categorySelection){
      const members=source.memberIds.map(id=>byId.get(id));
      const replacements=members.map(item=>removeReplacement(item,items,removableAssets));
      return replacements.length&&replacements.every(Boolean)?replacements[0]:null;
    }
    if(!source||!removalSets.get(removableAssets).has(source.asset)||!removalAllowed(source.slot))return null;
    const choices=slots.get(source.slot)??[];
    const preferred={InnerShirt:'Undershirt_None',InnerPants:'BottomBase_None',NeckWear:'NeckWear_None',Neckpad:'GearNeckpad_None',FaceWear:'FaceGear_BalaclavaNone',LeftArmTattoo:'ArmTattoo_None',RightArmTattoo:'ArmTattoo_None',LeftLegTattoo:'LegTattoo_None',RightLegTattoo:'LegTattoo_None'}[source.slot];
    return choices.find(item=>item.asset===preferred)??choices[0]??null;
  }
  function actionOf(rule,items,removableAssets=[]){
    if(rule.action==='copy')return 'assign';
    const source=items.find(item=>item.id===rule.sourceId),replacement=items.find(item=>item.id===rule.replacementId);
    return empty(replacement)&&removeReplacement(source,items,removableAssets)?'remove':'replace';
  }
  function withFrequency(original,edited,value,fill){
    const legacy=original.frequency===undefined;
    return legacy&&!edited?{...(original.replacementCap!==undefined?{replacementCap:original.replacementCap}:{}),...(original.fillToFrequency!==undefined?{fillToFrequency:original.fillToFrequency}:{})}:{frequency:value,fillToFrequency:fill};
  }
  function describe(rule,items){
    items=withCategories(items);
    const get=id=>items.find(item=>item.id===id),source=get(rule.sourceId),replacement=get(rule.replacementId),wearing=get(rule.wearingItemId);
    const operation=rule.action==='copy'?`Assign ${replacement?.name??'unavailable item'}`:empty(replacement)?`Remove ${source?.name??'unavailable item'}`:`Replace ${source?.name??'unavailable item'} with ${replacement?.name??'unavailable item'}`;
    const filters=[rule.teams?.length?rule.teams.join(', '):'all teams',rule.positions?.length?rule.positions.join(', '):'',rule.playerRows?.length?`${rule.playerRows.length} selected player${rule.playerRows.length===1?'':'s'}`:''].filter(Boolean).join(' · ');
    const sourceName=(source?.name??'unavailable item')+(rule.matchMode==='item'&&!source?.categorySelection?' (any color)':''),replacementName=replacement?.name??'unavailable item';
    const action=rule.action==='copy'?`Assign ${replacement?.categorySelection?'evenly from ':''}${replacementName}`:empty(replacement)?`Remove ${sourceName}`:`Replace ${sourceName} with ${replacement?.categorySelection?'an even mix from ':''}${replacementName}`;
    const sentence=action+(rule.pairSides?' on both sides':'')+(rule.preserveColor&&!empty(replacement)?", keeping each player's current color":'')+(wearing?`, only ${rule.action==='copy'?'to':empty(replacement)?'from':'for'} players wearing ${wearing.name}${rule.wearingMatchMode==='item'?' (any color)':''}`:rule.wearingItemId?', wearing item unavailable':'')+'.';
    return {operation,sentence,filters,condition:wearing?`Only when wearing ${wearing.name}${rule.wearingMatchMode==='item'?' (any color)':''}`:rule.wearingItemId?'Wearing item unavailable':'',frequency:rule.frequency??rule.replacementCap??100};
  }
  return Object.freeze({empty,pairedSlot,removeReplacement,actionOf,withFrequency,describe,categoryOf,categoryName,withCategories,protectedRemovalSlots,removalAllowed,removalRestriction});
});
