// Frozen CSV implementation from the deprecated Shared/toolUx.js reference.
// Kept locally so parity tests don't require the old standalone tool bundle.
const csvCell = value => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(headers, rows) {
  return [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
