/* One catalog picker for existing items, replacements and conditions. */
function mapperLibraryPanel(root,prepared,onChoose,{slot=null,filter=()=>true,state={}}={}){
  const items=new Map(prepared.items.map(item=>[item.id,item]));
  const groups=prepared.groups.map(group=>({...group,choices:group.variantIds.map(id=>items.get(id)).filter(item=>item.copyable!==false&&(!slot||item.slot===slot)&&filter(item))})).filter(group=>group.choices.length);
  const categories=[...new Set(groups.map(group=>group.category))].sort();state.page??=0;state.query??='';state.category??='';state.choices??={};
  if(!categories.includes(state.category))state.category='';
  root.innerHTML=`${slot?`<p class="mapper-slot-notice">Equipment side: <strong>${escapeHtml(mapperSlotLabel(slot))}</strong></p>`:''}<div class="mapper-browser-filters"><label>Search Equipment<input class="input" data-map-search type="search" placeholder="Search by equipment name"></label><label>Category<select data-map-category><option value="">All Categories</option>${categories.map(category=>`<option>${escapeHtml(category)}</option>`).join('')}</select></label></div><div class="mapper-library-toolbar"><span data-map-count role="status"></span><div><button type="button" class="button secondary" data-map-prev>Previous</button><button type="button" class="button secondary" data-map-next>Next</button></div></div><div class="mapper-item-list" data-map-items></div>`;
  const search=root.querySelector('[data-map-search]'),category=root.querySelector('[data-map-category]');search.value=state.query;category.value=state.category;
  const render=()=>{
    const query=state.query.trim().toLowerCase(),matches=groups.filter(group=>(!state.category||group.category===state.category)&&`${group.name} ${group.category}`.toLowerCase().includes(query));
    state.page=Math.min(state.page,Math.max(0,Math.ceil(matches.length/100)-1));const start=state.page*100;
    root.querySelector('[data-map-count]').textContent=`${matches.length?start+1:0}–${Math.min(start+100,matches.length)} of ${matches.length.toLocaleString()} items`;
    root.querySelector('[data-map-prev]').disabled=state.page===0;root.querySelector('[data-map-next]').disabled=start+100>=matches.length;
    root.querySelector('[data-map-items]').innerHTML=matches.slice(start,start+100).map(group=>{
      const selected=group.choices.find(item=>item.id===state.choices[group.id])??group.choices[0];
      return `<article class="mapper-item"><div class="mapper-item-description"><strong>${escapeHtml(group.name)}</strong><small>${escapeHtml(group.category)}</small></div><div class="mapper-item-actions">${group.choices.length>1?`<label>Equipment Side<select data-map-choice data-map-group="${escapeHtml(group.id)}">${group.choices.map(item=>`<option value="${escapeHtml(item.id)}"${item.id===selected.id?' selected':''}>${escapeHtml(mapperSlotLabel(item.slot))}</option>`).join('')}</select></label>`:`<span class="mapper-slot-tag">${escapeHtml(mapperSlotLabel(selected.slot))}</span>`}<button type="button" class="button secondary" data-map-choose="${escapeHtml(selected.id)}">Select Item</button></div></article>`;
    }).join('')||'<p class="mapper-empty">No equipment matches. Try another name or category.</p>';
  };
  search.oninput=()=>{state.query=search.value;state.page=0;render();};category.onchange=()=>{state.category=category.value;state.page=0;render();};
  root.querySelector('[data-map-prev]').onclick=()=>{state.page--;render();};root.querySelector('[data-map-next]').onclick=()=>{state.page++;render();};
  root.querySelector('[data-map-items]').onchange=event=>{if(event.target.matches('[data-map-choice]'))state.choices[event.target.dataset.mapGroup]=event.target.value;};
  root.querySelector('[data-map-items]').onclick=event=>{const button=event.target.closest('[data-map-choose]');if(button)onChoose(items.get(button.closest('article').querySelector('[data-map-choice]')?.value??button.dataset.mapChoose));};render();
}

function mountMapperPicker(dialog,host,prepared,{title,description,slot,filter,state,onChoose,onCancel}){
  const heading=dialog.querySelector('h2'),intro=dialog.querySelector('.configuration-description'),actions=dialog.querySelector('.configuration-footer-actions'),dirty=dialog.querySelector('[data-config-dirty]'),close=dialog.querySelector('.configuration-header [data-config-cancel]');
  const old={title:heading.textContent,description:intro.textContent,dirty:dirty.textContent,close:close.textContent,label:close.getAttribute('aria-label')},saved=document.createDocumentFragment();
  while(actions.firstChild)saved.append(actions.firstChild);
  heading.textContent=title;intro.textContent=description;dirty.textContent='Select an item to return to your rule.';close.textContent='Back';close.setAttribute('aria-label','Cancel item selection');
  actions.innerHTML='<button type="button" class="button secondary" data-map-back>Cancel Selection</button>';
  const cancel=event=>{event?.preventDefault();event?.stopImmediatePropagation();finish();onCancel();};
  const finish=()=>{dialog.removeEventListener('cancel',cancel,true);close.removeEventListener('click',cancel,true);heading.textContent=old.title;intro.textContent=old.description;dirty.textContent=old.dirty;close.textContent=old.close;close.setAttribute('aria-label',old.label);actions.replaceChildren(saved);};
  dialog.addEventListener('cancel',cancel,true);close.addEventListener('click',cancel,true);actions.querySelector('[data-map-back]').onclick=cancel;
  mapperLibraryPanel(host,prepared,item=>{finish();onChoose(item);},{slot,filter,state});host.querySelector('[data-map-search]').focus({preventScroll:true});
}

function openMapperBrowser(prepared,onChoose){
  const dialog=createConfigurationDialog({title:'Browse Equipment',description:'Select an existing item to start a replacement rule.',eyebrow:'Equipment Mapper',immediate:true,saveLabel:'Done',className:'mapper-dialog mapper-library-dialog',toolLayout:true});if(!dialog)return;
  dialog.querySelector('[data-config-dirty]').textContent='Browsing does not change your save.';
  mapperLibraryPanel(dialog.querySelector('.configuration-body'),prepared,item=>{dialog.closeEditor();onChoose(item);});dialog.querySelector('[data-config-save]').onclick=()=>dialog.closeEditor();dialog.showModal();
}
