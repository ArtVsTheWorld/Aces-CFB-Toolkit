/* Presentation adapter: saved rules retain the existing Mapper contract. */
function openMapperRule(prepared,initial,onSave,{action}={}){
  const dialog=createConfigurationDialog({title:'Equipment Rule',description:'Choose the equipment, choose the players, then review your rule.',eyebrow:'Equipment Mapper',saveLabel:'Save Rule',className:'mapper-dialog mapper-rule-dialog',toolLayout:true});if(!dialog)return;
  const original=structuredClone(initial),draft=structuredClone(initial),items=prepared.items,byId=id=>items.find(item=>item.id===id),removable=prepared.removableAssets??[];
  const existing=Boolean(initial.sourceId||initial.replacementId);
  if(existing&&draft.pairSides===undefined)draft.pairSides=false;
  let kind=action??MapperEditor.actionOf(initial,items,removable),step=0,frequencyEdited=false,allConfirmed=initial.scope==='all'||initial.action==='replace'&&initial.scope===undefined,timer,request=0,targetPage=0,visible=[],count=null,targetError='',pending=false;
  const chosen=new Map((initial.playerRows??[]).map(row=>[Number(row),initial.playerIdentities?.find(identity=>Number(identity.row)===Number(row))??{row:Number(row)}]));
  let missingTeams=(initial.teams??[]).filter(team=>!prepared.teams.includes(team)),missingPositions=(initial.positions??[]).filter(position=>!prepared.positions.includes(position));
  const pickerStates={},scrolls=[0,0,0],body=dialog.querySelector('.configuration-body'),root=document.createElement('div'),browser=document.createElement('div');root.className='mapper-rule-form';browser.hidden=true;body.append(root,browser);
  let replacementBeforeAssign=null;
  const help=(name,text)=>modelHelpButton(name,text),pickCard=(role,title)=>`<section class="mapper-equipment-card" data-map-card="${role}"><h3>${title}</h3><strong data-map-${role}></strong><small data-map-${role}-slot></small><button type="button" class="button secondary" data-map-pick="${role}">Select Item</button></section>`;
  root.innerHTML=`<nav class="mapper-editor-steps" role="tablist" aria-label="Rule steps">${['Equipment','Players','Review'].map((title,index)=>`<button type="button" class="button secondary" role="tab" data-map-step="${index}" id="mapper-step-${index}" aria-controls="mapper-page-${index}"><span>${index+1}</span>${title}</button>`).join('')}</nav>
  <section data-map-page="0" role="tabpanel" id="mapper-page-0" aria-labelledby="mapper-step-0">
    <fieldset class="mapper-action-choices"><legend>What would you like to do?</legend>${[['replace','Replace Item','Change an item to another item.'],['remove','Remove Item','Remove a specific piece of equipment.'],['assign','Assign Item','Put an item on matching players.']].map(([value,title,caption])=>`<button type="button" class="button secondary" data-map-action="${value}" aria-pressed="false"><strong>${title}</strong><small>${caption}</small></button>`).join('')}</fieldset>
    <div class="mapper-flow">${pickCard('source','Existing Item')}${pickCard('replacement','Replacement')}</div><p class="notice mapper-remove-note" data-map-remove-note hidden>The selected item will be removed. Helmets, facemasks and cleats cannot be removed.</p>
    <section class="mapper-pair-settings mapper-editor-section" data-map-pair-section><label class="check-row"><input type="checkbox" data-map-pair>Apply to Both Sides ${help('Apply to Both Sides','Change both sides together. You can still choose different items for the left and right side.')}</label><div class="mapper-pair-choices" data-map-pair-choices><section data-map-existing-pair-label><h4 data-map-source-pair-title>Other Existing Item</h4><strong data-map-source-pair-name></strong><button type="button" class="button secondary" data-map-pick="sourcePair">Choose Item</button></section><section data-map-replacement-pair-label><h4 data-map-replacement-pair-title>Other Replacement Item</h4><strong data-map-replacement-pair-name></strong><button type="button" class="button secondary" data-map-pick="replacementPair">Choose Item</button></section></div></section>
    <section class="mapper-options-section"><label data-map-match-field>Match Existing Item ${help('Match Existing Item','Selected Color matches the item you chose. Include Other Colors also matches its supported color variants.')}<select data-map-mode><option value="asset">Selected Color</option><option value="item">Include Other Colors</option>${initial.matchMode==='exact'?'<option value="exact">Saved Exact Configuration</option>':''}</select></label><label class="check-row" data-map-keep-field><input type="checkbox" data-map-keep-color>Keep Current Colors ${help('Keep Current Colors','Change the item but keep the player’s color. Example: replace a black sleeve with a baggy sleeve and it stays black. If that item has no matching color, Preview asks you to choose another replacement.')}</label></section>
  </section>
  <section data-map-page="1" role="tabpanel" id="mapper-page-1" aria-labelledby="mapper-step-1" hidden>
    <h3>Players to Change</h3><p class="muted mapper-editor-intro">These filters work together. Leave a filter empty to include everyone it allows.</p>
    <div class="mapper-filter-grid"><details class="mapper-filter-card"><summary>Teams <span data-map-team-summary>All teams</span></summary>${checkboxPicker('mapper-rule-teams','Teams',prepared.teams,'All teams when none are checked.',initial.teams??[])}</details><details class="mapper-filter-card"><summary>Positions <span data-map-position-summary>All positions</span></summary>${checkboxPicker('mapper-rule-positions','Positions',[...prepared.positions].sort(positionCompare).map(position=>({value:position,label:localizedPosition(position)})),'All positions when none are checked.',initial.positions??[])}</details></div>
    <details class="mapper-wearing-filter"><summary>Only When Wearing <span data-map-wearing-summary>Any equipment</span></summary><div><strong data-map-wearing>Any equipment</strong><small data-map-wearing-slot></small><div class="mapper-wearing-actions"><button type="button" class="button secondary" data-map-pick="wearing">Select Item</button><button type="button" class="button secondary" data-map-clear-wearing>Clear</button></div><label class="check-row"><input type="checkbox" data-map-wearing-colors>Include Other Colors</label><p class="muted">The same outfit must wear this item. Other outfits stay unchanged.</p></div></details>
    <div class="notice warning" data-map-missing-filters hidden><p>Some saved teams or positions are unavailable in this save.</p><button type="button" class="button secondary" data-map-clear-missing>Clear Unavailable Filters</button></div>
    <section class="mapper-individual-players"><label class="check-row"><input type="checkbox" data-map-limit-players>Choose Specific Players ${help('Choose Specific Players','Only checked players can change. They must still match your other filters. Use Selected Only to review everyone you checked, including players hidden by a filter.')}</label>
    <div data-map-individual-controls hidden><div class="mapper-player-search"><label>Search Players<input type="search" class="input" data-map-target-search placeholder="Player name, team, or position"></label><label class="check-row"><input type="checkbox" data-map-selected-only>Selected Only</label></div><div class="mapper-target-actions"><span data-map-target-count></span><button type="button" class="button secondary" data-map-target-all>Select This Page</button><button type="button" class="button secondary" data-map-target-clear>Clear Players</button></div><div class="mapper-player-pagination"><span data-map-player-page></span><div><button type="button" class="button secondary" data-map-player-prev>Previous</button><button type="button" class="button secondary" data-map-player-next>Next</button></div></div><div class="mapper-target-list" data-map-target-list aria-label="Matching players"></div></div></section>
    <p class="mapper-match-status" data-map-match-status role="status" aria-live="polite"></p><p class="muted" data-map-outside-warning hidden></p><div data-map-all-choice hidden><p>Choose a filter, or include all matching players.</p><button type="button" class="button secondary" data-map-use-all>Use All Matching Players</button></div>
  </section>
  <section data-map-page="2" role="tabpanel" id="mapper-page-2" aria-labelledby="mapper-step-2" hidden>
    <section class="mapper-frequency-card"><h3>Frequency ${help('Frequency','How many matching players may receive this change on each team. At 30%, up to 3 of 10 matches can change. Fill to Frequency tries to reach the target; turning it off gives each player a chance instead. Both sides of a pair count as one player.')}</h3><label>Matching Players (%)<input class="input" type="number" min="0" max="100" step="1" data-map-cap></label><label class="check-row"><input type="checkbox" data-map-fill>Fill to Frequency</label></section>
    <section class="mapper-rule-review"><h3>Review Rule</h3><strong data-map-review-operation></strong><dl data-map-review-details></dl><p class="mapper-match-status" data-map-review-count></p><p class="muted">Save Rule adds this to your list. Preview Changes checks the final equipment before you apply it.</p></section>
  </section>`;
  const get=selector=>root.querySelector(selector),values=id=>[...get('#'+id).selectedOptions].map(option=>option.value);
  const originalFill=initial.fillToFrequency===true;get('[data-map-cap]').value=initial.frequency??initial.replacementCap??100;get('[data-map-fill]').checked=originalFill;
  get('[data-map-mode]').value=initial.matchMode??'asset';get('[data-map-keep-color]').checked=initial.preserveColor===true;get('[data-map-limit-players]').checked=chosen.size>0;
  const actions=dialog.querySelector('.configuration-footer-actions'),save=actions.querySelector('[data-config-save]'),reset=actions.querySelector('[data-config-reset]');reset.textContent='Reset Rule';
  const back=document.createElement('button'),next=document.createElement('button');for(const button of [back,next]){button.type='button';button.className='button secondary';}next.className='button';back.textContent='Back';next.textContent='Next';back.dataset.mapPrevious='';next.dataset.mapNext='';actions.insertBefore(back,save);actions.insertBefore(next,save);
  const error=dialog.querySelector('[data-config-error]'),fail=message=>{error.textContent=message;error.hidden=!message;return !message;};
  const collect=()=>{
    const selected=get('[data-map-limit-players]').checked?[...chosen.keys()]:[],teams=values('mapper-rule-teams'),positions=values('mapper-rule-positions');
    const rule={...draft,action:kind==='assign'?'copy':'replace',scope:teams.length||positions.length||selected.length||draft.wearingItemId?'selected':allConfirmed?'all':'selected',teams,positions,playerRows:selected,playerIdentities:selected.map(row=>chosen.get(row)),matchMode:get('[data-map-mode]').value,preserveColor:get('[data-map-keep-color]').checked,preserveSide:initial.preserveSide??true,pairSides:get('[data-map-pair]').checked};
    if(!draft.wearingItemId){delete rule.wearingItemId;delete rule.wearingMatchMode;}
    const frequency=Number(get('[data-map-cap]').value);Object.assign(rule,MapperEditor.withFrequency(existing?original:{...original,frequency:100},frequencyEdited,frequency,get('[data-map-fill]').checked));if(frequencyEdited)delete rule.replacementCap;
    return rule;
  };
  const equipmentError=()=>{
    const source=byId(draft.sourceId),replacement=byId(draft.replacementId);
    if(!replacement||replacement.copyable===false||kind!=='assign'&&(!source||source.copyable===false))return 'Choose available equipment from your selected catalog.';
    if(kind!=='assign'&&source.slot!==replacement.slot)return 'The existing item and replacement must use the same equipment side.';
    if(kind==='remove'&&!MapperEditor.removeReplacement(source,items,removable))return 'This item has no supported removal option. Choose another item.';
    if(get('[data-map-pair]').checked){const partner=byId(draft.replacementPairId),sourcePartner=byId(draft.sourcePairId);if(!partner||partner.slot!==MapperEditor.pairedSlot(replacement.slot)||kind!=='assign'&&(!sourcePartner||sourcePartner.slot!==MapperEditor.pairedSlot(source.slot)))return 'Choose the existing and replacement item for the other side.';}
    if(draft.wearingItemId&&!byId(draft.wearingItemId))return 'The saved Wearing Item is unavailable. Choose it again or clear the condition.';
    return '';
  };
  const playerError=()=>{
    if(missingTeams.length||missingPositions.length)return 'Clear the unavailable saved filters, or select them in a save that contains them.';
    if(get('[data-map-limit-players]').checked&&!chosen.size)return 'Choose at least one player, or turn off Choose Specific Players.';
    for(const [row,identity]of chosen)if(get('[data-map-limit-players]').checked&&!prepared.players.some(player=>player.row===row&&player.player===identity.player&&player.team===identity.team))return 'A saved selected player has changed or is unavailable. Clear Players and choose the intended players again.';
    const rule=collect();if(rule.scope==='selected'&&!rule.teams.length&&!rule.positions.length&&!rule.playerRows.length&&!rule.wearingItemId)return 'Choose a filter, or select Use All Matching Players.';
    return '';
  };
  const review=()=>{
    const rule=collect(),summary=MapperEditor.describe(rule,items),details=[['Players',mapperScopeSummary(rule)],['Only When Wearing',summary.condition||'Any equipment'],['Existing Item Matching',kind==='assign'?'Not required':mapperMatchLabel(rule.matchMode)],['Sides',rule.pairSides?'Both sides':'Selected side'],['Colors',rule.preserveColor?'Keep current colors':'Use selected colors'],['Frequency',summary.frequency+'% per team · '+(rule.fillToFrequency?'Fill to Frequency':'Chance roll')]];
    get('[data-map-review-operation]').textContent=summary.operation;get('[data-map-review-details]').innerHTML=details.map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
    get('[data-map-review-count]').textContent=pending?'Checking matching players…':targetError||count?(targetError||`${get('[data-map-limit-players]').checked?count.selectedMatching:count.matchingPlayers} matching players before frequency and compatibility checks.`):'Matching players will be checked before Preview.';
    save.disabled=step!==2||pending||Boolean(targetError);next.hidden=step===2;save.hidden=step!==2;back.hidden=step===0;
  };
  const targetView=()=>{
    get('[data-map-team-summary]').textContent=values('mapper-rule-teams').length?values('mapper-rule-teams').join(', '):'All teams';get('[data-map-position-summary]').textContent=values('mapper-rule-positions').length?values('mapper-rule-positions').map(localizedPosition).join(', '):'All positions';
    get('[data-map-individual-controls]').hidden=!get('[data-map-limit-players]').checked;
    get('[data-map-missing-filters]').hidden=!missingTeams.length&&!missingPositions.length;
    const rule=collect();get('[data-map-all-choice]').hidden=allConfirmed||rule.teams.length||rule.positions.length||rule.playerRows.length||rule.wearingItemId;
    get('[data-map-target-count]').textContent=`${chosen.size.toLocaleString()} selected`;
    get('[data-map-match-status]').textContent=pending?'Checking matching players…':targetError||(!count?'':`${count.matchingPlayers.toLocaleString()} players match the equipment and filters.`);
    const outside=get('[data-map-outside-warning]');outside.hidden=!get('[data-map-limit-players]').checked||!count?.selectedOutsideFilters;outside.textContent=count?`${count.selectedOutsideFilters} selected players are outside the current filters and will not be changed.`:'';
    if(count){get('[data-map-player-page]').textContent=`${count.totalMatches?count.page*100+1:0}–${Math.min((count.page+1)*100,count.totalMatches)} of ${count.totalMatches.toLocaleString()} · Page ${count.page+1} of ${count.pages}`;get('[data-map-player-prev]').disabled=count.page===0;get('[data-map-player-next]').disabled=count.page+1>=count.pages;}
    get('[data-map-target-all]').disabled=pending||!visible.length;
    get('[data-map-target-list]').innerHTML=visible.map(player=>`<label class="mapper-target-row"><input type="checkbox" data-map-target="${player.row}"${chosen.has(player.row)?' checked':''}><span>${escapeHtml(player.player)} · ${escapeHtml(player.team)} · ${escapeHtml(localizedPosition(player.position))}${player.outsideFilters?' · Outside filters':''}</span></label>`).join('')||'<p class="muted">No players match this search.</p>';review();
  };
  const schedule=(resetPage=true)=>{
    if(resetPage)targetPage=0;clearTimeout(timer);const token=++request;count=null;targetError='';pending=true;targetView();
    if(equipmentError()){pending=false;targetError=equipmentError();targetView();return;}
    timer=setTimeout(async()=>{
      try{
        const result=await window.cfbToolkit.mapperTargets({savePath:state.activeSave.path,sessionId:prepared.targetSessionId,fingerprint:prepared.fingerprint,rule:collect(),query:get('[data-map-target-search]').value,page:targetPage,selectedRows:[...chosen.keys()],selectedOnly:get('[data-map-selected-only]').checked});
        if(!dialog.isConnected||token!==request)return;count=result;visible=result.rows;targetPage=result.page;pending=false;targetView();
      }catch(error){if(!dialog.isConnected||token!==request)return;pending=false;visible=[];targetError=readableError(error).message;targetView();}
    },180);
  };
  const setStep=index=>{
    if(index>0&&!fail(equipmentError()))return;if(index===2&&!fail(playerError()))return;
    scrolls[step]=body.scrollTop;step=index;fail('');root.querySelectorAll('[data-map-page]').forEach(page=>page.hidden=Number(page.dataset.mapPage)!==step);
    root.querySelectorAll('[data-map-step]').forEach(button=>{const selected=Number(button.dataset.mapStep)===step;button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
    body.scrollTop=scrolls[step];review();if(step>0&&!count&&!pending)schedule(false);
  };
  const refresh=()=>{
    const source=byId(draft.sourceId),replacement=byId(draft.replacementId),wearing=byId(draft.wearingItemId);
    root.querySelectorAll('[data-map-action]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mapAction===kind)));
    get('[data-map-card=source]').hidden=kind==='assign';get('[data-map-card=replacement]').hidden=kind==='remove';get('[data-map-remove-note]').hidden=kind!=='remove';
    get('[data-map-card=replacement] h3').textContent=kind==='assign'?'Item to Assign':'Replacement';
    for(const [role,item]of [['source',source],['replacement',replacement]]){get('[data-map-'+role+']').textContent=item?.name??'Not selected';get('[data-map-'+role+'-slot]').textContent=item?mapperSlotLabel(item.slot):'';}
    get('[data-map-pick=replacement]').disabled=kind==='replace'&&!source;
    get('[data-map-match-field]').hidden=kind==='assign';get('[data-map-keep-field]').hidden=kind==='remove'&&!original.preserveColor;
    const slot=kind==='assign'?replacement?.slot:source?.slot,partnerSlot=MapperEditor.pairedSlot(slot),pairAvailable=Boolean(partnerSlot);get('[data-map-pair-section]').hidden=!pairAvailable;
    if(draft.pairSides===undefined&&slot)draft.pairSides=/^(Left|Right)HandWear$/.test(slot);get('[data-map-pair]').checked=pairAvailable&&draft.pairSides===true;
    get('[data-map-pair-choices]').hidden=!get('[data-map-pair]').checked;get('[data-map-existing-pair-label]').hidden=kind==='assign';get('[data-map-replacement-pair-label]').hidden=kind==='remove';
    for(const [selected,key,name]of [[source,'sourcePairId','source'],[replacement,'replacementPairId','replacement']]){
      if(partnerSlot&&byId(draft[key])?.slot!==partnerSlot)draft[key]=items.find(item=>item.slot===partnerSlot&&item.asset===selected?.asset)?.id;
      get('[data-map-'+name+'-pair-title]').textContent=(partnerSlot?mapperSlotLabel(partnerSlot):'Other Side')+(name==='source'?' — Existing':kind==='assign'?' — Assign':' — Replacement');get('[data-map-'+name+'-pair-name]').textContent=byId(draft[key])?.name??'Not selected';
    }
    if(kind==='remove'){draft.replacementId=MapperEditor.removeReplacement(source,items,removable)?.id;if(get('[data-map-pair]').checked)draft.replacementPairId=MapperEditor.removeReplacement(byId(draft.sourcePairId),items,removable)?.id;}
    get('[data-map-wearing]').textContent=wearing?.name??(draft.wearingItemId?'Unavailable item':'Any equipment');get('[data-map-wearing-summary]').textContent=wearing?.name??'Any equipment';get('[data-map-wearing-slot]').textContent=wearing?mapperSlotLabel(wearing.slot):'';
    get('[data-map-clear-wearing]').disabled=!draft.wearingItemId;get('[data-map-wearing-colors]').disabled=!wearing;get('[data-map-wearing-colors]').checked=draft.wearingMatchMode==='item';targetView();
  };
  root.querySelectorAll('[data-map-pick]').forEach(button=>button.onclick=()=>{
    const role=button.dataset.mapPick,partner=role.endsWith('Pair'),source=byId(draft.sourceId),replacement=byId(draft.replacementId),slot=partner?MapperEditor.pairedSlot(kind==='assign'?replacement?.slot:source?.slot):role==='replacement'&&kind!=='assign'?source?.slot:null;
    const title={source:kind==='remove'?'Choose Item to Remove':'Choose Existing Item',replacement:kind==='assign'?'Choose Item to Assign':'Choose Replacement',wearing:'Choose Wearing Item',sourcePair:'Choose Other Existing Item',replacementPair:kind==='assign'?'Choose Other Item to Assign':'Choose Other Replacement'}[role];
    scrolls[step]=body.scrollTop;root.hidden=true;browser.hidden=false;browser.replaceChildren();
    const restore=()=>{browser.hidden=true;root.hidden=false;body.scrollTop=scrolls[step];button.focus({preventScroll:true});};
    mountMapperPicker(dialog,browser,prepared,{title,description:role==='wearing'?'Only outfits wearing this item will qualify.':partner?'Select the item for '+mapperSlotLabel(slot)+'.':role==='replacement'?kind==='assign'?'Choose the item to put on matching players.':'Choose what the existing item should become.':'Select an item by its name.',slot,filter:item=>kind==='remove'&&role!=='wearing'?Boolean(MapperEditor.removeReplacement(item,items,removable)):true,state:pickerStates[role]??=Object.assign({},{}),onCancel:restore,onChoose:choice=>{
      draft[{source:'sourceId',replacement:'replacementId',wearing:'wearingItemId',sourcePair:'sourcePairId',replacementPair:'replacementPairId'}[role]]=choice.id;
      if(role==='source'){delete draft.sourcePairId;if(byId(draft.replacementId)?.slot!==choice.slot){delete draft.replacementId;delete draft.replacementPairId;}}
      if(role==='replacement')delete draft.replacementPairId;refresh();restore();count=null;if(step>0)schedule();
    }});body.scrollTop=0;
  });
  root.querySelectorAll('[data-map-action]').forEach(button=>button.onclick=()=>{
    const nextKind=button.dataset.mapAction;if(nextKind===kind)return;
    if(nextKind==='assign'){
      replacementBeforeAssign={id:draft.replacementId,pairId:draft.replacementPairId};
      if(byId(draft.sourceId)){draft.replacementId=draft.sourceId;draft.replacementPairId=draft.sourcePairId;}
      if(original.action!=='copy')allConfirmed=false;
    }else if(kind==='assign'){
      // Keep the visible assigned item when returning to Existing Item, while
      // restoring the replacement draft if it still fits the selected slot.
      draft.sourceId=draft.replacementId;draft.sourcePairId=draft.replacementPairId;
      const previous=byId(replacementBeforeAssign?.id),source=byId(draft.sourceId);
      draft.replacementId=previous&&previous.slot===source?.slot?previous.id:undefined;
      draft.replacementPairId=draft.replacementId?replacementBeforeAssign?.pairId:undefined;
    }
    kind=nextKind;clearTimeout(timer);request++;pending=false;count=null;targetError='';visible=[];refresh();
  });
  root.querySelectorAll('[data-map-step]').forEach(button=>{button.onclick=()=>setStep(Number(button.dataset.mapStep));button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=event.key==='Home'?0:event.key==='End'?2:Math.max(0,Math.min(2,step+(event.key==='ArrowRight'?1:-1)));setStep(index);get('[data-map-step="'+step+'"]').focus();};});
  back.onclick=()=>setStep(step-1);next.onclick=()=>setStep(step+1);get('[data-map-pair]').onchange=event=>{draft.pairSides=event.target.checked;refresh();count=null;};
  get('[data-map-clear-wearing]').onclick=()=>{delete draft.wearingItemId;delete draft.wearingMatchMode;refresh();schedule();};get('[data-map-wearing-colors]').onchange=event=>{draft.wearingMatchMode=event.target.checked?'item':'asset';schedule();};
  get('[data-map-limit-players]').onchange=()=>{targetView();schedule();};get('[data-map-target-search]').oninput=()=>schedule();get('[data-map-selected-only]').onchange=()=>schedule();
  get('[data-map-target-list]').onchange=event=>{const player=visible.find(player=>player.row===Number(event.target.dataset.mapTarget));if(!player)return;if(event.target.checked)chosen.set(player.row,{row:player.row,player:player.player,team:player.team});else chosen.delete(player.row);schedule(false);};
  get('[data-map-target-all]').onclick=()=>{visible.forEach(({row,player,team})=>chosen.set(row,{row,player,team}));schedule(false);};get('[data-map-target-clear]').onclick=()=>{chosen.clear();schedule(false);};
  get('[data-map-player-prev]').onclick=()=>{targetPage--;schedule(false);};get('[data-map-player-next]').onclick=()=>{targetPage++;schedule(false);};
  get('[data-map-use-all]').onclick=()=>{allConfirmed=true;targetView();schedule();};get('[data-map-clear-missing]').onclick=()=>{missingTeams=[];missingPositions=[];targetView();schedule();};
  for(const id of ['mapper-rule-teams','mapper-rule-positions'])get('#'+id).addEventListener('change',()=>schedule());
  get('[data-map-mode]').onchange=()=>{count=null;};get('[data-map-keep-color]').onchange=()=>review();
  for(const selector of ['[data-map-cap]','[data-map-fill]'])get(selector).addEventListener('input',()=>{frequencyEdited=Number(get('[data-map-cap]').value)!==(initial.frequency??initial.replacementCap??100)||get('[data-map-fill]').checked!==originalFill;review();});
  reset.onclick=()=>{dialog.closeEditor();openMapperRule(prepared,{action:kind==='assign'?'copy':'replace',matchMode:'asset',scope:kind==='assign'?'selected':'all'},onSave,{action:kind});};
  save.onclick=()=>{if(!fail(equipmentError()||playerError()||targetError))return;const frequency=Number(get('[data-map-cap]').value);if(get('[data-map-cap]').value.trim()===''||!Number.isInteger(frequency)||frequency<0||frequency>100){fail('Enter a whole frequency from 0 to 100.');return;}onSave(collect());dialog.closeEditor();};
  const close=dialog.closeEditor;dialog.closeEditor=()=>{clearTimeout(timer);request++;close();};
  bindCheckboxPickers(root);bindModelHelp(root);refresh();setStep(0);dialog.showModal();
}
