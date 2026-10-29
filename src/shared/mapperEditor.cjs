(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.MapperEditor=value;})(globalThis,()=>{
  const empty=item=>Boolean(item)&&(/(?:^|_)None$/i.test(item.asset)||item.asset==='FaceGear_BalaclavaNone');
  const pairedSlot=slot=>({LeftHandWear:'RightHandWear',RightHandWear:'LeftHandWear',LeftShoe:'RightShoe',RightShoe:'LeftShoe',LeftArmWear:'RightArmWear',RightArmWear:'LeftArmWear'})[slot]??null;
  function removeReplacement(source,items,removableAssets){
    if(!source||!removableAssets.includes(source.asset)||['HeadWear','FaceMask','LeftShoe','RightShoe','LeftShoeOverride','RightShoeOverride'].includes(source.slot))return null;
    const choices=items.filter(item=>item.slot===source.slot&&item.copyable!==false&&empty(item));
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
    const get=id=>items.find(item=>item.id===id),source=get(rule.sourceId),replacement=get(rule.replacementId),wearing=get(rule.wearingItemId);
    const operation=rule.action==='copy'?`Assign ${replacement?.name??'unavailable item'}`:empty(replacement)?`Remove ${source?.name??'unavailable item'}`:`Replace ${source?.name??'unavailable item'} with ${replacement?.name??'unavailable item'}`;
    const filters=[rule.teams?.length?rule.teams.join(', '):'all teams',rule.positions?.length?rule.positions.join(', '):'',rule.playerRows?.length?`${rule.playerRows.length} selected player${rule.playerRows.length===1?'':'s'}`:''].filter(Boolean).join(' · ');
    return {operation,filters,condition:wearing?`Only when wearing ${wearing.name}${rule.wearingMatchMode==='item'?' (any color)':''}`:rule.wearingItemId?'Wearing item unavailable':'',frequency:rule.frequency??rule.replacementCap??100};
  }
  return Object.freeze({empty,pairedSlot,removeReplacement,actionOf,withFrequency,describe});
});
