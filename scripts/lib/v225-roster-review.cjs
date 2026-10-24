const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async(window,root,getReport)=>{
 const execute=async source=>{try{return await window.webContents.executeJavaScript(`try{${source}}catch(error){window.rosterReviewFailure=String(error.stack);throw error}`)}catch(error){console.error('Roster review expression:',source.slice(0,250));console.error('Roster review:',await window.webContents.executeJavaScript(`({failure:window.rosterReviewFailure,page:state.page,toast:document.getElementById('toast')?.textContent,result:state.genericPreviews.get('roster-generator')?.details?.warnings})`));throw error;}};
 window.setContentSize(1480,1050);
 const counts=await execute(`(async()=>{
  window.rosterReviewCheck=(ok,message)=>{if(!ok)throw Error(message)};
  navigate('roster-generator');for(let i=0;!document.getElementById('roster-teams');i++){if(i>1000)throw Error('Roster Generator did not load');await new Promise(r=>setTimeout(r,30))}
  const teams=document.getElementById('roster-teams');for(const option of teams.options)option.selected=option.value==='LSU';teams.dispatchEvent(new Event('change',{bubbles:true}));
  for(const [id,value]of [['roster-offense','OFF_OPTION'],['roster-defense','DEF_BASE3_4'],['roster-makeup','scheme']]){const control=document.getElementById(id);control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}))}
  await runTool('roster-generator','preview');const result=state.genericPreviews.get('roster-generator');rosterReviewCheck(result?.details.changes.length>0,'Actual generation preview completed');
  window.rosterReviewResult=result;
  const changed=result.details.changes.filter(row=>row.positionChanged);rosterReviewCheck(changed.length>0,'Selected schemes redistribute some positions');
  rosterReviewCheck(changed.length===result.details.teams[0].composition.changed,'Flag count matches actual composition changes');
  for(const row of result.details.changes){const position=rosterPositionReview(row);rosterReviewCheck(position.changed===row.positionChanged,'Renderer/backend position-change flags agree');rosterReviewCheck(position.previous===row.originalPosition,'Original position metadata retained')}
  window.auditRosterReview=()=>{
   const result=rosterReviewResult,output=document.getElementById('run-output'),changes=result.details.changes.filter(row=>row.positionChanged),cards=[...output.querySelectorAll('.roster-player-card')];
   rosterReviewCheck(cards.length===result.details.changes.length,'Every generated player has a card');rosterReviewCheck(output.querySelectorAll('.roster-player-grid [data-roster-position-change]').length===changes.length,'Changed players flagged on cards');
   rosterReviewCheck(output.querySelectorAll('.generic-player-table-view [data-roster-position-change]').length===changes.length,'Changed players flagged in table');
   for(const row of changes){const card=cards.find(c=>c.querySelector('header strong').textContent==='#'+row.fields.JerseyNum+' '+row.player+'*');rosterReviewCheck(card?.textContent.includes(row.oldPlayer+' · '+row.originalPosition),'Replaced player name/position shown');const flag=card?.querySelector('header strong [data-roster-position-change]');rosterReviewCheck(flag?.textContent==='*'&&flag.title.includes(row.originalPosition+' → '+row.position),'Asterisk beside name explains old/new position');const color=getComputedStyle(flag).color;rosterReviewCheck(['rgb(189, 32, 50)','rgb(255, 123, 137)'].includes(color),'Position asterisk is red in both themes')}
   rosterReviewCheck(!output.querySelector('.roster-team-summary'),'No sprawling per-team summary');
   const warnings=output.querySelector('[data-roster-apply-warnings]');rosterReviewCheck(Boolean(warnings)===Boolean(result.details.warnings.length),'Before You Apply only exists when there are warnings');
   if(warnings)rosterReviewCheck(!/average across your roster|Long-snap and dealbreaker fixes|Player rows and roster size|Ranked by natural position|named-scheme tuning will be used|native scheme counts are available/.test(warnings.textContent),'No routine instructions/success/fallback notices in warning panel');
  };
  auditRosterReview();return {players:result.details.changes.length,changed:changed.length};
 })().catch(error=>{window.rosterReviewFailure=String(error.stack);throw error})`);
 const report=getReport(),column=report.headings.indexOf('PositionChanged'),original=report.headings.indexOf('OriginalPosition'),generated=report.headings.indexOf('GeneratedPosition'),diagnostics=report.headings.indexOf('PreviewDiagnosticsJSON');
 assert.ok(column>=0&&original>=0&&generated>=0);assert.equal(report.rows.filter(row=>row[column]).length,counts.changed);
 for(const row of report.rows)assert.equal(row[column],({LE:'LEDG',RE:'REDG',MLB:'MIKE',LOLB:'SAM',ROLB:'WILL'}[row[original]]??row[original])!==({LE:'LEDG',RE:'REDG',MLB:'MIKE',LOLB:'SAM',ROLB:'WILL'}[row[generated]]??row[generated]));
 assert.ok(JSON.parse(report.rows[0][diagnostics]).generationNotes.some(note=>note.includes('Long-snap')),'Routine notes remain in CSV diagnostics');
 for(const theme of ['light','dark'])for(const width of [1480,760,520]){
  window.setContentSize(width,width===1480?1050:780);
  await execute(`document.documentElement.dataset.theme=${JSON.stringify(theme)};void 0;`);
  for(const view of ['cards','table']){
   await execute(`document.querySelector('[data-generic-view="${view}"]').click();auditRosterReview();const first=document.querySelector(${JSON.stringify(view==='cards'?'.roster-player-card:has([data-roster-position-change])':'.generic-player-table-view')});first.scrollIntoView({block:'start'});new Promise(r=>setTimeout(r,80));`);
   const layout=await execute(`(()=>{const output=document.getElementById('run-output'),table=output.querySelector('.generic-player-table-view'),cards=output.querySelector('.roster-player-grid');rosterReviewCheck(${JSON.stringify(view)}==='cards'?!cards.hidden&&table.hidden:cards.hidden&&!table.hidden,'Cards/table visibility preserved');return{width:innerWidth,scroll:document.documentElement.scrollWidth}})()`);
   assert.ok(layout.scroll<=layout.width+2,'Roster review stays within viewport');
   if(width!==760)fs.writeFileSync(path.join(root,`outputs/v225-roster-review-${view}-${theme}-${width}.png`),(await window.webContents.capturePage()).toPNG());
  }
 }
 await execute(`(()=>{const clean=structuredClone(rosterReviewResult);clean.details.warnings=[];renderResult(document.getElementById('run-output'),clean);rosterReviewCheck(!document.querySelector('[data-roster-apply-warnings]'),'No empty warning panel');})()`);
 console.log('PASS roster review: '+counts.players+' actual generated players, '+counts.changed+' position changes named/flagged in cards/table and CSV; routine notes excluded from warnings but retained in diagnostics, no empty panel, responsive light/dark views; fixture unchanged, no Apply.');
};
