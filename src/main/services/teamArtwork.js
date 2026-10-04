import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const teamArtworkKey = name => String(name ?? "").trim().toLowerCase();
const artworkDirectory = dataDirectory => path.join(dataDirectory, "team-artwork");
const artworkPath = (dataDirectory, name, kind) => path.join(artworkDirectory(dataDirectory), `${crypto.createHash("sha256").update(teamArtworkKey(name)).digest("hex").slice(0, 20)}-${kind}.png`);
export function imageDataUrl(filePath) { return `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`; }

export function saveTeamArtwork({ dataDirectory, teamName, kind, sourcePath, nativeImage }) {
  if (!teamArtworkKey(teamName) || !["logo", "header"].includes(kind)) throw new Error("Choose a valid team and artwork type.");
  const image = nativeImage.createFromPath(sourcePath);
  if (image.isEmpty()) throw new Error("The selected file is not a supported image.");
  const { width, height } = image.getSize();
  if (kind === "logo" && (width !== 1024 || height !== 1024)) throw new Error("Team logos must be exactly 1024 × 1024 pixels.");
  const output = artworkPath(dataDirectory, teamName, kind);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, image.toPNG());
  return { path: output, dataUrl: imageDataUrl(output) };
}

export function readTeamArtwork(dataDirectory, stored, teamNames) {
  const result = {}, root = artworkDirectory(dataDirectory);
  for (const name of teamNames) {
    const key = teamArtworkKey(name), entry = stored?.[key];
    if (!entry) continue;
    for (const kind of ["logo", "header"]) {
      const file = entry[kind];
      if (file !== artworkPath(dataDirectory, name, kind) || !file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) continue;
      (result[key] ??= {})[kind] = imageDataUrl(file);
    }
  }
  return result;
}
