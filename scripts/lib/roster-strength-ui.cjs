// Runs inside the isolated real-renderer roster smoke harness; no user settings.
const fs=require('node:fs'),path=require('node:path');
module.exports=async function(window,output){
  await window.webContents.executeJavaScript(`(async()=>{
    const check=(v,m)=>{if(!v)throw Error(m);};
    const wait=async predicate=>{for(let i=0;i<600&&!predicate();i++)await new Promise(r=>setTimeout(r,25));check(predicate(),'Roster strength UI timeout');};
    await wait(()=>state.bootstrap);navigate('roster-generator');await wait(()=>document.getElementById('roster-caliber'));
    const teams=document.getElementById('roster-teams'),choose=names=>{for(const o of teams.options)o.selected=names.includes(o.value);teams.dispatchEvent(new Event('change',{bubbles:true}));};
    check(document.getElementById('roster-team-overrides').hidden,'No teams: hide individual settings');
    choose(['LSU']);check(document.getElementById('roster-team-overrides').hidden,'One team: hide individual settings');
    document.getElementById('roster-configure-teams').click();check(!document.querySelector('dialog[open]'),'Single-team opener guarded');
    choose(['LSU','Navy']);check(!document.getElementById('roster-team-overrides').hidden,'Multiple teams: show individual settings');
    const open=()=>{[...content.querySelectorAll('.configuration-entry')].find(e=>e.querySelector('strong')?.textContent==='Position Strength').querySelector('button').click();return document.querySelector('dialog[open]');};
    let d=open(),original=document.getElementById('roster-talent-shares').value;
    check(d.classList.contains('roster-strength-dialog'),'Dedicated scrollable shell');check(d.querySelectorAll('tbody').length===3,'Three position sections');check(d.querySelectorAll('[data-roster-talent]').length===13,'All position groups');check(!d.querySelector('meter'),'No redundant OVR bars');
    const counts=rosterTalentCounts(),before=RosterTalent.baseline(counts),qb=d.querySelector('[data-roster-talent="QB"]'),number=d.querySelector('[data-roster-talent-number="QB"]');
    d.querySelector('[data-roster-step="QB"][data-step="1"]').click();check(Number(qb.value)===before.QB+1&&Number(number.value)===before.QB+1,'Plus syncs slider and number');check(d.querySelector('[data-config-save]').disabled,'Over budget cannot save');
    d.querySelector('[data-roster-step="QB"][data-step="-1"]').click();check(!d.querySelector('[data-config-save]').disabled,'Minus restores valid budget');
    number.value=before.QB+7;number.dispatchEvent(new Event('input',{bubbles:true}));check(Number(qb.value)===before.QB+7,'Precise input syncs slider');check(rosterReadTalent(d).OL===before.OL,'Other shares stay independent');
    const expected=RosterTalent.resolvedShares(counts,rosterReadTalent(d));d.querySelector('[data-roster-normalize]').click();check(JSON.stringify(rosterReadTalent(d))===JSON.stringify(expected),'Normalize reuses allocation math');check(!d.querySelector('[data-config-save]').disabled,'Normalized draft can save');
    check(d.querySelector('[data-roster-talent-total]').textContent==='100% / 100%','Prominent budget total');
    const targets=RosterTalent.targets(counts,69,expected);check(d.querySelector('[data-roster-target="QB"]').textContent===targets.QB.toFixed(1),'OVR uses generation calculation');
    const help=d.querySelector('[data-model-help]');help.focus();help.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));check(!d.querySelector('.model-help-tooltip').hidden,'Keyboard-accessible tooltip');help.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));check(d.querySelector('.model-help-tooltip').hidden&&d.open,'Escape dismisses help first');
    d.querySelector('.configuration-footer [data-config-cancel]').click();check(document.getElementById('roster-talent-shares').value===original,'Cancel keeps saved configuration');
    d=open();d.querySelector('[data-roster-talent-number="QB"]').value=0;d.querySelector('[data-roster-talent-number="QB"]').dispatchEvent(new Event('input',{bubbles:true}));d.querySelector('[data-roster-normalize]').click();const saved=configurationRead(d,'roster-talent-shares').value;d.querySelector('[data-config-save]').click();check(document.getElementById('roster-talent-shares').value===saved,'Save commits normalized shares');
    d=open();d.querySelector('[data-config-reset]').click();check(configurationRead(d,'roster-talent-shares').value==='','Reset restores toolkit baseline');check(Number(d.querySelector('[data-roster-talent="QB"]').value)===before.QB,'Reset displayed share');d.querySelector('[data-config-save]').click();
    d=open();const start=d.querySelector('[data-roster-spending-preset]');check([...start.options].filter(option=>option.value).length===5,'Five spending presets');for(const preset of RosterTalent.spendingPresets){start.value=preset.id;start.dispatchEvent(new Event('input',{bubbles:true}));start.dispatchEvent(new Event('change',{bubbles:true}));check(JSON.stringify(rosterReadTalent(d))===JSON.stringify(RosterTalent.presetShares(counts,preset.id)),'Main-page Spending preset applied: '+preset.id);}check(d.querySelector('[data-roster-step="K/P"][data-step="-1"]').disabled,'Specialist minimum protected');d.querySelector('[data-config-reset]').click();d.querySelector('[data-config-save]').click();
    document.getElementById('roster-configure-teams').click();d=document.querySelector('dialog[open]');d.querySelector('[data-roster-edit]').click();d.querySelector('[data-roster-tab="1"]').click();check(d.querySelector('[data-roster-normalize]').disabled,'Inherited team controls disabled');const custom=d.querySelector('[data-roster-custom]');custom.checked=true;custom.dispatchEvent(new Event('change',{bubbles:true}));check(!d.querySelector('[data-roster-normalize]').disabled,'Custom team controls enabled');d.querySelector('[data-roster-step="QB"][data-step="1"]').click();check(d.querySelector('[data-config-save]').disabled,'Individual team validates budget');d.querySelector('[data-roster-normalize]').click();check(!d.querySelector('[data-config-save]').disabled,'Individual team normalization');d.closeEditor();
    choose(['LSU']);check(document.getElementById('roster-team-overrides').hidden,'Reducing team selection hides entry');
  })()`);
  for(const [width,height,theme]of[[1480,1000,'light'],[1480,1000,'dark'],[760,850,'dark'],[520,760,'light'],[380,700,'dark']]){
    window.setSize(width,height);
    await window.webContents.executeJavaScript(`closeConfigurationDialogs();document.documentElement.dataset.theme=${JSON.stringify(theme)};[...content.querySelectorAll('.configuration-entry')].find(e=>e.querySelector('strong')?.textContent==='Position Strength').querySelector('button').click();`);
    await new Promise(r=>setTimeout(r,100));
    const geometry=await window.webContents.executeJavaScript(`(()=>{const d=document.querySelector('dialog[open]'),b=d.querySelector('.configuration-body'),f=d.querySelector('.configuration-footer');b.scrollTop=b.scrollHeight;const box=d.getBoundingClientRect(),footer=f.getBoundingClientRect();return {width:innerWidth,height:innerHeight,left:box.left,right:box.right,bottom:box.bottom,scroll:b.scrollWidth,client:b.clientWidth,footerTop:footer.top,footerBottom:footer.bottom,saveVisible:footer.bottom<=innerHeight&&footer.top>=box.top};})()`);
    if(geometry.left<0||geometry.right>geometry.width+1||geometry.scroll>geometry.client+1||!geometry.saveVisible)throw Error('Strength modal layout: '+JSON.stringify(geometry));
    await window.webContents.executeJavaScript(`document.querySelector('dialog[open] .configuration-body').scrollTop=0;`);
    fs.writeFileSync(path.join(output,`strength-${theme}-${width}.png`),(await window.webContents.capturePage()).toPNG());
  }
  await window.webContents.executeJavaScript(`closeConfigurationDialogs();navigate('home');state.toolSettings.delete('roster-generator');state.genericPreviews.delete('roster-generator');`);
  window.setSize(1480,1000);
  console.log('Position Strength: grouped table, sliders/steppers, normalization, validation, target OVR, tooltips, team gating, Save/Cancel, reset and responsive footer passed.');
};
