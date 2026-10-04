const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m"
};

const paint = (text, color, enabled) => enabled ? `${ANSI.bold}${color}${text}${ANSI.reset}` : text;
const strong = (text, enabled) => enabled ? `${ANSI.bold}${text}${ANSI.reset}` : text;
const printSection = title => console.log(`\n${"-".repeat(62)}\n${title}\n${"-".repeat(62)}`);
const displayPosition = position => ({ LOLB: "SAM", ROLB: "WILL", MLB: "MIKE", LE: "LEDG", RE: "REDG" })[position] ?? position;
export const classLabel = player => `${String(player.redshirtStatus ?? "").toLowerCase() === "previous" ? "RS" : "True"} ${player.classYear}`;

export function formatChange({ target, donor }, colorEnabled = false) {
  const recipient = `RECIPIENT: ${target.team} | ${target.firstName} ${target.lastName} | ${displayPosition(target.position)} | ${classLabel(target)} | #${target.jersey}`;
  const source = `DONOR: ${donor.team} | ${donor.firstName} ${donor.lastName} | ${displayPosition(donor.position)} | ${classLabel(donor)} | #${donor.jersey}`;
  return `${paint(recipient, ANSI.green, colorEnabled)} ${paint("<-", ANSI.yellow, colorEnabled)} ${paint(source, ANSI.cyan, colorEnabled)}`;
}

function formatMixedChange(change, colorEnabled) {
  const { target } = change;
  const recipient = `RECIPIENT: ${target.team} | ${target.firstName} ${target.lastName} | ${displayPosition(target.position)} | ${classLabel(target)} | #${target.jersey}`;
  const grouped = new Map();
  for (const { group, donor } of change.donorUses) {
    const key = `${donor.team} | ${donor.firstName} ${donor.lastName} | ${displayPosition(donor.position)} | ${classLabel(donor)} | #${donor.jersey}`;
    const groups = grouped.get(key) ?? [];
    groups.push(group);
    grouped.set(key, groups);
  }
  const donors = [...grouped].map(([player, groups]) => `${player} (${groups.join(", ")})`).join("; ");
  const mode = change.crossPositionMixed ? "CROSS-POSITION MIX" : change.mixed ? "MIXED" : "FULL + BRANDED GLOVES/CLEATS";
  return `${paint(recipient, ANSI.green, colorEnabled)} ${paint("<-", ANSI.yellow, colorEnabled)} ${paint(`DONORS [${mode}]: ${donors}`, ANSI.cyan, colorEnabled)}`;
}

export function printChanges(result, options = {}) {
  const colorEnabled = options.colorEnabled ?? (process.env.NO_COLOR === undefined && Boolean(process.stdout.isTTY || process.env.FORCE_COLOR));
  console.log("\nPlayers changed:");
  const changes = result.changes.filter(change => !change.isFcs).sort((a, b) =>
    a.target.team.localeCompare(b.target.team, undefined, { sensitivity: "base" })
    || `${a.target.lastName}, ${a.target.firstName}`.localeCompare(`${b.target.lastName}, ${b.target.firstName}`, undefined, { sensitivity: "base" })
    || a.target.row - b.target.row
  );
  if (!changes.length) console.log("  None");
  for (const change of changes) {
    console.log(change.donorUses?.length > 1 ? formatMixedChange(change, colorEnabled) : formatChange(change, colorEnabled));
  }
  if (result.skipped.length) {
    const reasons = new Map();
    for (const player of result.skipped.filter(player => !player.isFcs)) reasons.set(player.reason, (reasons.get(player.reason) ?? 0) + 1);
    if (reasons.size) {
      console.log("\nSkipped true freshmen:");
      for (const [reason, count] of reasons) console.log(`  ${count} - ${reason}`);
    }
  }
  console.log(`\nFixed equipment on ${result.fcsChanged ?? 0} FCS players.`);
}

export function printHelmetChanges(changes, options = {}) {
  const colorEnabled = options.colorEnabled ?? (process.env.NO_COLOR === undefined && Boolean(process.stdout.isTTY || process.env.FORCE_COLOR));
  const visible = changes.filter(change => !change.isFcs).sort((a, b) =>
    a.team.localeCompare(b.team, undefined, { sensitivity: "base" })
    || `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`, undefined, { sensitivity: "base" })
    || a.row - b.row
  );
  printSection("HELMET CORRECTIONS");
  if (!visible.length) console.log("  None");
  for (const change of visible) {
    const player = `${change.team} | ${change.firstName} ${change.lastName} | ${displayPosition(change.position)} | ${classLabel(change)} | #${change.jersey}`;
    const correction = `${change.oldHelmet} -> ${change.newHelmet} | Facemask: ${change.newFacemask}`;
    console.log(`${strong(player, colorEnabled)} | ${paint(correction, ANSI.cyan, colorEnabled)}`);
  }
  const fcsCount = changes.filter(change => change.isFcs).length;
  if (fcsCount) console.log(`Corrected helmets for ${fcsCount} FCS players (individual entries hidden).`);
}

export function printItemChanges(title, changes, fcsMessage, options = {}) {
  const colorEnabled = options.colorEnabled ?? (process.env.NO_COLOR === undefined && Boolean(process.stdout.isTTY || process.env.FORCE_COLOR));
  const visible = changes.filter(change => !change.isFcs).sort((a, b) =>
    a.team.localeCompare(b.team, undefined, { sensitivity: "base" })
    || `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`, undefined, { sensitivity: "base" })
    || a.row - b.row
  );
  printSection(title.toUpperCase());
  if (!visible.length) console.log("  None");
  for (const change of visible) {
    const player = `${change.team} | ${change.firstName} ${change.lastName} | ${displayPosition(change.position)} | ${classLabel(change)} | #${change.jersey}`;
    console.log(`${strong(player, colorEnabled)} | ${paint(`${change.oldItem} -> ${change.newItem}`, ANSI.cyan, colorEnabled)}`);
  }
  const fcsCount = changes.filter(change => change.isFcs).length;
  if (fcsCount) console.log(`${fcsMessage} ${fcsCount} FCS players (individual entries hidden).`);
}

export function printTeamChangeCounts(title, changes, options = {}) {
  const colorEnabled = options.colorEnabled ?? (process.env.NO_COLOR === undefined && Boolean(process.stdout.isTTY || process.env.FORCE_COLOR));
  const counts = new Map();
  for (const change of changes) counts.set(change.team, (counts.get(change.team) ?? 0) + 1);
  printSection(title.toUpperCase());
  if (!counts.size) console.log("  None");
  for (const [team, count] of [...counts].sort(([left], [right]) => left.localeCompare(right, undefined, { sensitivity: "base" }))) {
    console.log(`${strong(team, colorEnabled)} | ${paint(`${count} player${count === 1 ? "" : "s"} changed`, ANSI.cyan, colorEnabled)}`);
  }
}
