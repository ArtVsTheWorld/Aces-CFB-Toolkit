// Keep a valid SemVer for installers/updater comparisons. Users see v18.3.
export function displayAppVersion(version) {
  return String(version ?? "").replace(/^(\d+\.\d+)\.0(?=$|-)/, "$1");
}
