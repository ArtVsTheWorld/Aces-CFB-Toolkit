export function isWhiteHelmetFixCandidate(record) {
  if (!record || record.isEmpty) return false;
  const teamIndex = Number(record.TeamIndex);
  if (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex === 255) return false;
  return Number(record.NumPrideStickers) > 32;
}

export function applyWhiteHelmetFix(records, { apply = false } = {}) {
  const changes = [];
  records.forEach((record, row) => {
    if (!isWhiteHelmetFixCandidate(record)) return;
    const oldCount = Number(record.NumPrideStickers);
    if (apply) record.NumPrideStickers = 32;
    changes.push({ row, record, oldCount, newCount: 32 });
  });
  return changes;
}


