module.exports=async(window)=>{
 const exec=code=>window.webContents.executeJavaScript(code),pause=ms=>new Promise(r=>setTimeout(r,ms));
 await exec(`(()=>{const d=passOpen('Mouthpiece Settings');passChange(configurationRead(d,'mouthpiece-style-mode'),'custom');window.helpTestDialog=d;window.helpTestIcon=d.querySelector('[data-model-help]');})()`);
 await pause(180);
 const point=await exec(`(()=>{const r=helpTestIcon.getBoundingClientRect(),d=helpTestDialog.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),awayX:Math.round(d.left+10),awayY:Math.round(d.top+10)}})()`);
 // A real mouse click focuses the icon. Leaving it must still dismiss help.
 window.webContents.sendInputEvent({type:'mouseMove',x:point.x,y:point.y});
 window.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,x:point.x,y:point.y});
 window.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:point.x,y:point.y});
 await pause(240);
 await exec(`passCheck(document.activeElement===helpTestIcon,'Mouse click focuses help icon');passCheck(!helpTestDialog.querySelector('.model-help-tooltip').hidden,'Mouse click opens help');`);
 window.webContents.sendInputEvent({type:'mouseMove',x:point.awayX,y:point.awayY});await pause(220);
 await exec(`passCheck(helpTestDialog.querySelector('.model-help-tooltip').hidden,'Mouse-focused tooltip closes after pointer leaves');`);
 window.webContents.sendInputEvent({type:'mouseMove',x:point.x,y:point.y});await pause(240);
 await exec(`passCheck(!helpTestDialog.querySelector('.model-help-tooltip').hidden,'Hover opens help');helpTestDialog.querySelector('.configuration-body').dispatchEvent(new Event('scroll'));passCheck(helpTestDialog.querySelector('.model-help-tooltip').hidden,'Scrolling closes help');`);
 await exec(`(()=>{helpTestIcon.blur();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));helpTestIcon.focus();helpTestIcon.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));passCheck(!helpTestDialog.querySelector('.model-help-tooltip').hidden,'Keyboard focus opens help without mouse');helpTestIcon.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));passCheck(helpTestDialog.open&&helpTestDialog.querySelector('.model-help-tooltip').hidden,'Escape dismisses help, not dialog');helpTestIcon.blur();helpTestIcon.focus();helpTestIcon.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));passTab(helpTestDialog,'Colors & Existing Gear');passCheck(helpTestDialog.querySelector('.model-help-tooltip').hidden,'Changing pages dismisses help');helpTestDialog.closeEditor();passCheck(!document.querySelector('.model-help-tooltip:not([hidden])'),'Closing window leaves no tooltip');})()`);
 console.log('PASS tooltip lifecycle: real mouse click/focus/leave, hover, scroll, keyboard focus, Escape, page switch and dialog close.');
};
