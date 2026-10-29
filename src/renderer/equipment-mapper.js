/* Rows group unique gear assets. Side and configuration choices stay compact;
 * selecting a side never allows it to be copied into the opposite slot. */
const mapperSlotLabel=slot=>({HeadWear:'Helmet',FaceMask:'Facemask',MouthWear:'Mouthpiece',InnerShirt:'Undershirt',OuterShirt:'Jersey',InnerPants:'Leg Base Layer',OuterPants:'Pants',InnerSocks:'Socks',BackPlate:'Backplate',WaistWear:'Waist Gear',LeftHandWear:'Left Glove',RightHandWear:'Right Glove',LeftShoe:'Left Cleat',RightShoe:'Right Cleat',LeftArmWear:'Left Arm Sleeve',RightArmWear:'Right Arm Sleeve',WaistWearOverride:'Waist Gear Position',Unresolved:'Unresolved Slot'})[slot]??String(slot??'').replace(/([a-z])([A-Z])/g,'$1 $2');
function mapperScopeSummary(rule){return [rule.teams?.length?rule.teams.join(', '):'',rule.positions?.length?rule.positions.map(localizedPosition).join('/'): '',rule.playerRows?.length?`${rule.playerRows.length} player${rule.playerRows.length===1?'':'s'} selected`:''].filter(Boolean).join(' · ')||'All matching active-roster players';}
const mapperMatchLabel=mode=>({exact:'Exact Configuration',asset:'Same Item',item:'Same Item · Any Color'})[mode]??'Same Item';
async function equipmentMapperPage(tool,chosenMods=null){
  if(!state.activeSave?.path){content.innerHTML=toolHeader(tool)+inputCard();bindCommon();return;}
  let mods=chosenMods;try{mods??=JSON.parse(state.toolSettings.get(tool.id)?.['mapper-mods']??'null');}catch{}
  if(!mods?.confirmed){
    content.innerHTML=toolHeader(tool)+`<section class="standard-config-workspace tool-ui ui-other-workspace mapper-mod-workspace"><section class="ui-section"><header class="ui-section-heading"><h2>Mods You Use ${modelHelpButton('Mods You Use','Select the equipment mods installed for this dynasty. Leave all boxes unchecked to use only base-game equipment.')}</h2></header><div class="ui-option-group quickstart-mod-options" data-mapper-mod-list></div></section><p class="ui-intro">Leave these off for an unmodded game.</p><div class="tool-command-bar actions"><button class="button" id="mapper-confirm-mods">Continue to Mapper</button></div></section>`;
    for(const [key,title,help]of [['unlocked','CFB27 Unlocked v0.97+','Show equipment from CFB27 Unlocked v0.97+ by Orckestra.'],['raw','RAW Accessories v3.1.4+','Show equipment from RAW Accessories v3.1.4+ by Delonte RAW.'],['eljax','GameDay Gear v2.0+','Show equipment from GameDay Gear v2.0+ by ElJax YT (Equipment Truck).']]){
      const input=document.createElement('input');input.type='checkbox';input.id='mapper-mod-'+key;input.dataset.mapperMod=key;input.checked=mods?.[key]===true;
      content.querySelector('[data-mapper-mod-list]').append(ToolkitUI.choice(input,{title,help}));
    }
    bindCommon();document.getElementById('mapper-confirm-mods').onclick=()=>{const value={confirmed:true,...Object.fromEntries([...content.querySelectorAll('[data-mapper-mod]')].map(input=>[input.dataset.mapperMod,input.checked]))};state.toolSettings.set(tool.id,{...state.toolSettings.get(tool.id),'mapper-mods':JSON.stringify(value)});equipmentMapperPage(tool,value);};return;
  }
  const save=state.activeSave?.path;if(!save){content.innerHTML=toolHeader(tool)+inputCard();bindCommon();return;}
  content.innerHTML=toolHeader(tool)+`<section class="card section">${toolLoading('Loading equipment catalog and players…')}</section>`;
  try{
    const prepared=await window.cfbToolkit.prepareTool({toolId:tool.id,savePath:save,options:{mods}});if(state.page!==tool.id||state.activeSave?.path!==save)return;
    state.prepared.set(`${tool.id}|${save}`,prepared);
    const stored=state.toolSettings.get(tool.id)?.['mapper-rules']??'[]';
    const modNames=[['unlocked','Unlocked'],['raw','RAW Accessories'],['eljax','GameDay Gear']].filter(([key])=>mods[key]).map(([,name])=>name);
    content.innerHTML=toolHeader(tool)+`<section class="standard-config-workspace"><div class="tool-workbench mapper-workbench stage-settings-workbench"><div class="tool-config-stack">
      <section class="mapper-mod-summary"><div><strong>${escapeHtml(modNames.join(' · ')||'Base Game Equipment')}</strong><p>${prepared.groups.length.toLocaleString()} catalog items · ${prepared.players.length.toLocaleString()} rostered players</p></div><div class="mapper-library-actions"><button type="button" class="button secondary" id="mapper-browse">Browse Equipment</button><button type="button" class="button secondary" id="mapper-reload">Change Mods</button></div></section>
      <section class="ops-section"><header class="ops-section-header"><span class="step-number">1</span><div><h2>Equipment Rules</h2><p>Replace, remove or assign equipment. Each rule uses the original outfit.</p></div><button type="button" class="button" id="mapper-add">Add Rule</button></header><div class="ops-section-body"><input id="mapper-mods" type="hidden" value="${escapeHtml(JSON.stringify(mods))}"><input id="mapper-rules" type="hidden" value="${escapeHtml(stored)}"><div id="mapper-queue"></div>${prepared.issues.length?`<details class="mapper-diagnostics"><summary>${prepared.issues.length} saved records could not be read</summary><ul>${prepared.issues.map(issue=>`<li>${escapeHtml(issue.player)}: ${escapeHtml(issue.reason)}</li>`).join('')}</ul></details>`:''}</div></section>
      <div id="mapper-status" role="status"></div><div class="tool-command-bar actions"><button class="button" id="mapper-preview">Preview Changes →</button></div></div></div></section>${standardPreviewWorkspace('Equipment Mapping Preview','Review the changed items before applying.','mapper-apply')}`;
    const control=document.getElementById('mapper-rules'),read=()=>{try{const rules=JSON.parse(control.value);return Array.isArray(rules)?rules:[];}catch{return [];}};
    const update=()=>{
      document.getElementById('mapper-queue').innerHTML=read().map((rule,index)=>{
        const summary=MapperEditor.describe(rule,prepared.items);
        return `<article class="mapper-rule-row"><span class="mapper-rule-number">${index+1}</span><div><strong>${escapeHtml(summary.operation)}</strong><p>${escapeHtml(mapperScopeSummary(rule))}${summary.condition?' · '+escapeHtml(summary.condition):''}</p><small>${summary.frequency}% per team · ${rule.fillToFrequency?'Fill to Frequency':'Chance roll'}${rule.pairSides?' · Both sides':''}${rule.preserveColor?' · Keep current colors':''}</small></div><div class="mapper-rule-actions"><button type="button" class="button secondary" data-mapper-edit="${index}">Edit</button><button type="button" class="button secondary" data-mapper-duplicate="${index}">Duplicate</button><button type="button" class="button secondary" data-mapper-remove="${index}" aria-label="Remove rule ${index+1}">Remove</button></div></article>`;
      }).join('')||'<div class="mapper-empty">Add a rule to choose the equipment and players you want to change.</div>';
      document.getElementById('mapper-preview').disabled=!read().length;document.getElementById('mapper-apply').disabled=true;state.genericPreviews.delete(tool.id);
    };
    const edit=(index,initial)=>{if(index===null&&read().length>=100){toast('A maximum of 100 rules can be queued.');return;}openMapperRule(prepared,initial??read()[index],rule=>{const rules=read();if(index===null)rules.push(rule);else rules[index]=rule;control.value=JSON.stringify(rules);control.dispatchEvent(new Event('change',{bubbles:true}));});};
    document.getElementById('mapper-reload').onclick=()=>equipmentMapperPage(tool,{...mods,confirmed:false});
    document.getElementById('mapper-add').onclick=()=>edit(null,{action:'replace',matchMode:'asset',scope:'all'});
    document.getElementById('mapper-browse').onclick=()=>openMapperBrowser(prepared,item=>edit(null,{action:'replace',sourceId:item.id,matchMode:'asset',scope:'all',pairSides:/^(Left|Right)HandWear$/.test(item.slot)}));
    document.getElementById('mapper-queue').onclick=event=>{const button=event.target.closest('[data-mapper-edit],[data-mapper-duplicate],[data-mapper-remove]');if(!button)return;if(button.dataset.mapperEdit!==undefined)edit(Number(button.dataset.mapperEdit));else if(button.dataset.mapperDuplicate!==undefined)edit(null,structuredClone(read()[Number(button.dataset.mapperDuplicate)]));else{control.value=JSON.stringify(read().filter((_,index)=>index!==Number(button.dataset.mapperRemove)));control.dispatchEvent(new Event('change',{bubbles:true}));}};
    control.addEventListener('change',update);bindCommon();restoreToolSettings();update();
    document.getElementById('run-output').addEventListener('click',event=>{const button=event.target.closest('[data-mapper-conflict-rule]');if(!button)return;const index=Number(button.dataset.mapperConflictRule);if(!read()[index])return;showStandardPreviewStage(false);edit(index);});
    let confirmingCompatibility=false;
    const run=async mode=>{
      const preview=state.genericPreviews.get(tool.id);
      if(mode==='apply'&&(!preview?.planId||preview.details?.canApply===false))return;
      let confirmCompatibility=false;
      if(mode==='apply'&&preview.details.requiresCompatibilityConfirmation){
        if(confirmingCompatibility)return;confirmingCompatibility=true;
        const button=document.getElementById('mapper-apply');button.disabled=true;
        try{confirmCompatibility=await confirmMapperCompatibility(preview);}finally{confirmingCompatibility=false;}
        if(state.page!==tool.id||state.activeSave?.path!==save||state.genericPreviews.get(tool.id)!==preview||!button.isConnected)return;
        button.disabled=false;if(!confirmCompatibility)return;
      }
      const output=mode==='preview'?document.getElementById('mapper-status'):document.getElementById('run-output'),token=beginToolRun(output),page=state.page;
      document.getElementById('mapper-preview').disabled=true;document.getElementById('mapper-apply').disabled=true;output.innerHTML=toolLoading('Checking equipment changes…');
      try{const result=await window.cfbToolkit.runTool({toolId:tool.id,savePath:save,mode,options:mode==='preview'?{fingerprint:prepared.fingerprint,mods:JSON.parse(document.getElementById('mapper-mods').value),rules:read()}:{planId:preview.planId,confirmCompatibility}});if(!currentToolRun(output,save,page,token))return;
        if(mode==='preview'){state.genericPreviews.set(tool.id,result);output.innerHTML='';showStandardPreviewStage(true);}else state.genericPreviews.delete(tool.id);
        renderResult(document.getElementById('run-output'),result);document.getElementById('mapper-apply').disabled=mode!=='preview'||!result.details.canApply;await refreshHistory().catch(()=>{});
      }catch(error){if(currentToolRun(output,save,page,token)){
        const readable=readableError(error);
        if(/cached result|already been applied|save changed.*preview|source row.*changed|donor file changed/i.test(readable.message))state.genericPreviews.delete(tool.id);
        if(mode==='apply'&&state.genericPreviews.get(tool.id)===preview)renderResult(output,preview);
        showError(readable,output);markRunFailure(output,readable,mode);
        document.getElementById('mapper-apply').disabled=!state.genericPreviews.get(tool.id)?.planId||state.genericPreviews.get(tool.id)?.details?.canApply===false;
      }}finally{if(state.page===page&&document.getElementById('mapper-preview'))document.getElementById('mapper-preview').disabled=!read().length;}
    };
    document.getElementById('mapper-preview').onclick=()=>run('preview');document.getElementById('mapper-apply').onclick=()=>run('apply');
  }catch(error){if(state.page===tool.id&&state.activeSave?.path===save)showError(readableError(error));}
}
function confirmMapperCompatibility(preview){
  const count=preview.details.compatibilityWarnings?.length??0;
  const answer=appConfirm('Apply Equipment with Known Incompatibilities?',`${count.toLocaleString()} player${count===1?' has':'s have'} equipment combinations that may clip, overlap or appear incorrectly in-game. Apply the reviewed equipment anyway?`,'Apply Anyway','A backup will be created. The equipment shown in this preview will be applied.');
  document.querySelector('dialog.confirmation-editor[open]')?.classList.add('mapper-compatibility-confirmation');
  return answer;
}
function mapperVariantLabel(item,prepared,index){
  if(item.catalog)return mapperSlotLabel(item.slot)+' · '+({unlocked:'Unlocked',raw:'RAW Accessories',eljax:'GameDay Gear',vanilla:'Base Game'})[item.origin];
  const {element,context={}}=JSON.parse(item.configuration),parts=[],name=asset=>prepared.items.find(entry=>entry.asset===asset)?.name??asset;
  for(const [slot,value]of Object.entries(context))parts.push(mapperSlotLabel(slot)+': '+(value?({HandwarmerStyle_Front:'Front',HandwarmerStyle_Back:'Back',HandwarmerStyle_None:'None'})[value.itemAssetName]??name(value.itemAssetName):'None'));
  for(const [key,value]of Object.entries(element))if(!['slotType','itemAssetName'].includes(key))parts.push(key==='blends'?value.map((blend,index)=>'Blend '+(index+1)+': '+Object.entries(blend).map(([name,value])=>name.replace(/([a-z])([A-Z])/g,'$1 $2')+' '+value).join(', ')).join('; '):key.replace(/([a-z])([A-Z])/g,'$1 $2')+': '+JSON.stringify(value));
  return (parts.join(' · ')||'Default saved settings')+' · Item ID: '+element.itemAssetName;
}
const mapperPairedSlot=slot=>({LeftHandWear:'RightHandWear',RightHandWear:'LeftHandWear',LeftShoe:'RightShoe',RightShoe:'LeftShoe',LeftArmWear:'RightArmWear',RightArmWear:'LeftArmWear'})[slot];
function mapperResults(result){
  const conflicts=new Set();for(const player of result.details.blocked??[])for(const match of player.reason.matchAll(/Mappings?\s+(\d+)(?:\s+and\s+(\d+))?/gi))for(const number of [match[1],match[2]])if(number&&Number(number)<=100)conflicts.add(Number(number));
  const links=conflicts.size?'<div class="mapper-conflict-actions" aria-label="Edit conflicting rules">'+[...conflicts].sort((a,b)=>a-b).map(number=>'<button type="button" class="button secondary" data-mapper-conflict-rule="'+(number-1)+'">Edit Rule '+number+'</button>').join('')+'</div>':'';
  return `${links}${result.details.allocations?.some(item=>item.percentage<100)?`<details><summary>Frequencies by Team</summary><table class="mapper-cap-table"><thead><tr><th>Rule</th><th>Team</th><th>Frequency</th><th>Matching Players</th><th>Selected</th></tr></thead><tbody>${result.details.allocations.filter(item=>item.percentage<100).map(item=>`<tr><td>${item.rule}</td><td>${escapeHtml(item.team)}</td><td>${item.percentage}%</td><td>${item.matchedPlayers}</td><td>${item.selectedPlayers}</td></tr>`).join('')}</tbody></table></details>`:''}${equipmentResults(result)}`;}
