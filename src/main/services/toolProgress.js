import {AsyncLocalStorage} from 'node:async_hooks';

const runs = new AsyncLocalStorage();

// Percentages describe completed stages and record counts, never elapsed time.
export function withToolProgress(emit, action) {
  const state = {percent:-1, emit};
  return runs.run({state, start:0, end:100}, action);
}

export function progressRange(start, end, action) {
  const parent = runs.getStore();
  if (!parent) return action();
  const width = parent.end - parent.start;
  return runs.run({...parent, start:parent.start + width * start / 100, end:parent.start + width * end / 100}, action);
}

export function toolProgress(percent, message) {
  const context = runs.getStore();
  if (!context || !Number.isFinite(percent)) return;
  const value = Math.min(100, Math.max(0, Math.floor(context.start + (context.end - context.start) * percent / 100)));
  if (value <= context.state.percent) return;
  context.state.percent = value;
  context.state.emit({percent:value, message:String(message ?? 'Working…')});
}

export function toolProgressCount(done, total, message) {
  if (total > 0) toolProgress(100 * done / total, message);
}
