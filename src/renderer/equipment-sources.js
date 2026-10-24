function equipmentSourceGroups(uses = []) {
  const grouped = new Map();
  for (const use of uses) {
    const donor = use.donor ?? {}, key = JSON.stringify([donor.team, donor.row ?? [donor.firstName, donor.lastName, donor.position]]);
    const entry = grouped.get(key) ?? {donor, groups: []};
    if (!entry.groups.includes(use.group)) entry.groups.push(use.group);
    grouped.set(key, entry);
  }
  return [...grouped.values()];
}
function equipmentSourceGroupLabel(group) {
  return ({'full kit':'Whole outfit','helmet':'Helmet & face','upper':'Upper body','lower':'Lower body','upper body':'Upper body','lower body':'Lower body','upper body + arms':'Upper body & arms','lower body + waist':'Lower body & waist',hands:'Gloves',feet:'Cleats'})[group] ?? String(group ?? 'Equipment').replace(/(^|[ /-])\w/g, text=>text.toUpperCase());
}
function equipmentSourcesMarkup(change, compact = false) {
  const donors = equipmentSourceGroups(change.donorUses);
  const pools = new Map(Object.entries(change.modPoolAdditions ?? {}).map(([origin,items])=>[origin,[...items]]));
  for(const item of change.facePaint ?? [])if(item.asset && item.asset !== 'FaceMarks_None'){
    const origin=item.source?.includes('RAW')?'raw':item.source?.includes('Unlocked')?'unlocked':'facepaint';
    if(!pools.has(origin))pools.set(origin,[]);pools.get(origin).push({displayName:item.displayName??'Facepaint'});
  }
  const additions = [...pools].filter(([,items])=>items.length);
  const cards = donors.map(({donor,groups})=>`<div class="equipment-source"><div><strong>${escapeHtml([donor.firstName,donor.lastName].filter(Boolean).join(' ')||'Source player')}</strong><small>${escapeHtml(donor.team??'Unknown team')} · ${escapeHtml(localizedPosition(donor.position??''))}</small><div class="equipment-source-tags">${groups.map(group=>`<span>${escapeHtml(equipmentSourceGroupLabel(group))}</span>`).join('')}</div></div></div>`).join('');
  const poolCards = additions.map(([origin,items])=>`<div class="equipment-source equipment-source-pool"><div><strong>${escapeHtml({unlocked:'CFB27 Unlocked',raw:'RAW Accessories',eljax:'GameDay Gear',facepaint:'Vanilla Facepaint Pool'}[origin]??origin)}</strong><div class="equipment-source-tags">${[...new Set(items.map(item=>item.displayName??item.category??'Modded equipment'))].map(label=>`<span>${escapeHtml(label)}</span>`).join('')}</div></div></div>`).join('');
  return `<section class="equipment-sources ${compact?'is-compact':''}" aria-label="Equipment sources"><div class="equipment-source-heading"><strong>Equipment Sources</strong>${donors.length?`<span>${donors.length} player${donors.length===1?'':'s'}</span>`:''}</div><div class="equipment-source-grid">${cards||(!poolCards?`<p>${escapeHtml(change.donor||'Source details are unavailable for this older preview.')}</p>`:'')}${poolCards}</div>${change.noDrip?'<span class="equipment-source-note">Simplified look applied</span>':''}</section>`;
}
