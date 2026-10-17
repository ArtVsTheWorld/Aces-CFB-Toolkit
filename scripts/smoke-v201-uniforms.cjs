module.exports = async (window, root) => {
  await window.webContents.executeJavaScript(`(async () => {
    const check = (value, message) => { if (!value) throw new Error('v20.1: ' + message); };
    const pause = () => new Promise(resolve => setTimeout(resolve, 70));
    closeConfigurationDialogs(); navigate('equipment-patcher');
    for (let i=0;i<300&&!document.getElementById('fix-unlocked-lower-jersey');i++) await pause();
    const entry = title => [...content.querySelectorAll('.configuration-entry')].find(node=>node.querySelector('strong')?.textContent===title);
    check(entry('Lower Rolled Jersey Caps').hidden && entry('Cutoff Pants Settings').hidden, 'new editors hidden until enabled');
    check(!equipmentOptions('equipment-patcher').lowerRolledJerseyFix && !equipmentOptions('equipment-patcher').cutoffPantsFix, 'both passes default off');
    document.getElementById('fix-unlocked-lower-jersey').click(); entry('Lower Rolled Jersey Caps').querySelector('button').click();
    let dialog=document.querySelector('dialog'), draft=id=>configurationRead(dialog,id);
    check(draft('lower-uniform-cap-QB').value==='100' && draft('lower-uniform-cap-OL').value==='0' && draft('lower-uniform-cap-EDGE').value==='100' && draft('lower-uniform-cap-DT').value==='0', 'requested default caps');
    draft('lower-uniform-cap-WR').value='12.5'; draft('lower-uniform-cap-WR').dispatchEvent(new Event('input',{bubbles:true}));
    check(dialog.querySelector('[data-config-save]').disabled,'fractional caps rejected');
    draft('lower-uniform-cap-WR').value='12'; draft('lower-uniform-cap-WR').dispatchEvent(new Event('input',{bubbles:true}));
    dialog.querySelector('.configuration-footer [data-config-cancel]').click(); check(equipmentOptions('equipment-patcher').lowerJerseyCaps.WR===100,'Cancel preserves caps');
    document.getElementById('fix-unlocked-cutoff-pants').click(); entry('Cutoff Pants Settings').querySelector('button').click(); dialog=document.querySelector('dialog');
    check(draft('cutoff-uniform-cap-WR').value==='5' && draft('cutoff-uniform-cap-CB').value==='5' && draft('cutoff-uniform-cap-FS').value==='5' && draft('cutoff-uniform-cap-SS').value==='5' && draft('cutoff-uniform-cap-QB').value==='0' && !draft('cutoff-replace-standard').checked, 'cutoff defaults and explicit standard override');
    draft('cutoff-uniform-cap-WR').value='17'; draft('cutoff-uniform-cap-WR').dispatchEvent(new Event('input',{bubbles:true})); draft('cutoff-replace-standard').click(); dialog.querySelector('[data-config-save]').click();
    check(equipmentOptions('equipment-patcher').cutoffPantsCaps.WR===17 && equipmentOptions('equipment-patcher').replaceStandardWithCutoff,'Save commits exact settings');
    const preset=presetConfiguration(); check(preset.values['cutoff-uniform-cap-WR']==='17' && preset.values['cutoff-replace-standard'],'preset retains caps and checkbox');
    check(presetCompatibility(preset).messages.length===0,'new settings pass preset compatibility');
    const review=equipmentReviewMarkup('equipment-patcher',state.prepared.get('equipment-patcher|'+state.activeSave.path)); check(review.includes('WR 17%') && review.includes('All Compatible Standard Pants'),'Review exposes cap and override');
    check(entry('Cutoff Pants Settings').textContent.includes('WR 17%'),'inline summary reflects edits');
    document.getElementById('fix-unlocked-cutoff-pants').click(); check(entry('Cutoff Pants Settings').hidden,'turning pass off hides editor but preserves options');
    document.getElementById('fix-unlocked-cutoff-pants').click();
  })()`);
  const fs=require('node:fs'),path=require('node:path');
  for (const [width,theme,kind] of [[1480,'light','lower'],[1480,'dark','cutoff'],[520,'light','cutoff']]) {
    window.setSize(width,width===1480?1000:760);
    await window.webContents.executeJavaScript(`closeConfigurationDialogs();document.documentElement.dataset.theme=${JSON.stringify(theme)};[...content.querySelectorAll('.configuration-entry')].find(node=>node.querySelector('strong')?.textContent===${JSON.stringify(kind==='lower'?'Lower Rolled Jersey Caps':'Cutoff Pants Settings')}).querySelector('button').click();`);
    await new Promise(resolve=>setTimeout(resolve,130));
    const size=await window.webContents.executeJavaScript(`(()=>{const d=document.querySelector('dialog'),b=d.querySelector('.configuration-body');return {left:d.getBoundingClientRect().left,right:d.getBoundingClientRect().right,width:innerWidth,client:b.clientWidth,scroll:b.scrollWidth};})()`);
    if(size.left<0||size.right>size.width+1||size.scroll>size.client+1)throw new Error('Uniform window overflow: '+JSON.stringify(size));
    fs.writeFileSync(path.join(root,'outputs',`v201-${kind}-${theme}-${width}.png`),(await window.webContents.capturePage()).toPNG());
  }
  await window.webContents.executeJavaScript(`closeConfigurationDialogs();document.documentElement.dataset.theme='light';document.getElementById('fix-unlocked-cutoff-pants').click();document.getElementById('fix-unlocked-lower-jersey').click();`);
  window.setSize(1480,1000);
  return 'v20.1 uniform editors: defaults, whole caps, Save/Cancel, visibility, presets, Review, and light/dark desktop/mobile passed.';
};
