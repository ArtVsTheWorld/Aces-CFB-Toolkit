// Compatibility bridge for older imports. Smart Force Win no longer derives
// team strength from depth-chart rows; the active Player roster is authoritative.
export { buildRosterRatings as buildDepthChartRatings } from "./rosterRatings.js";
export * from "./rosterRatings.js";
