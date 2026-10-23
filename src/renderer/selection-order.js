/* Covers dynamic filters, reviews, saved-history screens and cloned editors.
 * Sort nodes without changing selected values or firing configuration edits. */
function dropdownOrderKey(select){
  return select.dataset.order??select.dataset.batchField??select.dataset.configOriginal??select.id??'';
}
function sortToolkitDropdown(select){
  if(!select||select.matches('.team-picker-source')||select.multiple&&select.closest('[data-option-picker],[data-team-picker]')||select.dataset.order==='preserve')return;
  if(select.id==='force-clear-team'&&document.getElementById('force-clear-team-search')?.value.trim())return; // Preserve explicit search relevance.
  let key=dropdownOrderKey(select);
  if(!key)key=select.dataset.previewFacet??[...select.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name).join(' ');
  const selected=new Set([...select.selectedOptions]),current=select.value,groups=[select,...select.querySelectorAll('optgroup')];
  if(!select.multiple&&select.options.length&&![...select.options].some(option=>option.defaultSelected))select.options[0].defaultSelected=true;
  for(const group of groups){const options=[...group.children].filter(node=>node.tagName==='OPTION'),items=options.map(option=>({value:option.value,label:option.textContent,option})),sorted=ToolkitSelectionOrder.sortChoices(key,items).map(item=>item.option);
    if(sorted.every((option,i)=>option===options[i]))continue;
    const fragment=document.createDocumentFragment();sorted.forEach(option=>fragment.append(option));group.append(fragment);
  }
  for(const option of select.options)option.selected=selected.has(option);
  if(!select.multiple&&selected.size===0)select.value=current;
}
function sortToolkitDropdowns(root=document){if(root.matches?.('select'))sortToolkitDropdown(root);root.querySelectorAll?.('select').forEach(sortToolkitDropdown);}
const pendingDropdowns=new Set();let dropdownSortQueued=false;
new MutationObserver(records=>{
  for(const record of records){if(record.target.matches?.('select,optgroup,option')){const select=record.target.closest('select');if(select)pendingDropdowns.add(select);}for(const node of record.addedNodes){if(node.nodeType!==1)continue;if(node.matches('select'))pendingDropdowns.add(node);node.querySelectorAll('select').forEach(select=>pendingDropdowns.add(select));}}
  if(dropdownSortQueued||!pendingDropdowns.size)return;dropdownSortQueued=true;
  queueMicrotask(()=>{dropdownSortQueued=false;const selects=[...pendingDropdowns];pendingDropdowns.clear();selects.filter(s=>s.isConnected).forEach(sortToolkitDropdown);});
}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('pointerdown',event=>{const select=event.target.closest('select');if(select)sortToolkitDropdown(select);},true);
