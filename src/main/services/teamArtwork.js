import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import dynastyIdentity from '../../shared/dynastyIdentity.cjs';
const {validDynastyId,dynastyKey}=dynastyIdentity;

export const teamArtworkKey = name => String(name ?? "").trim().toLowerCase();
const artworkDirectory = (dataDirectory,dynastyId) => path.join(dataDirectory, "team-artwork",dynastyId==null?'':crypto.createHash('sha256').update(dynastyKey(dynastyId)).digest('hex').slice(0,24));
export const teamArtworkPath = (dataDirectory, name, kind,dynastyId=null) => path.join(artworkDirectory(dataDirectory,dynastyId), `${crypto.createHash("sha256").update(teamArtworkKey(name)).digest("hex").slice(0, 20)}-${kind}.png`);
export function imageDataUrl(filePath) { return `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`; }

export function saveTeamArtwork({ dataDirectory, teamName, kind, sourcePath, nativeImage,dynastyId }) {
  if(!validDynastyId(dynastyId))throw Error('Select a dynasty with a supported identifier before changing team artwork.');
  if (!teamArtworkKey(teamName) || !["logo", "header"].includes(kind)) throw new Error("Choose a valid team and artwork type.");
  const image = nativeImage.createFromPath(sourcePath);
  if (image.isEmpty()) throw new Error("The selected file is not a supported image.");
  const { width, height } = image.getSize();
  if (kind === "logo" && (width !== 1024 || height !== 1024)) throw new Error("Team logos must be exactly 1024 × 1024 pixels.");
  const output = teamArtworkPath(dataDirectory, teamName, kind,dynastyId);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary=output+'.tmp';fs.writeFileSync(temporary, image.toPNG());fs.renameSync(temporary,output);
  return { path: output, dataUrl: imageDataUrl(output) };
}

export function readTeamArtwork(dataDirectory, stored, teamNames,dynastyId=null) {
  const result = {}, root = artworkDirectory(dataDirectory,dynastyId);
  for (const name of teamNames) {
    const key = teamArtworkKey(name), entry = stored?.[key];
    if (!entry) continue;
    for (const kind of ["logo", "header"]) {
      const file = entry[kind];
      if (file !== teamArtworkPath(dataDirectory, name, kind,dynastyId) || !file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) continue;
      (result[key] ??= {})[kind] = imageDataUrl(file);
    }
  }
  return result;
}

export function copyLegacyTeamArtwork(dataDirectory,legacy,current,dynastyId){
  if(!validDynastyId(dynastyId))throw Error('A dynasty is required to recover artwork.');
  const result=structuredClone(current??{});
  for(const [team,entry]of Object.entries(legacy??{}))for(const kind of ['logo','header']){
    if(result[team]?.[kind])continue;
    const file=entry?.[kind];if(file!==teamArtworkPath(dataDirectory,team,kind)||!fs.existsSync(file))continue;
    const output=teamArtworkPath(dataDirectory,team,kind,dynastyId);fs.mkdirSync(path.dirname(output),{recursive:true});fs.copyFileSync(file,output);
    (result[team]??={})[kind]=output;
  }
  return result;
}
