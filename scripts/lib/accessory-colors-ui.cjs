const fs=require('node:fs'),path=require('node:path');
module.exports=async(window,root)=>{
  const execute=source=>window.webContents.executeJavaScript(source,true);
  await execute(`(async()=>{
    const check=(ok,label)=>{if(!ok)throw Error(label)},wait=async predicate=>{for(let i=0;i<1000;i++){if(predicate())return;await new Promise(r=>setTimeout(r,20));}throw Error('Color UI timeout')};
    navigate('equipment-patcher');await wait(()=>content.querySelector('[data-patcher-flow]')?.patcherCards?.length===17);
    for(const team of ['alabama','georgia','nebraska','penn state','usc'])for(const [color,expected] of [['white','95'],['black','5'],['primary','0'],['secondary','0']]){
      const input=content.querySelector('[data-accessory-team="'+team+'"][data-accessory-team-color="'+color+'"]');check(input?.value===expected,'Fresh accessory default '+team+' '+color);
    }
    for(const team of ['alabama','georgia','nebraska','penn state','usc'])check(content.querySelector('[data-tape-team="'+team+'"][data-tape-color="black"]')?.value==='100','Independent tape table retained '+team);
    document.getElementById('fix-unlocked-recolor').click();document.getElementById('equipment-step-next').click();
    content.querySelector('[data-patcher-setting="fix-unlocked-recolor"] [data-config-open]').click();const dialog=document.querySelector('dialog[open]');check(dialog,'Recolor configuration opens');
    const values=equipmentOptions('equipment-patcher');check(values.tapeColorMode==='accessory'&&values.unlockedColorTheme==='team','Existing mode defaults retained');
    dialog.querySelector('[data-config-save]').click();const options=equipmentOptions('equipment-patcher');for(const team of ['alabama','georgia','nebraska','penn state','usc'])check(options.teamAccessoryColors[team]?.white===95&&options.teamAccessoryColors[team]?.black===5,'Save preserves new accessory defaults '+team);
    navigate('equipment-quickstart');await wait(()=>document.getElementById('quickstart-unlocked'));check(content.querySelectorAll('.standard-config-workspace input[type="checkbox"]').length===4,'Quickstart retains only mods and EA protection choices');check(!/5%|accent chance|color accent/i.test(content.textContent),'No Quickstart accent notes');
    window.accessoryColorsUiAudit={schools:5,separateEditorDefaults:true,configurationSaved:true,quickstartControlsUnchanged:true,noAccentNotes:true};
  })()`);
  const result=await execute('accessoryColorsUiAudit');fs.writeFileSync(path.join(root,'outputs/accessory-colors-ui.json'),JSON.stringify(result,null,2));console.log('PASS '+JSON.stringify(result));
};
