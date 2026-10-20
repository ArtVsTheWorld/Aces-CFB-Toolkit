/* Presentation only. Keep controls and their original help nodes intact so
 * drafts, saved presets, validation and live configuration summaries still work.
 * This explicit allowlist intentionally excludes previews, reports and warnings. */
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
    if (note.hidden || note.id && !liveHelp || note.dataset.optionHelpMoved || [...note.attributes].some(attribute => attribute.name.startsWith("data-") && !["data-option-explanation", "data-config-original"].includes(attribute.name))) continue;
    if (note.closest(".standard-preview-workspace,.equipment-preview,.config-presets,.confirmation-editor,.notice,[role='alert'],[role='status'],.help-reference,#run-output,#analysis-output")) continue;
    if (note.querySelector("input,select,button,a,[id],[data-config-summary]") || /\b(?:warning|save unchanged|entire dynasty|NIL players always excluded)\b/i.test(note.textContent) || !note.closest('.toggle-card') && /\bcannot\b/i.test(note.textContent)) continue;
    const requirements = [...note.querySelectorAll(".requirement")], copy = note.cloneNode(true);
    copy.querySelectorAll(".requirement").forEach(node => node.remove());
    const description = copy.textContent.replace(/\s+/g, " ").trim();
    if (/^(?:No (?:matching|available)|Nothing |Loading|Reading|Total:|\d+ (?:of |players|teams))/i.test(description)) continue;
    if (!requirements.length && /\brequires\b/i.test(description)) continue;
    if (!description) continue;
    const parent = note.parentElement;
    let caption = null;
    if (parent.matches(".team-picker")) caption = parent.querySelector(":scope > label");
    else {
      const previous = note.previousElementSibling;
      if (previous?.matches("strong,label,h2,h3,h4")) caption = previous;
      else if (previous?.matches(".configuration-entry")) caption = previous.querySelector("strong");
      else {
        const control = previous?.matches("input,select,textarea") ? previous : previous?.querySelector("input[id],select[id],textarea[id]");
        if (control?.id) caption = [...parent.querySelectorAll("label[for]")].find(label => label.htmlFor === control.id);
      }
    }
    // Toggle captions are one span deeper than the checkbox. Keep help beside
    // the title rather than reserving a whole extra row for it.
    if (!caption && parent.matches("span")) caption = parent.querySelector("strong");
    if (!caption) caption = parent.closest(".ops-section,.equipment-wizard-panel")?.querySelector(":scope > header h2");
    const label = caption?.dataset.baseLabel || caption?.textContent.trim() || "These settings";
    const holder = document.createElement("span"); holder.innerHTML = modelHelpButton(label, description);
    const button = holder.firstElementChild; button.classList.add("option-info");
    if (liveHelp) button.dataset.helpSource = note.id;
    const existing = caption?.querySelector(":scope > .option-info:not([data-help-source])");
    if (existing && !liveHelp) existing.dataset.modelHelp += "\n\n" + description;
    else if (caption?.hasAttribute("data-multi-label-for")) caption.after(button);
    else if (caption && !caption.matches("label.toggle-card")) caption.append(button);
    else note.before(button);
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
