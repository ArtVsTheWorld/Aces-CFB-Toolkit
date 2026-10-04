import path from "node:path";
import { app } from "electron";

export function appPaths() {
  const data = app.getPath("userData");
  return { data, settings: path.join(data, "settings.json"), history: path.join(data, "history.json"), logs: path.join(data, "logs"), reports: path.join(data, "reports") };
}

export function schemaDirectory() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "engine-data")
    : path.resolve(app.getAppPath(), "resources", "engine-data");
}

export function schemaPath(version = "C27_486_6") {
  return path.join(schemaDirectory(), `${version}.gz`);
}

export function commentaryMapPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "commentary-data", "PlayerCommentaryidMap.txt")
    : path.resolve(app.getAppPath(), "resources", "commentary-data", "PlayerCommentaryidMap.txt");
}
