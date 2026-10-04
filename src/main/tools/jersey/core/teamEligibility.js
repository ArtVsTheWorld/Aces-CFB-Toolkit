export function isBuiltInFcsTeam(team) {
  if (!team || team.isEmpty) return false;
  return String(team.DisplayName ?? "").trim().toUpperCase().startsWith("FCS ");
}


