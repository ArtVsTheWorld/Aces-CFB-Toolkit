# Jersey Renumber v3.5 migration audit (CFB Toolkit v0.4.0)

The two CLI entrypoints remain separate registered tools. They share the active-save pipeline, C27_486_1 Player/Team loading, save-derived team names, preview table, report service, guarded preview-plan storage, and backup/apply code. Their copied `lib` modules are text-identical to the originals; the original scripts and BAT launchers are not modified.

## Preserved differences

| Behavior | Jersey Renumber | No Duplicates |
| --- | --- | --- |
| Scope | All eligible non-FCS teams; user-controlled teams excluded by default | All eligible non-FCS teams or one exact save-derived team |
| Duplicate rule | Resolves same-side conflicts; opposite-side duplicates are allowed; the backup-QB exception is preserved | Exactly one holder of every number per selected team |
| NIL | Protected by default; explicit toggle permits movement | Eligible for movement, with no NIL prompt |
| Position allocation | Original preferred/fallback ranges, priority order, displacement, team traditions, retired numbers, promotions, freshman release, and final 0–10 fill | Independent absolute-uniqueness allocator with its original preferred/fallback order, traditions, retired numbers, promotion rules, and no-free-number failure |
| Capacity failure | Original standard validation/remaining-conflict reporting | More than 100 rostered players throws; exhaustion never relaxes retired or claimed-number rules |
| Report | Team, Player, Position, Class, Overall, OldNumber, NewNumber | Adds NIL, Reason, and Fallback |
| Empty apply | Retains the standard CLI confirmation/backup/save path | Retains the CLI early return: report only, no backup or save |

Neither CLI exposes a seed. Both algorithms continue to use `Math.random` where the originals do. Preview stores the exact calculated row/old/new assignment plan; Apply verifies the complete save hash and each source jersey value before creating a backup and applying that plan. It never reruns random allocation during Apply.

## GUI mapping

Standard mode exposes the original user-team, NIL, team-tradition, retired-number, and promotion/freshman/fill confirmations as toggles with the same defaults. No Duplicates exposes the original all-teams/one-team branch with searchable save-derived names and its three original rule toggles. Preview shows searchable Player, Position, Team, Current Number, and Proposed Number fields; No Duplicates also shows its original reason/fallback outcome.

Preview produces the original CSV shape and does not create a backup or write the save. Apply is enabled only for a current preview. Changing an option invalidates the preview. A changed file, mismatched Active Save, expired plan, or changed source jersey blocks Apply and requires a new Preview.

## Verification contract

Automated tests compare every copied core module with the original source and compare both algorithms on deterministic difficult fixtures. Coverage includes same-number collisions, protected and movable NIL players, QB fallback rescue, specialist/number pressure, promotions, invalid ranges, and the 101-player capacity failure. Disposable real-save tests hash Preview input before/after, apply cached plans, confirm backup creation, reopen the save, and compare every proposed row to the saved number.

The recommended next migration is White Helmet Fix: it is a small Player-table correction that can reuse the established preview/report/backup path without requiring another allocation or review framework. It has not been started.
