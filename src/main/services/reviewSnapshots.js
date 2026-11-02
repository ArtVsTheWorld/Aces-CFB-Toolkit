import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {equipmentRunOverview} from '../../shared/equipmentRunOverview.js';
import previewPages from '../../shared/previewPages.cjs';

export class ReviewSnapshots {
  constructor(directory) { this.directory = directory; }
  file(id) { if (!/^[0-9a-f-]{36}$/i.test(String(id))) throw new Error("Invalid run ID."); return path.join(this.directory, `${id}.json.gz`); }
  save(id, result, rows) {
    fs.mkdirSync(this.directory, { recursive: true });
    let reviewRows = rows ?? result.details?.changes ?? [];
    if (result.mode === 'apply' && result.resultKind === 'automatic-force-win' && result.details?.leaveUnchangedRows?.length) {
      const omitted = new Set(result.details.leaveUnchangedRows.map(Number));
      reviewRows = reviewRows.map(row => omitted.has(Number(row.row)) ? { ...row, affected: false, forcedWinner: 'Unchanged', proposedForceWin: row.existingForceWin, status: 'Left unchanged by user' } : row);
    }
    const overview=reviewRows.length===Number(result.details?.totalPreviewRows??reviewRows.length)?equipmentRunOverview(result.resultKind,reviewRows):null;
    const snapshot = { result: { ...result, planId: null, details: { ...result.details, ...(overview?{equipmentOverview:overview}:{}), changes: reviewRows.slice(0, previewPages.supports(result.resultKind)?100:1000), totalPreviewRows: reviewRows.length } }, rows: reviewRows };
    const destination = this.file(id), temporary = `${destination}.tmp`;
    // Concatenated gzip members are standard gzip and gunzipSync reads them as
    // one document. Write bounded members instead of one dynasty-sized string
    // and buffer, keeping every review row and the existing on-disk JSON shape.
    const descriptor=fs.openSync(temporary,'wx');
    let chunk='';
    const flush=()=>{if(chunk){fs.writeFileSync(descriptor,zlib.gzipSync(chunk));chunk='';}};
    const append=value=>{if(chunk.length+value.length>1024*1024)flush();chunk+=value;if(chunk.length>=1024*1024)flush();};
    try{
      append('{"result":'+JSON.stringify(snapshot.result)+',"rows":[');
      for(const [index,row]of reviewRows.entries())append((index?',':'')+(JSON.stringify(row)??'null'));
      append(']}');flush();fs.closeSync(descriptor);fs.renameSync(temporary,destination);
    }catch(error){try{fs.closeSync(descriptor);}catch{}try{fs.unlinkSync(temporary);}catch{}throw error;}
    return true;
  }
  get(id) { try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(this.file(id))).toString("utf8")); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
  prune(keptIds) { if (!fs.existsSync(this.directory)) return; const keep = new Set(keptIds); for (const name of fs.readdirSync(this.directory)) { const match = /^([0-9a-f-]{36})\.json\.gz$/i.exec(name); if (match && !keep.has(match[1])) fs.unlinkSync(path.join(this.directory, name)); } }
}
