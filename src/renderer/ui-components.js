/* Shared presentation components. Tool settings and reviewed plans remain owned
 * by the existing tool; these helpers never copy or serialize their controls. */
const ToolkitUI = Object.freeze({
  equipmentFlow({name,choose,configure,controls}) {
    return `<div class="equipment-config-workspace tool-ui" id="equipment-config-workspace"><section class="equipment-config ui-setup-flow ${name}-flow" id="equipment-wizard" data-equipment-flow="${name}" ${name==='patcher'?'data-patcher-flow':'data-randomizer-flow'}>
      <div class="ui-presets-bar"><div class="tool-command-bar actions ui-tool-commands"></div></div>
      ${this.steps(['Choose Options','Configure'])}
      <div class="ui-flow-pages"><div data-ui-page="0">${choose}</div><div data-ui-page="1" hidden>${configure}<details class="ui-config-review"><summary>Review All Settings</summary><div id="equipment-review-summary"></div></details></div></div>
      <div id="equipment-wizard-status" class="ui-flow-run-status" role="status" aria-live="polite"></div>
      ${this.actions({backId:'equipment-step-back',nextId:'equipment-step-next',previewId:'equipment-preview',statusId:'equipment-step-progress'})}
      <div hidden class="ui-control-bank">${controls}</div>
    </section></div>`;
  },
  steps(labels) {
    return `<nav class="ui-flow-steps" aria-label="Tool setup"><ol>${labels.map((label,index)=>`<li><button type="button" data-ui-step="${index}"${index===0?' aria-current="step"':''}><span aria-hidden="true">${index+1}</span><strong>${escapeHtml(label)}</strong></button></li>`).join('')}</ol></nav>`;
  },
  section(title, body, {help='',className=''}={}) {
    return `<section class="ui-section ${className}"><header class="ui-section-heading"><h2>${escapeHtml(title)}${help?' '+modelHelpButton(title,help):''}</h2></header>${body}</section>`;
  },
  choice(control, {title,help,requirement=''}) {
    const row=document.createElement('div');row.className='toggle-card ui-option-row';
    row.innerHTML=`<div class="ui-option-copy"><div class="ui-field-caption"><label for="${escapeHtml(control.id)}">${escapeHtml(title)}</label>${modelHelpButton(title,help)}</div>${requirement?`<span class="ui-requirement">${escapeHtml(requirement)}</span>`:''}</div>`;
    row.prepend(control);return row;
  },
  settingCard({title,help,body}) {
    const card=document.createElement('section');card.className='ui-setting-card';
    card.innerHTML=`<header class="ui-section-heading"><h3>${escapeHtml(title)} ${modelHelpButton(title,help)}</h3></header><div class="ui-setting-body"></div>`;
    card.lastElementChild.append(body);return card;
  },
  actions({backId,nextId,previewId,statusId}) {
    return `<footer class="ui-flow-actions actions"><button type="button" class="button secondary" id="${backId}" hidden>Back</button><span id="${statusId}" class="ui-flow-status" role="status" aria-live="polite"></span><div class="ui-flow-primary"><button type="button" class="button" id="${nextId}">Configure Options</button><button type="button" class="button" id="${previewId}" hidden>Preview Changes</button></div></footer>`;
  },
  showStep(root,index) {
    root.querySelectorAll('[data-ui-page]').forEach(page=>page.hidden=Number(page.dataset.uiPage)!==index);
    root.querySelectorAll('[data-ui-step]').forEach(button=>{
      if(Number(button.dataset.uiStep)===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    });
    root.dispatchEvent(new Event('toolkit-hide-help',{bubbles:true}));
  }
});
