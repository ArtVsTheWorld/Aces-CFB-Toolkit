function toolLoading(message) {
  return `<div class="tool-progress" data-tool-progress role="status"><div class="tool-progress-heading"><strong data-progress-message>${escapeHtml(message)}</strong><span data-progress-percent>0%</span></div><progress max="100" value="0" aria-label="Tool progress"></progress></div>`;
}

(() => {
  const operations = new Map();
  window.cfbToolkit.onToolProgress?.(update => {
    if (update.phase === 'start') {
      const targets = [...document.querySelectorAll('[data-tool-progress]:not([data-operation-id])')];
      let target = targets.at(-1);
      if (!target) {
        let tray = document.getElementById('tool-progress-tray');
        if (!tray) { tray = document.createElement('aside'); tray.id = 'tool-progress-tray'; tray.setAttribute('aria-label', 'Current operations'); document.body.append(tray); }
        const panel = document.createElement('div'); panel.innerHTML = toolLoading('Loading…');
        target = panel.firstElementChild; target.dataset.floating = 'true'; tray.append(target);
      }
      target.dataset.operationId = update.operationId;
      operations.set(update.operationId, target);
    }
    const target = operations.get(update.operationId);
    if (!target) return;
    if (!target.isConnected) { operations.delete(update.operationId); return; }
    const bar = target.querySelector('progress'), percent = target.querySelector('[data-progress-percent]');
    if (update.phase !== 'error' && Number.isFinite(update.percent)) {
      const value = Math.max(bar.value, Math.min(100, Math.max(0, Math.floor(update.percent))));
      bar.value = value;
      percent.textContent = value + '%';
    }
    if (update.message) target.querySelector('[data-progress-message]').textContent = update.phase === 'error' ? 'Stopped: ' + update.message : update.message;
    if (['complete', 'error'].includes(update.phase)) {
      operations.delete(update.operationId);
      if (target.dataset.floating) { target.remove(); const tray = document.getElementById('tool-progress-tray'); if (tray && !tray.children.length) tray.remove(); }
    }
  });
})();
