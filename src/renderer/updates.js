/* GitHub notes are untrusted content. Rebuild only formatting; never attributes,
 * images, embedded media, script, links, styles or event handlers. */
function updateNotesMarkup(value){
  const source=String(value??'').slice(0,60000),escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  if(!source.trim())return '<p class="muted">Release notes are not available for this update.</p>';
  if(/<\/?(?:p|h[1-6]|ul|ol|li|div|br|strong|b)\b/i.test(source)){
    const parsed=new DOMParser().parseFromString(source,'text/html'),allowed=new Set(['P','H1','H2','H3','H4','H5','H6','UL','OL','LI','STRONG','B','EM','I','CODE','PRE','BR']),blocked=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','TEMPLATE','FORM','INPUT','BUTTON','IMG','VIDEO','AUDIO']);
    const clean=node=>{if(node.nodeType===3)return escape(node.textContent);if(node.nodeType!==1||blocked.has(node.tagName))return '';const inner=[...node.childNodes].map(clean).join('');if(!allowed.has(node.tagName))return inner;const tag=/^H[1-6]$/.test(node.tagName)?'h3':node.tagName.toLowerCase();return tag==='br'?'<br>':`<${tag}>${inner}</${tag}>`;};
    return [...parsed.body.childNodes].map(clean).join('');
  }
  const inline=text=>escape(text).replace(/!\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');
  let list=false,html='';for(const line of source.split(/\r?\n/)){const bullet=line.match(/^\s*[-*+]\s+(.+)/);if(bullet){if(!list)html+='<ul>';list=true;html+='<li>'+inline(bullet[1])+'</li>';continue;}if(list){html+='</ul>';list=false;}if(/^\s*#{1,6}\s+/.test(line))html+='<h3>'+inline(line.replace(/^\s*#{1,6}\s+/,''))+'</h3>';else if(line.trim())html+='<p>'+inline(line)+'</p>';}return html+(list?'</ul>':'');
}
/* Update notices stay outside tool forms so configuration and previews are untouched. */
(() => {
  let status = { phase: "idle", message: "Checking update availability…" };
  const dismissed = new Set();
  const noticeKey = () => `${status.phase}:${status.version}`;
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const actions = () => {
    if (status.installing) return "";
    if (status.phase === "available") return '<button class="button" data-update-action="downloadUpdate">Download Update</button>';
    if (status.phase === "downloaded") return '<button class="button" data-update-action="installUpdate">Restart and Install</button>';
    if (["idle", "error"].includes(status.phase)) return '<button class="button secondary" data-update-action="checkForUpdates">Check for Updates</button>';
    return "";
  };
  const body = () => `<p>${escape(status.message)}</p>${status.phase === "downloading" ? `<progress max="100" value="${Number(status.percent) || 0}" aria-label="Update download"></progress><span> ${Math.floor(Number(status.percent) || 0)}%</span>` : ""}<div class="actions">${actions()}</div>`;
  function paint() {
    const card = document.querySelector("#update-settings-status");
    if (card) card.innerHTML = body();
    const notice = document.querySelector("#update-notice");
    if (notice) {
      notice.hidden = !["available", "downloading", "downloaded"].includes(status.phase) || dismissed.has(noticeKey());
      notice.innerHTML = `<button class="update-dismiss" data-update-dismiss aria-label="Dismiss update notice">×</button><strong>Toolkit Update</strong>${body()}`;
    }
    queueWhatsNew();
  }
  const promptQueue=[];
  let prompting=false;
  const shownNotes=new Set();
  function queueWhatsNew(){const notes=status.whatsNew;if(!notes?.version||shownNotes.has(notes.version)||!notes.notes)return;shownNotes.add(notes.version);promptQueue.push({kind:'whats-new',version:notes.version,releaseNotes:notes.notes});showUpdatePrompt();}
  function showUpdatePrompt(){
    if(prompting||!promptQueue.length)return;
    if(document.querySelector("dialog[open]")){setTimeout(showUpdatePrompt,200);return;}
    const request=promptQueue.shift(),install=request.kind==="install",readOnly=request.kind==='whats-new',version=String(request.version).replace(/\.0$/,"");
    const dialog=createConfigurationDialog({title:readOnly?`What’s New in v${version}`:install?"Restart to Update":`What’s New in v${version}`,eyebrow:"App Updates",saveLabel:readOnly?'Got It':install?"Restart and Install":"Download Update",immediate:true,className:"confirmation-editor update-prompt",description:readOnly?'Your Toolkit is up to date.':install?`Install Ace's CFB Toolkit ${version}?`:`Ace's CFB Toolkit ${version} is available.`});
    if(!dialog){promptQueue.unshift(request);setTimeout(showUpdatePrompt,200);return;}
    prompting=true;let settled=false;
    dialog.querySelector(".configuration-body").innerHTML=`<article class="update-release-notes">${updateNotesMarkup(request.releaseNotes)}</article>${readOnly?'':`<p>${install?'The Toolkit will close and reopen. Unapplied previews and review decisions will be discarded. Unsaved tool settings also reset on restart. Your saves, backups, saved settings, presets, reports, and history are not removed.':'You can keep using the app during the download. The update installs only when you approve a restart.'}</p>`}`;
    dialog.querySelector("[data-config-dirty]").textContent=readOnly?'':install?"Finish any work you want to keep before restarting.":"Nothing downloads until you approve.";
    const close=dialog.closeEditor;
    const finish=accepted=>{if(settled)return;settled=true;close();prompting=false;if(readOnly)void window.cfbToolkit.acknowledgeRelease?.(request.version).catch(()=>{});else void window.cfbToolkit.respondUpdatePrompt({id:request.id,accepted});setTimeout(showUpdatePrompt,0);};
    dialog.closeEditor=()=>finish(false);
    const later=document.createElement("button");later.className="button secondary";later.textContent="Later";later.addEventListener("click",()=>finish(false));if(!readOnly)dialog.querySelector(".configuration-footer-actions").prepend(later);
    dialog.querySelector("[data-config-save]").addEventListener("click",()=>finish(true));dialog.showModal();(readOnly?dialog.querySelector('[data-config-save]'):later).focus();
  }
  window.cfbToolkit.onUpdatePrompt?.(request=>{if(!request||!["download","install"].includes(request.kind)||typeof request.id!=="string")return;promptQueue.push(request);showUpdatePrompt();});
  window.toolkitUpdates = {
    settings: () => `<section class="card update-settings"><h2>App Updates</h2><p class="muted">The installer edition checks GitHub Releases when you open the app. Downloads and restarts require your approval.</p><div id="update-settings-status" role="status" aria-live="polite">${body()}</div></section>`
  };
  document.addEventListener("click", async event => {
    if (event.target.closest("[data-update-dismiss]")) { dismissed.add(noticeKey()); paint(); return; }
    const button = event.target.closest("[data-update-action]");
    if (!button) return;
    const method = button.dataset.updateAction;
    if (!["checkForUpdates", "downloadUpdate", "installUpdate"].includes(method)) return;
    button.disabled = true;
    try { status = await window.cfbToolkit[method](); }
    catch (error) { status = { ...status, message: String(error.message).replace(/^Error invoking remote method '[^']+': Error: /, "") }; }
    paint();
  });
  window.cfbToolkit.onUpdateStatus?.(value => { status = value; paint(); });
  window.cfbToolkit.getUpdateStatus?.().then(value => { status = value; paint(); }).catch(() => {
    status = { phase: "disabled", message: "Update checks are not available in this session." }; paint();
  });
})();
