// Documentation-only projection: does not edit the source catalog or any pool.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { equipmentItem } from "../src/main/tools/equipment/catalog.js";
import { UNLOCKED_TATTOO_POOL } from "../src/main/tools/equipment/core/tattoos.js";

const MOD_NAMES = { catalog: "Established catalog / locked gear", unlocked: "CFB27 Unlocked — Orckestra", raw: "RAW Accessories — Delonte RAW", unresolved: "Source not established" };
const SLOT_NAMES = { LeftArmWear: "Left arm", RightArmWear: "Right arm", LeftElbowWear: "Left elbow", RightElbowWear: "Right elbow", LeftWristWear: "Left wrist", RightWristWear: "Right wrist", MouthWear: "Mouthpiece", FaceWear: "Face covering", FaceMarks: "Facepaint / face tape", FacePaint: "Facepaint / face tape", NeckWear: "Neckwear", Neckpad: "Neck pad / necklace", GuardianCap: "Guardian cap / skullcap", InnerPants: "Lower-body base layer", LeftThighWear: "Left thigh", RightThighWear: "Right thigh", Towel: "Towel" };
const REVIEW_NAMES = { slot: "Verify save slot", caps: "Check skullcap appearance", combo: "Optional earring support", refresh: "Not re-observed this scan", artwork: "Tattoo artwork naming", unresolved: "Resolve source / slot" };
const compare = (a, b) => a.localeCompare(b, "en", { numeric: true });
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const md = value => String(value ?? "").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");

export function buildEntries(catalog) {
  const entries = new Map();
  for (const live of catalog.items) entries.set(live.itemName, { itemName: live.itemName, live });
  for (const [origin, rows] of Object.entries(catalog.knownModPools)) for (const pool of rows) {
    const entry = entries.get(pool.itemName) ?? { itemName: pool.itemName };
    if (entry.pool) throw new Error(`Duplicate established mapping: ${pool.itemName}`);
    if (entry.live && entry.live.origin !== origin) throw new Error(`Conflicting provenance: ${pool.itemName}`);
    entry.pool = pool;
    entry.origin = origin;
    entries.set(pool.itemName, entry);
  }
  return [...entries.values()].map(entry => {
    const { live, pool, itemName } = entry;
    const known = equipmentItem(itemName), tattoo = UNLOCKED_TATTOO_POOL.find(item => item.value === itemName);
    const origin = entry.origin ?? live.origin;
    const combo = itemName.startsWith("FaceMarks_RawEarringsCombo_");
    const category = combo ? "Earring / facepaint combinations" : pool?.category ?? known?.category ?? (/^FaceMarks_/.test(itemName) ? "Facepaint" : "Jersey / clothing observations");
    const displayName = live?.displayName ?? pool.displayName;
    // Combo labels are technical strings; do not invent their appearance.
    const name = combo ? `Earring combination: ${displayName.split(":").slice(1).join(":") || displayName}` : displayName;
    const slots = pool?.slots ?? live?.slots ?? known?.slots ?? [];
    const location = tattoo ? (tattoo.type === "arm" ? "Arm tattoo" : "Leg tattoo") : slots.map(slot => SLOT_NAMES[slot] ?? slot).join(" / ") || "Not verified";
    const underLip = itemName.startsWith("FaceGear_BalaclavaUnderLip");
    const newClothing = origin === "unlocked" && !pool && !known && !/^FaceMarks_/.test(itemName);
    const caps = /^GuardianCap_Raw(?:Nike|Battle)SkullCap/.test(itemName);
    const reviewKinds = [];
    const notes = [];
    if (newClothing) { reviewKinds.push("slot"); notes.push("Check the equipment menu and an equipped save: the label/resource is known, but the writable save slot and direct assignment safety are not verified."); }
    if (caps) { reviewKinds.push("caps"); notes.push("Verify Nike/Battle branding, white/black appearance and fit in-game. Exact IDs, GuardianCap placement, reports and save/reopen behavior passed checks."); }
    if (combo) { reviewKinds.push("combo"); notes.push("Optional future feature: verify which slot(s) this combined asset uses and that both earrings and facepaint survive save/reload. Not in the facepaint-only pool."); }
    if (pool && !live) { reviewKinds.push("refresh"); notes.push("Established mapping from earlier sourcing; not re-observed in this scan. Absence does not mean removal or failure. Recheck only when refreshing completeness or testing this family."); }
    if (tattoo && /^(?:CujoMatty_ArmTats_|LegTattoo_)/.test(itemName)) { reviewKinds.push("artwork"); notes.push("A picture/in-game view is needed to replace the numbered label with an accurate artwork description. Do not infer motifs from the ID."); }
    if (origin === "unresolved" && !underLip) { reviewKinds.push("unresolved"); notes.push("Seen in both the earlier unmodded scan and this scan. The catalog does not establish a direct writable slot or justify adding a mod requirement."); }
    if (underLip) notes.push("Intentionally excluded at your request. No review is needed unless you decide to support under-lip balaclavas later.");
    if (itemName === "FaceGear_BalaclavaNone") notes.push("Remove Balaclava is intentionally excluded at your request; no review is required.");
    if (origin === "catalog") notes.push("Established Toolkit entry, not proof of vanilla menu availability. A loaded asset can be locked. Menu access needs a separate no-mod check if that distinction matters.");
    let toolkit;
    // Facepaint/tattoo mappings use separate generation systems. A missing or
    // false generic generationEligible flag is not proof they are unsupported.
    if (pool?.category === "Facepaint") toolkit = "Established facepaint pool mapping";
    else if (tattoo) toolkit = `Tattoo selector — ${tattoo.defaultSelected ? "selected" : "deselected"} by default`;
    else if (underLip || itemName === "FaceGear_BalaclavaNone") toolkit = "Intentionally excluded";
    else if (combo) toolkit = "Excluded — optional future support";
    else if (newClothing) toolkit = "Not enabled — verify save slot first";
    else if (origin === "unresolved") toolkit = "Observation only";
    else toolkit = (pool?.generationEligible ?? live?.generationEligible) === true ? "Eligible for generic equipment pools" : "Excluded from generic equipment pools";
    return { itemName, name, displayName, origin, source: MOD_NAMES[origin], category, location, slots, toolkit, observation: live ? "ID + display name checked this scan" : "Earlier mapping; not re-observed", live: Boolean(live), baseline: live?.observedWithoutMods === true, evidence: live?.evidence ?? pool?.source ?? "Existing Toolkit inventory mapping.", manifests: live?.resourceManifests ?? [], reviewKinds, review: notes.join(" ") || "No specific sourcing gap recorded; visual/menu behavior is not certified by a memory scan." };
  }).sort((a, b) => compare(a.origin, b.origin) || compare(a.category, b.category) || compare(a.name, b.name));
}

export function buildReviewGroups(entries) {
  return [
    { kind: "slot", title: "New Unlocked clothing: verify before adding", priority: "Needed before support", explanation: "Seven labels were verified, but not the writable slots: rolled-low tucked undershirt, sleeveless hoodie, tight untucked sleeves, and four long-sleeve undershirt colors. These may be backing clothing assets rather than standalone save selections. Leave them out until menu/equipped-save checks establish safe assignments." },
    { kind: "caps", title: "RAW Nike/Battle skullcaps: appearance spot-check", priority: "Recommended now", explanation: "Check white and black Nike/Battle skullcaps in-game. The IDs, existing GuardianCap slot and Toolkit write/reopen path are verified; actual rendered colors, branding and fit still need a visual check." },
    { kind: "combo", title: "RAW earrings + facepaint combinations", priority: "Only for future support", explanation: "Thirty combined assets were found. They stay out of the standalone facepaint pool. Only investigate them if you want earring support; verify their save slot(s), appearance and persistence rather than treating them like ordinary facepaint." },
    { kind: "refresh", title: "Earlier mappings not refreshed by this session", priority: "Optional completeness check", explanation: "78 established entries were not re-observed: 73 Unlocked and 5 RAW. This is not evidence of a bug. Unlocked: 12 lower-body items (including four excluded NFL undersocks), 3 rubber-band elbow items, 6 thigh pads, 1 string towel and 51 tattoos. RAW: gold/silver cross necklaces and three tape labels (I'm F'n Open, Kill All, Not Sorry). Check these families only if you want a fresh complete inventory." },
    { kind: "artwork", title: "Numbered tattoo artwork names", priority: "Optional naming improvement", explanation: "The 21 CujoMatty arm designs and 5 custom leg designs have established IDs, but their artwork motifs are not known. A visual reference would allow descriptive names. Japanese/Polynesian names describe source styles, not independently verified motifs, and stay deselected by default." },
    { kind: "unresolved", title: "Three jersey sleeve observations", priority: "Optional catalog cleanup", explanation: "Long Sleeves, Loose Sleeves and Tight Sleeves were already seen without mods. Their presence does not establish mod provenance or direct assignability. No new mod pool entry is added from these observations." }
  ].map(group => ({ ...group, entries: entries.filter(entry => entry.reviewKinds.includes(group.kind)) }));
}

const INTRO = [
  "Source: the October 5, 2026 checked live scan plus established Toolkit mod mappings. Running mods: CFB27 Unlocked 0.96 by Orckestra and RAW Accessories v2.0.4 by Delonte RAW.",
  "This reference combines 251 checked live observations and 78 earlier mappings not re-observed, deduplicated to 329 entries. It is a sourcing reference, not a complete menu inventory or a guarantee of every item's in-game appearance.",
  "Established catalog / locked gear is deliberately not called vanilla-only: loaded no-mod assets can still be locked. A mod can replace an existing asset without adding a new ID.",
  "The supplied RAW mod file is 2.0.2, older than the running v2.0.4. Its manifest cannot prove every current change. New white skullcap attribution uses live records and your explicit RAW provenance.",
  "Facepaint and tattoos use separate pools. The raw JSON's generic generationEligible flag must not be read as their support status. This reference cross-checks knownModPools and the tattoo selector instead.",
  "Eligible means the entry may be used by relevant enabled features; brand, position, pool and compatibility rules still apply. This document changes no Toolkit settings or equipment behavior."
];

export function renderMarkdown(catalog, entries) {
  const lines = ["# Gear Catalog — Human-Readable Reference", "", `Checked scan: ${catalog.observed}`, "", ...INTRO.flatMap(line => [line, ""]), "## Manual review checklist", "", "Review labels are not all blockers. Optional checks and deliberately excluded items are kept separate.", ""];
  for (const group of buildReviewGroups(entries)) {
    lines.push(`### ${group.title} (${group.entries.length})`, "", `**${group.priority}.** ${group.explanation}`, "", ...group.entries.map(entry => `- ${md(entry.name)} — ${md(entry.location)}. Internal ID: \`${entry.itemName}\`.`), "");
  }
  lines.push("### No action needed for deliberately excluded entries", "", "The four under-lip balaclavas and Remove Balaclava remain excluded by request. They are not missing support that needs fixing. NFL-style undersocks remain excluded from generic generation; being listed does not enable them.", "", "### Vanilla/locked boundary", "", "Of the 145 established catalog entries in this scan, 43 also appeared in the earlier no-mod observation. Neither overlap nor absence proves menu availability. If a strict vanilla-only inventory is needed, check menus with no equipment mods; do not flag all remaining entries as modded solely from this scan.", "", "## Complete reference", "", "Names below use checked menu labels where available, or earlier verified/curated labels otherwise. Technical earring labels remain technical rather than guessed. Exact IDs are retained for debugging.", "");
  for (const origin of Object.keys(MOD_NAMES)) {
    const subset = entries.filter(entry => entry.origin === origin);
    lines.push(`## ${MOD_NAMES[origin]} (${subset.length})`, "");
    for (const category of [...new Set(subset.map(entry => entry.category))].sort(compare)) {
      lines.push(`### ${category}`, "", "| Item | Location | Verification | Toolkit use | Review |", "| --- | --- | --- | --- | --- |");
      for (const entry of subset.filter(row => row.category === category)) lines.push(`| ${md(entry.name)}<br>\`${entry.itemName}\` | ${md(entry.location)} | ${md(entry.observation)} | ${md(entry.toolkit)} | ${md(entry.reviewKinds.map(kind => REVIEW_NAMES[kind]).join("; ") || "No specific gap")} |`);
      lines.push("");
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function renderHtml(catalog, entries) {
  const categories = [...new Set(entries.map(entry => entry.category))].sort(compare);
  const reviewGroups = buildReviewGroups(entries);
  const options = values => values.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
  const reviews = reviewGroups.map(group => `<details class="review-group"><summary><span>${escapeHtml(group.title)}</span><b>${group.entries.length}</b></summary><p class="priority">${escapeHtml(group.priority)}</p><p>${escapeHtml(group.explanation)}</p><ul>${group.entries.map(entry => `<li><a href="#gear-${escapeHtml(entry.itemName)}" data-reveal="${escapeHtml(entry.itemName)}">${escapeHtml(entry.name)}</a><small>${escapeHtml(entry.location)}</small></li>`).join("")}</ul><button type="button" data-review-filter="${group.kind}">Show these items in catalog</button></details>`).join("");
  const rows = entries.map(entry => `<tr id="gear-${escapeHtml(entry.itemName)}" data-source="${entry.origin}" data-category="${escapeHtml(entry.category)}" data-review="${entry.reviewKinds.join(" ")}" data-live="${entry.live ? "live" : "earlier"}"><td><strong>${escapeHtml(entry.name)}</strong><span class="location">${escapeHtml(entry.location)}</span><details class="technical"><summary>Internal ID &amp; evidence</summary><code>${escapeHtml(entry.itemName)}</code><p>Original label: ${escapeHtml(entry.displayName)}</p><p>${escapeHtml(entry.evidence)}</p><p>Also seen in earlier no-mod scan: ${entry.baseline ? "Yes (does not prove menu availability)" : "Not recorded"}. Exact supplied manifest match: ${escapeHtml(entry.manifests.map(mod => MOD_NAMES[mod]).join("; ") || "None recorded")}.</p></details></td><td>${escapeHtml(entry.source)}<small>${escapeHtml(entry.category)}</small></td><td><span class="badge ${entry.live ? "checked" : "earlier"}">${entry.live ? "Checked this scan" : "Earlier mapping"}</span><small>${escapeHtml(entry.toolkit)}</small></td><td>${entry.reviewKinds.map(kind => `<span class="review-tag">${escapeHtml(REVIEW_NAMES[kind])}</span>`).join("") || '<span class="quiet">No specific sourcing gap</span>'}<p class="review-note">${escapeHtml(entry.review)}</p></td></tr>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'none'; connect-src 'none'"><title>Ace's CFB Toolkit — Gear Catalog</title><style>
:root{color-scheme:light;--green:#087649;--ink:#10231c;--muted:#53665d;--line:#d4e0d9;--paper:#fff}*{box-sizing:border-box}body{margin:0;background:#f3f6f4;color:var(--ink);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}header{background:#09271c;color:white;padding:36px max(24px,calc((100vw - 1320px)/2));border-bottom:5px solid #19a469}header p{max-width:850px;color:#cce2d5}.eyebrow{color:#62d59e;text-transform:uppercase;letter-spacing:.15em;font-size:12px;font-weight:700}h1{font-size:clamp(26px,4vw,40px);line-height:1.15;margin:10px 0}main{max-width:1320px;margin:auto;padding:24px}h2{font-size:23px;margin:0 0 12px}h3{font-size:17px;margin:0}.stats{display:flex;gap:24px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding:0 0 20px;margin-bottom:24px}.stats strong{font-size:29px;display:block}.stats span{font-size:13px;color:var(--muted)}.notice{border-left:4px solid var(--green);padding:12px 18px;background:#e6f2eb;margin:12px 0}.notes{background:white;border:1px solid var(--line);padding:16px;margin:18px 0}.notes summary{font-weight:700;cursor:pointer}.notes p{max-width:1050px}.review-groups{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0 20px}.review-group{border:1px solid var(--line);background:var(--paper);padding:14px 16px;align-self:start}.review-group summary{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;font-weight:700}.review-group summary:before{content:'▸';color:var(--green)}.review-group[open] summary:before{content:'▾'}.review-group summary span{flex:1}.review-group b{color:var(--green);font-variant-numeric:tabular-nums}.priority{color:var(--green);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}a{color:var(--green);text-decoration-thickness:1px;text-underline-offset:3px}li{margin:7px 0}small{display:block;font-size:12px;color:var(--muted);margin-top:6px}button,input,select{font:inherit;border:1px solid #b9cabe;border-radius:4px;min-height:40px;background:white;color:var(--ink);padding:8px 10px}button{cursor:pointer}button:hover{background:#e5f1e9}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #39a572;outline-offset:2px}.filters{display:grid;grid-template-columns:minmax(240px,2fr) 1fr 1fr 1fr;gap:10px;background:white;padding:16px;border:1px solid var(--line);margin:14px 0}.filters label{display:block;font-size:12px;font-weight:700;margin-bottom:5px}.filters input,.filters select{width:100%;min-width:0}.filter-actions{grid-column:1/-1;display:flex;gap:16px;align-items:center;flex-wrap:wrap}.filter-actions select{width:auto;max-width:100%}#count{font-weight:700;color:var(--green)}.table-wrap{overflow-x:auto;background:white;border:1px solid var(--line)}table{width:100%;border-collapse:collapse;table-layout:fixed}th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.06em;background:#e7eee9;padding:14px}td{padding:16px 14px;border-top:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere}th:nth-child(1){width:31%}th:nth-child(2){width:17%}th:nth-child(3){width:21%}th:nth-child(4){width:31%}.location{display:block;color:var(--muted);font-size:12px;margin-top:4px}.technical{margin-top:10px;font-size:12px}.technical summary{cursor:pointer;color:var(--green)}code{display:block;margin-top:8px;white-space:normal;font:12px/1.5 ui-monospace,Consolas,monospace}.technical p{font-size:12px;color:var(--muted)}.badge,.review-tag{display:inline-block;font-size:11px;border-radius:3px;padding:3px 7px;margin:0 4px 5px 0}.checked{background:#ddefe3;color:#07552c}.earlier{background:#f5e9cd;color:#795100}.review-tag{background:#eef0f2;color:#344842}.quiet{font-size:12px;color:var(--muted)}.review-note{font-size:12px;color:var(--muted);margin:5px 0 0}tr:target{box-shadow:inset 4px 0 #0a9c5a;background:#f0faf4}footer{margin:24px 0;color:var(--muted);font-size:12px}#empty{padding:25px;display:none}#empty.visible{display:block}
@media(max-width:850px){.filters{grid-template-columns:1fr 1fr}.review-groups{grid-template-columns:1fr}table{min-width:780px}main{padding:16px}header{padding:28px 16px}}@media(max-width:480px){.filters{grid-template-columns:1fr}.stats{gap:18px}.filter-actions{gap:8px}}
@media print{header{background:white;color:black;border-color:black;padding:0}.eyebrow,header p{color:black}.filters,.filter-actions,button{display:none}.review-group{break-inside:avoid}main{max-width:none;padding:0}.table-wrap{overflow:visible}table{font-size:10px;min-width:0}tr{break-inside:avoid}td,th{padding:7px}.technical{font-size:9px}.stats{margin-top:20px}}
</style></head><body><header><div class="eyebrow">Ace's CFB Toolkit · Catalog reference · ${escapeHtml(catalog.observed)}</div><h1>Gear Catalog</h1><p>Readable equipment names, exact IDs when you need them, and a practical manual-review checklist. Nothing here changes your save or equipment pools.</p></header><main>
<div class="stats"><div><strong>${entries.length}</strong><span>unique entries</span></div><div><strong>${entries.filter(entry => entry.live).length}</strong><span>checked live observations</span></div><div><strong>${entries.filter(entry => !entry.live).length}</strong><span>earlier mappings, not refreshed</span></div><div><strong>2</strong><span>mods: Unlocked 0.96 · RAW v2.0.4</span></div></div>
<h2>What needs manual review?</h2><p>Start with clothing-slot checks and the new skullcap appearance check. The other groups are optional catalog expansion or cleanup, not evidence of broken equipment.</p><div class="review-groups">${reviews}</div>
<div class="notice"><strong>Intentionally excluded, not missing:</strong> four under-lip balaclavas and Remove Balaclava. NFL-style undersocks remain excluded from generic generation. No action is required unless you want to revisit those exclusions.</div>
<details class="notes"><summary>What this catalog can — and cannot — prove</summary>${INTRO.map(line => `<p>${escapeHtml(line)}</p>`).join("")}<p>Of 145 established catalog entries, 43 also appeared in the earlier no-mod observations. For a strictly vanilla menu list, check menus with no equipment mods; neither overlap nor absence is enough by itself.</p></details>
<h2 id="catalog">Browse the full catalog</h2><div class="filters"><div><label for="search">Find an item or exact ID</label><input id="search" type="search" placeholder="Try skullcap, turtleneck, mouthpiece, tattoo…"></div><div><label for="source">Source</label><select id="source">${options([["", "All sources"], ...Object.entries(MOD_NAMES)])}</select></div><div><label for="category">Equipment group</label><select id="category">${options([["", "All groups"], ...categories.map(category => [category, category])])}</select></div><div><label for="review">Manual review</label><select id="review">${options([["", "All items"], ["any", "Any review flag"], ...Object.entries(REVIEW_NAMES)])}</select></div><div class="filter-actions"><span id="count" role="status" aria-live="polite"></span><label for="observation">Scan status</label><select id="observation">${options([["", "All scan statuses"], ["live", "Checked this scan"], ["earlier", "Earlier mappings only"]])}</select><button id="reset" type="button">Clear Filters</button></div></div>
<div class="table-wrap"><table><thead><tr><th scope="col">Item &amp; location</th><th scope="col">Source &amp; group</th><th scope="col">Verification &amp; Toolkit use</th><th scope="col">Manual review / limitations</th></tr></thead><tbody>${rows}</tbody></table><div id="empty">No entries match. Try clearing a filter.</div></div><footer>Offline, self-contained reference. No external requests, process addresses, raw memory bytes or mod files. Source data: equipment-modded-2026-10-05.json. Review flags can overlap; their counts should not be added together.</footer>
</main><script>
const controls=['search','source','category','review','observation'].map(id=>document.getElementById(id));const rows=[...document.querySelectorAll('tbody tr')];const searchText=new Map(rows.map(row=>[row,row.textContent.toLowerCase()]));
function filter(){const [search,source,category,review,observation]=controls.map(control=>control.value);const query=search.toLowerCase().trim();let visible=0;for(const row of rows){const kinds=row.dataset.review.split(' ').filter(Boolean);const match=(!query||searchText.get(row).includes(query))&&(!source||row.dataset.source===source)&&(!category||row.dataset.category===category)&&(!review||(review==='any'?kinds.length>0:kinds.includes(review)))&&(!observation||row.dataset.live===observation);row.hidden=!match;if(match)visible++;}document.getElementById('count').textContent=visible+' of '+rows.length+' entries';document.getElementById('empty').classList.toggle('visible',visible===0);}
for(const control of controls)control.addEventListener(control.id==='search'?'input':'change',filter);document.getElementById('reset').addEventListener('click',()=>{controls.forEach(control=>control.value='');filter();});
for(const button of document.querySelectorAll('[data-review-filter]'))button.addEventListener('click',()=>{controls.forEach(control=>control.value='');document.getElementById('review').value=button.dataset.reviewFilter;filter();document.getElementById('catalog').scrollIntoView();});
for(const link of document.querySelectorAll('[data-reveal]'))link.addEventListener('click',()=>{controls.forEach(control=>control.value='');filter();});filter();
</script></body></html>\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = path.resolve(process.argv[2] ?? "docs/catalogs/equipment-modded-2026-10-05.json");
  const catalog = JSON.parse(fs.readFileSync(source, "utf8")), entries = buildEntries(catalog);
  const directory = path.dirname(source);
  for (const [name, content] of [["gear-catalog-readable.md", renderMarkdown(catalog, entries)], ["gear-catalog-readable.html", renderHtml(catalog, entries)]]) {
    fs.writeFileSync(path.join(directory, name), content, "utf8");
    console.log(`Created ${path.join(directory, name)} (${entries.length} unique entries)`);
  }
  console.log(JSON.stringify(buildReviewGroups(entries).map(group => ({ review: group.kind, count: group.entries.length })), null, 2));
}
