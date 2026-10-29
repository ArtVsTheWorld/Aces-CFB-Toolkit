/* Reuse the existing donor/filter editors and canonical controls. Selection
 * changes presentation only; generation and reviewed-plan safety stay intact. */
const RANDOMIZER_OPTIONS = Object.freeze([
  {id:'equipment-unlocked',title:'Unlocked Equipment',origin:'unlocked',requirement:'Unlocked v0.97+',help:'Allow extra equipment from CFB27 Unlocked. Choose categories, item lists and chances on Configure. These choices add gear; they do not remove modded gear copied from donors. Jamo sleeves start off. Requires CFB27 Unlocked v0.97+ by Orckestra.'},
  {id:'equipment-raw-accessories',title:'RAW Accessories',origin:'raw',requirement:'RAW Accessories v3.1.4+',help:'Allow RAW accessories such as necklaces, skullcaps and facepaint. Choose item lists and chances on Configure. RAW Jamo sleeves start off. Gear already copied from donors is kept. Requires RAW Accessories v3.1.4+ by Delonte RAW.'},
  {id:'equipment-truck',title:'GameDay Gear / Equipment Truck',origin:'eljax',requirement:'GameDay Gear v2.0+',help:'Allow supported Equipment Truck items, including sleeves, visors and other accessories. Choose categories, items and chances on Configure. Logo handwarmers start off. Requires GameDay Gear v2.0+ by ElJax YT.'},
  {id:'equipment-no-drip',title:'No Drip Profile',field:'equipment-no-drip-chances',help:'Give some players a simpler look by removing selected accessories. Choose how often this happens for each individual position.'}
]);

function randomizerWorkspaceMarkup({scope,donor,rules}) {
  const choose=ToolkitUI.section('Players & Teams','<div data-randomizer-scope></div>',{help:'Choose who can receive new equipment. Player Filters includes positions, class years, redshirts, overall limits and player protections.'})+
    ToolkitUI.section('Optional Equipment & Style','<p class="ui-intro">Donor equipment is always copied. Select any extra equipment or style changes you want.</p><div class="ui-option-group randomizer-option-list" data-randomizer-options></div>');
  const configure=ToolkitUI.section('Configure Equipment','<p class="ui-intro">Choose where equipment comes from, then adjust any selected extras. Defaults are ready to use.</p><div class="ui-settings-grid" data-randomizer-settings></div>');
  return ToolkitUI.equipmentFlow({name:'randomizer',choose,configure,controls:scope+donor+rules});
}

function mountRandomizerFlow() {
  const root=content.querySelector('[data-randomizer-flow]');if(!root)return;
  root.querySelector('[data-randomizer-scope]').append(root.querySelector('.player-pool-layout'));
  const prepared=state.prepared.get('freshman-equipment|'+state.activeSave?.path);
  root.querySelector('[data-randomizer-scope]').insertAdjacentHTML('beforeend',equipmentMemoryMarkup('randomizer-clear-memory',prepared?.equipmentMemoryCount));
  const clear=document.getElementById('randomizer-clear-memory');clear.addEventListener('click',()=>clearDynastyEquipmentMemory(clear,()=>{clear.disabled=true;root.querySelector('[data-equipment-memory-count]').textContent='0 players remembered';}));
  const settings=root.querySelector('[data-randomizer-settings]'),source=root.querySelector('.donor-settings-content'),donor=configurationEntries.get(source)?.entry;
  if(!donor)throw Error('Donor Settings editor is unavailable.');
  const donorCard=ToolkitUI.settingCard({title:'Donor Settings',help:'Pick whose outfits to copy: the highest-rated players or players you choose yourself. You can use this save or a separate donor file, which stays unchanged.',body:donor});
  donorCard.classList.add('randomizer-donor-card');settings.append(donorCard);
  const cards=[];
  for(const option of RANDOMIZER_OPTIONS){
    const control=document.getElementById(option.id),old=control.closest('.toggle-card'),row=ToolkitUI.choice(control,option);
    old.replaceWith(row);root.querySelector('[data-randomizer-options]').append(row);
    const body=option.origin?root.querySelector(`[data-mod-pool-entry="${option.origin}"]`):configurationEntries.get(document.getElementById(option.field))?.entry;
    if(!body)throw Error(`Missing Randomizer editor: ${option.id}`);
    const button=body.querySelector('button');button.textContent='Configure';button.setAttribute('aria-label','Configure '+option.title);
    const card=ToolkitUI.settingCard({...option,body});card.dataset.randomizerSetting=option.id;
    settings.append(card);cards.push({option,control,card});
  }
  root.randomizerCards=cards;
  root.addEventListener('change',()=>refreshRandomizerFlow());
  root.querySelectorAll('[data-ui-step]').forEach(button=>button.addEventListener('click',()=>setRandomizerStep(Number(button.dataset.uiStep),true)));
  document.getElementById('equipment-step-next').addEventListener('click',()=>setRandomizerStep(1,true));
  document.getElementById('equipment-step-back').addEventListener('click',()=>setRandomizerStep(0,true));
  document.getElementById('equipment-edit-settings').addEventListener('click',()=>{showEquipmentPreviewWorkspace(false);setRandomizerStep(1,true);});
  bindEquipmentReviewEdits('freshman-equipment');bindModelHelp(root);
  setRandomizerStep(equipmentWizardState('freshman-equipment').step===0?0:1);
}

function setRandomizerStep(step,focus=false) {
  const root=content.querySelector('[data-randomizer-flow]');if(!root)return;
  captureToolSettings();const index=step===0?0:1;
  equipmentWizardState('freshman-equipment').step=index;
  ToolkitUI.showStep(root,index);root.querySelector('.ui-flow-pages').scrollTop=0;
  document.getElementById('equipment-step-back').hidden=index===0;
  document.getElementById('equipment-step-next').hidden=index!==0;
  document.getElementById('equipment-preview').hidden=index!==1;
  refreshRandomizerFlow();
  if(focus){const heading=root.querySelector(`[data-ui-page="${index}"] h2`);heading.tabIndex=-1;heading.focus({preventScroll:true});heading.scrollIntoView({block:'start'});}
}

function refreshRandomizerFlow() {
  const root=content.querySelector('[data-randomizer-flow]');if(!root?.randomizerCards)return;
  const selected=root.randomizerCards.filter(({control,card})=>{card.hidden=!control.checked;return control.checked;}).length;
  const status=selected?`Donor equipment + ${selected} ${selected===1?'extra':'extras'}`:'Donor equipment only';
  const node=document.getElementById('equipment-step-progress');if(node.textContent!==status)node.textContent=status;
}
