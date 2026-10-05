// Keep a valid SemVer for installers/updater comparisons. Hide a zero patch component in the UI.
export function displayAppVersion(version) {
  return String(version ?? "").replace(/^(\d+\.\d+)\.0(?=$|-)/, "$1");
}
