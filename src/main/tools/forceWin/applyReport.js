import { parseCsv } from '../../services/reportAudit.js';

// Keep the original projection columns; distinguish a proposal from the actual
// approved write. The shared CSV parser preserves quoted JSON and newlines.
export function approvedMatchupReport(content, assignments, excludedRows, originalAssignments = assignments) {
  const [headings, ...rows] = parseCsv(content), record = headings.indexOf('Record');
  const changed = new Map(assignments.map(change => [change.row, change.newValue]));
  const original = new Map(originalAssignments.map(change => [change.row, change]));
  const field = headings.indexOf('ForceWinValue'), outcome = headings.indexOf('Outcome');
  const quote = value => /[",\r\n]/.test(String(value ?? '')) ? '"' + String(value).replaceAll('"', '""') + '"' : String(value ?? '');
  return [...[[...headings.map(heading => heading.startsWith('Summary') ? 'Preview' + heading : heading), 'PreviewForceWinValue', 'ApplyDecision', 'ActualWrittenForceWin', 'AppliedAssignmentCount']], ...rows.map(row => {
    const id = record < 0 || row[record] === '' ? null : Number(row[record]);
    const proposed = field < 0 ? '' : row[field];
    if (excludedRows.has(id)) { if (field >= 0) row[field] = String(original.get(id).oldValue); if (outcome >= 0) row[outcome] = 'Left unchanged by user'; }
    return [...row, proposed, excludedRows.has(id) ? 'Left unchanged by user' : changed.has(id) ? 'Applied' : '', changed.has(id) ? changed.get(id) : '', assignments.length];
  })].map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
}
