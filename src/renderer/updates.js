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
  }
  const promptQueue=[];
  let prompting=false;
  function showUpdatePrompt(){
    if(prompting||!promptQueue.length)return;
    if(document.querySelector("dialog[open]")){setTimeout(showUpdatePrompt,200);return;}
    const request=promptQueue.shift(),install=request.kind==="install",version=String(request.version).replace(/\.0$/,"");
    const dialog=createConfigurationDialog({title:install?"Restart to Update":"Toolkit Update Available",eyebrow:"App Updates",saveLabel:install?"Restart and Install":"Download Update",immediate:true,className:"confirmation-editor update-prompt",description:install?`Install Ace's CFB Toolkit ${version}?`:`Ace's CFB Toolkit ${version} is available.`});
    if(!dialog){promptQueue.unshift(request);setTimeout(showUpdatePrompt,200);return;}
    prompting=true;let settled=false;
    dialog.querySelector(".configuration-body").textContent=install?"The Toolkit will close and reopen. Unapplied previews and review decisions will be discarded. Unsaved tool settings also reset on restart. Your saves, backups, saved settings, presets, reports, and history are not removed.":"You can keep using the app during the download. The update installs only when you approve a restart.";
    dialog.querySelector("[data-config-dirty]").textContent=install?"Finish any work you want to keep before restarting.":"Nothing downloads until you approve.";
    const close=dialog.closeEditor;
    const finish=accepted=>{if(settled)return;settled=true;close();prompting=false;void window.cfbToolkit.respondUpdatePrompt({id:request.id,accepted});setTimeout(showUpdatePrompt,0);};
    dialog.closeEditor=()=>finish(false);
    const later=document.createElement("button");later.className="button secondary";later.textContent="Later";later.addEventListener("click",()=>finish(false));dialog.querySelector(".configuration-footer-actions").prepend(later);
    dialog.querySelector("[data-config-save]").addEventListener("click",()=>finish(true));dialog.showModal();later.focus();
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
