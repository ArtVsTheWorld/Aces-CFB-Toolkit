function openMapperConflictReview(preview,onSave){
  const review=preview.details.conflictReview;if(!review?.groups?.length)return;
  const existing=document.querySelector('dialog.mapper-conflict-review[open]');if(existing)return existing;
  const dialog=createConfigurationDialog({title:'Review Equipment Conflicts',eyebrow:'Equipment Mapper',description:'Choose what happens to each group. Review Fix starts selected and shows the extra outfit changes. Nothing is saved until you apply the reviewed preview.',className:'mapper-conflict-review tool-ui-dialog',saveLabel:'Build Reviewed Preview'});
  const body=dialog.querySelector('.configuration-body'),save=dialog.querySelector('[data-config-save]'),error=dialog.querySelector('[data-config-error]');
  const groups=review.groups,decisions=structuredClone(review.decisions??{groups:{},players:{}}),labels={fix:'Review Fix',skip:'Skip',anyway:'Apply Anyway'};
  let groupIndex=0,page=0,query='',team='',busy=false;
  for(const group of groups)decisions.groups[group.id]??='fix';
  const variants=new Map(groups.map(g=>[g.id,new Map(g.variants.map(v=>[v.id,v]))]));
  const action=(group,p)=>decisions.players[p.row]??decisions.groups[group.id];
  const variant=(group,p)=>variants.get(group.id).get(p.variantId);
  const unresolved=()=>groups.reduce((total,g)=>total+g.players.filter(p=>action(g,p)==='fix'&&!variant(g,p).available).length,0);
  const allPlayers=groups.reduce((n,g)=>n+g.players.length,0);
  body.innerHTML=`<div class="mapper-review-nav"><button type="button" class="button secondary" data-mcr-step="-1">Previous Conflict</button><label>Conflict Group<select data-mcr-group data-order="preserve">${groups.map((g,i)=>`<option value="${i}">${i+1} of ${groups.length} · ${g.players.length.toLocaleString()} players</option>`).join('')}</select></label><button type="button" class="button secondary" data-mcr-step="1">Next Conflict</button></div><div data-mcr-workspace></div>`;
  dialog.querySelector('[data-config-dirty]').textContent=`${allPlayers.toLocaleString()} players need a choice. Your save stays unchanged until Apply.`;
  const changesMarkup=changes=>`<ul class="mapper-fix-changes">${changes.map(c=>`<li><strong>${escapeHtml(mapperSlotLabel(c.slot))}${c.loadout>0?` · Outfit ${c.loadout+1}`:''}</strong><span>${escapeHtml(c.before)} → ${escapeHtml(c.after)}</span></li>`).join('')}</ul>`;
  const status=()=>{
    const count=unresolved();save.disabled=busy||count>0;
    error.textContent=count?`${count.toLocaleString()} player${count===1?' has':'s have'} no verified fix. Choose Skip or Apply Anyway for them, or edit the rule.`:'';
    const totals={fix:0,skip:0,anyway:0};for(const g of groups)for(const p of g.players)totals[action(g,p)]++;
    dialog.querySelector('[data-config-dirty]').textContent=`${totals.fix.toLocaleString()} Review Fix · ${totals.skip.toLocaleString()} Skip · ${totals.anyway.toLocaleString()} Apply Anyway. Save unchanged.`;
  };
  const renderFix=()=>{
    const group=groups[groupIndex],v=group.variants.find(v=>v.id===body.querySelector('[data-mcr-variant]')?.value)??group.variants[0],host=body.querySelector('[data-mcr-fix-details]');
    const usingFix=group.players.some(p=>action(group,p)==='fix');body.querySelector('[data-mcr-variant]').parentElement.hidden=!usingFix;
    if(!usingFix){host.innerHTML=decisions.groups[group.id]==='skip'?'<p>These players keep their original equipment.</p>':'<p class="mapper-fix-unavailable">These players keep your original mapping, including the known incompatibility.</p>';return;}
    host.innerHTML=v.available?`<p>For players using Review Fix, keep your requested mapping and add these outfit adjustments:</p>${changesMarkup(v.changes)}`:`<div class="notice error"><strong>No Verified Fix</strong><p>${escapeHtml(v.reason)}</p></div>`;
  };
  const renderRows=()=>{
    const group=groups[groupIndex],needle=query.trim().toLocaleLowerCase(),matches=group.players.filter(p=>(!team||p.team===team)&&(!needle||[p.player,p.team,localizedPosition(p.position)].join(' ').toLocaleLowerCase().includes(needle))),pages=Math.max(1,Math.ceil(matches.length/50));page=Math.min(page,pages-1);
    const rows=matches.slice(page*50,(page+1)*50);
    body.querySelector('[data-mcr-count]').textContent=matches.length?`${page*50+1}–${Math.min((page+1)*50,matches.length)} of ${matches.length.toLocaleString()} players`:'No players match these filters.';
    body.querySelector('[data-mcr-rows]').innerHTML=rows.map(p=>{const v=variant(group,p);return `<tr><td><strong>${escapeHtml(p.player)}</strong><small>${escapeHtml(p.team)} · ${escapeHtml(localizedPosition(p.position))}</small></td><td><select data-mcr-player="${p.row}" aria-label="Conflict choice for ${escapeHtml(p.player)}" data-order="preserve"><option value="">Use group (${labels[decisions.groups[group.id]]})</option>${Object.entries(labels).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></td><td>${v.available?`<details><summary>View Fix</summary>${changesMarkup(v.changes)}</details>`:'<span class="mapper-fix-unavailable">No verified fix</span>'}</td></tr>`;}).join('')||'<tr><td colspan="3">No matching players.</td></tr>';
    for(const select of body.querySelectorAll('[data-mcr-player]'))select.value=decisions.players[select.dataset.mcrPlayer]??'';
    body.querySelector('[data-mcr-page-label]').textContent=`Page ${page+1} of ${pages}`;body.querySelector('[data-mcr-page="-1"]').disabled=page===0;body.querySelector('[data-mcr-page="1"]').disabled=page===pages-1;
    status();
  };
  const render=()=>{
    const group=groups[groupIndex];body.querySelector('[data-mcr-group]').value=String(groupIndex);body.querySelector('[data-mcr-step="-1"]').disabled=groupIndex===0;body.querySelector('[data-mcr-step="1"]').disabled=groupIndex===groups.length-1;
    const teams=[...new Set(group.players.map(p=>p.team))].sort((a,b)=>a.localeCompare(b));
    body.querySelector('[data-mcr-workspace]').innerHTML=`<section class="mapper-conflict-group"><header><h3>${escapeHtml(group.reason)}</h3><p>${group.players.length.toLocaleString()} affected player${group.players.length===1?'':'s'}</p></header><div class="mapper-conflict-actions">${[['fix','Review Fix','Keep your mapping and review extra outfit changes.'],['skip','Skip','Leave all equipment on this player unchanged.'],['anyway','Apply Anyway','Keep your mapping even if the gear clips or overlaps.']].map(([value,label,help])=>`<label class="toggle-card"><input type="radio" name="mapper-conflict-action" value="${value}" data-mcr-action="${value}"${decisions.groups[group.id]===value?' checked':''}><span><strong>${label}</strong><small>${help}</small></span></label>`).join('')}</div></section><section class="mapper-conflict-fix"><label>Proposed Fix<select data-mcr-variant data-order="preserve">${group.variants.slice(0,20).map((v,i)=>`<option value="${v.id}">${v.available?'Outfit adjustment':'No verified fix'}${group.variants.length>1?` ${i+1} of ${group.variants.length}`:''} · ${v.count.toLocaleString()} players</option>`).join('')}</select></label>${group.variants.length>20?'<p class="muted">Showing 20 fix examples. Use View Fix beside a player for their exact changes.</p>':''}<div data-mcr-fix-details></div></section><section class="mapper-conflict-players"><header><h3>Players in This Group</h3><p>The group choice applies to everyone. Use a player's dropdown to make an exception.</p></header><div class="mapper-conflict-filters"><label>Search<input class="input" type="search" data-mcr-search placeholder="Player, team or position" value="${escapeHtml(query)}"></label><label>Team<select data-mcr-team><option value="">All teams</option>${teams.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}</select></label></div><p class="muted" data-mcr-count></p><div class="preview-scroll"><table><thead><tr><th>Player</th><th>Choice</th><th>Extra Outfit Changes</th></tr></thead><tbody data-mcr-rows></tbody></table></div><nav class="mapper-conflict-pagination" aria-label="Conflict players"><button type="button" class="button secondary" data-mcr-page="-1">Previous</button><span data-mcr-page-label></span><button type="button" class="button secondary" data-mcr-page="1">Next</button></nav></section>`;
    body.querySelector('[data-mcr-team]').value=team;renderFix();renderRows();
  };
  body.addEventListener('change',event=>{
    const input=event.target,group=groups[groupIndex];
    if(input.matches('[data-mcr-action]')){decisions.groups[group.id]=input.value;for(const select of body.querySelectorAll('[data-mcr-player]'))select.options[0].textContent=`Use group (${labels[input.value]})`;renderFix();status();}
    if(input.matches('[data-mcr-player]')){if(input.value)decisions.players[input.dataset.mcrPlayer]=input.value;else delete decisions.players[input.dataset.mcrPlayer];renderFix();status();}
    if(input.matches('[data-mcr-group]')){groupIndex=Number(input.value);page=0;query='';team='';render();}
    if(input.matches('[data-mcr-team]')){team=input.value;page=0;renderRows();}
    if(input.matches('[data-mcr-variant]'))renderFix();
  });
  body.addEventListener('input',event=>{if(event.target.matches('[data-mcr-search]')){query=event.target.value;page=0;renderRows();}});
  body.addEventListener('click',event=>{
    const button=event.target.closest('[data-mcr-step],[data-mcr-page]');if(!button||button.disabled)return;
    if(button.dataset.mcrStep){groupIndex+=Number(button.dataset.mcrStep);page=0;query='';team='';render();}else{page+=Number(button.dataset.mcrPage);renderRows();}
  });
  dialog.querySelector('[data-config-reset]').onclick=()=>{decisions.groups=Object.fromEntries(groups.map(g=>[g.id,'fix']));decisions.players={};render();};
  const close=dialog.closeEditor;dialog.closeEditor=()=>{if(!busy)close();};
  dialog.addEventListener('cancel',event=>{if(busy){event.preventDefault();event.stopImmediatePropagation();}},true);
  const setBusy=value=>{busy=value;for(const control of dialog.querySelectorAll('input,select,button'))control.disabled=value;if(!value){render();status();}};
  save.onclick=async()=>{
    if(busy||unresolved())return;setBusy(true);save.disabled=true;error.textContent='Building the reviewed preview…';
    try{await onSave(structuredClone(decisions));busy=false;close();}catch(cause){setBusy(false);error.textContent=readableError(cause).message;save.disabled=unresolved()>0;}
  };
  render();dialog.showModal();return dialog;
}
