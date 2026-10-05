export const POSITION_GROUPS = Object.freeze(["QB", "HB", "FB", "WR", "TE", "OL", "EDGE", "DT", "LB", "CB", "FS", "SS", "K/P"]);
const groups = { RB: "HB", LT: "OL", LG: "OL", C: "OL", RG: "OL", RT: "OL", LE: "EDGE", RE: "EDGE", LEDG: "EDGE", REDG: "EDGE", DE: "EDGE", LOLB: "LB", MLB: "LB", ROLB: "LB", SAM: "LB", MIKE: "LB", WILL: "LB", K: "K/P", P: "K/P" };
export const positionGroup = value => groups[String(value ?? "").toUpperCase()] ?? String(value ?? "").toUpperCase();
