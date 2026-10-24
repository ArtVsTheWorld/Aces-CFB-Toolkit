import {Worker} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';

// One persistent worker owns cached previews. Serial dispatch keeps Apply,
// tracking updates and memory resets in the same order as their requests.
export class ToolWorkerClient {
  constructor(configuration, {workerUrl = new URL('./toolWorker.js', import.meta.url)} = {}) {
    this.configuration = configuration;
    this.workerUrl = workerUrl;
    this.pending = new Map();
    this.worker = null;
    this.closed = false;
  }
  start() {
    if (this.closed) throw new Error('The toolkit is closing.');
    if (this.worker) return;
    const worker = new Worker(this.workerUrl, {workerData:this.configuration});
    this.worker = worker;
    worker.on('message', message => {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      if (message.type === 'progress') { pending.onProgress?.(message.progress); return; }
      this.pending.delete(message.id);
      if (message.error) {
        const error = new Error(message.error.message);
        if (message.error.code) error.code = message.error.code;
        if (message.error.stack) error.stack = message.error.stack;
        pending.reject(error);
      } else pending.resolve(message.value);
    });
    const failed = error => {
      if (this.worker !== worker) return;
      this.worker = null;
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    };
    worker.on('error', failed);
    worker.on('exit', () => failed(new Error('The background tool stopped. Run Preview again before Apply. Cached previews are no longer available.')));
  }
  request(action, payload = {}, onProgress) {
    this.start();
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject, onProgress});
      try { this.worker.postMessage({id, action, payload}); }
      catch (error) { this.pending.delete(id); reject(error); }
    });
  }
  async close() {
    this.closed = true;
    const worker = this.worker;
    this.worker = null;
    for (const pending of this.pending.values()) pending.reject(new Error('The toolkit is closing.'));
    this.pending.clear();
    await worker?.terminate();
  }
}
