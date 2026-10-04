export const POSITION_LABELS = Object.freeze({ LE: "LEDG", RE: "REDG", MLB: "MIKE", ROLB: "WILL", LOLB: "SAM" });

export function displayPosition(position) {
  return POSITION_LABELS[String(position ?? "")] ?? String(position ?? "");
}
