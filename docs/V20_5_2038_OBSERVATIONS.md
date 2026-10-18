# v20.5 — 2038 Observation Expansion

## Source and safety

Read-only source: `DYNASTY-2038EXAMPLE`, the user-confirmed continuation of the default 2026/2032 dynasty. Year 2038, Preseason / Week 0. SHA-256: `b9d6cc60dd678775daa6854740df4715044134b2e13f22f42cc74d1bd8fb4db5`.

Audited 11,730 main-roster players on 138 teams. Five directional FCS teams contain another 424 players and remain outside the generation observation pools. No roster-reference/ownership problems, shared main-roster visual rows, malformed appearances or mental-name/rank mismatches were found. OVR formulas cover every player: 11,705 exact and all 11,730 within one point; existing formula rounding is retained. All six cap fields remain inside the existing validated bounds. Source saves are never written by the audit/compiler.

## Observations added

| Observation | Added | Combined total where applicable |
| --- | ---: | ---: |
| Generated football packages | 11,730 | 23,460 |
| Complete generic appearance packages | 11,730 | 23,460 |
| First names | 155 | 1,187 |
| Surnames | 969 | 4,540 |
| Distinct generic heads | 548 | 4,211 |
| Distinct head/first-name pairings | 11,532 | — |
| Position/archetype physical-tier packages | 639 | — |
| Position/archetype mental-ability/rank packages | 1,753 | — |
| Position/archetype cap vectors | 11,720 | — |
| New position/archetype animation/style combinations | 0 | — |

The EA baseline plus both generated samples now contain 35,190 football/style observations. IDs retain their source (`ea-2026:`, `generated-2032:`, `generated-2038:`). The catalog stores no original save blobs, full player-name pairings, Age/birth-date fields or unverified unique heads.

## Integration

Football, class/redshirt eligibility packages, potential/caps, abilities, progression, personality and appearance pools now accept every audited generated source, rather than checking only source index 1. Physical tiers and mental name/rank combinations remain together with the observed football profile; potential uses whole observed cap/development packages. Head, body, portrait, size and first-name evidence stay tied to the observed appearance.

The former first-eight-alphabetically cutoff dropped 3,216 verified head/name pairings from the expanded bank. Every observed same-head name is now eligible; pools have a median of four names and a maximum of 23. No names are assigned to a face through guessed ethnicity or skin-tone categories.

Roster caliber targets, the 2032 Standard development distribution, EA class/redshirt reference, user-configured age/potential settings, athletic-profile chances, seeded Preview/Apply behavior and caps/ability safety are unchanged. The 2038 development proportions are descriptive, not new defaults. Equipment still uses the active-save Equipment Randomizer pipeline, not a new optional mod pool. No new animation/style combination was found, so the existing same-archetype EA-style preference remains intact, with the expanded same-position fallback available.

The compiler accepts additional later cohorts after the 2026/2032 baselines. It rejects duplicate sources, invalid identities/references, unproven sources and out-of-bounds observations. Catalog validation supports arbitrary proven source indexes; unknown indexes remain invalid. Existing catalog schema version 1 is retained because the source list is additive; its SHA-256 changes and is captured in reports.

## Commentary map

Cross-checked generated 2032 and 2038 players. Added 23 surname/ID pairs supported by at least two different first names, one consistent positive ID, and no existing-ID or cross-surname collision. The bundled map grows from 7,032 to 7,055 entries. Original mappings are not overwritten. Zero IDs, isolated observations, fallback matches and conflicts remain review-only.

| Name | Commentary ID | Independent first names |
| --- | ---: | ---: |
| Badet | 7107 | 2 |
| Breeland | 5701 | 2 |
| Coe | 975 | 2 |
| Crosswell | 8329 | 2 |
| Eifert | 5530 | 3 |
| Fay | 7891 | 2 |
| Goldson | 1907 | 2 |
| Josiah | 2519 | 2 |
| Kilian | 2625 | 2 |
| Knighton | 2679 | 2 |
| Lasike | 6175 | 2 |
| Leisle | 2863 | 2 |
| Lestage | 8374 | 2 |
| Luketa | 8530 | 2 |
| Madrigal | 7409 | 2 |
| McCurdy | 8122 | 3 |
| Mosher | 7712 | 2 |
| Oplinger | 7053 | 3 |
| Rabach | 4046 | 2 |
| Ricketts | 8084 | 2 |
| Strojny | 4782 | 2 |
| Ventrone | 5153 | 2 |
| Watton | 5243 | 2 |

Full public addition evidence is `test/fixtures/commentary2038Observations.json`. Private read-only audit reports are in `outputs/roster-generator-audit-3OMITy`, `outputs/v205-2038-commentary-audit.json` and `outputs/v205-2038-combined-commentary-audit.json`. There were 38 existing-name ID mismatches across both cohorts, including zero IDs and IDs associated with other spellings; none was used to replace an established mapping.

## Recovery

Pre-expansion source snapshot: `outputs/ui-rollback-1qx4a3` (738 verified files). Restore with `node scripts/ui-snapshot.mjs restore outputs/ui-rollback-1qx4a3`; a recovery snapshot preserves newer work first. Source saves and personal settings are outside snapshot restore.

## Verification and local build

Passed: 610 portable source tests; five copied-save integration tests (exact Preview/Apply/reopen, backups, protected fields, stale/interrupted-write safeguards); real packaged renderer/preload/handler testing with presets, Cards/Table, History, reports and Apply; 471 source/asset/resource/hash checks; and a real isolated NSIS updater download plus invalid-checksum rejection. All three source hashes still match. The packaged catalog contains 35,190 football profiles and 23,460 appearances. No private saves, reports, reviews, output folders or personal settings are included.

Local build: `dist/v20.5-2038-expanded-release`. Installer, blockmap and `latest.yml` upload copies are under `github-release-assets`. Installer size: 165,221,701 bytes; SHA-256: `275cc2973a341368f9e31766689953bf0d4b6000dd39534591a37817268a6942`. Use the three files from this directory together; earlier 20.5 builds remain intact. The installer is unsigned; Windows may show a reputation warning. New generated rosters still need in-game testing.

App version remains 20.5.0 and tool versions are unchanged. Nothing was committed or published to GitHub.
