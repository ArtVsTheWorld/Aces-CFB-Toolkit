/* Settings presentation only. Move original controls and bound editor launchers;
 * serializers, defaults, presets and reviewed plans remain owned by each tool. */
const otherToolSteps=new Map();
function beginOtherToolLoading(){
  const ids={'jersey-renumber':'jersey-preview','team-boost':'rating-mode','roster-generator':'roster-caliber','nil-toggle':'nil-target','dealbreaker-fixer':'db-preview','commentary-id':'analyze-commentary','equipment-quickstart':'quickstart-raw','equipment-mapper':'mapper-rules','long-snap':'preview','automatic-force-win':'force-action'};
  if(!document.getElementById(ids[state.page])||state.page==='commentary-id'&&state.commentaryReview)return;
  let workspace=content.querySelector('.standard-config-workspace,#force-config-workspace');
  if(!workspace&&state.page==='commentary-id'){const workbench=content.querySelector('.tool-workbench');if(!workbench)return;workspace=otherToolNode('div','standard-config-workspace');workbench.before(workspace);workspace.append(workbench);}
  if(!workspace||workspace.querySelector('[data-other-tool-flow]')||workspace.classList.contains('ui-pending-workspace'))return;
  workspace.classList.add('ui-pending-workspace');
  const message=otherToolNode('div','ui-pending-message tool-ui',`<h2>Loading Settings</h2>${toolLoading('Reading players and settings…')}`);message.dataset.uiPendingMessage='';workspace.prepend(message);
}
function showOtherToolLoadingError(error){
  const message=content.querySelector('[data-ui-pending-message]');if(!message)return false;
  message.innerHTML=`<div class="notice warning"><strong>Settings Could Not Be Loaded</strong><p>${escapeHtml(readableError(error).message)}</p></div><button type="button" class="button secondary" data-retry-tool-settings>Try Again</button>`;
  message.querySelector('button').onclick=()=>{captureToolSettings();delete content.dataset.commentaryScopeError;render();};return true;
}
function otherToolNode(tag,className='',html=''){
  const node=document.createElement(tag);node.className=className;node.innerHTML=html;return node;
}
function restoreCondensedToolControl(element){
  const saved=configurationEntries.get(element);if(!saved)return element;
  saved.entry.before(element);saved.entry.remove();saved.source.remove();configurationEntries.delete(element);return element;
}
function toolEditorFor(element){return configurationEntries.get(element)?.entry;}
function toolFlowSection(title,help=''){
  return otherToolNode('section','ui-section',`<header class="ui-section-heading"><h2>${escapeHtml(title)}${help?' '+modelHelpButton(title,help):''}</h2></header><div class="tool-section-content"></div>`);
}
function toolFlowField(id,help=''){
  const control=document.getElementById(id),field=otherToolNode('div','tool-control-field');
  const label=content.querySelector(`label[for="${id}"]`);
  if(label){field.append(label);if(help&&!label.querySelector('.model-help-button'))label.insertAdjacentHTML('beforeend',' '+modelHelpButton(label.textContent,help));}
  field.append(control);return field;
}
function toolInlineCard(id,title,help,extra=[]){
  const card=otherToolNode('section','ui-setting-card ui-inline-setting',`<header class="ui-section-heading"><h3>${escapeHtml(title)} ${modelHelpButton(title,help)}</h3></header><div class="tool-inline-body"></div>`),field=toolFlowField(id);
  field.classList.add('tool-inline-field');field.querySelector('select,input').setAttribute('aria-label',title);card.lastElementChild.append(field,...extra);return card;
}
function toolFlowChoice(id,title,help){
  const control=document.getElementById(id),old=control.closest('label,.toggle-card');
  const row=ToolkitUI.choice(control,{title,help});if(old.id)row.id=old.id;old.replaceWith(row);return row;
}
function toolModeChoices(grid){
  grid.classList.add('ui-mode-options');
  grid.querySelectorAll('.mode-card').forEach(label=>{
    const small=label.querySelector('small'),strong=label.querySelector('strong');
    if(small&&strong&&!label.querySelector('.model-help-button'))strong.insertAdjacentHTML('afterend',' '+modelHelpButton(strong.textContent,small.textContent));
  });return grid;
}
function toolFlowCard(title,help,entry){
  const button=entry.querySelector('button');if(button){button.textContent='Configure';button.setAttribute('aria-label','Configure '+title);}
  return ToolkitUI.settingCard({title,help,body:entry});
}
function condenseToolFields(fields,specification){
  const owner=otherToolNode('div','tool-editor-fields');fields.filter(Boolean).forEach(node=>owner.append(node));
  content.querySelector('[data-other-tool-bank]').append(owner);
  condenseConfiguration(owner,specification);return toolEditorFor(owner);
}
function createOtherToolFlow(workspace,{kind,previewId,twoPages=false,previewLabel='Preview Changes'}){
  workspace.querySelector('[data-ui-pending-message]')?.remove();workspace.classList.remove('ui-pending-workspace');
  const original=[...workspace.childNodes],bank=otherToolNode('div','ui-control-bank');bank.hidden=true;bank.dataset.otherToolBank='';original.forEach(node=>bank.append(node));
  const root=otherToolNode('section','ui-setup-flow');root.dataset.otherToolFlow=kind;
  root.innerHTML=`<div class="ui-presets-bar"><div class="tool-command-bar actions ui-tool-commands"></div></div>${twoPages?ToolkitUI.steps(['Choose Options','Configure']):''}<div class="ui-flow-pages"><div data-ui-page="0"></div>${twoPages?'<div data-ui-page="1" hidden></div>':''}</div><div class="ui-flow-run-status" role="status" aria-live="polite"></div>${ToolkitUI.actions({backId:'tool-step-back',nextId:'tool-step-next',previewId:'tool-flow-preview-placeholder',statusId:'tool-step-progress'})}`;
  workspace.classList.add('tool-ui','ui-other-workspace');workspace.append(root);root.append(bank);
  const preview=bank.querySelector('#'+previewId)??document.getElementById(previewId);
  root.querySelector('#tool-flow-preview-placeholder').replaceWith(preview);preview.textContent=previewLabel;preview.hidden=twoPages;
  root.flowPreview=preview;root.twoPages=twoPages;
  const commands=root.querySelector('.ui-tool-commands'),presets=bank.querySelector('.config-presets'),reset=bank.querySelector('#reset-tool-defaults');
  if(presets)root.querySelector('.ui-presets-bar').prepend(presets);if(reset)commands.append(reset);
  root.querySelectorAll('[data-ui-step]').forEach(button=>button.onclick=()=>showOtherToolStep(root,Number(button.dataset.uiStep),true));
  root.querySelector('#tool-step-next').onclick=()=>showOtherToolStep(root,1,true);
  root.querySelector('#tool-step-back').onclick=()=>showOtherToolStep(root,0,true);
  root.addEventListener('click',event=>{if(event.target.closest('#reset-tool-defaults'))otherToolSteps.delete(kind);},true);
  root.addEventListener('change',()=>refreshOtherToolFlow(root));
  return root;
}
function showOtherToolStep(root,index,focus=false){
  const step=root.twoPages&&index===1&&(!root.canConfigure||root.canConfigure())?1:0;
  captureToolSettings();otherToolSteps.set(root.dataset.otherToolFlow,step);ToolkitUI.showStep(root,step);
  root.querySelector('#tool-step-next').hidden=!root.twoPages||step!==0;root.querySelector('#tool-step-back').hidden=step===0;
  root.flowPreview.hidden=root.twoPages&&step===0;root.querySelector('.ui-flow-pages').scrollTop=0;refreshOtherToolFlow(root);
  if(focus){const heading=root.querySelector(`[data-ui-page="${step}"] h2`);if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
}
function finishOtherToolFlow(root,{canConfigure,status,refresh}={}){
  root.canConfigure=canConfigure;root.flowStatus=status;root.refreshFlow=refresh;
  // Some existing editors install hidden controls late. Restore their saved
  // values before step navigation captures the newly assembled form.
  restoreToolSettings();bindModelHelp(root);showOtherToolStep(root,otherToolSteps.get(root.dataset.otherToolFlow)??0);
}
function refreshOtherToolFlow(root){
  const ready=!root.canConfigure||root.canConfigure();root.querySelector('#tool-step-next').disabled=!ready;
  if(!ready&&root.querySelector('[data-ui-page="1"]:not([hidden])'))showOtherToolStep(root,0);
  const text=root.flowStatus?.()??'Preview is read-only. Review the results before Apply.',node=root.querySelector('.ui-flow-status');if(node.textContent!==text)node.textContent=text;
  root.refreshFlow?.();
}
function addToolSection(root,page,title,help,body){
  const section=toolFlowSection(title,help);if(body)section.lastElementChild.append(body);root.querySelector(`[data-ui-page="${page}"]`).append(section);return section.lastElementChild;
}
function toolSettingsGrid(...cards){const grid=otherToolNode('div','ui-settings-grid');cards.forEach(card=>grid.append(card));return grid;}

function mountJerseySettings(workspace){
  const rules=document.getElementById('jersey-team-rules').closest('.toggle-grid'),mode=toolModeChoices(workspace.querySelector('.mode-choice-grid'));
  const skipped=toolEditorFor(document.getElementById('jersey-skipped').closest('[data-team-picker]'));
  const custom=document.getElementById('jersey-custom-open').closest('.configuration-entry');
  const root=createOtherToolFlow(workspace,{kind:'jersey-renumber',previewId:'jersey-preview',twoPages:true});
  addToolSection(root,0,'Numbering Style','Standard follows realistic number sharing. No Duplicates gives each player on a team a unique number.',mode);
  const teams=toolFlowCard('Teams to Skip','Selected teams keep their current numbers. Remove a team from this list to renumber it.',skipped);
  const protection=document.getElementById('jersey-protect-ea')?toolFlowChoice('jersey-protect-ea','Protect Original EA Roster Players','Keep the numbers of original EA players. This uses the toolkit’s player reference, independently of the NIL flag.'):otherToolNode('p','','No Duplicates can renumber original EA players. Use Player Locks on Configure to protect individual numbers.');
  addToolSection(root,0,'Teams & Protection','Choose which rosters and players keep their current numbers.',toolSettingsGrid(teams,ToolkitUI.settingCard({title:'Player Protection',help:'Keep original EA players’ numbers in Standard mode, or use Player Locks in either mode.',body:protection})));
  const choices=otherToolNode('div','ui-option-group');
  for(const [id,title,help]of [['jersey-team-rules','Team-Specific Traditions','Use supported jersey traditions for each team. Custom team rules are available on Configure.'],['jersey-retired','Protect Retired Numbers','Keep supported retired numbers out of the available pool. Team overrides are available on Configure.'],['jersey-promotions','Jersey Promotions','Move eligible players into preferred numbers when the allocation rules allow it. Standard also fills remaining low-number openings.']])choices.append(toolFlowChoice(id,title,help));
  addToolSection(root,0,'Numbering Rules','Choose the rules this run should follow.',choices);
  addToolSection(root,1,'Configure Numbering','Defaults are ready to use. Adjust player locks, team traditions and retired numbers only where needed.',toolSettingsGrid(toolFlowCard('Player Locks & Team Number Rules','Keep individual numbers or customize team traditions and retired numbers. All three editors remain available.',custom)));
  rules.remove();finishOtherToolFlow(root,{status:()=>state.jerseyMode==='no-duplicates'?'No Duplicates · one number per player on each team':'Standard · realistic number sharing'});
}
function mountBoostSettings(workspace){
  const teams=toolEditorFor(document.getElementById('team-search').closest('[data-team-picker]'));
  const scope=document.getElementById('player-scope').closest('.ops-section-body'),extra=scope.querySelector('.extra-player-scope'),positions=document.getElementById('boost-positions').closest('[data-option-picker]');
  restoreCondensedToolControl(extra);restoreCondensedToolControl(positions);
  const condition=otherToolNode('div','tool-player-condition');condition.append(toolFlowField('player-scope'));condition.append(document.getElementById('player-scope-help'));scope.prepend(condition);
  const range=document.getElementById('minimum').closest('.field-grid'),overrides=document.getElementById('configure-boost-ranges').closest('.configuration-entry'),attributes=toolEditorFor(document.getElementById('boost-attributes').closest('[data-option-picker]'));
  const root=createOtherToolFlow(workspace,{kind:'team-boost',previewId:'preview',twoPages:true});
  condenseConfiguration(scope,{title:'Player Filters',description:'Filters narrow the teams selected for this run. Above/below-average scope compares each player with their own position room.',summary:s=>[configurationLabel(s,'player-scope'),selectSummary('boost-positions','All Positions'),selectSummary('boost-classes','All Class Years'),selectSummary('boost-redshirt')].join(' · ')});
  addToolSection(root,0,'Players & Teams','Choose the teams to adjust, then narrow the player list if needed.',toolSettingsGrid(toolFlowCard('Teams','Choose one or more teams whose ratings should change.',teams),toolFlowCard('Player Filters','Combine position, class year, redshirt status, individual players and above/below-average scope.',toolEditorFor(scope))));
  addToolSection(root,0,'Rating Options','Choose which ratings can change.',toolSettingsGrid(toolInlineCard('rating-mode','Ratings to Adjust','Relevant Ratings adjusts the skills used by each player’s position. Specific Attributes changes every supported attribute you select.')));
  const rangeEntry=condenseToolFields([range],{title:'Rating Adjustments',description:'Positive values raise ratings; negative values lower them. Positions without an override use the main range.',summary:s=>`${configurationRead(s,'minimum').value} to ${configurationRead(s,'maximum').value}`,validate:s=>{const min=configurationNumber(s,'minimum'),max=configurationNumber(s,'maximum');return !Number.isInteger(min)||!Number.isInteger(max)||min < -99||max>99||min>max?'Use whole numbers from -99 to 99, with minimum no greater than maximum.':'';}});
  const grid=toolSettingsGrid(toolFlowCard('Rating Adjustments','Set the minimum and maximum rating change. The limits are inclusive.',rangeEntry),toolFlowCard('Position Adjustments','Give selected position groups their own adjustment range.',overrides),toolFlowCard('Specific Attributes','Choose the attributes to adjust when Specific Attributes is selected.',attributes));
  const attrCard=grid.lastElementChild;
  addToolSection(root,1,'Configure Ratings','Adjust the rating range and any selected attribute or position settings.',grid);
  finishOtherToolFlow(root,{canConfigure:()=>document.getElementById('team-search').selectedOptions.length>0,status:()=>document.getElementById('team-search').selectedOptions.length?`${document.getElementById('team-search').selectedOptions.length} teams selected`:'Select at least one team to continue.',refresh:()=>{attrCard.hidden=document.getElementById('rating-mode').value!=='specific';}});
}
function mountRosterSettings(workspace){
  const fieldset=document.getElementById('roster-options'),teams=toolEditorFor(document.getElementById('roster-teams').closest('[data-team-picker]'));
  const changeNotice=workspace.querySelector('.roster-generator-config-grid>.notice')??workspace.querySelector('.roster-generator-config-grid>div>.notice');
  const root=createOtherToolFlow(workspace,{kind:'roster-generator',previewId:'preview',twoPages:true});
  addToolSection(root,0,'Teams to Regenerate','Select one or more teams. Each selected roster is replaced with fictional players.',toolSettingsGrid(toolFlowCard('Teams','Choose the rosters to replace.',teams)));
  const note=otherToolNode('div','notice tool-important-note','<strong>Selected rosters will be replaced.</strong><p>Preview creates a new roster. Apply writes the exact players you reviewed and creates a backup first.</p>');
  if(changeNotice?.querySelector('.model-help-button'))note.firstElementChild.append(' ',changeNotice.querySelector('.model-help-button'));root.querySelector('[data-ui-page="0"]').append(note);
  if(state.prepared.get('roster-generator|'+state.activeSave.path)?.fileKind==='roster')note.insertAdjacentHTML('beforeend','<p>Play Now roster file · Reorder generated depth charts in-game.</p>');
  const grid=toolSettingsGrid();
  for(const [id,title,help]of [['roster-build-config','Roster Caliber','Choose current talent, age and future potential separately.'],['roster-scheme-config','Offensive & Defensive Schemes','Choose schemes and whether to keep current position counts or build to the schemes’ needs.'],['roster-strength-config','Position Strength','Spread the talent budget across positions. All shares and estimates remain available.'],['roster-appearance-config','Appearance & Names','Choose the skin-tone mix. Fictional identities and backstories are generated automatically.']])grid.append(toolFlowCard(title,help,toolEditorFor(document.getElementById(id))));
  const teamEntry=document.getElementById('roster-team-overrides'),teamCard=toolFlowCard('Team Settings','Give each selected team its own roster setup, or build a varied group of teams.',teamEntry);
  fieldset.querySelector('legend')?.remove();fieldset.append(grid,teamCard);fieldset.classList.add('tool-roster-config');
  addToolSection(root,1,'Configure Rosters','Defaults are ready to use. Shared settings apply unless you configure individual teams.',fieldset);
  finishOtherToolFlow(root,{canConfigure:()=>document.getElementById('roster-teams').selectedOptions.length>0,status:()=>document.getElementById('roster-teams').selectedOptions.length?`${document.getElementById('roster-teams').selectedOptions.length} teams selected`:'Select at least one team to continue.',refresh:()=>{teamCard.hidden=document.getElementById('roster-teams').selectedOptions.length<2;}});
}
function mountNilSettings(workspace){
  const modes=workspace.querySelector('.nil-flag-choices'),scope=workspace.querySelectorAll('.ops-section')[1].querySelector('.configuration-entry');
  modes.querySelectorAll('.mode-card').forEach(label=>{const enabled=label.querySelector('input').value==='false';label.querySelector('strong').textContent=enabled?'Allow In-Game Editing':'Restrict In-Game Editing';label.querySelector('small').textContent=enabled?'Set the NIL flag to False for matching players. This allows in-game editing.':'Set the NIL flag to True for matching players. This restricts in-game editing.';});toolModeChoices(modes);
  const root=createOtherToolFlow(workspace,{kind:'nil-toggle',previewId:'preview'});
  addToolSection(root,0,'In-Game Editing','The NIL flag controls whether matching players can be edited in-game. It does not identify real-life NIL players.',modes);
  addToolSection(root,0,'Players & Teams','Combine filters to narrow the selection. Empty filters include the entire active roster.',toolSettingsGrid(toolFlowCard('Player Filters','Choose teams, positions, class years, redshirt status or specific players.',scope)));
  finishOtherToolFlow(root,{status:()=>['nil-teams','nil-players','nil-positions','nil-classes'].every(id=>!document.getElementById(id).selectedOptions.length)&&document.getElementById('nil-redshirts').value==='all'?'Entire active roster · review the target flag carefully.':'Only matching players will be included.'});
}
function mountDealbreakerSettings(workspace){
  const mix=toolEditorFor(workspace.querySelector('.distribution-grid').closest('.ops-section-body')),protection=toolEditorFor(document.querySelector('#db-protection-source')??document.getElementById('db-protected-values').closest('[data-db-protection]'));
  const root=createOtherToolFlow(workspace,{kind:'dealbreaker-fixer',previewId:'db-preview'}),choices=otherToolNode('div','ui-option-group');
  choices.append(toolFlowChoice('db-restrict-style','Limit Playing Style to HB, WR & TE','Allow new Playing Style dealbreakers only for halfbacks, wide receivers and tight ends. Leave off to allow every position.'),toolFlowChoice('db-fix-style','Fix Invalid Playing Style Assignments','When the position limit is on, also replace existing Playing Style dealbreakers on other positions.'));
  addToolSection(root,0,'Playing Style Eligibility','Choose whether Playing Style is available to every position.',choices);
  addToolSection(root,0,'Assignment Settings','Defaults are ready to use. The player’s situation also influences which dealbreaker they receive.',toolSettingsGrid(toolFlowCard('Starting Dealbreaker Mix','Set starting weights. None is a minimum share of the dynasty, rather than a chance to erase existing dealbreakers.',mix),toolFlowCard('Protected Dealbreakers & Players','Keep selected existing dealbreakers and players unchanged.',protection)));
  finishOtherToolFlow(root);
}
function mountCommentarySettings(workspace){
  const scope=document.getElementById('commentary-classes').closest('.extra-player-scope');restoreCondensedToolControl(scope);
  scope.append(document.getElementById('freshmen-only').closest('.toggle-card'));
  const root=createOtherToolFlow(workspace,{kind:'commentary-id',previewId:'analyze-commentary',previewLabel:'Analyze Matches'});
  condenseConfiguration(scope,{title:'Player Filters',description:'All filters work together. Original EA roster players are always protected.',summary:()=>affectedScopeSummary()});
  addToolSection(root,0,'Players & Teams','Choose whose spoken names to check. Original EA roster players stay protected.',toolSettingsGrid(toolFlowCard('Player Filters','Combine teams, positions, class years, redshirt status and individual players. True Freshmen Only is available inside.',toolEditorFor(scope))));
  const choices=otherToolNode('div','ui-option-group');
  for(const [id,title,help]of [['phonetic','Suggest Similar-Sounding Last Names','Suggest spoken names that sound similar when an exact last name is unavailable. You must accept or reject each suggestion before Apply.'],['first-name','Use First Name When Last Name Is Unavailable','Use an exact spoken first name if there is no last-name match.'],['preserve-unmatched','Keep Existing IDs When No Match Is Found','Keep the player’s current commentary ID when the toolkit cannot find a match.']])choices.append(toolFlowChoice(id,title,help));
  addToolSection(root,0,'Matching Rules','Choose how the toolkit can find spoken names.',choices);
  root.querySelector('.ui-flow-run-status').append(document.getElementById('analysis-output'));finishOtherToolFlow(root);
}
function mountQuickstartSettings(workspace){
  const playerBody=workspace.querySelectorAll('.ops-section')[1].querySelector('.ops-section-body'),root=createOtherToolFlow(workspace,{kind:'equipment-quickstart',previewId:'preview'}),choices=otherToolNode('div','ui-option-group');
  for(const [id,title,help]of [['quickstart-unlocked','CFB27 Unlocked v0.97+','Add the Unlocked equipment pool and its included corrections. Accessory colors use team percentages; tape matches accessory color. Requires Orckestra’s Unlocked v0.97+.'],['quickstart-raw','RAW Accessories v3.1.4+','Add RAW’s default accessory pool. RAW Jamo sleeves start off. Requires Delonte RAW’s RAW Accessories v3.1.4+.'],['quickstart-gameday','GameDay Gear v2.0+','Add the default Equipment Truck pool and team logo/brand clear visors. Other visor tints are kept. Requires ElJax YT’s GameDay Gear v2.0+.']])choices.append(toolFlowChoice(id,title,help));
  choices.classList.add('quickstart-mod-options');addToolSection(root,0,'Mods You Use','Leave these off for an unmodded game.',choices);
  const protection=toolFlowChoice('quickstart-protect-ea','Protect Original EA Roster Players','Keep original EA roster players unchanged. Turn this off to include them.');playerBody.prepend(protection);playerBody.classList.add('tool-quickstart-memory');addToolSection(root,0,'Players in This Dynasty','Previously equipped players are skipped. Quickstart and Randomizer share player memory on this computer.',playerBody);
  finishOtherToolFlow(root);
}
function mountLongSnapSettings(workspace){
  const rules=workspace.querySelector('.rule-summary-grid'),root=createOtherToolFlow(workspace,{kind:'long-snap',previewId:'preview'});
  addToolSection(root,0,'Long Snap Ratings','Only eligible tight ends and offensive linemen outside these ranges change. Other ratings and already-valid players stay unchanged.',rules);
  root.querySelector('[data-ui-page="0"]').insertAdjacentHTML('beforeend','<p class="ui-intro">No settings are needed. Preview the corrections before applying them.</p>');finishOtherToolFlow(root);
}
function mountMapperSettings(workspace){
  const sections=workspace.querySelectorAll('.ops-section'),library=sections[0].querySelector('.ops-section-body'),rules=sections[1].querySelector('.ops-section-body'),add=document.getElementById('mapper-add'),reload=document.getElementById('mapper-reload');
  const root=createOtherToolFlow(workspace,{kind:'equipment-mapper',previewId:'mapper-preview'});
  const first=addToolSection(root,0,'Equipment Library','Browse saved gear or choose equipment from a player. Copy and replacement rules are reviewed before Apply.',library);first.parentElement.querySelector('header').append(reload);
  const queue=addToolSection(root,0,'Replacement Rules','Rules run in the order shown. Each rule keeps its own target players, colors, pairing and per-team cap.',rules);queue.parentElement.querySelector('header').append(add);
  root.querySelector('.ui-flow-run-status').append(document.getElementById('mapper-status'));finishOtherToolFlow(root);
}
function mountForceSettings(workspace){
  const root=createOtherToolFlow(workspace,{kind:'automatic-force-win',previewId:'force-preview',twoPages:true});
  addToolSection(root,0,'What to Do','Choose an action. Nothing is written until Apply.',toolSettingsGrid(toolInlineCard('force-action','Action','Propose new force wins, or clear existing assignments.')));
  const clear=document.getElementById('force-clear'),evaluate=document.getElementById('force-evaluate');
  const scope=toolInlineCard('force-scope','Schedule Scope','Choose which upcoming games to evaluate.',[document.getElementById('force-week-field')]);
  const user=toolFlowChoice('force-user-only','User Schedule Only',document.getElementById('force-user-only-help').textContent),skipped=toolEditorFor(document.getElementById('force-skipped').closest('[data-team-picker]'));
  const evaluateScope=addToolSection(root,0,'Games & Protection','Choose upcoming games and protect teams that should keep their existing assignments.',toolSettingsGrid(scope,ToolkitUI.settingCard({title:'Games to Evaluate',help:document.getElementById('force-user-only-help').textContent,body:user})));evaluateScope.append(toolSettingsGrid(toolFlowCard('Teams to Skip','Selected teams and their games are protected. Controlled teams start selected.',skipped)));
  const evaluateSettings=addToolSection(root,1,'Configure Matchups','Choose how often the tool steps in and how it compares teams.'),grid=toolSettingsGrid(toolInlineCard('force-involvement','Tool Involvement','Choose how often the tool steps in, from only the biggest mismatches to every eligible game.'),toolInlineCard('force-profile','Matchup Model','Choose how teams are compared. Custom models keep every detailed adjustment available.'));
  const custom=toolFlowCard('Custom Matchup Model','Start from an existing model, tune its influences and set a weekly limit.',document.getElementById('custom-model-entry'));
  const fcs=otherToolNode('div','ui-option-group');fcs.append(toolFlowChoice('force-fcs','Force Every Eligible FCS Matchup','Assign the favorite in every eligible FCS matchup. Team protections, completed games and active-week restrictions still apply.'));
  evaluateSettings.append(grid,toolSettingsGrid(custom),fcs);
  addToolSection(root,1,'Clear Existing Assignments','Choose which existing force wins to remove. The preview shows every proposed removal.',clear);
  const oldReview=document.getElementById('force-review-workspace');root.querySelector('.ui-flow-run-status').append(document.getElementById('force-review-status'));
  oldReview.hidden=true;
  finishOtherToolFlow(root,{refresh:()=>{const clearing=document.getElementById('force-action').value==='clear';evaluateScope.parentElement.hidden=clearing;evaluateSettings.parentElement.hidden=clearing;clear.parentElement.parentElement.hidden=!clearing;custom.hidden=document.getElementById('force-profile').value!=='custom';}});
  evaluate.hidden=true;
}
function mountRemainingToolFlow(){
  if(state.page==='commentary-id'&&state.commentaryReview&&document.getElementById('review-table')){mountCommentaryDecisionReview();return;}
  const ready={
    'jersey-renumber':['jersey-custom-json',mountJerseySettings],
    'team-boost':['boost-position-ranges',mountBoostSettings],
    'roster-generator':['roster-build-config',mountRosterSettings],
    'nil-toggle':['nil-target',mountNilSettings],
    'dealbreaker-fixer':['db-protected-values',mountDealbreakerSettings],
    'commentary-id':['commentary-classes',mountCommentarySettings],
    'equipment-quickstart':['quickstart-raw',mountQuickstartSettings],
    'equipment-mapper':['mapper-rules',mountMapperSettings],
    'long-snap':['preview',mountLongSnapSettings],
    'automatic-force-win':['force-user-only',mountForceSettings]
  }[state.page];if(!ready||!document.getElementById(ready[0]))return;
  let workspace=content.querySelector('.standard-config-workspace,#force-config-workspace');
  if(!workspace&&state.page==='commentary-id'&&!state.commentaryReview){workspace=otherToolNode('div','standard-config-workspace');const workbench=content.querySelector('.tool-workbench');if(!workbench)return;workbench.before(workspace);workspace.append(workbench);}
  if(!workspace)return;
  const mounted=workspace.querySelector('[data-other-tool-flow]');if(mounted){refreshOtherToolFlow(mounted);return;}
  if(state.page==='team-boost'&&!document.getElementById('boost-classes'))return;
  if(state.page==='roster-generator'&&!toolEditorFor(document.getElementById('roster-appearance-config')))return;
  ready[1](workspace);
}
function mountCommentaryDecisionReview(){
  const workspace=content.querySelector('.standard-config-workspace');if(!workspace||workspace.hasAttribute('data-ui-tool-review'))return;
  const panel=workspace.querySelector(':scope>section'),review=state.commentaryReview;
  workspace.dataset.uiToolReview='';workspace.classList.add('tool-ui','ui-other-workspace');
  const frame=otherToolNode('section','ui-setup-flow'),scroll=otherToolNode('div','ui-flow-pages');
  const heading=toolFlowSection('Review Spoken Names','Accept or reject each similar-sounding name. Exact matches are handled automatically.');
  const toolbar=panel.querySelector('.review-toolbar'),filter=document.getElementById('review-filter'),filters=otherToolNode('div','tool-review-filter-row');
  filter.type='search';filter.placeholder='Search players, teams or spoken names';filter.setAttribute('aria-label','Search commentary matches');
  const search=otherToolNode('label','tool-review-search','Search');search.append(filter);filters.append(search);toolbar.classList.add('tool-review-toolbar');
  const selects=[...toolbar.querySelectorAll('select')];selects.forEach((select,index)=>{const label=otherToolNode('label','',index===0?'Team':'Match Type');label.append(select);filters.append(label);});
  const reset=otherToolNode('button','button secondary','Reset Filters');reset.type='button';reset.dataset.resetCommentaryFilters='';
  const syncReset=()=>reset.disabled=!filter.value&&!selects.some(select=>select.value);filter.addEventListener('input',syncReset);selects.forEach(select=>select.addEventListener('change',syncReset));
  reset.onclick=()=>{review.filter='';review.teamFilter='';review.methodFilter='';filter.value='';selects.forEach(select=>select.value='');refreshCommentaryReviewRows();syncReset();};filters.append(reset);syncReset();
  const bulk=otherToolNode('div','tool-review-decision-actions');bulk.append(...toolbar.childNodes);toolbar.append(filters,bulk);
  for(const [id,label]of [['accept-all','Accept All Suggestions'],['reject-all','Reject All Suggestions'],['reset-review','Reset Decisions']])document.getElementById(id).textContent=label;
  const metrics=panel.querySelector('.metric-grid');metrics.classList.add('tool-review-metrics');
  metrics.children[2].querySelector('small').textContent='Suggestions to review';
  const details=otherToolNode('details','run-details','<summary>Match Details <span>Coverage and matching rules</span></summary><div class="run-details-body"></div>');details.lastElementChild.append(metrics.lastElementChild);details.lastElementChild.insertAdjacentHTML('beforeend','<p>Exact matches are handled automatically. Only similar-sounding suggestions need an Accept or Reject decision.</p>');
  const notice=panel.querySelector('.notice');notice.classList.add('tool-review-attention');
  const pending=review.analysis.proposals.filter(item=>item.requiresDecision&&typeof review.decisions[item.row]!=='boolean').length;
  notice.innerHTML=`<strong>${pending?`${pending} ${pending===1?'suggestion needs':'suggestions need'} a decision`:'All suggestions reviewed'}</strong>`;
  // The original handlers recreate the page after a decision; all decisions
  // still live in the same review model, never in these presentation nodes.
  heading.lastElementChild.append(metrics,details,toolbar,notice,panel.querySelector('.equipment-result-switch'),document.getElementById('review-table'));
  scroll.append(heading);frame.append(scroll);
  const actions=panel.querySelector('.actions');actions.className='ui-flow-actions actions';
  const status=otherToolNode('span','ui-flow-status',pending?`${pending} ${pending===1?'suggestion needs':'suggestions need'} a decision`:'All suggestions reviewed');document.getElementById('new-analysis').after(status);document.getElementById('commentary-preview').textContent='Preview Changes';actions.append(status,document.getElementById('commentary-preview'));frame.append(actions);
  workspace.append(frame);panel.remove();bindModelHelp(workspace);syncCommentaryReviewPresentation();
}
function paginateMatchupModel(dialog){
  const host=dialog.querySelector('.configuration-body'),groups=[...host.querySelectorAll(':scope>.model-slider-section')];
  if(!groups.length)return;
  const pages=[{title:'Model & Limits',nodes:[host.querySelector('.model-preset-toolbar'),host.querySelector(':scope>p'),...groups.filter(node=>!node.matches('details'))].filter(Boolean)},{title:'Ratings & Matchups',nodes:[]},{title:'Coaches & Venue',nodes:[]},{title:'Decisions & Lines',nodes:[]}];
  for(const node of groups.filter(node=>node.matches('details'))){const title=node.querySelector('summary').textContent;pages[/coach|continuity|venue|home/i.test(title)?2:/ratings|personnel|position|unit|matchup blend/i.test(title)?1:3].nodes.push(node);}
  addConfigurationPages(dialog,host,pages);dialog.classList.add('tool-model-editor');
}
function syncCommentaryReviewPresentation(){
  const root=content.querySelector('[data-ui-tool-review]'),review=state.commentaryReview;if(!root||!review)return;
  const total=review.analysis.proposals.length,count=filteredCommentaryProposals().length;
  root.querySelector('.equipment-result-switch>strong').textContent=`${count===total?count:count+' of '+total} proposed matches`;
  root.querySelectorAll('[data-commentary-review-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.commentaryReviewView===(review.view??'cards'))));
}
const refreshCommentaryRowsBeforeFlow=refreshCommentaryReviewRows;
refreshCommentaryReviewRows=()=>{refreshCommentaryRowsBeforeFlow();syncCommentaryReviewPresentation();};
scheduleRefinements();
