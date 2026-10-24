import {parentPort, workerData} from 'node:worker_threads';
import {getToolHandler} from '../tools/handlers.js';
import {prepareEquipmentDonors} from '../tools/equipment/donorSource.js';
import {planAudit, setPlanAudit, searchPlanRows, snapshotPlanRows} from '../tools/jersey/planStore.js';
import {QuickstartMemory, equipmentDynastyId} from './quickstartMemory.js';
import {openCfb27Save, inspectSaveSchema} from './save.js';
import {ReportService} from './reports.js';
import {ReviewSnapshots} from './reviewSnapshots.js';
import {readHomeContext} from './homeContext.js';
import {readSeasonLines} from '../tools/forceWin/runner.js';
import {withToolProgress, toolProgress, progressRange} from './toolProgress.js';

const memory = new QuickstartMemory(workerData.memoryFile);
const reports = new ReportService(workerData.reportsDirectory);
const reviews = new ReviewSnapshots(workerData.reviewsDirectory);

async function execute(action, payload) {
  const context = {...payload, quickstartMemory:memory};
  if (action === 'inspect') return inspectSaveSchema(payload.savePath, payload.schemaDirectory);
  if (action === 'prepare') {
    const prepared = await progressRange(0, 80, () => getToolHandler(payload.toolId)?.prepare?.(context) ?? {});
    toolProgress(82, 'Reading controlled teams…');
    const home = await progressRange(82, 94, () => readHomeContext(payload.savePath, payload.schemaPath)).catch(() => null);
    if (!home) return prepared;
    const controlled = new Map([...(prepared.userControlledTeams ?? []), ...(home.controlledTeams ?? [])].map(team => [team.name ?? team, team]));
    return {...prepared, userControlledTeams:[...controlled.values()]};
  }
  if (action === 'run') {
    const handler = getToolHandler(payload.toolId);
    if (!handler?.run) throw new Error('This tool has not been migrated yet.');
    const previous = payload.mode === 'apply' && payload.options?.planId ? planAudit(payload.options.planId) : null;
    const audit = {...payload.audit, options:previous?.options ?? payload.options ?? {}, previewRunId:previous?.runId ?? null};
    const result = await progressRange(0, 93, () => handler.run({...context, reports:reports.forRun(audit)}));
    if (payload.mode === 'preview' && result.planId) setPlanAudit(result.planId, audit);
    toolProgress(94, 'Saving review details…');
    let reviewAvailable = false, reviewError = null;
    try { reviewAvailable = reviews.save(audit.runId, result, result.planId ? snapshotPlanRows(result.planId) : null); }
    catch (error) { reviewError = error.message; }
    return {result, reviewAvailable, reviewError};
  }
  if (action === 'search') return searchPlanRows(payload.planId, payload.query, 1000, payload.filters);
  if (action === 'donors') return prepareEquipmentDonors(context);
  if (action === 'clearMemory') {
    const {franchise} = await openCfb27Save(payload.savePath, payload.schemaPath);
    return memory.clear(await equipmentDynastyId(franchise));
  }
  if (action === 'home') return readHomeContext(payload.savePath, payload.schemaPath);
  if (action === 'lines') return readSeasonLines(context);
  if (action === 'review') return reviews.get(payload.id);
  if (action === 'pruneReviews') return reviews.prune(payload.ids);
  throw new Error('Unknown background tool operation.');
}

let queue = Promise.resolve();
parentPort.on('message', ({id, action, payload}) => {
  parentPort.postMessage({id, type:'progress', progress:{percent:0, message:'Waiting for the current operation…'}});
  queue = queue.then(async () => {
    try {
      const value = await withToolProgress(progress => parentPort.postMessage({id, type:'progress', progress}), async () => {
        toolProgress(1, 'Starting…');
        const value = await execute(action, payload);
        toolProgress(99, 'Finishing…');
        return value;
      });
      parentPort.postMessage({id, value});
    } catch (error) {
      parentPort.postMessage({id, error:{message:error.message, code:error.code, stack:error.stack}});
    }
  });
});
