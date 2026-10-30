### Release Notes

General
- Styled checkbox rows can now be checked or unchecked by clicking anywhere on the row
- Fixed equipment settings cache issues when switching tools or loading settings at the same time

Equipment Mapper
- Added a conflict review screen with Review Fix, Skip and Apply Anyway, with Review Fix selected by default
- Review Fix keeps your requested equipment changes and shows any extra outfit adjustments needed to make them compatible
- Review conflicts by group or choose different actions for individual players
- Added All Category selections, such as All Turtlenecks, for replacing or removing every supported item in a category
- Assigning an All Category selection spreads its items evenly across matching players
- Added clearer rule summaries, matching-player counts, reasons for unchanged players and specific conflict messages
- Players with conflicts now show the same red asterisk used in Roster Generator
- Improved item browsing, spacing and alignment, with expandable lists showing what each All Category selection includes
- Socks, pants and jersey styles cannot be removed, alongside helmets, facemasks and cleats. They can still be assigned or replaced

Equipment Randomizer and Equipment Quickstart
- Split base-game equipment into its own CFB 27 Equipment pool, separate from Unlocked
- Corrected equipment availability and names using checks against the unmodded equipment menu, including items replaced by mods
- Face paint now copies from donors instead of always being randomized separately. Enabled equipment pools can still add their selected face paints
- Added Quarter Sleeves, Half Sleeves, Long Arm Tape, Short Arm Tape and more wrist gear to the default CFB 27 Equipment selections
- Large glove tape pool rolls are limited to DL, OL, LB, TE and FB
- Lowered Unlocked cross wrist tape to 3%
- Enabled Unlocked String Towels at 1%, limited to WRs, CBs and safeties
- Removed the broken Arm Bands White item from catalog selections and new donor copying
- Fixed additional sleeve, wrist/elbow, mask, mouthpiece and helmet accessory compatibility interactions
- Fixed equipment source previews counting pool items that later corrections removed

Equipment Patcher
- Fixed Recolor Accessories treating the pass alone as evidence that Unlocked was installed
- Updated removal protection for required clothing while keeping leg sleeves and compression leggings removable

Roster Generator
- Added Balanced, Starters First and Deep Roster talent distributions, configurable for the whole team or by position group
- Added a position depth summary showing leading-player ratings and backup averages
- Added Latino, Polynesian and combined Latino + Polynesian appearance/name mixes, each defaulting to a 10% roster share. Existing Mix remains the default
- Expanded name variety and reduced repeated first and last names within generated teams
- Expanded face variety for the new mixes and updated Standard, HBCU and Big Sky skin-tone distributions

Dealbreaker Fixer
- Updated the default distribution, with None at 0% and Playing Time at 25%

Long Snap Fixer
- Temporarily disabled while investigating a reported base-game issue where nonzero Long Snap ratings can affect field-goal accuracy
- Newly generated players keep Long Snap ratings at 0 while the fixer is paused
