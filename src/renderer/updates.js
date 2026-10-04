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
