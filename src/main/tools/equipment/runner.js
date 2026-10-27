import {progressRange} from '../../services/toolProgress.js';
import {originalEaProtectionEnabled,originalEaProtectionAudit,originalEaIdentity} from '../../services/originalEaPlayers.js';
import { CROSS_DONOR_GROUPS, DEFAULT_CROSS_DONOR_GROUPS, normalizeCrossDonorGroups } from './core/donorGroups.js';
import fs from 'node:fs';
import path from 'node:path';
import { quickstartPlayerKey, equipmentDynastyId } from '../../services/quickstartMemory.js';
import { takePlan } from '../jersey/planStore.js';
import { normalizeFillFrequencies } from './core/frequency.js';
import { normalizeTattooChances } from './core/tattoos.js';
import { saveFingerprint } from '../jersey/planStore.js';
import { DEFAULT_MOUTHPIECE_LIMITS, normalizeMouthpieceLimits, DEFAULT_MOUTHPIECE_POSITIONS, normalizeMouthpiecePositions } from './core/mouthpieceSettings.js';
import { loadEquipmentDonorSource } from './donorSource.js';
import { collectEquipmentDonors, patchFreshmanEquipment } from "./core/patcher.js";
import { applyGlobalEquipmentFixes, APPROVED_SKILL_HELMETS, HELMET_FAMILY_DISTRIBUTION_LABEL, SOCK_DISTRIBUTION_LABEL, UNDERSHIRT_DISTRIBUTION_LABEL } from "./core/globalFixes.js";
import { applyEquipmentPlan, buildFcsTeamIndexes, buildRosterPlayerRows, buildTeamApparel, buildTeamNames, cacheEquipmentPlan, loadEquipmentTables, makeEligible, prepareEquipment, REDSHIRT_FILTERS, resolveTeamIndexes, snapshotVisualRawData, splitList, validateTable, VALID_BODY_TYPES, VALID_CLASSES, VALID_POSITIONS } from "./shared.js";
import { equipmentPreviewChanges, groupPatcherPreviewRows, limitEquipmentPreview, summarizeVisualChanges } from "./preview.js";
import { parseRef, sf } from "./openSave.js";
import { displayPosition } from "../../../shared/localization.js";
import { equipmentDisplayValue, mouthpieceDisplayValue } from "./catalog.js";
import { defaultTeamAccessoryWeights, defaultTeamTapeWeights, normalizeAccessoryColorWeights, normalizeTeamTapeColors, normalizeTeamAccessoryColors } from "./core/recolor.js";
import { buildRosterPlayerApparel, buildRosterTeamNames, equipmentTeamColors } from "./shared.js";
import { normalizeTattooSelection, UNLOCKED_TATTOO_POOL } from "./core/tattoos.js";
import { equipmentSkipReporting, modAddedFcsPlayerRows } from "./skipReporting.js";
import { DEFAULT_LOWER_JERSEY_CAPS, DEFAULT_CUTOFF_PANTS_CAPS, normalizeUniformCaps } from "./core/unlockedUniforms.js";
import { DEFAULT_VISOR_FREQUENCIES, DEFAULT_UNDERSHIRT_WEIGHTS, normalizeUndershirtWeights, normalizeVisorFrequencies } from "./core/passSettings.js";
import { equipmentDisplayName } from "./catalog.js";
import { modPoolEditorCatalog, normalizeModPools } from "./core/modPools.js";
import { normalizeFacemaskPools, HELMET_MODELS, HELMET_POSITIONS, DEFAULT_HELMET_WEIGHTS, normalizeHelmetDistribution } from "./core/helmets.js";

const FRESHMAN_ID = "freshman-equipment", PATCHER_ID = "equipment-patcher";
const names = Object.freeze({ [FRESHMAN_ID]: "Equipment Randomizer", [PATCHER_ID]: "Equipment Patcher" });
const allowed = (values, valid, label) => { const lookup = new Map(valid.map(value => [value.toLowerCase(), value])); return values.map(value => { const result = lookup.get(value.toLowerCase()); if (!result) throw new Error(`Invalid ${label}: ${value}.`); return result; }); };
function percentage(value, fallback, label) { const number = value === undefined ? fallback : Number(value); if (value === "" || !Number.isInteger(number) || number < 0 || number > 100) throw new Error(`${label} must be a whole percentage from 0 through 100.`); return number; }
function normalize(options, freshman) {
  const helmetDistribution = normalizeHelmetDistribution(!freshman && options?.helmetFix ? options?.helmetDistribution : undefined);
  const bearsPadsReplacement = options?.bearsPadsReplacement ?? "shooter";
  if (options?.bearsPadsSleeveFix && !["shooter", "none", "mixed"].includes(bearsPadsReplacement)) throw new Error("Choose a replacement style for Bear’s Pads sleeves.");
  const minimumOverall = options?.minimumOverall === "" || options?.minimumOverall === undefined ? null : Number(options.minimumOverall), maximumOverall = options?.maximumOverall === "" || options?.maximumOverall === undefined ? null : Number(options.maximumOverall);
  if (minimumOverall !== null && (!Number.isInteger(minimumOverall) || minimumOverall < 0 || minimumOverall > 99)) throw new Error("Minimum overall must be a whole number from 0 through 99.");
  if (maximumOverall !== null && (!Number.isInteger(maximumOverall) || maximumOverall < 0 || maximumOverall > 99)) throw new Error("Maximum overall must be a whole number from 0 through 99.");
  if (minimumOverall !== null && maximumOverall !== null && minimumOverall > maximumOverall) throw new Error("Minimum overall cannot be greater than maximum overall.");
  const explicitRedshirts = options?.redshirtStatuses !== undefined ? splitList(options.redshirtStatuses) : null, redshirtGroup = explicitRedshirts === null ? String(options?.redshirtGroup ?? "all") : null, redshirt = explicitRedshirts ?? (redshirtGroup === "all" ? [] : REDSHIRT_FILTERS[redshirtGroup]);
  if (!redshirt) throw new Error("Redshirt group must be all, true, or redshirt.");
  const validRedshirts = new Set(["Eligible", "Current", "Previous"]); if (redshirt.some(value => !validRedshirts.has(value))) throw new Error("Invalid redshirt status.");
  const donorMode = freshman ? String(options?.donorMode ?? "top") : "top";
  if (!["top", "selected"].includes(donorMode)) throw new Error("Choose top-rated donors or selected players.");
  const donorRows = donorMode === "selected" ? [...new Set(splitList(options?.donorRows).map(value => /^\d+$/.test(value) ? Number(value) : NaN))] : undefined;
  if (donorRows && (!donorRows.length || donorRows.some(row => !Number.isSafeInteger(row) || row < 0))) throw new Error("Select at least one eligible donor player from the donor source.");
  if (freshman && options?.forceCrossPosition && options?.disableCrossPosition) throw new Error("Disable cross-position mixing and forced mixing cannot both be enabled.");
  const crossPositionPercent = percentage(options?.crossPositionPercent, options?.forceCrossPosition ? 100 : options?.disableCrossPosition ? 0 : 10, "Cross-position mixing chance");
  const multipleDonorPercent = percentage(options?.multipleDonorPercent, options?.forceCrossPosition ? 0 : 30, "Multiple-donor chance");
  if (freshman && crossPositionPercent + multipleDonorPercent > 100) throw new Error("Cross-position mixing and multiple-donor chances must total no more than 100%. The remainder uses one donor.");
  const expandedEquipmentPercent = percentage(options?.expandedEquipmentPercent, 10, "Unlocked Equipment Pool chance");
  const noDripPercentages = Object.fromEntries([["skill", 1], ["balanced", 3], ["heavy", 6]].map(([group, fallback]) => [group, percentage(options?.noDripPercentages?.[group], fallback, "No Drip chance")]));
  const top = donorMode === "selected" ? 30 : Number(options?.top ?? 30); if (freshman && (!Number.isInteger(top) || top < 1)) throw new Error("Top donor count must be a positive integer.");
  const undershirtColor = String(options?.undershirtColor ?? "weighted"); if (!["weighted", "custom", "primary", "secondary", "white", "black"].includes(undershirtColor)) throw new Error("Unknown rolled-jersey undershirt color.");
  const unlockedColorTheme = String(options?.unlockedColorTheme ?? "team"); if (!["weighted", "team", "primary", "secondary", "black", "white", "random"].includes(unlockedColorTheme)) throw new Error("Unknown unlocked accessory color theme.");
  const tapeColorMode = String(options?.tapeColorMode ?? "accessory");
  if (!["distribution", "accessory"].includes(tapeColorMode)) throw new Error("Choose a team tape distribution or match player accessory color.");
  const brandedMouthpieceFrequency = percentage(options?.brandedMouthpieceFrequency, 75, "Branded mouthpiece frequency");
  const accessoryColorWeights = normalizeAccessoryColorWeights(options?.unlockedRecolorFix && unlockedColorTheme === "weighted" ? options?.accessoryColorWeights : undefined), teamTapeColors = normalizeTeamTapeColors(options?.unlockedRecolorFix && tapeColorMode === "distribution" ? options?.teamTapeColors : undefined);
  const teamAccessoryColors = normalizeTeamAccessoryColors(options?.unlockedRecolorFix && unlockedColorTheme === "team" ? options?.teamAccessoryColors : undefined);
  const unlockedTattooCap = options?.unlockedTattooCap === "" || options?.unlockedTattooCap === undefined ? 40 : Number(options.unlockedTattooCap); if (!Number.isInteger(unlockedTattooCap) || unlockedTattooCap < 0 || unlockedTattooCap > 100) throw new Error("Tattoo population cap must be a whole percentage from 0 through 100.");
  if (options?.clearTattoos && options?.unlockedTattooFix) throw new Error('Clear Tattoos and Add Tattoos cannot both be enabled. Choose one tattoo pass.');
  const unlockedTattooSelection = normalizeTattooSelection(options?.unlockedTattooFix ? options?.unlockedTattooSelection : undefined);
  const bodyTypes = freshman ? [] : allowed(splitList(options?.bodyTypes), VALID_BODY_TYPES, "body type").map(value => value === "Lean" ? "Freshman" : value);
  const classes = allowed(splitList(options?.classes), VALID_CLASSES, "class year");
return { protectPreviouslyRandomized: options?.protectPreviouslyRandomized !== false, randomizeDonors: options?.randomizeDonors === true, fillFrequencies: normalizeFillFrequencies(options?.fillFrequencies), tattooChances: normalizeTattooChances(options?.tattooChances), lowerRolledJerseyFix: !freshman && Boolean(options?.lowerRolledJerseyFix), cutoffPantsFix: !freshman && Boolean(options?.cutoffPantsFix), replaceStandardWithCutoff: !freshman && Boolean(options?.replaceStandardWithCutoff), lowerJerseyCaps: normalizeUniformCaps(options?.lowerJerseyCaps, DEFAULT_LOWER_JERSEY_CAPS, "Lower Rolled Jersey"), cutoffPantsCaps: normalizeUniformCaps(options?.cutoffPantsCaps, DEFAULT_CUTOFF_PANTS_CAPS, "Cutoff Pants"), crossDonorGroups: normalizeCrossDonorGroups(options?.crossDonorGroups), mouthpiecePositions: normalizeMouthpiecePositions(options?.mouthpiecePositions), mouthpieceLimits: normalizeMouthpieceLimits(options?.mouthpieceLimits), donorFingerprint: String(options?.donorFingerprint ?? ""), modPools: normalizeModPools(options?.modPools, expandedEquipmentPercent), unlockedSocksFix: Boolean(options?.unlockedSocksFix), visorFrequencies: normalizeVisorFrequencies(options?.visorFrequencies), undershirtWeights: normalizeUndershirtWeights(options?.undershirtWeights), facemaskPools: normalizeFacemaskPools(options?.facemaskPools), helmetDistribution, bearsPadsReplacement, bearsPadsSleeveFix: Boolean(options?.bearsPadsSleeveFix), removeHandwarmers: Boolean(options?.removeHandwarmers), tapeColorMode, brandedMouthpieceFrequency, allowVicisZero2: Boolean(options?.allowVicisZero2), balanceExistingHelmets: Boolean(options?.balanceExistingHelmets), rerollExistingMouthpieces: Boolean(options?.unlockedMouthpieceFix && (options?.rerollExistingMouthpieces ?? options?.randomizeExistingMouthpieceColors)), seed: Math.floor(Math.random() * 0x100000000), top, crossPositionPercent, multipleDonorPercent, expandedEquipmentPercent, noDripPercentages, donorMode, donorRows, disableCrossPosition: freshman && crossPositionPercent === 0, donorSave: String(options?.donorSave ?? "").trim(), excludedTeams: splitList(options?.excludedTeams), includedTeams: splitList(options?.includedTeams), positions: allowed(splitList(options?.positions).map(value => value.toUpperCase()), VALID_POSITIONS, "position"), classes, bodyTypes, redshirtStatuses: redshirt, minimumOverall, maximumOverall, protectOriginalEaPlayers: originalEaProtectionEnabled(options), pantsFix: Boolean(options?.pantsFix), helmetFix: Boolean(options?.helmetFix), rolledJerseyFix: Boolean(options?.rolledJerseyFix), sockFix: Boolean(options?.sockFix), sleeveCompatibilityFix: Boolean(options?.sleeveCompatibilityFix), nikeThighPads: Boolean(options?.nikeThighPads), visorFix: Boolean(options?.visorFix), oakleyVisorFix: Boolean(options?.oakleyVisorFix), forceCrossPosition: freshman && crossPositionPercent === 100, usingUnlockedMod: Boolean(options?.usingUnlockedMod), usingRawAccessoriesMod: Boolean(options?.usingRawAccessoriesMod), usingEquipmentTruckMod: Boolean(options?.usingEquipmentTruckMod), noDripProfile: Boolean(options?.noDripProfile), unlockedRecolorFix: Boolean(options?.unlockedRecolorFix), unlockedMouthpieceFix: Boolean(options?.unlockedMouthpieceFix), allowRandomMouthpieceColors: Boolean(options?.allowRandomMouthpieceColors), randomizeExistingMouthpieceColors: Boolean(options?.unlockedMouthpieceFix && options?.randomizeExistingMouthpieceColors), clearTattoos: !freshman && Boolean(options?.clearTattoos), unlockedTattooFix: Boolean(options?.unlockedTattooFix), unlockedTattooCap, unlockedTattooSelection, unlockedColorTheme, accessoryColorWeights, teamAccessoryColors, teamTapeColors, undershirtColor };
}
export const normalizeEquipmentOptions = normalize;
export async function prepareEquipmentTool({ savePath, schemaPath, toolId, quickstartMemory }) {
  const loaded = await loadEquipmentTables(savePath, schemaPath), prepared = prepareEquipment(loaded.teams.records);
  const equipmentMemoryCount=toolId===FRESHMAN_ID&&quickstartMemory?quickstartMemory.snapshot(await equipmentDynastyId(loaded.franchise),{savePath,players:loaded.players}).keys.size:null;
  const donorPlayers = collectEquipmentDonors(loaded.players.records, loaded.visuals.records, loaded.visuals.header.tableId, { rosterRows: buildRosterPlayerRows(loaded.players, loaded.teams, loaded.rosters), fcsTeamIndexes: buildFcsTeamIndexes(loaded.teams.records), teamNames: buildTeamNames(loaded.teams.records), teamApparel: buildTeamApparel(loaded.teams.records), playerApparel: buildRosterPlayerApparel(loaded.players, loaded.teams, loaded.rosters) })
    .sort((a, b) => a.team.localeCompare(b.team) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName) || a.row - b.row)
    .map(player => ({ value: String(player.row), position: player.position, overall: player.overall, label: `${player.firstName} ${player.lastName} · ${player.team} · ${displayPosition(player.position)} · ${player.classYear} · #${player.jersey} · ${player.overall} OVR` }));
  return { ...prepared, equipmentMemoryCount, defaultLowerJerseyCaps: DEFAULT_LOWER_JERSEY_CAPS, defaultCutoffPantsCaps: DEFAULT_CUTOFF_PANTS_CAPS, crossDonorGroups: CROSS_DONOR_GROUPS, defaultCrossDonorGroups: DEFAULT_CROSS_DONOR_GROUPS, defaultMouthpiecePositions: DEFAULT_MOUTHPIECE_POSITIONS, defaultMouthpieceLimits: DEFAULT_MOUTHPIECE_LIMITS, modPoolCategories: modPoolEditorCatalog(), donorPlayers, defaultVisorFrequencies: DEFAULT_VISOR_FREQUENCIES, defaultUndershirtWeights: DEFAULT_UNDERSHIRT_WEIGHTS, helmetModels: HELMET_MODELS.map(model => ({ ...model, facemasks: model.masks.map(id => ({ value: id, label: equipmentDisplayName(id) })) })), helmetPositions: HELMET_POSITIONS, defaultHelmetWeights: DEFAULT_HELMET_WEIGHTS, defaultRepairHelmetIds: APPROVED_SKILL_HELMETS, tattooPool: UNLOCKED_TATTOO_POOL, tapeColorDefaults: Object.fromEntries(prepared.teams.map(team => [team.name.toLowerCase(), defaultTeamTapeWeights(team.name)])), accessoryColorDefaults: Object.fromEntries(prepared.teams.map(team => [team.name.toLowerCase(), defaultTeamAccessoryWeights(team.name)])), teamColors: equipmentTeamColors(loaded.teams.records), undershirtDistribution: UNDERSHIRT_DISTRIBUTION_LABEL, sockDistribution: SOCK_DISTRIBUTION_LABEL, helmetDistribution: HELMET_FAMILY_DISTRIBUTION_LABEL };
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
  const truck = (change.equipmentTruckChanges ?? []).map(item => `${item.category}: ${item.displayName}`);
  const noDrip = change.noDrip ? `; No Drip — ${(change.noDripChanges ?? []).map(item => item.category).join(", ") || "already compatible"}` : "";
  const paint = (change.facePaint ?? []).map(item => `Facepaint: ${equipmentDisplayValue(item.asset)} (${item.source})`).join("; ");
  const brand = (change.brandCorrections ?? []).map(item => `${item.slot}: ${equipmentDisplayValue(item.oldItem)} → ${equipmentDisplayValue(item.newItem)} (${item.reason})`).join("; ");
  return {
    mode: change.crossPositionMixed ? "Cross-position mixed" : change.mixed ? "Multiple/mixed" : "Single donor",
    teams: [...new Set(entries.map(item => item.donor.team))].join("; "),
    players: `${entries.map(({ donor, groups }) => `${donor.firstName} ${donor.lastName} (${displayPosition(donor.position)}, ${donor.team}) — ${groups.join(" + ")}`).join("; ")}${unlocked.length ? `; Unlocked Equipment Pool — ${unlocked.join("; ")}` : ""}${raw.length ? `; RAW Accessories Equipment Pool — ${raw.join("; ")}` : ""}${truck.length ? `; ELJAX’s Equipment Truck Pool — ${truck.join("; ")}` : ""}${noDrip}${paint ? `; ${paint}` : ""}${brand ? `; Brand protection — ${brand}` : ""}${change.fallbackNotes?.length ? `; Fallbacks — ${change.fallbackNotes.join("; ")}` : ""}`
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
  validateTable(loaded.players, ["FirstName", "LastName", "Position", "SchoolYear", "RedshirtStatus", "CharacterBodyType", "CharacterVisuals", "PLYR_ASSETNAME"], "Player");
  validateTable(loaded.visuals, ["RawData"], "CharacterVisuals");
  validateTable(loaded.teams, ["TeamApparel"], "Team");
  const teamNames = buildTeamNames(loaded.teams.records);
  const teamApparel = buildTeamApparel(loaded.teams.records);
  const fcs = buildFcsTeamIndexes(loaded.teams.records);
  const excluded = resolveTeamIndexes(loaded.teams.records, options.excludedTeams);
  const included = resolveTeamIndexes(loaded.teams.records, options.includedTeams);
  const filterEligible = makeEligible(options, teamNames, included);
  const tracking = freshman && context.quickstartMemory ? context.quickstartMemory.snapshot(await equipmentDynastyId(loaded.franchise),{savePath:context.savePath,players:loaded.players}) : null;
  const playerRows = new Map(loaded.players.records.map((record,row)=>[record,row]));
  const playerKeys = new Map(tracking ? loaded.players.records.filter(record=>record&&!record.isEmpty).map(record=>[record,quickstartPlayerKey(record,playerRows.get(record))]) : []);
  const eligiblePlayer = record => filterEligible(record) && !(freshman && options.protectPreviouslyRandomized && tracking?.keys.has(playerKeys.get(record)));
  const activePlayerRows = buildRosterPlayerRows(loaded.players, loaded.teams, loaded.rosters);
  const oldRaw = snapshotVisualRawData(loaded.visuals.records);
  let reportRows, details, assignments, fullPreviewRows, donorDecisions;
  if (freshman) {
    let donor = loaded;
    if (!options.donorSave && options.donorFingerprint) throw new Error("Switch to Active Dynasty and choose donors again.");
    if (options.donorMode === "selected" && options.donorSave && !options.donorFingerprint) throw new Error("Reload your donor file before selecting players.");
    if (options.donorSave) {
      const canonicalPath = file => { const resolved = fs.realpathSync(file); return process.platform === 'win32' ? resolved.toLowerCase() : resolved; };
      if (canonicalPath(options.donorSave) === canonicalPath(loaded.savePath)) {
        const fingerprint = saveFingerprint(loaded.savePath);
        if (options.donorFingerprint && options.donorFingerprint !== fingerprint) throw new Error('The donor file changed since you chose players. Reload the donor file and choose players again.');
        // Browsing to the active file must preserve the same donor protection
        // as Use Active, rather than treating its players as an external copy.
        donor = { ...loaded, donorKind: 'active', donorFingerprint: fingerprint };
      } else donor = await loadEquipmentDonorSource(options.donorSave, context.schemaPath, options.donorFingerprint);
      validateTable(donor.players, ["FirstName", "LastName", "Position", "SchoolYear", "CharacterBodyType", "CharacterVisuals"], "Donor Player"); validateTable(donor.visuals, ["RawData"], "Donor CharacterVisuals"); validateTable(donor.teams, ["TeamApparel"], "Donor Team");
    }
    if (options.donorSave) options.donorFingerprint = donor.donorFingerprint;
    const donorNames = buildTeamNames(donor.teams.records), donorApparel = buildTeamApparel(donor.teams.records), recipientRosterRows = activePlayerRows, donorRosterRows = buildRosterPlayerRows(donor.players, donor.teams, donor.rosters);
    const result = progressRange(25, 82, () => patchFreshmanEquipment(loaded.players.records, loaded.visuals.records, loaded.visuals.header.tableId, { teamNames, teamApparel, playerApparel: buildRosterPlayerApparel(loaded.players, loaded.teams, loaded.rosters), donorPlayerApparel: buildRosterPlayerApparel(donor.players, donor.teams, donor.rosters), donorPlayerRecords: donor.players.records, donorVisualRecords: donor.visuals.records, donorVisualsTableId: donor.visuals.header.tableId, donorTeamNames: donorNames, donorTeamApparel: donorApparel, recipientRosterRows, donorRosterRows, donorFcsTeamIndexes: buildFcsTeamIndexes(donor.teams.records), crossDonorGroups: options.crossDonorGroups, fcsTeamIndexes: fcs, excludedRecipientTeamIndexes: excluded, eligiblePlayer, randomizeDonors: options.randomizeDonors, top: options.top, mixedChance: options.multipleDonorPercent / 100, crossMixedChance: options.crossPositionPercent / 100, modPools: options.modPools, unlockedItemChance: options.expandedEquipmentPercent / 100, noDripPercentages: options.noDripPercentages, donorRows: options.donorRows, disableCrossPosition: options.disableCrossPosition, forceCrossPosition: options.forceCrossPosition, usingUnlockedMod: options.usingUnlockedMod, usingRawAccessoriesMod: options.usingRawAccessoriesMod, usingEquipmentTruckMod: options.usingEquipmentTruckMod, noDripProfile: options.noDripProfile, protectOriginalEaPlayers: options.protectOriginalEaPlayers, seed: options.seed, apply: true }));
    assignments = result.changes.map(change => ({ table: "visuals", row: change.visualsRow, field: "RawData", oldValue: oldRaw.get(change.visualsRow), newValue: change.newRawData }));
    donorDecisions = result.changes.map(change => ({ donors: change.donorUses, fallbackNotes: change.fallbackNotes ?? [], brandAssignments: change.brandAssignments ?? [], brandCorrections: change.brandCorrections ?? [], modPoolAdditions: { unlocked: change.unlockedChanges ?? [], raw: change.rawChanges ?? [], eljax: change.equipmentTruckChanges ?? [] } }));
    reportRows = result.changes.map(change => { const donor = donorDetail(change), before = oldRaw.get(change.visualsRow); return [donor.mode, change.target.team, `${change.target.firstName} ${change.target.lastName}`, displayPosition(change.target.position), change.target.classYear, change.target.redshirtStatus, change.target.overall, donor.teams, donor.players, change.visualsRow, summarizeVisualChanges(before, change.newRawData), before ?? "", change.newRawData]; });
    const previewChanges = result.changes.map(change => { const donor = donorDetail(change); return { row: change.target.row, team: change.target.team, player: `${change.target.firstName} ${change.target.lastName}`, position: displayPosition(change.target.position), classYear: change.target.classYear, redshirtStatus: change.target.redshirtStatus, overall: change.target.overall, currentValue: donor.mode, proposedValue: donor.mode, donor: donor.players, donorUses: change.donorUses, noDrip: change.noDrip ?? false, facePaint: (change.facePaint ?? []).map(item => ({...item, displayName: equipmentDisplayValue(item.asset)})), modPoolAdditions: { unlocked: change.unlockedChanges ?? [], raw: change.rawChanges ?? [], eljax: change.equipmentTruckChanges ?? [] }, fallbackNotes: change.fallbackNotes, brandAssignments: (change.brandAssignments ?? []).map(item => ({ ...item, oldItem: equipmentDisplayValue(item.oldItem), newItem: equipmentDisplayValue(item.newItem) })), brandCorrections: (change.brandCorrections ?? []).map(item => ({ ...item, oldItem: equipmentDisplayValue(item.oldItem), newItem: equipmentDisplayValue(item.newItem) })), changes: equipmentPreviewChanges(oldRaw.get(change.visualsRow), change.newRawData) }; }).sort((a, b) => a.team.localeCompare(b.team) || a.player.localeCompare(b.player) || a.position.localeCompare(b.position) || a.row - b.row);
    fullPreviewRows = previewChanges;
    details = { trackingScope: tracking ? 'dynasty' : null, leagueId: tracking?.dynastyId ?? null, playerIdentityVersion: 2, protectPreviouslyRandomized: options.protectPreviouslyRandomized, randomizeDonors: options.randomizeDonors, previouslyRandomized: tracking ? [...activePlayerRows].filter(row=>tracking.keys.has(playerKeys.get(loaded.players.records[row]))).length : 0, crossDonorGroups: options.crossDonorGroups, mouthpiecePositions: options.mouthpiecePositions, modPools: options.modPools, seed: options.seed, crossPositionPercent: options.crossPositionPercent, multipleDonorPercent: options.multipleDonorPercent, expandedEquipmentPercent: options.expandedEquipmentPercent, noDripPercentages: options.noDripPercentages, top: options.donorMode === "top" ? options.top : null, donorMode: options.donorMode, donorRows: options.donorRows ?? null, disableCrossPosition: options.disableCrossPosition, forceCrossPosition: options.forceCrossPosition, donorSave: options.donorSave || null, donorFingerprint: donor.donorFingerprint ?? null, donorKind: donor.donorKind ?? "active", donorSourceWarnings: donor.warnings ?? [], usingUnlockedMod: options.usingUnlockedMod, usingRawAccessoriesMod: options.usingRawAccessoriesMod, usingEquipmentTruckMod: options.usingEquipmentTruckMod, noDripProfile: options.noDripProfile, ...equipmentSkipReporting(result.skipped, modAddedFcsPlayerRows(loaded.players, loaded.teams, loaded.rosters)), fcsChanged: result.fcsChanged, donorPositions: result.donorPositions, sleeveCompatibilityCorrections: result.sleeveCompatibilityCorrections, unlockedPlayersChanged: result.unlockedPlayersChanged ?? 0, rawPlayersChanged: result.rawPlayersChanged ?? 0, equipmentTruckPlayersChanged: result.equipmentTruckPlayersChanged ?? 0, noDripPlayers: result.noDripPlayers ?? 0, facePaintPools: result.facePaintPools, brandCorrections: result.brandCorrections, totalPreviewRows: previewChanges.length, changes: limitEquipmentPreview(previewChanges) };
  }
  else {
    const fixes = progressRange(25, 82, () => applyGlobalEquipmentFixes(loaded.players.records, loaded.visuals.records, loaded.visuals.header.tableId, { ...options, teamNames, recolorTeamNames: buildRosterTeamNames(loaded.players, loaded.teams, loaded.rosters), fcsTeamIndexes: fcs, excludedTeamIndexes: excluded, activePlayerRows, eligiblePlayer }));
    assignments = [];
    for (const [row, oldValue] of oldRaw) {
      if (typeof oldValue !== "string") continue;
      const newValue = sf(loaded.visuals.records[row], "RawData");
      if (newValue !== oldValue) assignments.push({ table: "visuals", row, field: "RawData", oldValue, newValue });
    }
    const groups = [
      ["pants", fixes.pantsChanges],
      ["helmet", fixes.helmetChanges],
      ["helmet accessory compatibility", fixes.helmetAccessoryChanges ?? []],
      ["Bear’s Pads sleeve fit", fixes.bearsPadsChanges ?? []],
      ["Remove handwarmers", fixes.handwarmerChanges ?? []],
      ["rolled jersey", fixes.rolledJerseyChanges],
      ["socks", fixes.sockChanges],
      ["CFB27 Unlocked socks", fixes.unlockedSockChanges],
      ["Lower Rolled Jersey", fixes.lowerJerseyChanges],
      ["Cutoff Pants", fixes.cutoffPantsChanges],
      ["equipment compatibility", fixes.sleeveCompatibilityChanges],
      ["Nike thigh pads", fixes.nikeThighPadChanges],
      ["visor", fixes.visorChanges],
      ["Oakley visor replacement", fixes.oakleyVisorChanges ?? []],
      ["CFB27 Unlocked mouthpiece", fixes.unlockedMouthpieceChanges],
      ["CFB27 Unlocked mouthpiece reroll", fixes.existingMouthpieceColorChanges.filter(change => !change.repairInvalid)],
      ["CFB27 Unlocked mouthpiece repair", fixes.existingMouthpieceColorChanges.filter(change => change.repairInvalid)],
      ["Accessory recolor", fixes.unlockedRecolorChanges],
      ["CFB27 Unlocked tattoo", fixes.unlockedTattooChanges],
      ["Clear tattoos", fixes.clearedTattooChanges]
    ];
    const slotLabel = change => change.slot ? (({ LeftArmWear: "Left Arm", RightArmWear: "Right Arm", WaistWear: "Waist Gear" })[change.slot] ?? change.slot) + ": " : "";
    const oldValue = (type, change) => slotLabel(change) + (type.includes("mouthpiece") ? mouthpieceDisplayValue(change.oldItem) : equipmentDisplayValue(type === "helmet" ? `${change.oldHelmet}${change.oldFacemask ? ` / ${change.oldFacemask}` : ""}` : change.oldItem));
    const newValue = (type, change) => slotLabel(change) + equipmentDisplayValue(type === "helmet" ? `${change.newHelmet} / ${change.newFacemask}` : change.newItem);
    const previewChanges = groups.flatMap(([type, changes]) => changes.map(change => ({ row: change.row, type, team: change.team, player: `${change.firstName} ${change.lastName}`, position: displayPosition(change.position), classYear: change.classYear, redshirtStatus: change.redshirtStatus, overall: change.overall, currentValue: oldValue(type, change), proposedValue: newValue(type, change) }))).sort((a, b) => a.team.localeCompare(b.team) || a.player.localeCompare(b.player) || a.type.localeCompare(b.type) || a.row - b.row);
    fullPreviewRows = groupPatcherPreviewRows(previewChanges);
    const newRaw = snapshotVisualRawData(loaded.visuals.records);
    reportRows = fullPreviewRows.map(player => [player.changes.map(change => change.type).join("; "), player.team, player.player, player.position, player.classYear, player.redshirtStatus, player.overall, player.changes.map(change => `${change.type}: ${change.currentValue}`).join("; "), player.changes.map(change => `${change.type}: ${change.proposedValue}`).join("; "), ...visualAudit(player.row, loaded.players, oldRaw, newRaw)]);
    details = {
      lowerRolledJerseyFix: options.lowerRolledJerseyFix, cutoffPantsFix: options.cutoffPantsFix, replaceStandardWithCutoff: options.replaceStandardWithCutoff,
      lowerJerseyCaps: options.lowerJerseyCaps, cutoffPantsCaps: options.cutoffPantsCaps, uniformPopulation: fixes.uniformPopulation,
      lowerJerseyPlayersChanged: new Set(fixes.lowerJerseyChanges.map(change => change.row)).size,
      cutoffPantsPlayersChanged: new Set(fixes.cutoffPantsChanges.map(change => change.row)).size,
      seed: options.seed,
      visualsChanged: fixes.visualsChanged,
      helmetFix: options.helmetFix,
      visorFix: options.visorFix, rolledJerseyFix: options.rolledJerseyFix, unlockedMouthpieceFix: options.unlockedMouthpieceFix,
      helmetMixExcludesZero: Boolean(options.helmetDistribution),
      helmetDistribution: options.helmetDistribution,
      bearsPadsPlayersChanged: new Set(fixes.bearsPadsChanges.map(change => change.row)).size,
      handwarmerPlayersChanged: new Set(fixes.handwarmerChanges.map(change => change.row)).size,
      pantsPlayersChanged: fixes.pantsPlayersChanged,
      helmetPlayersChanged: fixes.helmetPlayersChanged,
      rolledJerseyPlayersChanged: fixes.rolledJerseyPlayersChanged,
      sockPlayersChanged: fixes.sockPlayersChanged,
      unlockedSockPlayersChanged: fixes.unlockedSockPlayersChanged,
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
      mouthpiecePositions: options.mouthpiecePositions, mouthpieceLimits: options.mouthpieceLimits,
      visorFrequencies: options.visorFrequencies, undershirtWeights: options.undershirtWeights, facemaskPools: options.facemaskPools,
      allowVicisZero2: options.allowVicisZero2,
      balanceExistingHelmets: options.balanceExistingHelmets,
      helmetPopulation: fixes.helmetPopulation,
      helmetBalance: fixes.helmetBalance,
      unlockedRecolorPlayersChanged: fixes.unlockedRecolorPlayersChanged,
      recolorSettings: options.unlockedRecolorFix ? { tapeColorMode: options.tapeColorMode, colorTheme: options.unlockedColorTheme, accessoryColorWeights: options.accessoryColorWeights, teamAccessoryColors: options.teamAccessoryColors, teamTapeColors: options.teamTapeColors } : null,
      clearTattoos: options.clearTattoos,
      clearedTattooPlayers: fixes.clearedTattooPlayers,
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
  const unprotectedScope=makeEligible({...options,protectOriginalEaPlayers:false},teamNames,included);
  const scopedPlayers=loaded.players.records.filter((record,row)=>record&&!record.isEmpty&&activePlayerRows.has(row)&&!excluded.has(Number(record.TeamIndex))&&unprotectedScope(record));
  details.protection=originalEaProtectionAudit(scopedPlayers,options.protectOriginalEaPlayers);
  const identityRows=fullPreviewRows.map(row=>originalEaIdentity(loaded.players.records[row.row]));
  const auditHeadings = ["CharacterVisualsRow", "ChangedSlotsAndMetadata", "BeforeRawData", "AfterRawData"];
  const report = { prefix: "equipment-report", headings: [...(freshman ? ["ChangeType", "Team", "Player", "Position", "ClassYear", "RedshirtStatus", "Overall", "OldOrDonorTeam", "NewOrDonorPlayerAndEquipmentGroups"] : ["ChangeType", "Team", "Player", "Position", "ClassYear", "RedshirtStatus", "Overall", "OldGearItem", "NewGearItem"]), ...auditHeadings, "Seed", "ResolvedOptionsJSON", "HelmetDistributionAuditJSON", "DonorSourceAuditJSON", "DonorDecisionAuditJSON", "UniformPopulationAuditJSON", "PopulationCapsAuditJSON","EAIdentity","IdentityReason","OriginalEAProtectionAuditJSON"], rows: reportRows.map((row, index) => [...row, options.seed, index === 0 ? JSON.stringify(options) : "", index === 0 ? JSON.stringify({ balance: details.helmetBalance ?? null, population: details.helmetPopulation ?? null }) : "", index === 0 && freshman ? JSON.stringify({ source: details.donorSave, kind: details.donorKind, fingerprint: details.donorFingerprint, warnings: details.donorSourceWarnings }) : "", freshman ? JSON.stringify(donorDecisions[index]) : "", index === 0 && !freshman ? JSON.stringify(details.uniformPopulation) : "", index === 0 && !freshman ? JSON.stringify({ scope: "team", tattoos: details.unlockedTattooPopulation, equipment: details.populationSafeguards }) : "",identityRows[index]?.label??"Unknown",identityRows[index]?.reason??"",index===0?JSON.stringify(details.protection):""]) };
  const result = {
    status: "preview",
    mode: "preview",
    savePath: loaded.savePath,
    backupPath: null,
    reportPath: context.reports.create({ ...report, toolId, toolName: names[toolId] }),
    summary: freshman
      ? [{ label: "Players Changed", value: details.totalPreviewRows }, { label: "Eligible Players Skipped", value: details.reportedSkipped ?? details.skipped }, { label: "FCS Players Changed", value: details.fcsChanged }, { label: "Compatibility Corrections", value: details.sleeveCompatibilityCorrections }, ...(details.usingUnlockedMod ? [{ label: "Unlocked Pool Additions", value: details.unlockedPlayersChanged }] : []), ...(details.usingRawAccessoriesMod ? [{ label: "RAW Accessories Pool Additions", value: details.rawPlayersChanged }] : []), ...(details.usingEquipmentTruckMod ? [{ label: "Equipment Truck Pool Additions", value: details.equipmentTruckPlayersChanged }] : []), ...(details.noDripProfile ? [{ label: "No Drip Players", value: details.noDripPlayers }] : [])]
      : [{ label: "Equipment Records Changed", value: details.visualsChanged }, { label: "Players with Pants Changes", value: details.pantsPlayersChanged }, { label: "Players with Helmet Changes", value: details.helmetPlayersChanged }, { label: "Lower Rolled Jerseys", value: details.lowerJerseyPlayersChanged }, { label: "Cutoff Pants", value: details.cutoffPantsPlayersChanged }, { label: "Other Equipment Changes", value: details.rolledJerseyPlayersChanged + details.sockPlayersChanged + details.unlockedSockPlayersChanged + details.sleeveCompatibilityPlayersChanged + details.nikeThighPadPlayersChanged + details.visorPlayersChanged + details.oakleyVisorPlayersChanged + details.bearsPadsPlayersChanged + details.handwarmerPlayersChanged }, ...(options.unlockedMouthpieceFix ? [{ label: "CFB27 Unlocked Mouthpieces", value: details.unlockedMouthpiecePlayersChanged }, ...(options.rerollExistingMouthpieces ? [{ label: "Existing Mouthpieces Rerolled", value: details.existingMouthpieceColorsChanged - details.invalidMouthpiecesRepaired }] : []), ...(details.invalidMouthpiecesRepaired ? [{ label: "Invalid Mouthpiece Slots Repaired", value: details.invalidMouthpiecesRepaired }] : [])] : []), ...(options.unlockedRecolorFix ? [{ label: "Accessory Recolors", value: details.unlockedRecolorPlayersChanged }] : []), ...(options.clearTattoos ? [{ label: "Players with Tattoos Cleared", value: details.clearedTattooPlayers }] : []), ...(options.unlockedTattooFix ? [{ label: "CFB27 Unlocked Tattoos Added", value: details.unlockedTattooPlayersChanged }, { label: "Tattoo Equipment Layers Repaired", value: details.unlockedTattooPlayersRepaired }] : [])],
    historySummary: [{ label: freshman ? "Players changed" : "Visual rows changed", value: freshman ? details.totalPreviewRows : details.visualsChanged }],
    resultKind: toolId,
    details
  };
  return { ...result, planId: cacheEquipmentPlan({ randomizerTracking: tracking ? {...tracking,keys:fullPreviewRows.map(row=>playerKeys.get(loaded.players.records[row.row])).filter(Boolean)} : null, donorSource: freshman && options.donorSave ? { path: options.donorSave, fingerprint: options.donorFingerprint } : null, toolId, toolName: names[toolId], savePath: loaded.savePath, assignments, previewRows: fullPreviewRows, report, result, needsVisuals: true }) };
}
export async function runFreshmanEquipment(context) {
  if(context.mode==='preview')return analyze(context,true);
  if(context.mode!=='apply')throw Error('Run mode must be preview or apply.');
  const memory=context.quickstartMemory;
  if(!memory)return applyEquipmentPlan({...context,toolId:FRESHMAN_ID});
  return memory.exclusive(async()=>{
    const plan=takePlan(context.options?.planId);
    if(plan.toolId!==FRESHMAN_ID||path.resolve(plan.savePath)!==path.resolve(context.savePath)||!plan.randomizerTracking)throw Error('Run a new Randomizer preview before applying.');
    const stage=memory.stage(plan.randomizerTracking.dynastyId,plan.randomizerTracking.keys,plan.randomizerTracking.revision,plan.randomizerTracking);
    try {
      const result=await applyEquipmentPlan({...context,toolId:FRESHMAN_ID});
      try { const count=stage.commit();return {...result,details:{...result.details,trackingSaved:true,rememberedAfter:count}}; }
      catch(error){stage.cancel();return {...result,details:{...result.details,trackingSaved:false,warnings:[...(result.details.warnings??[]),'Equipment was applied, but player tracking could not be saved. Resolve the tracking-file problem before rerunning.'],trackingError:String(error.message)}};}
    }catch(error){stage.cancel();throw error;}
  });
}
export async function runEquipmentPatcher(context) { if (context.mode === "apply") return applyEquipmentPlan({ ...context, toolId: PATCHER_ID }); if (context.mode !== "preview") throw new Error("Run mode must be preview or apply."); return analyze(context, false); }
