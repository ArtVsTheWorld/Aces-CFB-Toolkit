/* Presentation only. Keep controls and their original help nodes intact so
 * drafts, saved presets, validation and live configuration summaries still work.
 * This explicit allowlist intentionally excludes previews, reports and warnings. */
function optionHelpCaption(note) {
  const parent = note.parentElement, scope = note.closest('.configuration-draft,.configuration-body,.ops-section-body') ?? parent;
  let caption = null;
  if (note.dataset.helpFor) {
    const target = document.getElementById(note.dataset.helpFor) ?? configurationRead(scope,note.dataset.helpFor);
    caption = target?.matches('input,select,textarea') ? target.closest('label') ?? [...scope.querySelectorAll('label[for]')].find(label=>label.htmlFor===target.id) : target;
  }
  if (!caption && parent.matches('.team-picker')) caption = parent.querySelector(':scope > label, :scope > .field-caption > label');
  if (!caption && note.closest('.toggle-card')) caption = note.closest('.toggle-card');
  if (!caption) {
    const previous = note.previousElementSibling;
    if (previous?.matches('strong,label,h2,h3,h4')) caption = previous;
    else if (previous?.matches('.configuration-entry')) caption = previous.querySelector('strong');
    else {
      const control = previous?.matches('input,select,textarea') ? previous : previous?.querySelector('input[id],select[id],textarea[id]');
      if (control?.id) caption = [...parent.querySelectorAll('label[for]')].find(label=>label.htmlFor===control.id);
    }
  }
  if (!caption && parent.matches('span')) caption = parent.querySelector('strong');
  if (!caption) caption = parent.querySelector(':scope > h2, :scope > h3, :scope > h4, :scope > header h2');
  if (caption?.matches('label.toggle-card')) {
    const text = caption.querySelector(':scope > span');
    caption = text?.querySelector('strong');
    if (!caption && text) {
      const titleNodes = [...text.childNodes].filter(node=>node.nodeType===3&&node.textContent.trim());
      if (titleNodes.length) { caption=document.createElement('strong');titleNodes[0].before(caption);caption.append(...titleNodes); }
    }
  }
  if (caption?.matches('label') && caption.querySelector('input,select,textarea')) {
    // A wrapping label is a vertical field, not an inline caption. Put help
    // with its title rather than after its dropdown in a separate centered row.
    let row = caption.querySelector(':scope > .field-caption');
    if (!row) {
      const titleNodes = [...caption.childNodes].filter(node=>node.nodeType===3&&node.textContent.trim()||node.nodeType===1&&node.matches('strong,span:not(.model-help-tooltip)'));
      if (!titleNodes.length) return null;
      row=document.createElement('span');row.className='field-caption';titleNodes[0].before(row);row.append(...titleNodes);
    }
    caption=row;
  }
  if (caption?.matches('label') && caption.parentElement.matches('.model-slider-caption')) caption=caption.parentElement;
  return caption;
}
function condenseOptionHelp(root = document.body) {
  bindModelHelp(document.body);
  for (const dialog of root.querySelectorAll("dialog")) bindModelHelp(dialog);
  const selectors = [
    ".toggle-card small", ".pass-row small",
    ".ops-section-header p", ".equipment-wizard-panel > header p",
    ".team-picker > p.muted",
    ".configuration-body p.muted", ".configuration-draft p.muted",
    ".ops-section-body > p.muted", ".tool-config-stack p.muted",
    "#unlocked-color-field > p.muted", ".settings-artwork-item > p.muted",
    ".tool-config-stack .scope-note", ".player-pool-toolbar > .scope-note",
    ".workflow-callout > div > span",
    "#force-evaluate p.muted", "#force-user-only-help",
    "[data-option-explanation]"
  ].join(",");
  for (const note of root.querySelectorAll(selectors)) {
    // IDs/data bindings usually denote live totals, summaries or conditional
    // messages. Do not replace them, or move essential requirements into help.
    const liveHelp = ["force-profile-description", "force-involvement-description", "force-user-only-help"].includes(note.dataset.configOriginal ?? note.id);
    if (note.hidden || note.id && !liveHelp || note.dataset.optionHelpMoved || [...note.attributes].some(attribute => attribute.name.startsWith("data-") && !["data-option-explanation", "data-config-original", "data-help-for"].includes(attribute.name))) continue;
    if (note.closest(".standard-preview-workspace,.equipment-preview,.config-presets,.confirmation-editor,.notice,[role='alert'],[role='status'],.help-reference,#run-output,#analysis-output")) continue;
    if (note.querySelector("input,select,button,a,[id],[data-config-summary]") || /\b(?:warning|save unchanged|entire dynasty|original EA roster players always protected)\b/i.test(note.textContent) || !note.closest('.toggle-card') && /\bcannot\b/i.test(note.textContent)) continue;
    const requirements = [...note.querySelectorAll(".requirement")], copy = note.cloneNode(true);
    copy.querySelectorAll(".requirement").forEach(node => node.remove());
    const description = copy.textContent.replace(/\s+/g, " ").trim();
    if (/^(?:No (?:matching|available)|Nothing |Loading|Reading|Total:|\d+ (?:of |players|teams))/i.test(description)) continue;
    if (!requirements.length && /\brequires\b/i.test(description)) continue;
    if (!description) continue;
    const caption = optionHelpCaption(note);
    // Never hide useful text if it cannot be anchored to an actual caption.
    if (!caption) continue;
    const label = caption.dataset.baseLabel || caption.textContent.trim();
    const holder = document.createElement("span"); holder.innerHTML = modelHelpButton(label, description);
    const button = holder.firstElementChild; button.classList.add("option-info");
    if (liveHelp) button.dataset.helpSource = note.id;
    const existing = caption?.hasAttribute('data-multi-label-for') ? caption.closest('.field-caption')?.querySelector('.model-help-button:not([data-help-source])') : caption?.querySelector(":scope > .model-help-button:not([data-help-source])");
    if (existing && !liveHelp) existing.dataset.modelHelp += "\n\n" + description;
    else if (caption?.hasAttribute("data-multi-label-for")) { let row=caption.closest(".field-caption");if(!row){row=document.createElement("div");row.className="field-caption";caption.before(row);row.append(caption);}row.append(button); }
    else caption.append(button);
    note.dataset.optionHelpMoved = "true";
    if (requirements.length) note.replaceChildren(...requirements);
    else note.hidden = true;
  }
}
let optionHelpQueued = false;
function scheduleOptionHelp(records) {
  if (records && !records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && !node.matches(".model-help-tooltip,.option-info")))) return;
  if (optionHelpQueued) return;
  optionHelpQueued = true;
  queueMicrotask(() => { optionHelpQueued = false; condenseOptionHelp(); });
}
new MutationObserver(scheduleOptionHelp).observe(document.body, { childList: true, subtree: true });
scheduleOptionHelp();
