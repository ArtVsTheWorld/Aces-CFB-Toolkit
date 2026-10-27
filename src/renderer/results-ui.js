const EQUIPMENT_RESULT_KINDS=['freshman-equipment','equipment-patcher','equipment-quickstart','equipment-mapper'];
function prepareResultPage(result){
  if(!ToolkitPreviewPages.supports(result.resultKind))return result;
  const details=result.details??{};if(details.previewPage&&details.changes?.length<=100)return result;
  const rows=details.changes??[],first=ToolkitPreviewPages.page(ToolkitPreviewPages.createIndex(rows)),total=Number(details.totalSearchMatches??details.totalPreviewRows??rows.length);
  first.previewPage={...first.previewPage,total,pages:Math.max(1,Math.ceil(total/100)),end:Math.min(total,first.changes.length)};
  return {...result,details:{...details,changes:first.changes,previewPage:first.previewPage}};
}
function resultPageKey(result){return JSON.stringify([result.details?.previewPage?.index??0,result.details?.searchQuery??'',...ToolkitPreviewPages.FIELDS.map(field=>result.details?.searchFilters?.[field]??'')]);}
function previewPagerMarkup(result){
  const page=result.details?.previewPage;if(!page)return '';
  return `<nav class="preview-pagination" aria-label="Preview pages"><span>${page.start.toLocaleString()}–${page.end.toLocaleString()} of ${page.total.toLocaleString()}</span><div><button type="button" class="button secondary" data-preview-page-step="-1" ${page.index===0?'disabled':''}>Previous</button><label><select class="input" data-preview-page data-order="preserve" aria-label="Preview page">${Array.from({length:page.pages},(_,index)=>`<option value="${index}" ${index===page.index?'selected':''}>Page ${index+1} of ${page.pages}</option>`).join('')}</select></label><button type="button" class="button secondary" data-preview-page-step="1" ${page.index>=page.pages-1?'disabled':''}>Next</button></div></nav>`;
}
function bindPreviewPager(output,result,request){
  const page=result.details?.previewPage;if(!page)return;
  output.querySelectorAll('[data-preview-page-step]').forEach(button=>button.addEventListener('click',event=>request(page.index+Number(button.dataset.previewPageStep),event)));
  output.querySelectorAll('[data-preview-page]').forEach(select=>select.addEventListener('change',event=>request(Number(select.value),event)));
}
function setPreviewPagerBusy(output,result,busy){
  const page=result.details?.previewPage;if(!page)return;
  output.querySelectorAll('.preview-pagination').forEach(nav=>nav.setAttribute('aria-busy',String(busy)));
  output.querySelectorAll('[data-preview-page-step]').forEach(button=>button.disabled=busy||(Number(button.dataset.previewPageStep)<0?page.index===0:page.index>=page.pages-1));
  output.querySelectorAll('[data-preview-page]').forEach(select=>{select.disabled=busy;select.value=String(page.index);});
}
const parkedResultViews=new WeakMap();
function bindParkedResultViews(output){
  parkedResultViews.get(output)?.abort();
  const equipment=output.querySelector('[data-equipment-view]'),jersey=output.querySelector('[data-jersey-view]');
  if(!equipment&&!jersey)return;
  const attribute=equipment?'equipmentView':'jerseyView',selector=equipment?'[data-equipment-view]':'[data-jersey-view]';
  const cards=output.querySelector(equipment?'.equipment-card-list':'.jersey-card-list'),table=output.querySelector(equipment?'.equipment-table-view':'.jersey-table-view');
  if(!cards||!table)return;
  // Keep the alternate view's existing nodes/listeners, but outside the live
  // document. Scrolling Cards need not restyle a second 1,000-row Table too.
  const views=[{name:'cards',node:cards,park:document.createDocumentFragment()},{name:'table',node:table,park:document.createDocumentFragment()}];
  for(const image of output.querySelectorAll('img[data-team-logo]')){image.loading='lazy';image.decoding='async';}
  const activate=name=>{
    for(const view of views){
      if(view.name===name){if(view.park.childNodes.length){view.node.append(view.park);bindTeamLogoFallbacks(view.node);}}
      else while(view.node.firstChild)view.park.append(view.node.firstChild);
    }
  };
  activate(cards.hidden?'table':'cards');
  const controller=new AbortController();parkedResultViews.set(output,controller);
  output.addEventListener('click',event=>{
    const button=event.target.closest(selector);if(button&&output.contains(button))activate(button.dataset[attribute]);
  },{capture:true,signal:controller.signal});
}
function equipmentResultOverview(result){
  const details=result.details??{};if(details.equipmentOverview)return details.equipmentOverview;
  const rows=details.changes??[],total=Number(details.totalPreviewRows??rows.length),complete=total===rows.length&&!details.searchQuery&&!Object.values(details.searchFilters??{}).some(Boolean);
  const knownTeams=rows.every(row=>typeof row.team==='string'&&row.team.trim());
  return {players:total,teams:Array.isArray(details.previewFacets?.team)?details.previewFacets.team.length:complete&&knownTeams?new Set(rows.map(row=>row.team)).size:null,
    changes:details.totalCorrectionActions??(complete?rows.reduce((sum,row)=>sum+(row.changes?.length??0),0):null)};
}
function runPrimaryMetrics(result){
  const preview=result.mode==='preview',details=result.details??{};
  if(EQUIPMENT_RESULT_KINDS.includes(result.resultKind)){
    const overview=equipmentResultOverview(result);
    return [{label:preview?'Players to update':'Players updated',value:overview.players},...(overview.teams===null?[]:[{label:'Teams affected',value:overview.teams}]),...(overview.changes===null?[]:[{label:'Equipment changes',value:overview.changes}])];
  }
  const priorities={
    'team-boost':['players changed','rating changes','teams selected'],
    'roster-generator':['players to replace','teams to regenerate','original ea roster players'],
    'automatic-force-win':['games affected','assignments to clear','games left untouched'],
    'commentary-id':['players changed','matches proposed','similar-sounding matches accepted'],
    'dealbreaker-fixer':['changes proposed','players evaluated'],
    'jersey-renumber':['players changed','duplicate resolutions'],
    'jersey-no-duplicates':['players changed','duplicate resolutions']
  }[result.resultKind]??[];
  const summary=result.summary??[],chosen=priorities.map(label=>summary.find(item=>item.label.toLowerCase()===label)).filter(Boolean);
  return (chosen.length?chosen:summary).slice(0,3).map(item=>{
    let value=item.value;
    if(preview&&result.resultKind==='automatic-force-win'){
      const omitted=new Set(details.leaveUnchangedRows??[]).size;
      if(/^(games affected|assignments to clear)$/i.test(item.label))value=Math.max(0,Number(value)-omitted);
      if(/^games left untouched$/i.test(item.label))value=Number(value)+omitted;
    }
    return {value,label:preview?item.label.replace(/players changed/i,'Players to update'):item.label.replace(/players to replace/i,'Players regenerated').replace(/teams to regenerate/i,'Teams regenerated')};
  });
}
function runMetricsMarkup(result){return runPrimaryMetrics(result).map(item=>`<div><strong>${escapeHtml(typeof item.value==='number'?item.value.toLocaleString():item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`).join('');}
function runIssues(result){
  const d=result.details??{},blocked=d.blocked??d.blocking??[];
  const describe=item=>typeof item==='string'?item:[item.team,item.player,item.reason].filter(Boolean).join(' · ');
  const notes=[],warnings=[];
  for(const note of [...(d.warnings??[]),...(d.donorSourceWarnings??[])]){
    const message=String(note);
    if((result.resultKind==='equipment-mapper'&&message.startsWith('Mappings run in queue order.'))||(result.resultKind==='equipment-quickstart'&&/^\d+ players could not be randomized\./.test(message)))notes.push(message);
    else warnings.push(message);
  }
  if(d.trackingSaved===false&&!warnings.some(note=>/memory|tracking/i.test(note)))warnings.push('Equipment was saved, but player memory could not be saved. Resolve the memory issue before running equipment tools again.');
  return {blocked:blocked.map(describe),warnings:[...new Set(warnings)],notes};
}
function runStatus(result){
  const issues=runIssues(result),preview=result.mode==='preview',readOnly=state.page==='saved-review',blocked=preview&&(result.details?.canApply===false||issues.blocked.length>0);
  if(readOnly&&preview)return {title:'Saved Preview',message:'This is a read-only record of an earlier preview.',tone:'neutral'};
  if(blocked&&issues.blocked.length)return {title:'Apply Blocked',message:'Resolve the conflicts below before applying this preview.',tone:'error'};
  if(blocked)return {title:'No Changes Ready to Apply',message:'Review the run details or adjust your settings and build a new preview.',tone:'neutral'};
  if(!preview&&result.details?.trackingSaved===false)return {title:'Equipment Saved — Memory Needs Attention',message:'Your equipment changes were saved. Resolve the player-memory issue below before another run.',tone:'warning'};
  if(result.status==='no-changes')return {title:'No Changes Needed',message:'No changes were written to your save.',tone:'neutral'};
  if(!preview)return {title:'Changes Applied',message:result.backupPath?'Your save was updated and a backup was created.':'The run completed successfully.',tone:'success'};
  return {title:'Preview Ready',message:'Your save is unchanged. Review the affected players before applying.',tone:'neutral'};
}
function runIssueMarkup(result){
  const {blocked,warnings}=runIssues(result),messages=[...blocked,...warnings];if(!messages.length)return '';
  return `<div class="notice ${blocked.length?'error':'warning'} run-attention-alert" ${result.resultKind==='roster-generator'?'data-roster-apply-warnings':''}><strong>${blocked.length?'Needs attention':'Review before continuing'}</strong><p>${escapeHtml(messages[0])}</p>${messages.length>1?`<details><summary>${messages.length-1} more notices</summary><ul>${messages.slice(1).map(message=>`<li>${escapeHtml(message)}</li>`).join('')}</ul></details>`:''}</div>`;
}
function runDetailsMarkup(result){
  const d=result.details??{},issues=runIssues(result),overview=d.equipmentOverview;
  const statistics=(result.summary??[]).map(item=>`<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join('');
  return `<section class="run-detail-section"><h3>Run Summary</h3><dl class="run-statistics">${statistics}</dl>${originalEaProtectionSummary(result)}</section>
    ${overview?.byType?.length?`<details class="run-detail-section"><summary>Equipment Changes by Type</summary><table><thead><tr><th>Change</th><th>Players</th><th>Updates</th></tr></thead><tbody>${overview.byType.map(item=>`<tr><td>${escapeHtml(equipmentCorrectionTitle(item.type))}</td><td>${item.players.toLocaleString()}</td><td>${item.changes.toLocaleString()}</td></tr>`).join('')}</tbody></table></details>`:''}
    ${overview?.byTeam?.length?`<details class="run-detail-section"><summary>Players Changed by Team</summary><dl class="run-statistics">${overview.byTeam.map(item=>`<div><dt>${escapeHtml(item.team)}</dt><dd>${item.players.toLocaleString()}</dd></div>`).join('')}</dl></details>`:''}
    <div data-result-settings></div><div data-run-diagnostics>${EQUIPMENT_RESULT_KINDS.includes(result.resultKind)?equipmentSkippedNotice(result)+equipmentSafeguardNotice(result):''}</div>
    ${issues.notes.length?`<details class="run-detail-section"><summary>Run Notes</summary><ul>${issues.notes.map(note=>`<li>${escapeHtml(note)}</li>`).join('')}</ul></details>`:''}
    ${result.reportPath||result.backupPath?`<section class="run-detail-section run-files"><h3>Files & Reports</h3>${result.reportPath?`<div class="actions"><button type="button" class="button secondary" data-open="${escapeHtml(result.reportPath)}">Open ${/\.csv$/i.test(result.reportPath)?'CSV ':''}Report</button>${/\.csv$/i.test(result.reportPath)?`<button type="button" class="button secondary" data-reveal-report="${escapeHtml(result.reportPath)}">Show Report Folder</button>`:''}</div><dl><dt>Report file</dt><dd>${escapeHtml(result.reportPath)}</dd></dl>`:''}${result.backupPath?`<dl><dt>Backup file</dt><dd>${escapeHtml(result.backupPath)}</dd></dl>`:''}</section>`:''}`;
}
function runResultsMarkup(result){
  const status=runStatus(result),equipment=EQUIPMENT_RESULT_KINDS.includes(result.resultKind);
  return `<section class="run-results" data-run-result><div class="run-overview" data-run-tone="${status.tone}"><div class="run-status"><strong data-run-status>${escapeHtml(status.title)}</strong><p data-run-message>${escapeHtml(status.message)}</p></div><div class="run-primary-metrics">${runMetricsMarkup(result)}</div></div>
    <div data-run-attention role="status">${runIssueMarkup(result)}</div><div class="run-result-scroll"><details class="run-details"><summary>Run Details <span>Settings, totals, limits and reports</span></summary><div class="run-details-body">${runDetailsMarkup(result)}</div></details>
    <section class="run-affected"><h3>${equipment?'Affected Players':result.resultKind==='automatic-force-win'?'Schedule Changes':result.mode==='preview'?'Proposed Changes':'Applied Changes'}</h3>${previewPagerMarkup(result)}${resultTable(result)}${previewPagerMarkup(result)}</section></div></section>`;
}
function rememberResultWorkspace(output){
  const workspace=output.closest('.equipment-preview-workspace,.standard-preview-workspace,.force-preview-workspace');
  if(workspace&&!workspace.resultSettingsNode)workspace.resultSettingsNode=workspace.querySelector('.current-configuration');
}
function bindRunResultsUi(output,result){
  if(result.mode==='apply'&&result.details?.trackingSaved===true&&Number.isFinite(result.details?.rememberedAfter)){
    const count=result.details.rememberedAfter,prepared=state.prepared.get('freshman-equipment|'+state.activeSave?.path);if(prepared)prepared.equipmentMemoryCount=count;
    content.querySelectorAll('[data-equipment-memory-count]').forEach(node=>node.textContent=count.toLocaleString()+' players remembered');
    content.querySelectorAll('#randomizer-clear-memory,#quickstart-clear').forEach(node=>node.disabled=count===0);
  }

  output.classList.add('tool-ui','run-output');
  const workspace=output.closest('.equipment-preview-workspace,.standard-preview-workspace,.force-preview-workspace');
  if(workspace){
    workspace.classList.add('tool-ui','ui-results-workspace');workspace.dataset.resultMode=result.mode;
    const header=workspace.querySelector('.dedicated-preview-header');
    if(header){header.querySelector('h2').textContent=result.mode==='preview'?'Preview':'Results';header.querySelector('.eyebrow')?.setAttribute('hidden','');header.querySelector('p')?.setAttribute('hidden','');const edit=header.querySelector('button');if(edit)edit.textContent=result.mode==='preview'?'Edit Settings':'Back to Settings';}
    const bar=workspace.querySelector('.preview-apply-bar');
    if(bar){bar.hidden=result.mode!=='preview';const label=bar.querySelector('strong'),note=bar.querySelector('span'),button=bar.querySelector('button');if(label)label.textContent=result.details?.canApply===false?'Resolve this preview before applying':'Apply the full preview';if(note)note.textContent='Review filters do not change who will be updated. A backup is created before changes are written.';if(button&&(result.mode!=='preview'||result.details?.canApply===false||runIssues(result).blocked.length))button.disabled=true;}
    const target=output.querySelector('[data-result-settings]');if(target&&workspace.resultSettingsNode)target.append(workspace.resultSettingsNode);
  }
  const views='[data-equipment-view],[data-jersey-view],[data-generic-view]';
  const sync=()=>output.querySelectorAll(views).forEach(button=>button.setAttribute('aria-pressed',String(button.classList.contains('active'))));
  output.querySelectorAll(views).forEach(button=>button.addEventListener('click',()=>queueMicrotask(sync)));sync();
  const panel=output.querySelector('[data-run-result]'),scroller=output.querySelector('.run-result-scroll');let scrollTimer;
  panel?.addEventListener('toggle',()=>rememberRunPresentation(output),true);
  scroller?.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{if(panel.isConnected)rememberRunPresentation(output);},100);},{passive:true});
}
function markRunFailure(output,error,mode){
  const status=output.querySelector('[data-run-status]'),message=output.querySelector('[data-run-message]');
  if(status)status.textContent=mode==='apply'?'Apply Did Not Complete':'Preview Did Not Complete';
  if(message)message.textContent='Review the message below before trying again. Your reviewed preview is retained when it is still valid.';
  output.querySelector('.run-overview')?.setAttribute('data-run-tone','error');
  const workspace=output.closest('.ui-results-workspace');if(workspace&&!status)workspace.querySelector('.dedicated-preview-header h2').textContent=mode==='apply'?'Apply Needs Attention':'Preview Needs Attention';
}
function invalidateUnavailablePreview(output,result,error){
  if(!/cached result|already been applied|save changed.*preview|source row.*changed|donor file changed/i.test(error.message))return;
  for(const cache of [state.equipmentPreviews,state.genericPreviews])if(cache.get(result.resultKind)?.planId===result.planId)cache.delete(result.resultKind);
  if(result.mode!=='preview')return; // Searching an old result cannot undo a completed write.
  result.details.canApply=false;
  const button=output.closest('.ui-results-workspace')?.querySelector('.preview-apply-bar button');if(button)button.disabled=true;
  const title=output.querySelector('[data-run-status]'),message=output.querySelector('[data-run-message]');
  if(title)title.textContent='Preview Needs Refresh';
  if(message)message.textContent='Return to settings and run Preview again before applying changes.';
}
