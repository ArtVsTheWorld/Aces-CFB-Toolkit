### Release Notes

General

- More UI/UX improvements, including better modal spacing, aligned controls and info icons, and cleaner filter windows
- Player filters now use separate pages, and redshirt filtering consistently offers All Players, True, and Redshirt
- Team, position, class year, and other selection lists now use more sensible sorting
- Removed the "Who This Will Affect" boxes and section-jump buttons from configuration windows
- Replaced "Skip NIL Players" with "Protect Original EA Roster Players." Protection uses a built-in reference instead of the current NIL flag, so changing that flag in another tool won't remove it. Fictional fillers from EA's roster aren't treated as real players
- Updated equipment display names and corrected confirmed gear mappings

Roster Generator

- Added the game's 10 offensive and 9 defensive schemes, replacing the previous scheme presets. Thanks to SDmart3 for the scheme data
- Dynasty users can use each team's current schemes automatically. Play Now roster files support manual or randomized scheme choices
- Added Build to Scheme Needs: redistribute positions to suit the selected schemes while keeping the same roster size. Keeping existing position counts remains available
- Added Configure Teams, combining bulk setup and individual team editing in one window
- Generate varied team settings using Keep Their Identity, Controlled Variety, or Shuffle the Field, with configurable caliber frequencies, allowed settings, and locks to protect customized teams
- Named talent mixes now adjust when schemes or roster makeup change. Custom percentages stay unchanged, with updated estimated OVRs
- Scheme selection now comes before Position Strength, and Youth Movement includes some seniors
- Generated player NIL costs now use increments of five, and expected NIL compensation matches current compensation. Valid team budgets are preserved; any unusable remainder stays unspent

Equipment Randomizer

- Cleaned up all three modded equipment-pool windows, including aligned help icons and percentage controls, consistent item spacing, and simpler scrolling
- Expanded the GameDay Gear / Equipment Truck pool with Brand Logo Chin Covers, QB-only waist playcall bands, and Jersey Number + Cross Thigh Pads
- Added the Logo Handwarmer as an optional pool item, disabled by default
- Added missing Unlocked tattoo designs and RAW nose/eye tape and earring/eye-paint combinations to their respective selections

Equipment Patcher

- Expanded recolor support for the new GameDay Gear items
- Added recolor support for the GameDay Gear version of Irish Jamo Sleeves. These variants are not added to the Randomizer pool

Commentary IDs

- True Freshmen Only is now disabled by default
- Improved player-filter organization and original EA roster player protection

Dealbreaker Fixer

- Playing Style can now be assigned to any position by default. Limiting it to HB/WR/TE is optional
- Fix Invalid Playing Style Assignments is only available when that position limit is enabled
- Dealbreaker percentages now adjust in whole numbers

Other Tools

- NIL Toggle now uses a centered, narrower layout and buttons for its two flag values. It still changes the actual NIL flag, not original EA player protection
- Improved Team Boost configuration spacing and made Jersey Renumber's allocation-mode choices clearer
- Fixed Smart Force Win checkbox alignment and the Starting Preset controls in the custom matchup model
