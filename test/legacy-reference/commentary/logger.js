const enabled = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
const codes = { reset: "\u001b[0m", bold: "\u001b[1m", cyan: "\u001b[36m", green: "\u001b[32m", yellow: "\u001b[33m", magenta: "\u001b[35m", red: "\u001b[31m", dim: "\u001b[2m" };
const color = (name, text) => enabled ? `${codes[name]}${text}${codes.reset}` : text;

export async function printBanner(title) {
  const line = "═".repeat(title.length + 2);
  console.log(color("cyan", `╔${line}╗`));
  console.log(color("bold", `║ ${title} ║`));
  console.log(color("cyan", `╚${line}╝\n`));
}

export async function printChanges(result, { showAll = false } = {}) {
  const items = showAll ? result.players : result.changes;
  console.log(color("bold", `\n${showAll ? "Players" : "Proposed changes"} (${items.length})`));
  for (const item of items) {
    const fullName = `${item.firstName} ${item.lastName}`.trim();
    const target = item.preserved ? color("yellow", `no match - existing ID ${item.oldId} preserved`) :
      item.match.id === 0 ? color("red", "no match → 0") :
      color(item.match.method === "phonetic" ? "magenta" : item.match.source === "first" ? "yellow" : "green",
        `${item.match.source}-name ${item.match.method} → ${item.match.name} (${item.newId})`);
    const marker = item.oldId === item.newId ? color("dim", "OK") : color("cyan", `${item.oldId} → ${item.newId}`);
    console.log(`  [${item.row}] ${item.teamName} | ${fullName}: ${marker} | ${target}`);
  }
  if (!items.length) console.log(color("green", "  Every player already has the expected commentary ID."));
}

export async function printSummary(result, { applied, backupPath, savePath }) {
  const s = result.summary;
  console.log(color("bold", "\nSummary"));
  console.log(`  Active players scanned: ${s.scanned}`);
  console.log(`  NIL players skipped: ${s.skippedNil}`);
  console.log(`  No-team/free-agent players skipped: ${s.skippedNoTeam}`);
  console.log(`  Omar Omar QB placeholders skipped: ${s.skippedPlaceholder}`);
  console.log(`  Players outside Freshman filter skipped: ${s.skippedFreshmanFilter}`);
  console.log(`  Already correct: ${s.correct}`);
  console.log(`  Exact last-name matches: ${s.exact}`);
  console.log(`  Suffix-stripped matches: ${s.suffix}`);
  console.log(`  Phonetic last-name matches: ${s.phonetic}`);
  console.log(color("yellow", `  First-name fallbacks: ${s.first}`));
  console.log(color("red", `  No match (ID 0): ${s.unmatched}`));
  console.log(color("yellow", `  Unmatched IDs preserved: ${s.preservedUnmatched}`));
  console.log(color(applied ? "green" : "cyan", `  Changes ${applied ? "applied" : "previewed"}: ${result.changes.length}`));
  console.log(`  Backup: ${backupPath ?? "not created"}`);
  console.log(`  Output: ${applied ? savePath : "save was not changed"}`);
}
