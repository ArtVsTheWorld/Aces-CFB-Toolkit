import { collectEquipmentDonors, patchFreshmanEquipment } from "./core/patcher.js";
import { applyGlobalEquipmentFixes, HELMET_FAMILY_DISTRIBUTION_LABEL, SOCK_DISTRIBUTION_LABEL, UNDERSHIRT_DISTRIBUTION_LABEL } from "./core/globalFixes.js";
import { applyEquipmentPlan, buildFcsTeamIndexes, buildRosterPlayerRows, buildTeamApparel, buildTeamNames, cacheEquipmentPlan, loadEquipmentTables, makeEligible, prepareEquipment, REDSHIRT_FILTERS, resolveTeamIndexes, snapshotVisualRawData, splitList, validateTable, VALID_BODY_TYPES, VALID_CLASSES, VALID_POSITIONS } from "./shared.js";
import { equipmentPreviewChanges, groupPatcherPreviewRows, limitEquipmentPreview, summarizeVisualChanges } from "./preview.js";
import { parseRef, sf } from "./openSave.js";
import { displayPosition } from "../../../shared/localization.js";
import { equipmentDisplayValue, mouthpieceDisplayValue } from "./catalog.js";
import { defaultTeamTapeWeights, normalizeAccessoryColorWeights, normalizeTeamTapeColors } from "./core/recolor.js";
import { buildRosterPlayerApparel, buildRosterTeamNames, equipmentTeamColors } from "./shared.js";
import { normalizeTattooSelection, UNLOCKED_TATTOO_POOL } from "./core/tattoos.js";
import { equipmentSkipReporting, modAddedFcsPlayerRows } from "./skipReporting.js";

const FRESHMAN_ID = "freshman-equipment", PATCHER_ID = "equipment-patcher";
const names = Object.freeze({ [FRESHMAN_ID]: "Equipment Randomizer", [PATCHER_ID]: "Equipment Patcher" });
const allowed = (values, valid, label) => { const lookup = new Map(valid.map(value => [value.toLowerCase(), value])); return values.map(value => { const result = lookup.get(value.toLowerCase()); if (!result) throw new Error(`Invalid ${label}: ${value}.`); return result; }); };
function percentage(value, fallback, label) { const number = value === undefined ? fallback : Number(value); if (value === "" || !Number.isInteger(number) || number < 0 || number > 100) throw new Error(`${label} must be a whole percentage from 0 through 100.`); return number; }
function normalize(options, freshman) {
  const minimumOverall = options?.minimumOverall === "" || options?.minimumOverall === undefined ? null : Number(options.minimumOverall), maximumOverall = options?.maximumOverall === "" || options?.maximumOverall === undefined ? null : Number(options.maximumOverall);
  if (minimumOverall !== null && (!Number.isInteger(minimumOverall) || minimumOverall < 0 || minimumOverall > 99)) throw new Error("Minimum overall must be a whole number from 0 through 99.");
  if (maximumOverall !== null && (!Number.isInteger(maximumOverall) || maximumOverall < 0 || maximumOverall > 99)) throw new Error("Maximum overall must be a whole number from 0 through 99.");
  if (minimumOverall !== null && maximumOverall !== null && minimumOverall > maximumOverall) throw new Error("Minimum overall cannot be greater than maximum overall.");
  const explicitRedshirts = options?.redshirtStatuses !== undefined ? splitList(options.redshirtStatuses) : null, redshirtGroup = explicitRedshirts === null ? String(options?.redshirtGroup ?? (freshman ? "true" : "all")) : null, redshirt = explicitRedshirts ?? (redshirtGroup === "all" ? [] : REDSHIRT_FILTERS[redshirtGroup]);
  if (!redshirt) throw new Error("Redshirt group must be all, true, or redshirt.");
  const validRedshirts = new Set(["Eligible", "Current", "Previous"]); if (redshirt.some(value => !validRedshirts.has(value))) throw new Error("Invalid redshirt status.");
  const donorMode = freshman ? String(options?.donorMode ?? "top") : "top";
  if (!["top", "selected"].includes(donorMode)) throw new Error("Choose top-rated donors or selected players.");
  const donorRows = donorMode === "selected" ? [...new Set(splitList(options?.donorRows).map(value => /^\d+$/.test(value) ? Number(value) : NaN))] : undefined;
  if (donorRows && (!donorRows.length || donorRows.some(row => !Number.isSafeInteger(row) || row < 0))) throw new Error("Select at least one eligible donor player from the Active Dynasty.");
  if (freshman && options?.forceCrossPosition && options?.disableCrossPosition) throw new Error("Disable cross-position mixing and forced mixing cannot both be enabled.");
  const crossPositionPercent = percentage(options?.crossPositionPercent, options?.forceCrossPosition ? 100 : options?.disableCrossPosition ? 0 : 10, "Cross-position mixing chance");
  const multipleDonorPercent = percentage(options?.multipleDonorPercent, options?.forceCrossPosition ? 0 : 30, "Multiple-donor chance");
  if (freshman && crossPositionPercent + multipleDonorPercent > 100) throw new Error("Cross-position mixing and multiple-donor chances must total no more than 100%. The remainder uses one donor.");
  const expandedEquipmentPercent = percentage(options?.expandedEquipmentPercent, 10, "Unlocked Equipment Pool chance");
  const noDripPercentages = Object.fromEntries([["skill", 1], ["balanced", 3], ["heavy", 6]].map(([group, fallback]) => [group, percentage(options?.noDripPercentages?.[group], fallback, "No Drip chance")]));
  const top = donorMode === "selected" ? 50 : Number(options?.top ?? 50); if (freshman && (!Number.isInteger(top) || top < 1)) throw new Error("Top donor count must be a positive integer.");
  const undershirtColor = String(options?.undershirtColor ?? "weighted"); if (!["weighted", "primary", "secondary", "white", "black"].includes(undershirtColor)) throw new Error("Unknown rolled-jersey undershirt color.");
  const unlockedColorTheme = String(options?.unlockedColorTheme ?? "weighted"); if (!["weighted", "primary", "secondary", "black", "white", "random"].includes(unlockedColorTheme)) throw new Error("Unknown unlocked accessory color theme.");
  const tapeColorMode = String(options?.tapeColorMode ?? "distribution");
  if (!["distribution", "accessory"].includes(tapeColorMode)) throw new Error("Choose a team tape distribution or match player accessory color.");
  const brandedMouthpieceFrequency = percentage(options?.brandedMouthpieceFrequency, 75, "Branded mouthpiece frequency");
  const accessoryColorWeights = normalizeAccessoryColorWeights(options?.unlockedRecolorFix && unlockedColorTheme === "weighted" ? options?.accessoryColorWeights : undefined), teamTapeColors = normalizeTeamTapeColors(options?.unlockedRecolorFix && tapeColorMode === "distribution" ? options?.teamTapeColors : undefined);
  const unlockedTattooCap = options?.unlockedTattooCap === "" || options?.unlockedTattooCap === undefined ? 33 : Number(options.unlockedTattooCap); if (!Number.isInteger(unlockedTattooCap) || unlockedTattooCap < 0 || unlockedTattooCap > 100) throw new Error("Tattoo population cap must be a whole percentage from 0 through 100.");
  const unlockedTattooSelection = normalizeTattooSelection(options?.unlockedTattooFix ? options?.unlockedTattooSelection : undefined);
  const bodyTypes = freshman ? [] : allowed(splitList(options?.bodyTypes), VALID_BODY_TYPES, "body type").map(value => value === "Lean" ? "Freshman" : value);
  const classes = allowed(options?.classes === undefined && freshman ? ["Freshman"] : splitList(options?.classes), VALID_CLASSES, "class year");
return { tapeColorMode, brandedMouthpieceFrequency, allowVicisZero2: Boolean(options?.allowVicisZero2), balanceExistingHelmets: Boolean(options?.balanceExistingHelmets), rerollExistingMouthpieces: Boolean(options?.unlockedMouthpieceFix && (options?.rerollExistingMouthpieces ?? options?.randomizeExistingMouthpieceColors)), seed: Math.floor(Math.random() * 0x100000000), top, crossPositionPercent, multipleDonorPercent, expandedEquipmentPercent, noDripPercentages, donorMode, donorRows, disableCrossPosition: freshman && crossPositionPercent === 0, donorSave: donorMode === "selected" ? "" : String(options?.donorSave ?? "").trim(), excludedTeams: splitList(options?.excludedTeams), includedTeams: splitList(options?.includedTeams), positions: allowed(splitList(options?.positions).map(value => value.toUpperCase()), VALID_POSITIONS, "position"), classes, bodyTypes, redshirtStatuses: redshirt, minimumOverall, maximumOverall, skipNilPlayers: options?.skipNilPlayers !== false, pantsFix: Boolean(options?.pantsFix), helmetFix: Boolean(options?.helmetFix), rolledJerseyFix: Boolean(options?.rolledJerseyFix), sockFix: Boolean(options?.sockFix), sleeveCompatibilityFix: Boolean(options?.sleeveCompatibilityFix), nikeThighPads: Boolean(options?.nikeThighPads), visorFix: Boolean(options?.visorFix), oakleyVisorFix: Boolean(options?.oakleyVisorFix), forceCrossPosition: freshman && crossPositionPercent === 100, usingUnlockedMod: Boolean(options?.usingUnlockedMod), usingRawAccessoriesMod: Boolean(options?.usingRawAccessoriesMod), noDripProfile: Boolean(options?.noDripProfile), unlockedRecolorFix: Boolean(options?.unlockedRecolorFix), unlockedMouthpieceFix: Boolean(options?.unlockedMouthpieceFix), allowRandomMouthpieceColors: Boolean(options?.allowRandomMouthpieceColors), randomizeExistingMouthpieceColors: Boolean(options?.unlockedMouthpieceFix && options?.randomizeExistingMouthpieceColors), unlockedTattooFix: Boolean(options?.unlockedTattooFix), unlockedTattooCap, unlockedTattooSelection, unlockedColorTheme, accessoryColorWeights, teamTapeColors, undershirtColor };
}
export const normalizeEquipmentOptions = normalize;
export async function prepareEquipmentTool({ savePath, schemaPath }) {
  const loaded = await loadEquipmentTables(savePath, schemaPath), prepared = prepareEquipment(loaded.teams.records);
  const donorPlayers = collectEquipmentDonors(loaded.players.records, loaded.visuals.records, loaded.visuals.header.tableId, { rosterRows: buildRosterPlayerRows(loaded.players, loaded.teams, loaded.rosters), fcsTeamIndexes: buildFcsTeamIndexes(loaded.teams.records), teamNames: buildTeamNames(loaded.teams.records), teamApparel: buildTeamApparel(loaded.teams.records), playerApparel: buildRosterPlayerApparel(loaded.players, loaded.teams, loaded.rosters) })
    .sort((a, b) => a.team.localeCompare(b.team) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName) || a.row - b.row)
    .map(player => ({ value: String(player.row), position: player.position, overall: player.overall, label: `${player.firstName} ${player.lastName} · ${player.team} · ${displayPosition(player.position)} · ${player.classYear} · #${player.jersey} · ${player.overall} OVR` }));
  return { ...prepared, donorPlayers, tattooPool: UNLOCKED_TATTOO_POOL, tapeColorDefaults: Object.fromEntries(prepared.teams.map(team => [team.name.toLowerCase(), defaultTeamTapeWeights(team.name)])), teamColors: equipmentTeamColors(loaded.teams.records), undershirtDistribution: UNDERSHIRT_DISTRIBUTION_LABEL, sockDistribution: SOCK_DISTRIBUTION_LABEL, helmetDistribution: HELMET_FAMILY_DISTRIBUTION_LABEL };
}
function donorDetail(change) {
  const grouped = new Map();
  for (const use of change.donorUses) {
    const key = `${use.donor.team}|${use.donor.row}`;
    const entry = grouped.get(key) ?? { donor: use.donor, groups: [] };
    entry.groups.push(use.group); grouped.set(key, entry);
  }
  const entries = [...grouped.values()];
  const unlocked = (change.unlockedChanges ?? []).map(item => `${item.category}: ${item.displayName}`);
  const raw = (change.rawChanges ?? []).map(item => `${item.category}: ${item.displayName}`);
  const noDrip = change.noDrip ? `; No Drip — ${(change.noDripChanges ?? []).map(item => item.category).join(", ") || "already compatible"}` : "";
  const paint = (change.facePaint ?? []).map(item => `Facepaint: ${equipmentDisplayValue(item.asset)} (${item.source})`).join("; ");
  const brand = (change.brandCorrections ?? []).map(item => `${item.slot}: ${equipmentDisplayValue(item.oldItem)} → ${equipmentDisplayValue(item.newItem)} (${item.reason})`).join("; ");
  return {
    mode: change.crossPositionMixed ? "Cross-position mixed" : change.mixed ? "Multiple/mixed" : "Single donor",
    teams: [...new Set(entries.map(item => item.donor.team))].join("; "),
    players: `${entries.map(({ donor, groups }) => `${donor.firstName} ${donor.lastName} (${displayPosition(donor.position)}, ${donor.team}) — ${groups.join(" + ")}`).join("; ")}${unlocked.length ? `; Unlocked Equipment Pool — ${unlocked.join("; ")}` : ""}${raw.length ? `; Raw Accessories Equipment Pool — ${raw.join("; ")}` : ""}${noDrip}${paint ? `; ${paint}` : ""}${brand ? `; Brand protection — ${brand}` : ""}`
  };
}
function visualAudit(row, players, oldRaw, newRaw) {
  const ref = parseRef(sf(players.records[row], "CharacterVisuals"));
  const before = ref ? oldRaw.get(ref.row) : undefined;
  const after = ref ? newRaw.get(ref.row) : undefined;
  return [ref?.row ?? "", summarizeVisualChanges(before, after), before ?? "", after ?? ""];
}

async function analyze(context, freshman) {
  const toolId = freshman ? FRESHMAN_ID : PATCHER_ID;
  const options = normalize(context.options, freshman);
  const loaded = await loadEquipmentTables(context.savePath, context.schemaPath);
  validateTable(loaded.players, ["FirstName", "LastName", "Position", "SchoolYear", "RedshirtStatus", "CharacterBodyType", "CharacterVisuals", "IsNIL"], "Player");
  validateTable(loaded.visuals, ["RawData"], "CharacterVisuals");
  validateTable(loaded.teams, ["TeamApparel"], "Team");
  const teamNames = buildTeamNames(loaded.teams.records);
  const teamApparel = buildTeamApparel(loaded.teams.records);
  const fcs = buildFcsTeamIndexes(loaded.teams.records);
  const excluded = resolveTeamIndexes(loaded.teams.records, options.excludedTeams);
  const included = resolveTeamIndexes(loaded.teams.records, options.includedTeams);
  const eligiblePlayer = makeEligible(options, teamNames, included);
  const activePlayerRows = buildRosterPlayerRows(loaded.players, loaded.teams, loaded.rosters);
  const oldRaw = snapshotVisualRawData(loaded.visuals.records);
  let reportRows, details, assignments, fullPreviewRows;
  if (freshman) {
    let donor = loaded;
    if (options.donorSave) { donor = await loadEquipmentTables(options.donorSave, context.schemaPath, true, false); validateTable(donor.players, ["FirstName", "LastName", "Position", "SchoolYear", "CharacterBodyType", "CharacterVisuals"], "Donor Player"); validateTable(donor.visuals, ["RawData"], "Donor CharacterVisuals"); validateTable(donor.teams, ["TeamApparel"], "Donor Team"); }
    const donorNames = buildTeamNames(donor.teams.records), donorApparel = buildTeamApparel(donor.teams.records), recipientRosterRows = activePlayerRows, donorRosterRows = buildRosterPlayerRows(donor.players, donor.teams, donor.rosters);
    const result = patchFreshmanEquipment(loaded.players.records, loaded.visuals.records, loaded.visuals.header.tableId, { teamNames, teamApparel, playerApparel: buildRosterPlayerApparel(loaded.players, loaded.teams, loaded.rosters), donorPlayerApparel: buildRosterPlayerApparel(donor.players, donor.teams, donor.rosters), donorPlayerRecords: donor.players.records, donorVisualRecords: donor.visuals.records, donorVisualsTableId: donor.visuals.header.tableId, donorTeamNames: donorNames, donorTeamApparel: donorApparel, recipientRosterRows, donorRosterRows, fcsTeamIndexes: fcs, excludedRecipientTeamIndexes: excluded, eligiblePlayer, top: options.top, mixedChance: options.multipleDonorPercent / 100, crossMixedChance: options.crossPositionPercent / 100, unlockedItemChance: options.expandedEquipmentPercent / 100, noDripPercentages: options.noDripPercentages, donorRows: options.donorRows, disableCrossPosition: options.disableCrossPosition, forceCrossPosition: options.forceCrossPosition, usingUnlockedMod: options.usingUnlockedMod, usingRawAccessoriesMod: options.usingRawAccessoriesMod, noDripProfile: options.noDripProfile, skipNilPlayers: options.skipNilPlayers, seed: options.seed, apply: true });
    assignments = result.changes.map(change => ({ table: "visuals", row: change.visualsRow, field: "RawData", oldValue: oldRaw.get(change.visualsRow), newValue: change.newRawData }));
    reportRows = result.changes.map(change => { const donor = donorDetail(change), before = oldRaw.get(change.visualsRow); return [donor.mode, change.target.team, `${change.target.firstName} ${change.target.lastName}`, displayPosition(change.target.position), change.target.classYear, change.target.redshirtStatus, change.target.overall, donor.teams, donor.players, change.visualsRow, summarizeVisualChanges(before, change.newRawData), before ?? "", change.newRawData]; });
    const previewChanges = result.changes.map(change => { const donor = donorDetail(change); return { row: change.target.row, team: change.target.team, player: `${change.target.firstName} ${change.target.lastName}`, position: displayPosition(change.target.position), classYear: change.target.classYear, redshirtStatus: change.target.redshirtStatus, overall: change.target.overall, currentValue: donor.mode, proposedValue: donor.mode, donor: donor.players, changes: equipmentPreviewChanges(oldRaw.get(change.visualsRow), change.newRawData) }; }).sort((a, b) => a.team.localeCompare(b.team) || a.player.localeCompare(b.player) || a.position.localeCompare(b.position) || a.row - b.row);
    fullPreviewRows = previewChanges;
    details = { seed: options.seed, crossPositionPercent: options.crossPositionPercent, multipleDonorPercent: options.multipleDonorPercent, expandedEquipmentPercent: options.expandedEquipmentPercent, noDripPercentages: options.noDripPercentages, top: options.donorMode === "top" ? options.top : null, donorMode: options.donorMode, donorRows: options.donorRows ?? null, disableCrossPosition: options.disableCrossPosition, forceCrossPosition: options.forceCrossPosition, donorSave: options.donorSave || null, usingUnlockedMod: options.usingUnlockedMod, usingRawAccessoriesMod: options.usingRawAccessoriesMod, noDripProfile: options.noDripProfile, ...equipmentSkipReporting(result.skipped, modAddedFcsPlayerRows(loaded.players, loaded.teams, loaded.rosters)), fcsChanged: result.fcsChanged, donorPositions: result.donorPositions, sleeveCompatibilityCorrections: result.sleeveCompatibilityCorrections, unlockedPlayersChanged: result.unlockedPlayersChanged ?? 0, rawPlayersChanged: result.rawPlayersChanged ?? 0, noDripPlayers: result.noDripPlayers ?? 0, facePaintPools: result.facePaintPools, brandCorrections: result.brandCorrections, totalPreviewRows: previewChanges.length, changes: limitEquipmentPreview(previewChanges) };
  }
  else {
    const fixes = applyGlobalEquipmentFixes(loaded.players.records, loaded.visuals.records, loaded.visuals.header.tableId, { ...options, teamNames, recolorTeamNames: buildRosterTeamNames(loaded.players, loaded.teams, loaded.rosters), fcsTeamIndexes: fcs, excludedTeamIndexes: excluded, activePlayerRows, eligiblePlayer });
    assignments = [];
    for (const [row, oldValue] of oldRaw) {
      if (typeof oldValue !== "string") continue;
      const newValue = sf(loaded.visuals.records[row], "RawData");
      if (newValue !== oldValue) assignments.push({ table: "visuals", row, field: "RawData", oldValue, newValue });
    }
    const groups = [
      ["pants", fixes.pantsChanges],
      ["helmet", fixes.helmetChanges],
      ["rolled jersey", fixes.rolledJerseyChanges],
      ["socks", fixes.sockChanges],
      ["equipment compatibility", fixes.sleeveCompatibilityChanges],
      ["Nike thigh pads", fixes.nikeThighPadChanges],
      ["visor", fixes.visorChanges],
      ["Oakley visor replacement", fixes.oakleyVisorChanges ?? []],
      ["CFB 27 Unlocked mouthpiece", fixes.unlockedMouthpieceChanges],
      ["CFB 27 Unlocked mouthpiece reroll", fixes.existingMouthpieceColorChanges.filter(change => !change.repairInvalid)],
      ["CFB 27 Unlocked mouthpiece repair", fixes.existingMouthpieceColorChanges.filter(change => change.repairInvalid)],
      ["CFB 27 Unlocked recolor", fixes.unlockedRecolorChanges],
      ["CFB 27 Unlocked tattoo", fixes.unlockedTattooChanges]
    ];
    const oldValue = (type, change) => type.includes("mouthpiece") ? mouthpieceDisplayValue(change.oldItem) : equipmentDisplayValue(type === "helmet" ? change.oldHelmet : change.oldItem);
    const newValue = (type, change) => equipmentDisplayValue(type === "helmet" ? `${change.newHelmet} / ${change.newFacemask}` : change.newItem);
    const previewChanges = groups.flatMap(([type, changes]) => changes.map(change => ({ row: change.row, type, team: change.team, player: `${change.firstName} ${change.lastName}`, position: displayPosition(change.position), classYear: change.classYear, redshirtStatus: change.redshirtStatus, overall: change.overall, currentValue: oldValue(type, change), proposedValue: newValue(type, change) }))).sort((a, b) => a.team.localeCompare(b.team) || a.player.localeCompare(b.player) || a.type.localeCompare(b.type) || a.row - b.row);
    fullPreviewRows = groupPatcherPreviewRows(previewChanges);
    const newRaw = snapshotVisualRawData(loaded.visuals.records);
    reportRows = fullPreviewRows.map(player => [player.changes.map(change => change.type).join("; "), player.team, player.player, player.position, player.classYear, player.redshirtStatus, player.overall, player.changes.map(change => `${change.type}: ${change.currentValue}`).join("; "), player.changes.map(change => `${change.type}: ${change.proposedValue}`).join("; "), ...visualAudit(player.row, loaded.players, oldRaw, newRaw)]);
    details = {
      seed: options.seed,
      visualsChanged: fixes.visualsChanged,
      pantsPlayersChanged: fixes.pantsPlayersChanged,
      helmetPlayersChanged: fixes.helmetPlayersChanged,
      rolledJerseyPlayersChanged: fixes.rolledJerseyPlayersChanged,
      sockPlayersChanged: fixes.sockPlayersChanged,
      sleeveCompatibilityPlayersChanged: fixes.sleeveCompatibilityPlayersChanged,
      nikeThighPadPlayersChanged: fixes.nikeThighPadPlayersChanged,
      visorPlayersChanged: fixes.visorPlayersChanged,
      oakleyVisorPlayersChanged: fixes.oakleyVisorPlayersChanged ?? 0,
      unlockedMouthpiecePlayersChanged: fixes.unlockedMouthpiecePlayersChanged,
      existingMouthpieceColorsChanged: fixes.existingMouthpieceColorsChanged,
      invalidMouthpiecesRepaired: fixes.existingMouthpieceColorChanges.filter(change => change.repairInvalid).length,
      randomizeExistingMouthpieceColors: options.randomizeExistingMouthpieceColors,
      rerollExistingMouthpieces: options.rerollExistingMouthpieces,
      brandedMouthpieceFrequency: options.brandedMouthpieceFrequency,
      allowVicisZero2: options.allowVicisZero2,
      balanceExistingHelmets: options.balanceExistingHelmets,
      helmetBalance: fixes.helmetBalance,
      unlockedRecolorPlayersChanged: fixes.unlockedRecolorPlayersChanged,
      recolorSettings: options.unlockedRecolorFix ? { tapeColorMode: options.tapeColorMode, colorTheme: options.unlockedColorTheme, accessoryColorWeights: options.accessoryColorWeights, teamTapeColors: options.teamTapeColors } : null,
      tattooSelection: options.unlockedTattooFix ? options.unlockedTattooSelection : null,
      unlockedTattooPlayersChanged: fixes.unlockedTattooPlayersChanged,
      unlockedTattooPlayersRepaired: fixes.unlockedTattooPlayersRepaired,
      unlockedTattooPopulation: fixes.unlockedTattooPopulation,
      populationSafeguards: fixes.populationSafeguards,
      totalCorrectionActions: previewChanges.length,
      totalPreviewRows: fullPreviewRows.length,
      changes: limitEquipmentPreview(fullPreviewRows)
    };
  }
  const auditHeadings = ["CharacterVisualsRow", "ChangedSlotsAndMetadata", "BeforeRawData", "AfterRawData"];
  const report = { prefix: "equipment-report", headings: [...(freshman ? ["ChangeType", "Team", "Player", "Position", "ClassYear", "RedshirtStatus", "Overall", "OldOrDonorTeam", "NewOrDonorPlayerAndEquipmentGroups"] : ["ChangeType", "Team", "Player", "Position", "ClassYear", "RedshirtStatus", "Overall", "OldGearItem", "NewGearItem"]), ...auditHeadings], rows: reportRows };
  const result = {
    status: "preview",
    mode: "preview",
    savePath: loaded.savePath,
    backupPath: null,
    reportPath: context.reports.create({ ...report, toolId, toolName: names[toolId] }),
    summary: freshman
      ? [{ label: "Players Changed", value: details.totalPreviewRows }, { label: "Eligible Players Skipped", value: details.reportedSkipped ?? details.skipped }, { label: "FCS Players Changed", value: details.fcsChanged }, { label: "Compatibility Corrections", value: details.sleeveCompatibilityCorrections }, ...(details.usingUnlockedMod ? [{ label: "Unlocked Pool Additions", value: details.unlockedPlayersChanged }] : []), ...(details.usingRawAccessoriesMod ? [{ label: "Raw Accessories Pool Additions", value: details.rawPlayersChanged }] : []), ...(details.noDripProfile ? [{ label: "No Drip Players", value: details.noDripPlayers }] : [])]
      : [{ label: "Equipment Records Changed", value: details.visualsChanged }, { label: "Players with Pants Changes", value: details.pantsPlayersChanged }, { label: "Players with Helmet Changes", value: details.helmetPlayersChanged }, { label: "Other Equipment Changes", value: details.rolledJerseyPlayersChanged + details.sockPlayersChanged + details.sleeveCompatibilityPlayersChanged + details.nikeThighPadPlayersChanged + details.visorPlayersChanged + details.oakleyVisorPlayersChanged }, ...(options.unlockedMouthpieceFix ? [{ label: "CFB 27 Unlocked Mouthpieces", value: details.unlockedMouthpiecePlayersChanged }, ...(options.rerollExistingMouthpieces ? [{ label: "Existing Mouthpieces Rerolled", value: details.existingMouthpieceColorsChanged - details.invalidMouthpiecesRepaired }] : []), ...(details.invalidMouthpiecesRepaired ? [{ label: "Invalid Mouthpiece Slots Repaired", value: details.invalidMouthpiecesRepaired }] : [])] : []), ...(options.unlockedRecolorFix ? [{ label: "CFB 27 Unlocked Recolors", value: details.unlockedRecolorPlayersChanged }] : []), ...(options.unlockedTattooFix ? [{ label: "CFB 27 Unlocked Tattoos Added", value: details.unlockedTattooPlayersChanged }, { label: "Tattoo Equipment Layers Repaired", value: details.unlockedTattooPlayersRepaired }] : [])],
    historySummary: [{ label: freshman ? "Players changed" : "Visual rows changed", value: freshman ? details.totalPreviewRows : details.visualsChanged }],
    resultKind: toolId,
    details
  };
  return { ...result, planId: cacheEquipmentPlan({ toolId, toolName: names[toolId], savePath: loaded.savePath, assignments, previewRows: fullPreviewRows, report, result, needsVisuals: true }) };
}
export async function runFreshmanEquipment(context) { if (context.mode === "apply") return applyEquipmentPlan({ ...context, toolId: FRESHMAN_ID }); if (context.mode !== "preview") throw new Error("Run mode must be preview or apply."); return analyze(context, true); }
export async function runEquipmentPatcher(context) { if (context.mode === "apply") return applyEquipmentPlan({ ...context, toolId: PATCHER_ID }); if (context.mode !== "preview") throw new Error("Run mode must be preview or apply."); return analyze(context, false); }
