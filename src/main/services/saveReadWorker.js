import {parentPort} from 'node:worker_threads';
import {SaveReader} from './saveReader.js';
import {withToolProgress,toolProgress} from './toolProgress.js';
const reader=new SaveReader();
let queue=Promise.resolve();
parentPort.on('message',({id,action,payload})=>{
  queue=queue.then(async()=>{
    try{
      const value=await withToolProgress(progress=>parentPort.postMessage({id,type:'progress',progress}),async()=>{
        if(action==='lines'){
          const {readSeasonLines}=await import('../tools/forceWin/runner.js');
          return readSeasonLines(payload);
        }
        if(!['snapshot','identity'].includes(action))throw Error('Unknown save read operation.');
        const value=await reader.read(payload.savePath,payload.schemaDirectory,{identityOnly:action==='identity'});
        toolProgress(99,'Save ready');return action==='identity'?value.dynastyId:value;
      });
      parentPort.postMessage({id,value});
    }catch(error){parentPort.postMessage({id,error:{message:error.message,stack:error.stack,code:error.code}});}
  });
});
