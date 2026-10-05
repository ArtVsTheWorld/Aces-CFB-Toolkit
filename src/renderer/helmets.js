// The editor stores one serialized setting, so session navigation and existing
// Config Presets capture it just like other controls. Cancel never changes it.
function helmetDistributionOptions() {
  const value = document.getElementById("helmet-distribution-json")?.value;
  return value ? JSON.parse(value) : null;
}
function currentHelmetSettings() {
  return { helmetFix: document.getElementById("fix-helmet")?.checked ?? false, balanceExistingHelmets: document.getElementById("helmet-balance")?.checked ?? false, allowVicisZero2: document.getElementById("helmet-allow-vicis")?.checked ?? false, helmetDistribution: helmetDistributionOptions() };
}
function helmetActionLabel(settings) { return settings.balanceExistingHelmets ? "Apply My Mix — Balance Existing Helmets" : "Repair Only — Keep Allowed Helmets"; }
function helmetZeroExplanation(settings) {
  return settings.balanceExistingHelmets
    ? "0% replaces existing helmets of that model in the eligible Player Pool. Position overrides take priority. Protected players stay unchanged."
    : settings.helmetDistribution
      ? "0% excludes a helmet: existing helmets at 0% are replaced using your mix. Helmets with a positive percentage are kept, with facemask fixes if needed. Position-specific mixes take priority. Repair Only does not balance the proportions of already-allowed helmets."
      : "Toolkit Defaults keep SpeedFlex, Axiom, F7 and F7 Pro by default. Vicis choices are controlled through percentages. Other helmets are replaced. Choose Custom Percentages to exclude models with 0%, or Apply My Mix to balance the existing population.";
}
function helmetDistributionSummary(prepared, settings = currentHelmetSettings()) {
  const configuration = settings.helmetDistribution;
  if (!configuration) return settings.allowVicisZero2 ? "Toolkit Defaults + Standard Vicis Zero 2: SpeedFlex 68% · F7 / F7 Pro 15% · Axiom 14% · Vicis Zero 2 3%" : "Toolkit Defaults: SpeedFlex 70% · Axiom 10% · F7 10% · F7 Pro 10%";
  const labels = Object.fromEntries((prepared.helmetModels ?? []).map(model => [model.id, model.label]));
  const mix = Object.entries(configuration.global).filter(([, value]) => value > 0).map(([id, value]) => `${labels[id] ?? id} ${value}%`).join(" · ");
  const positions = Object.keys(configuration.positions ?? {});
  return "Custom: " + mix + (positions.length ? ` · Position-specific mixes: ${positions.map(localizedPosition).join(", ")}` : " · Shared by all eligible positions");
}
function helmetRepairExplanation(prepared, settings, position = "all") {
  const models = prepared.helmetModels ?? [];
  const configuration = settings.helmetDistribution, mix = configuration?.positions?.[position] ?? configuration?.global;
  const supported = models.filter(model => (configuration ? mix[model.id] > 0 : prepared.defaultRepairHelmetIds?.includes(model.id) || settings.allowVicisZero2 && model.id === "GearHelmet_VicisZero2") && (position === "all" || model.positions.includes(position)));
  const list = supported.map(model => model.label).join(", ");
  const scope = configuration ? position === "all" ? "the All Positions Mix" : `the ${localizedPosition(position)} mix` : "Toolkit Defaults";
  return `Helmets allowed by ${scope}: ${list || "None — select a compatible helmet"}. Repair Only keeps these helmets and replaces excluded or incompatible models. ` + (configuration ? "0% means excluded. A facemask that does not fit an allowed helmet is corrected without replacing that helmet. Position-specific mixes override the All Positions Mix, including 0% settings. " : "Toolkit Defaults keep an existing allowed helmet and facemask as they are. ") + "Every listed helmet can be configured for every position group, including OL. Only facemasks compatible with the chosen helmet are used. Apply My Mix also adjusts already-allowed helmets to approach the target percentages.";
}
function helmetReviewRows(prepared) {
  const settings = currentHelmetSettings();
  if (!settings.helmetFix) return [["Improve Helmets and Facemasks", "Disabled"]];
  return [["Improve Helmets and Facemasks", "Enabled"], ["Helmet Action", helmetActionLabel(settings)], ["Helmet Mix", helmetDistributionSummary(prepared, settings)], ["What 0% Means", helmetZeroExplanation(settings)], ["Facemask Pools", prepared.helmetModels.map(model => `${model.label}: ${(readJsonControl("facemask-pools-json", null)?.[model.id] ?? model.defaultMasks).length} Selected`).join(" · ")]];
}
function helmetPassPreview(details) {
  if (!details?.helmetFix) return "";
  const earlierRepairRules = details.helmetDistribution && !details.balanceExistingHelmets && details.helmetMixExcludesZero !== true;
  const explanation = earlierRepairRules ? "This saved preview used earlier Repair Only rules: 0% only blocked new selections, not existing helmets. Run a new preview to use 0% as an exclusion." : helmetZeroExplanation(details);
  return `<div class="helmet-preview-intent"><strong>Helmets: ${escapeHtml(helmetActionLabel(details))}</strong><p>${escapeHtml(explanation)}</p></div>`;
}
function helmetEditorControls() {
  // Retain the existing control IDs/values for session settings and older presets.
  return `<section class="helmet-settings-summary"><div hidden><input id="helmet-distribution-json" type="hidden" value="null"><input type="checkbox" id="helmet-balance"><input type="hidden" id="facemask-pools-json" value="null"><input type="checkbox" id="helmet-allow-vicis"></div><div class="helmet-editor-launch"><div><strong id="helmet-action-summary">Repair Only — Keep Allowed Helmets</strong><p id="helmet-mix-summary"></p></div><button type="button" class="button secondary" id="configure-helmet-mix">Configure Helmets &amp; Facemasks</button></div><p id="helmet-zero-summary" class="helmet-mode-note"></p></section>`;
}
function bindHelmetEditor(prepared) {
  const input = document.getElementById("helmet-distribution-json"), button = document.getElementById("configure-helmet-mix");
  if (!input || !button) return;
  const sync = () => {
    const settings = currentHelmetSettings();
    document.getElementById("helmet-mix-summary").textContent = helmetDistributionSummary(prepared, settings);
    document.getElementById("helmet-action-summary").textContent = settings.helmetFix ? helmetActionLabel(settings) : "Helmet Pass Disabled";
    document.getElementById("helmet-zero-summary").textContent = settings.helmetFix ? helmetZeroExplanation(settings) : "Enable the helmet pass to configure repairs or apply a helmet mix. Your saved helmet settings are kept while this pass is off.";
    document.getElementById("helmet-balance").disabled = !settings.helmetFix;
    document.getElementById("helmet-allow-vicis").disabled = !settings.helmetFix || Boolean(settings.helmetDistribution);
    button.disabled = !settings.helmetFix;
  };
  for (const id of ["helmet-distribution-json", "helmet-balance", "helmet-allow-vicis", "fix-helmet"]) document.getElementById(id).addEventListener("change", sync);
  button.addEventListener("click", () => openHelmetEditor(prepared, input)); sync();
}
function openHelmetEditor(prepared, input) {
  const models = prepared.helmetModels ?? [], positions = prepared.helmetPositions ?? [];
  if (!models.length) { toast("Helmet settings are unavailable. Select your save again."); return; }
  const original = helmetDistributionOptions(), draft = structuredClone(original ?? { mode: "custom", global: prepared.defaultHelmetWeights, positions: {} });
  // Older individual-position presets retain their values until this editor is
  // saved. Grouping uses an equal average when multiple old mixes differ.
  const aliases = { LT:"OL", LG:"OL", C:"OL", RG:"OL", RT:"OL", LE:"EDGE", RE:"EDGE", LEDG:"EDGE", REDG:"EDGE", LOLB:"LB", MLB:"LB", ROLB:"LB", SAM:"LB", MIKE:"LB", WILL:"LB", K:"K/P", P:"K/P" };
  const collected = {};
  for (const [key, mix] of Object.entries(draft.positions ?? {})) (collected[aliases[key] ?? key] ??= []).push({ key, mix });
  draft.positions = Object.fromEntries(Object.entries(collected).map(([key, entries]) => { const canonical = entries.find(entry => entry.key === key); const mixes = canonical ? [canonical.mix] : entries.map(entry => entry.mix); return [key, Object.fromEntries(models.map(model => [model.id, mixes.reduce((sum, mix) => sum + (mix[model.id] ?? 0), 0) / mixes.length]))]; }));
  for (const mix of Object.values(draft.positions)) { const proxy = models.map(model => ({ value: mix[model.id] })); balanceWholeInputs(proxy); models.forEach((model, index) => mix[model.id] = Number(proxy[index].value)); }
  if (!original && document.getElementById("helmet-allow-vicis").checked) {
    for (const key of ["QB","TE","EDGE","DT","LB"]) draft.positions[key] = { ...prepared.defaultHelmetWeights, GearHelmet_Speed_Flex:68, GearHelmet_Axiom:14, GearHelmet_SchuttF7:8, GearHelmet_SchuttF7Pro:7, GearHelmet_VicisZero2:3 };
  }
  draft.mode = "custom";
  let mode = original || document.getElementById("helmet-allow-vicis").checked ? "custom" : "default", position = "all", maskHelmet = models[0].id, balance = document.getElementById("helmet-balance").checked;
  const masks = structuredClone(readJsonControl("facemask-pools-json", Object.fromEntries(models.map(model => [model.id, model.defaultMasks]))));
  const dialog = createConfigurationDialog({ title:"Helmets & Facemasks", description:"Choose repairs or population balancing, edit helmet mixes by position group, and select compatible facemasks. OL and all Vicis variants can be configured. Only your eligible Player Pool is affected.", eyebrow:"Equipment Patcher", className:"helmet-editor", saveLabel:"Save Helmet Settings" });
  if (!dialog) return;
  dialog.querySelector(".configuration-body").innerHTML = `<fieldset class="helmet-action-choices"><legend>1. What Should This Pass Do?</legend><label><input type="radio" name="helmet-action" value="repair" data-helmet-action><span><strong>Repair Only</strong><small>Replace excluded helmets and facemasks; keep allowed combinations.</small></span></label><label><input type="radio" name="helmet-action" value="balance" data-helmet-action><span><strong>Apply My Mix</strong><small>Also balance existing helmets with the fewest practical swaps.</small></span></label></fieldset><p class="helmet-mode-note" data-helmet-zero-note></p><div class="helmet-editor-toolbar"><label><strong>2. Helmet Mix</strong><select data-helmet-mode><option value="default">Toolkit Defaults</option><option value="custom">Custom Percentages</option></select></label><label data-position-field><strong>Edit Percentages For</strong><select data-helmet-position><option value="all">All Positions Mix</option>${positions.map(value=>`<option value="${value}">${value}</option>`).join("")}</select></label></div><div data-custom-helmet-settings><label class="helmet-inherit" data-inherit-label hidden><input type="checkbox" data-helmet-inherit> Use the All Positions Mix for This Group</label><p class="muted">Every model is available for every group. A group override takes priority, including 0%. Toolkit Defaults remain SpeedFlex 70%, Axiom 10%, F7 10%, F7 Pro 10%; other models start at 0%.</p><div class="helmet-editor-total"><strong data-helmet-total></strong><button type="button" class="button secondary" data-helmet-balance>Normalize to 100%</button><button type="button" class="button secondary" data-helmet-reset>Reset This Mix</button></div><div class="helmet-weight-grid" data-helmet-weights></div></div><details class="helmet-repair-help"><summary>Which Helmets Does My Mix Allow?</summary><p data-helmet-repair-help></p></details><section class="facemask-pool-section"><h3>3. Facemask Pools</h3><p class="muted">Choose the masks allowed for each helmet. Compatible masks that used to be left out are listed but start unchecked. An unchecked existing mask is replaced, even in Repair Only. Each helmet must retain at least one mask.</p><label><strong>Helmet</strong><select data-mask-helmet>${models.map(model=>`<option value="${model.id}">${escapeHtml(model.label)}</option>`).join("")}</select></label><div class="team-picker-toolbar"><input class="input" type="search" data-mask-search placeholder="Find a facemask"><button type="button" class="button secondary" data-mask-all>All</button><button type="button" class="button secondary" data-mask-clear>Clear</button><button type="button" class="button secondary" data-mask-defaults>Default Pool</button></div><strong data-mask-count></strong><div class="facemask-pool-list" data-mask-list></div></section><p class="muted">FBS and directional FCS are balanced separately. Needed replacements are spread across teams. Preview includes before/after helmet counts and target percentages.</p>`;
  dialog.querySelector("[data-config-save]").dataset.helmetSave = "";
  dialog.querySelector(".configuration-footer [data-config-cancel]").dataset.helmetCancel = "";
  const weights = () => position === "all" ? draft.global : draft.positions[position] ?? draft.global;
  const validate = () => {
    if (mode === "custom") for (const [key,mix] of [["All Positions",draft.global], ...Object.entries(draft.positions)]) if (Object.values(mix).some(value=>!Number.isInteger(value)||value<0||value>100) || Object.values(mix).reduce((a,b)=>a+b,0)!==100) return key+": use whole percentages totaling 100%.";
    for (const model of models) if (!masks[model.id]?.length || masks[model.id].some(value=>!model.masks.includes(value))) return model.label+": select at least one compatible facemask.";
    return "";
  };
  const sync = () => {
    const error=validate();dialog.querySelector("[data-config-error]").textContent=error;dialog.querySelector("[data-config-error]").hidden=!error;dialog.querySelector("[data-helmet-save]").disabled=Boolean(error);
    const settings={balanceExistingHelmets:balance,helmetDistribution:mode==="custom"?draft:null};
    dialog.querySelector("[data-helmet-zero-note]").textContent=helmetZeroExplanation(settings);dialog.querySelector("[data-helmet-repair-help]").textContent=helmetRepairExplanation(prepared,settings,position);
    dialog.querySelector("[data-helmet-total]").textContent="Total: "+Object.values(weights()).reduce((a,b)=>a+b,0)+"%";
    dialog.querySelector("[data-mask-count]").textContent=masks[maskHelmet].length+" of "+models.find(model=>model.id===maskHelmet).masks.length+" selected";
  };
  const renderMasks=()=>{
    const model=models.find(model=>model.id===maskHelmet),query=dialog.querySelector("[data-mask-search]").value.toLowerCase();
    dialog.querySelector("[data-mask-list]").innerHTML=model.facemasks.filter(mask=>mask.label.toLowerCase().includes(query)).map(mask=>`<label class="team-picker-row" title="${escapeHtml(mask.label)}"><input type="checkbox" data-mask-choice value="${mask.value}" ${masks[maskHelmet].includes(mask.value)?"checked":""}><span>${escapeHtml(facemaskChoiceLabel(mask.label, model.label))}${model.defaultMasks.includes(mask.value)?"":" · Optional"}</span></label>`).join("") || '<p class="muted">No facemasks match.</p>';
    dialog.querySelectorAll("[data-mask-choice]").forEach(control=>control.addEventListener("change",()=>{const set=new Set(masks[maskHelmet]);if(control.checked)set.add(control.value);else set.delete(control.value);masks[maskHelmet]=[...set];sync();}));sync();
  };
  const render=()=>{
    dialog.querySelector("[data-helmet-mode]").value=mode;dialog.querySelector("[data-helmet-position]").value=position;dialog.querySelector("[data-mask-helmet]").value=maskHelmet;
    dialog.querySelectorAll("[data-helmet-action]").forEach(control=>control.checked=(control.value==="balance")===balance);
    dialog.querySelector("[data-custom-helmet-settings]").hidden=mode!=="custom";dialog.querySelector("[data-position-field]").hidden=mode!=="custom";
    dialog.querySelector("[data-inherit-label]").hidden=position==="all"; const inherited=position!=="all"&&!draft.positions[position];dialog.querySelector("[data-helmet-inherit]").checked=inherited;
    dialog.querySelector("[data-helmet-weights]").innerHTML=models.map(model=>`<label class="helmet-weight"><span><strong>${escapeHtml(model.label)}</strong></span><div class="input-suffix"><input class="input" type="number" min="0" max="100" step="1" data-helmet-id="${model.id}" value="${weights()[model.id]??0}" ${inherited?"disabled":""}><span>%</span></div></label>`).join("");
    dialog.querySelectorAll("[data-helmet-id]").forEach(control=>control.addEventListener("input",()=>{weights()[control.dataset.helmetId]=control.value===""?NaN:Number(control.value);sync();}));
    dialog.querySelector("[data-helmet-balance]").disabled=inherited;dialog.querySelector("[data-helmet-reset]").disabled=inherited;renderMasks();
  };
  dialog.querySelector("[data-helmet-mode]").addEventListener("change",event=>{mode=event.target.value;render();});
  dialog.querySelector("[data-helmet-position]").addEventListener("change",event=>{position=event.target.value;render();});
  dialog.querySelector("[data-helmet-inherit]").addEventListener("change",event=>{if(event.target.checked)delete draft.positions[position];else draft.positions[position]=structuredClone(draft.global);render();});
  dialog.querySelectorAll("[data-helmet-action]").forEach(control=>control.addEventListener("change",()=>{balance=control.value==="balance";sync();}));
  dialog.querySelector("[data-helmet-balance]").addEventListener("click",()=>{const inputs=models.map(model=>({value:weights()[model.id]}));balanceWholeInputs(inputs);models.forEach((model,index)=>weights()[model.id]=Number(inputs[index].value));render();});
  dialog.querySelector("[data-helmet-reset]").addEventListener("click",()=>{if(position==="all")draft.global=structuredClone(prepared.defaultHelmetWeights);else draft.positions[position]=structuredClone(prepared.defaultHelmetWeights);render();});
  dialog.querySelector("[data-mask-helmet]").addEventListener("change",event=>{maskHelmet=event.target.value;dialog.querySelector("[data-mask-search]").value="";renderMasks();});
  dialog.querySelector("[data-mask-search]").addEventListener("input",renderMasks);
  for(const [key,values] of [["all",model=>model.masks],["clear",()=>[]],["defaults",model=>model.defaultMasks]])dialog.querySelector("[data-mask-"+key+"]").addEventListener("click",()=>{masks[maskHelmet]=[...values(models.find(model=>model.id===maskHelmet))];renderMasks();});
  dialog.querySelector("[data-config-reset]").addEventListener("click",()=>{mode="default";position="all";balance=false;draft.global=structuredClone(prepared.defaultHelmetWeights);draft.positions={};for(const model of models)masks[model.id]=[...model.defaultMasks];render();});
  dialog.querySelector("[data-helmet-save]").addEventListener("click",()=>{
    if(validate())return;
    const values={"helmet-distribution-json":JSON.stringify(mode==="custom"?draft:{mode:"custom",global:prepared.defaultHelmetWeights,positions:{}}),"facemask-pools-json":JSON.stringify(masks),"helmet-balance":balance,"helmet-allow-vicis":false};
    const changed=[];for(const[id,value]of Object.entries(values)){const control=document.getElementById(id),old=control.type==="checkbox"?control.checked:control.value;if(old!==value){if(control.type==="checkbox")control.checked=value;else control.value=value;changed.push(control);}}
    dialog.closeEditor();changed.forEach(control=>control.dispatchEvent(new Event("change",{bubbles:true})));captureToolSettings();
  }); render();dialog.showModal();
}
function facemaskChoiceLabel(label, helmetLabel) {
  // Only trim the selected family prefix; never infer/change an equipment ID.
  const family = helmetLabel.replace(/^(?:Riddell|Schutt)\s+/i, "").replace(/\s+/g, "");
  const compact = label.replace(/\s+/g, "").toLowerCase(), prefix = family.toLowerCase();
  if (!compact.startsWith(prefix)) return label;
  let count = 0, at = 0;
  while (at < label.length && count < prefix.length) { if (!/\s/.test(label[at])) count++; at++; }
  return label.slice(at).replace(/^[\s:–—-]+/, "") || label;
}
