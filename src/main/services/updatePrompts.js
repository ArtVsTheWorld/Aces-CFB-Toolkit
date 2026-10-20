import {randomUUID} from 'node:crypto';
// Renderer consent is scoped to one live window and one single-use request.
export class UpdatePrompts {
  pending=new Map();
  request(window,kind,status){
    if(!window||window.isDestroyed())return Promise.resolve(false);
    const sender=window.webContents,id=randomUUID();
    return new Promise(resolve=>{
      const finish=value=>{if(!this.pending.has(id))return;this.pending.delete(id);clearTimeout(timer);sender.removeListener('destroyed',cancel);sender.removeListener('did-start-loading',cancel);resolve(value===true);};
      const cancel=()=>finish(false),timer=setTimeout(cancel,10*60*1000);timer.unref?.();
      this.pending.set(id,{sender,finish});sender.once('destroyed',cancel);sender.once('did-start-loading',cancel);
      try{sender.send('updates:prompt-request',{id,kind,version:status.version});}catch{finish(false);}
    });
  }
  respond(sender,request){const pending=this.pending.get(request?.id);if(!pending||pending.sender!==sender||typeof request.accepted!=='boolean')return false;pending.finish(request.accepted);return true;}
}
