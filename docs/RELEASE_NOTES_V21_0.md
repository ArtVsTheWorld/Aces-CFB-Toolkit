# Ace's CFB Toolkit v21.0

### Release Notes

General
- More UI/UX improvements. Extra option explanations now use small info icons to keep settings pages cleaner.
- Automatic update prompts now use the app's own UI style.
- Added a small completion sound when an Apply run finishes.
- Removed individual tool version numbers; tools now share the app version.
- Added a User Teams Selected shortcut to team-selection windows and improved filter-list ordering.
- Faster player-filter loading in Commentary IDs and Team Boost, with loading feedback while filters are read.

Roster Generator
- Redesigned Position Strength with a compact Offense / Defense / Specialists layout, sliders, precise percentage controls, and estimated average OVRs.
- Added talent-budget presets for offense, defense, playmakers, and the trenches, plus a Randomize button. Selecting a starting mix now applies it immediately.
- Stronger premium positions require bigger tradeoffs elsewhere, while a minimum specialist budget prevents taking every point away from K/P.
- Improved the spread of ratings within position rooms and added minimum speed safeguards for skill positions.
- Recruiting star ratings now reflect generated talent, with occasional surprises.
- Added individual team settings when regenerating multiple teams.
- Added automatic depth-chart reordering, with protection for unsupported or locked charts.
- Improved surname/appearance matching and skin-tone distributions, including running backs and corners on the Big Sky preset.
- Reworked all 565 backstories for more variety, personality, and believable college-life details.
- Fixed blocked generation for players with supported tattoo appearance layers.

Equipment Randomizer
- Added Unlocked's Taped Wrist with Cross to its equipment pool.
- Irish Jamo Sleeves are disabled by default in the Unlocked pool. Existing saved custom chances are preserved.
- Corrected Unlocked/RAW classification for GABOS, Kill Everybody, Trust God, and Custom 1–10 nose tapes.

Equipment Patcher
- Population caps now apply separately to each team for tattoos, visors, mouthpieces, lower rolled jerseys, and cutoff pants. Position-specific caps still apply within each team.
- Added team-level population counts and limits to previews and CSV reports. Existing gear is not removed when already above a cap.
- Increased the default tattoo cap to 40%. Tattoos can now be assigned beneath sleeves without removing the sleeves.
- Improved pass order: rolled-jersey undershirts run before lower rolled jerseys, followed by cutoff pants. Recoloring runs near the end, with tattoos last.
- Updated the untucked undershirt display names to Relaxed Tee Primary / Secondary / White / Black.

Population caps round down to whole players. Very small position groups can therefore have no new additions at low percentage settings. The explicit Also Replace All Standard Pants option still overrides the cutoff cap when selected.
