(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.MapperEditor=value;})(globalThis,()=>{
  const retiredEquipment=Object.freeze({
    GearArmSleeve_Bands_armTape_normal_OffWhite:Object.freeze({label:'Arm Bands White',message:'Arm Bands White was removed because it is a broken item. Choose another item from the catalog.'}),
    G_CompressionT_Crew_ShortSleeve_BasicJ_JER:Object.freeze({label:'Unlocked White Compression Tee',message:'The old Unlocked White Compression Tee was removed because it is not a valid selectable item in the game. Choose White Compression Tee from CFB 27 Equipment, or Irish Jamo Sleeves White from Unlocked.'})
  });
  const retiredItem=value=>retiredEquipment[String(value??'').split(':').pop()];
  const retiredItemMessage=value=>retiredItem(value)?.message??'';
  const retiredItemLabel=value=>retiredItem(value)?'Removed: '+retiredItem(value).label:'';
  function retiredRuleMessage(rule){
    const ids=[...(rule.action==='copy'?[]:[rule.sourceId]),rule.replacementId,rule.wearingItemId,...(rule.pairSides?[...(rule.action==='copy'?[]:[rule.sourcePairId]),rule.replacementPairId]:[])];
    return ids.map(retiredItemMessage).find(Boolean)??'';
  }
  const empty=item=>Boolean(item)&&(/(?:^|_)None$/i.test(item.asset)||item.asset==='FaceGear_BalaclavaNone');
  const protectedRemovalSlots=Object.freeze(['HeadWear','FaceMask','LeftShoe','RightShoe','LeftShoeOverride','RightShoeOverride','InnerSocks','OuterPants','OuterShirt']);
  const removalAllowed=slot=>!protectedRemovalSlots.includes(slot);
  const removalRestriction='Helmets, facemasks, cleats, socks, pants and jersey styles cannot be removed.';
  const categoryOf=item=>/turtleneck/i.test(item.name)?'Turtlenecks':item.category;
  const categoryName=category=>'All '+(({Undershirt:'Undershirts',Mouthpiece:'Mouthpieces',Visor:'Visors',Towel:'Towels',Handwarmer:'Handwarmers',Facemask:'Facemasks','Helmet Model':'Helmet Models','Jersey Style':'Jersey Styles','Back Plate':'Back Plates','Chin Cover':'Chin Covers','Flak Jacket':'Flak Jackets','Guardian Cap':'Guardian Caps','Neck Pad':'Neck Pads','Knee Brace':'Knee Braces','Waist Playcall Band':'Waist Playcall Bands',Tattoo:'Tattoos'})[category]??category);
  const categoryCache=new WeakMap();
  function withCategories(items){
    if(categoryCache.has(items))return categoryCache.get(items);
    const sets=new Map(),legacySets=new Map();
    for(const item of items){
      if(item.categorySelection||!item.catalog||item.copyable===false||empty(item))continue;
      for(const old of item.legacyCategories??[]){const key=old.category+'|'+old.slot;if(!legacySets.has(key))legacySets.set(key,{category:old.category,slot:item.slot,idSlot:old.slot,members:[]});legacySets.get(key).members.push(item);}
      if(item.legacy)continue;
      const category=categoryOf(item),key=category+'|'+item.slot;
      if(!sets.has(key))sets.set(key,{category,slot:item.slot,members:[]});
      sets.get(key).members.push(item);
    }
    const result=[...items,...[...sets.values()].map(({category,slot,members})=>({id:'category:'+encodeURIComponent(category)+':'+slot,name:categoryName(category),category,slot,side:/^(Left|Right)/.exec(slot)?.[1]??'Center',catalog:true,categorySelection:true,copyable:true,memberIds:members.map(i=>i.id),memberAssets:[...new Set(members.map(i=>i.asset))]}))];
    for(const {category,slot,idSlot,members}of legacySets.values()){const id='category:'+encodeURIComponent(category)+':'+idSlot;if(!result.some(item=>item.id===id))result.push({id,name:categoryName(category)+' (saved selection)',category,slot,catalog:true,categorySelection:true,legacy:true,copyable:true,memberIds:members.map(i=>i.id),memberAssets:[...new Set(members.map(i=>i.asset))]});}
    categoryCache.set(items,result);categoryCache.set(result,result);return result;
  }
  const sourceNames=Object.freeze({vanilla:'CFB 27 Equipment',unlocked:'Unlocked',raw:'RAW Accessories',eljax:'GameDay Gear',gameday:'GameDay Gear'});
  const sourceIndexes=new WeakMap();
  function sourceLabels(item,items=[]){
    if(!item)return [];
    if(!item.categorySelection)return [sourceNames[item.origin]??'Source not verified'];
    if(!sourceIndexes.has(items))sourceIndexes.set(items,new Map(items.map(i=>[i.id,i])));
    const index=sourceIndexes.get(items);
    return [...new Set((item.memberIds??[]).flatMap(id=>sourceLabels(index.get(id),items)))].sort((a,b)=>Object.values(sourceNames).indexOf(a)-Object.values(sourceNames).indexOf(b));
  }
  function sourceSummary(rule,items){
    items=withCategories(items);const get=id=>items.find(i=>i.id===id),source=get(rule.sourceId),replacement=get(rule.replacementId);
    const selections=rule.action==='copy'?[['Assign from',replacement]]:empty(replacement)?[['Existing',source]]:[['Existing',source],['Replacement',replacement]];
    if(rule.pairSides){if(rule.action!=='copy')selections.push(['Other existing',get(rule.sourcePairId)]);if(!empty(replacement))selections.push(['Other replacement',get(rule.replacementPairId)]);}
    selections.push(['Only when wearing',get(rule.wearingItemId)]);
    return selections.filter(([,item])=>item).map(([role,item])=>[role,sourceLabels(item,items).join(' / ')]);
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
  return Object.freeze({empty,pairedSlot,removeReplacement,actionOf,withFrequency,describe,categoryOf,categoryName,withCategories,sourceLabels,sourceSummary,retiredEquipment,retiredItemMessage,retiredItemLabel,retiredRuleMessage,protectedRemovalSlots,removalAllowed,removalRestriction});
});
