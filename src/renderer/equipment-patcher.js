/* The Patcher flow moves the existing controls and editor launchers. Its
 * serializer, presets, pass order and preview/apply handlers stay unchanged. */
const PATCHER_OPTION_GROUPS = Object.freeze([
  {title:'Helmets & Face',options:[
    {id:'fix-helmet',title:'Improve Helmets and Facemasks',field:'helmet',help:'Keep valid helmet combinations and fix ones that do not fit. Configure a helmet mix or choose Balance All to redistribute existing helmets too.'},
    {id:'fix-visors',title:'Hand Out Visors',field:'visor-settings-field',help:'Give clear Oakley visors to eligible players. Set how often they are added for each position, or fill toward your chosen frequency.'},
    {id:'fix-oakley-visors',title:'Brand Existing Visors',help:'Give existing unbranded visors Oakley branding. The visor keeps its current tint; this option does not add missing visors.',summary:'Existing visors keep their tint and gain Oakley branding.'},
    {id:'fix-unlocked-mouthpieces',title:'Add Mouthpieces',field:'unlocked-mouthpiece-color-field',requirement:'Unlocked v0.97+',help:'Add mouthpieces using your chosen frequency, styles and colors. Existing mouthpieces stay unless you choose to reroll them. Requires CFB27 Unlocked v0.97+ by Orckestra.'}
  ]},
  {title:'Uniform Fit',options:[
    {id:'fix-pants',title:'Above-Knee Pants',help:'Change long pants to the above-knee style.',summary:'Long pants change to the above-knee style.'},
    {id:'fix-rolled',title:'Rolled-Jersey Undershirts',field:'undershirt-field',help:'Add visible undershirts to cropped jerseys that need them. Choose colors and how often players keep the no-shirt look.'},
    {id:'fix-unlocked-lower-jersey',title:'Lower Rolled Jersey',field:'lower-uniform-settings',requirement:'Unlocked v0.97+',help:'Lower supported rolled jerseys. Set the frequency for all positions or adjust each position separately. Requires CFB27 Unlocked v0.97+ by Orckestra.'},
    {id:'fix-unlocked-cutoff-pants',title:'Cutoff Pants',field:'cutoff-uniform-settings',requirement:'Unlocked v0.97+',help:'Add cutoff pants where the outfit fits. Choose frequencies by position and whether to replace all compatible Standard Pants. Other gear is kept. Requires CFB27 Unlocked v0.97+ by Orckestra.'},
    {id:'fix-socks',title:'Mid-Sock Replacement',help:'Replace mid socks using the usual sock mix. Offensive linemen keep mid socks. If Unlocked Sock Styles is also selected, that option takes priority.',summary:'Replace mid socks using the usual mix; offensive linemen keep mid socks.'},
    {id:'fix-unlocked-socks',title:'Unlocked Sock Styles',requirement:'Unlocked v0.97+',help:'Change vanilla mid socks to Crew Cut and vanilla high socks to Unlocked High Socks. Takes priority over Mid-Sock Replacement. Requires CFB27 Unlocked v0.97+ by Orckestra.',summary:'Mid socks become Crew Cut; high socks become Unlocked High Socks.'}
  ]},
  {title:'Accessories & Appearance',options:[
    {id:'fix-sleeves',title:'Equipment Compatibility',help:'Fix supported equipment combinations that overlap or do not fit together.',summary:'Correct supported overlapping or incompatible gear combinations.'},
    {id:'fix-unlocked-recolor',title:'Recolor Accessories',field:'unlocked-color-field',requirement:'Unlocked v0.97+',help:'Recolor existing accessories using shared colors or a mix for each team. Tape can match the accessories or use its own mix. RAW and GameDay Gear recoloring is built in. Requires CFB27 Unlocked v0.97+ by Orckestra; supported RAW items need v3.1.4+ and GameDay Gear items need v2.0+.'},
    {id:'fix-nike',title:'Nike Thigh Pads',help:'Replace generic thigh pads with Nike thigh pads.',summary:'Generic thigh pads become Nike thigh pads.'},
    {id:'fix-remove-equipment',title:'Remove Equipment',field:'remove-equipment-field',help:'Choose items by name from the full catalog. Remove them from your filtered players after all other selected changes.'},
    {id:'fix-handwarmers',title:'Remove Handwarmers',help:'Remove existing handwarmers. Waist playcall bands and all other equipment stay.',summary:'Remove handwarmers while keeping waist playcall bands.'},
    {id:'fix-unlocked-tattoos',title:'Add Tattoos',field:'unlocked-tattoo-field',requirement:'Unlocked v0.97+',help:'Add tattoos from your selected designs. Choose the frequency, placement and arm pairing. Existing tattoos are kept. Cannot be combined with Clear Tattoos. Requires CFB27 Unlocked v0.97+ by Orckestra.'},
    {id:'fix-clear-tattoos',title:'Clear Tattoos',help:'Remove tattoos from eligible players without changing their equipment. Cannot be combined with Add Tattoos.',summary:'Remove existing tattoos without changing equipment.'},
    {id:'fix-bears-pads',title:'Bear’s Pads Sleeve Fit',field:'bears-pads-style-field',requirement:'Bear’s Pads',help:'Fix affected Double, Padded and Compression sleeves on Standard body types. Choose a replacement that keeps the color, no sleeve, or a mix. Requires Bear’s Pads by Bear5.'}
  ]}
]);

function patcherWorkspaceMarkup({scope,rules,optional}) {
  const choose=ToolkitUI.section('Players & Teams','<div data-patcher-scope></div>',{help:'Choose the teams and players these options can change. Player filters work together, and original EA player protection is on by default.'})+
    ToolkitUI.section('Choose Your Changes','<div class="patcher-option-groups">'+PATCHER_OPTION_GROUPS.map((group,index)=>'<section class="ui-option-group"><h3>'+escapeHtml(group.title)+'</h3><div data-patcher-options="'+index+'"></div></section>').join('')+'</div>');
  const configure=ToolkitUI.section('Configure Selected Options','<p class="ui-intro">Defaults are ready to use. Open only the settings you want to adjust.</p><div class="ui-settings-grid" data-patcher-settings></div><div class="ui-empty" data-patcher-empty hidden>Choose an option on the previous page to configure your changes.</div>');
  return ToolkitUI.equipmentFlow({name:'patcher',choose,configure,controls:scope+rules+optional});
}

function mountPatcherFlow() {
  const root=content.querySelector('[data-patcher-flow]');if(!root)return;
  const scope=root.querySelector('.player-pool-layout');
  root.querySelector('[data-patcher-scope]').append(scope);
  const cards=[];
  for(const [index,group] of PATCHER_OPTION_GROUPS.entries())for(const option of group.options){
    const control=document.getElementById(option.id),old=control.closest('.toggle-card,.pass-row');
    const row=ToolkitUI.choice(control,option);old.replaceWith(row);
    root.querySelector(`[data-patcher-options="${index}"]`).append(row);
    let body;
    if(option.field==='helmet'){
      body=root.querySelector('.helmet-settings-summary');
      const button=body.querySelector('button');button.textContent='Configure';button.setAttribute('aria-label','Configure Helmets and Facemasks');
    }else if(option.field){
      body=configurationEntries.get(document.getElementById(option.field))?.entry;
      if(!body)throw Error(`Missing Patcher settings editor: ${option.id}`);
      body.querySelector('button').setAttribute('aria-label','Configure '+option.title);
    }else{
      body=document.createElement('p');body.textContent=option.summary;
    }
    const card=ToolkitUI.settingCard({...option,body});card.dataset.patcherSetting=option.id;
    root.querySelector('[data-patcher-settings]').append(card);cards.push({option,control,card});
  }
  root.patcherCards=cards;
  root.addEventListener('change',()=>refreshPatcherFlow());
  root.querySelectorAll('[data-ui-step]').forEach(button=>button.addEventListener('click',()=>setPatcherStep(Number(button.dataset.uiStep),true)));
  document.getElementById('equipment-step-next').addEventListener('click',()=>setPatcherStep(1,true));
  document.getElementById('equipment-step-back').addEventListener('click',()=>setPatcherStep(0,true));
  document.getElementById('equipment-edit-settings').addEventListener('click',()=>{showEquipmentPreviewWorkspace(false);setPatcherStep(1,true);});
  bindEquipmentReviewEdits('equipment-patcher');bindModelHelp(root);
  setPatcherStep(equipmentWizardState('equipment-patcher').step===0?0:1);
  refreshPatcherFlow();
}

function setPatcherStep(step,focus=false) {
  const root=content.querySelector('[data-patcher-flow]');if(!root)return;
  captureToolSettings();
  const index=step===0?0:1;
  equipmentWizardState('equipment-patcher').step=index;
  ToolkitUI.showStep(root,index);
  root.querySelector('.ui-flow-pages').scrollTop=0;
  document.getElementById('equipment-step-back').hidden=index===0;
  document.getElementById('equipment-step-next').hidden=index!==0;
  document.getElementById('equipment-preview').hidden=index!==1;
  refreshPatcherFlow();
  if(focus){
    const heading=root.querySelector(`[data-ui-page="${index}"] h2`);
    heading.tabIndex=-1;heading.focus({preventScroll:true});heading.scrollIntoView({block:'start'});
  }
}

function refreshPatcherFlow() {
  const root=content.querySelector('[data-patcher-flow]');if(!root?.patcherCards)return;
  const enabled=root.patcherCards.filter(({control,card})=>{card.hidden=!control.checked;return control.checked;});
  const count=enabled.length,configure=equipmentWizardState('equipment-patcher').step!==0;
  document.getElementById('equipment-step-next').disabled=count===0;
  root.querySelector('[data-ui-step="1"]').disabled=count===0;
  root.querySelector('[data-patcher-empty]').hidden=count!==0;
  root.querySelector('.ui-config-review').hidden=count===0;
  const status=count?`${count} ${count===1?'option':'options'} selected${configure?' · Your save stays unchanged until Apply.':''}`:'Choose at least one option to continue.';
  const node=document.getElementById('equipment-step-progress');if(node.textContent!==status)node.textContent=status;
  const preview=document.getElementById('equipment-preview');
  if(!root.querySelector('.tool-progress'))preview.disabled=count===0;
}
