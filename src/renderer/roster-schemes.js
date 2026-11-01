/* Native scheme presentation. The generator resolves the authoritative context
 * again against the save, then guards that context through Apply. */
function rosterPrepared(){return state.prepared.get(`roster-generator|${state.activeSave?.path}`);}
function rosterSettingValue(root,id){return root?.querySelector?configurationValue(configurationRead(root,id)??document.getElementById(id)):root?.[id];}
function rosterSchemeRequirements(team,values){
  const prepared=rosterPrepared(),requirements={K:{idealOnRoster:2,minimum:1},P:{idealOnRoster:2,minimum:1}};
  for(const side of ['offense','defense']){
    const choice=rosterSettingValue(values,'roster-'+side),id=choice==='auto'?team.schemes?.[side]:choice;
    const scheme=prepared.nativeSchemes.find(s=>s.enum===id&&s.side===side);
    if(!scheme)throw Error(choice==='shuffle'?'Random schemes are resolved in Preview. Position estimates use the current roster until then.':'Choose an offensive and defensive scheme to build position counts.');
    for(const [position,entry]of Object.entries(scheme.positions))if(RosterComposition.positions.includes(position))requirements[position]=entry;
  }
  return requirements;
}
function rosterTeamPositionCounts(team,root=content){
  if(!team)return {};
  if(rosterSettingValue(root,'roster-makeup')!=='scheme')return team.positionCounts;
  try{const counts=RosterComposition.counts(team.rosterSize,rosterSchemeRequirements(team,root)),groups={};for(const [position,n]of Object.entries(counts)){const group=({LT:'OL',LG:'OL',C:'OL',RG:'OL',RT:'OL',LE:'EDGE',RE:'EDGE',LOLB:'LB',MLB:'LB',ROLB:'LB',K:'K/P',P:'K/P'})[position]??position;groups[group]=(groups[group]??0)+n;}return groups;}catch{return team.positionCounts;}
}
function rosterSchemeValues(root){return Object.fromEntries(['roster-offense','roster-defense','roster-makeup'].map(id=>[id,rosterSettingValue(root,id)]));}
function validateRosterSchemeValues(values,names){
  const prepared=rosterPrepared();if(!prepared)return '';
  for(const name of names){const team=prepared.teams.find(t=>t.name===name);if(!team)continue;
    for(const side of ['offense','defense']){const choice=values['roster-'+side],schemes=prepared[side==='offense'?'offensiveSchemes':'defensiveSchemes'];if(!schemes.some(s=>s.id===choice))return 'Choose a native '+side+' scheme; an older scheme setting needs updating.';if(choice==='auto'&&!team.schemes?.[side])return name+': no saved '+side+' scheme was found. Choose one manually.';}
    if(values['roster-makeup']==='scheme'){
      if(['roster-offense','roster-defense'].some(id=>values[id]==='random'))return 'Build to Scheme Needs requires an offensive and defensive scheme, not Randomized Archetypes.';
      if(['roster-offense','roster-defense'].some(id=>values[id]==='shuffle'))continue;
      try{RosterComposition.counts(team.rosterSize,rosterSchemeRequirements(team,values));}catch(error){return name+': '+error.message;}
    }
  }
  return '';
}
function validateRosterSchemeDraft(root){return validateRosterSchemeValues(rosterSchemeValues(root),root.dataset.rosterTeam?[root.dataset.rosterTeam]:selected('#roster-teams'));}
function rosterMigrateSchemes(values){
  delete values['roster-requirements-source'];
  const aliases={'air-raid':'OFF_AIR_RAID',spread:'OFF_SPREAD',option:'OFF_OPTION','4-3':'DEF_BASE4_3','3-4':'DEF_BASE3_4'};
  for(const id of ['roster-offense','roster-defense'])if(aliases[values[id]])values[id]=aliases[values[id]];
  // Other handmade schemes deliberately retain an invalid selection, prompting
  // an explicit native choice rather than silently changing a saved preset.
}
function syncRosterSchemeDraft(root){
  const panel=root.querySelector('[data-roster-scheme-evidence]');if(!panel)return;
  const prepared=rosterPrepared(),names=root.dataset.rosterTeam?[root.dataset.rosterTeam]:selected('#roster-teams'),values=rosterSchemeValues(root),rows=[];
  const description=root.querySelector('[data-roster-requirements-description]');if(description)description.textContent=values['roster-makeup']!=='scheme'?'Keeps the current number of players at each position. Schemes only influence archetype choices.':'Redistributes roster spots using the offensive and defensive schemes chosen above. Changing schemes changes position needs; the total number of players stays the same.';
  for(const name of names.slice(0,5)){
    const team=prepared.teams.find(t=>t.name===name);if(!team)continue;
    const label=side=>{const choice=values['roster-'+side],scheme=prepared.nativeSchemes.find(s=>s.enum===(choice==='auto'?team.schemes?.[side]:choice));return scheme?.scheme??(choice==='random'?'No scheme preference':choice==='shuffle'?'Chosen in Preview':'Choose a native scheme');};
    const countsSource=values['roster-makeup']==='scheme'?'Chosen schemes’ position needs':'Existing position counts';
    rows.push(`<div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(label('offense'))} · ${escapeHtml(label('defense'))}</span><small>${escapeHtml(countsSource)}</small></div>`);
  }
  panel.innerHTML=`<div class="roster-scheme-teams">${rows.join('')}</div>${names.length>5?`<p>${names.length-5} more teams · resolved individually in Preview.</p>`:''}<p>${values['roster-makeup']==='scheme'?'Positions will be redistributed to fit these needs. Preview shows the before and after position counts.':'Current position counts stay unchanged; schemes influence archetype choices only.'}</p><small>Random schemes are chosen in Preview. These settings do not change the team’s actual coaching scheme or add/remove roster players.</small>`;
}
function rosterSchemeReview(team){
  const context=team.settings?.schemeContext;if(!context)return '';
  const pretty=value=>localizedPosition(value),composition=team.composition??{},positions=RosterComposition.positions.filter(p=>(composition.before?.[p]??0)||(composition.after?.[p]??0)||context.requirements[p]);
  const needs=team.recruitingNeeds??{},fit=team.schemeFit??{};
  return `<small>${escapeHtml(context.offense?.name??'Randomized Offense')} · ${escapeHtml(context.defense?.name??'Randomized Defense')}</small><details><summary>Schemes, Position Counts & Recruiting Needs</summary><p>${escapeHtml(context.sources.counts)}. Archetype preferences use the game’s depth-slot importance weights; they are not hard restrictions.</p><div class="preview-scroll"><table><thead><tr><th>Position</th><th>Before</th><th>After</th><th>Ideal</th><th>Non-Seniors</th><th>Commits</th><th>Recruiting Need</th><th>Preferred Archetypes</th></tr></thead><tbody>${positions.map(p=>`<tr><td>${escapeHtml(pretty(p))}</td><td>${composition.before?.[p]??0}</td><td>${composition.after?.[p]??0}</td><td title="${escapeHtml(context.requirementSources?.[p]??context.sources.counts)}">${needs[p]?.ideal??'—'}</td><td>${needs[p]?.returning??'—'}</td><td>${needs[p]?.commits??'Unknown'}</td><td>${needs[p]?.need??'Unknown'}</td><td>${fit[p]?`${fit[p].preferred} / ${fit[p].players}`:'—'}</td></tr>`).join('')}</tbody></table></div><p class="muted">Recruiting needs exclude seniors and count existing commits where readable. Commitments stay unchanged. Unavailable preferred archetypes use other valid observed player profiles.</p></details>`;
}
