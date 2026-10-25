import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {displayPosition} from '../src/shared/localization.js';

const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
function renderer(){
 const context=vm.createContext({state:{genericResultViews:new Map()},previewChanges:result=>result.details.changes,localizedPosition:displayPosition,escapeHtml:html,forceLogoUrl:()=>'',rosterSchemeReview:()=>''});
 vm.runInContext(fs.readFileSync(new URL('../src/renderer/roster-generator.js',import.meta.url),'utf8'),context);return context;
}
function row(original='WR',generated='TE'){
 return {row:1,team:'Test Team',oldPlayer:'Original Person',player:'New Person',position:generated,classYear:'Freshman',overall:70,before:{Position:original,JerseyNum:8},fields:{Position:generated,JerseyNum:12,SchoolYear:'Freshman',PlayerType:'Possession',TraitDevelopment:'Normal',OverallRating:70,PLYR_HOME_TOWN:'Town',PLYR_HOME_STATE:'State'},provenance:{},highlights:[]};
}
function result(changes=[row()],warnings=[]){return {resultKind:'roster-generator',mode:'preview',details:{changes,warnings,teams:[],totalPreviewRows:changes.length}};}

test('changed roster slots visibly identify both positions and the old/new player in cards and table',()=>{
 const context=renderer(),changed=row(),kept={...row('QB','QB'),row:2,player:'Another Person'};context.result=result([changed,kept]);
 const markup=vm.runInContext('rosterGeneratorResults(result)',context),cards=[...markup.matchAll(/<article[^]*?<\/article>/g)].map(m=>m[0]);
 assert.match(cards[0],/Replaces #8 Original Person · WR/);assert.match(cards[0],/#12 New Person<span[^>]*data-roster-position-change[^>]*>\*<\/span><\/strong>/);assert.match(cards[0],/title="Position changed: WR → TE"/);
 assert.doesNotMatch(cards[1],/data-roster-position-change/);assert.match(markup,/<td>TE<\/td>/);assert.match(markup,/<td>#12 New Person<span[^>]*data-roster-position-change[^>]*>\*<\/span><\/td>/);
});

test('multi-team review omits the sprawling team summary without dropping player reviews or warnings',()=>{
 const context=renderer();context.result=result();context.result.details.teams=Array.from({length:138},(_,i)=>({team:`Team ${i}`,players:85,oldAverage:70,newAverage:69}));
 const markup=vm.runInContext('rosterGeneratorResults(result)',context);assert.doesNotMatch(markup,/roster-team-summary|Talent by Position Group|Schemes, Position Counts/);assert.match(markup,/New Person/);
 const css=fs.readFileSync(new URL('../src/renderer/roster-generator.css',import.meta.url),'utf8');assert.match(css,/\.roster-position-change\{[^}]*color:#bd2032/);assert.match(css,/\[data-theme=dark\][^}]*\.roster-position-change\{color:#ff7b89/);
});

test('position aliases and unknown legacy positions do not create false change flags',()=>{
 const context=renderer();for(const [previous,next]of [['MLB','MIKE'],['LE','LEDG'],['RE','REDG'],['LOLB','SAM'],['ROLB','WILL'],['QB','QB'],[0,'QB']])assert.equal(context.rosterPositionReview(row(previous,next)).changed,false,`${previous} → ${next}`);
 const legacy=row();delete legacy.before.Position;assert.equal(context.rosterPositionReview(legacy).changed,false);
 assert.equal(context.rosterPositionReview(row('WR','TE')).changed,true);
 assert.match(context.rosterPositionBadge(row('<script>','TE')),/&lt;script&gt;/);
});

test('shared review notices preserve actual unknown warnings and blockers outside the player list',()=>{
 const context=renderer();vm.runInContext(fs.readFileSync(new URL('../src/renderer/results-ui.js',import.meta.url),'utf8'),context);context.result=result();assert.equal(vm.runInContext('runIssueMarkup(result)',context),'');
 context.result=result([],['Test Team: Unrecognized issue <keep this warning>.']);context.result.details.generationNotes=['Explains how generation works.'];context.result.details.blocking=[{team:'Test Team',row:1,reason:'Unsafe appearance reference'}];
 const markup=vm.runInContext('runIssueMarkup(result)',context);assert.match(markup,/Needs attention/);assert.match(markup,/Unrecognized issue &lt;keep this warning&gt;/);assert.match(markup,/Unsafe appearance reference/);assert.doesNotMatch(markup,/Explains how generation works/);
});
