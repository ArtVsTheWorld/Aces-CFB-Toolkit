# Equipment donor sources

The Randomizer separates recipient filters from donor rules. Player Filters
choose every position/team/player eligible for the run. Configure Donor Sources
For edits one receiver's rule at a time; switching receivers retains each rule.
MLB/MIKE, SAM, WILL, FS, SS, K and P have separate choices. OL and EDGE retain
their existing grouped selectors.

Checked source positions form a strict allowlist, including the receiver's own
position. With only another position checked, all donors come from that source,
even if Cross-Position Mixing Chance is zero. With own-position and other
sources checked, the existing mixing chances apply. Empty or unavailable lists
skip the player without falling back to an unchecked source. Existing roster,
class, identity, loadout, brand and body-fit safeguards still apply.

The shared donorSources module validates new sparse per-receiver overrides.
Unedited receivers keep the previous crossDonorGroups rules and exact chance,
position-family and fallback behavior. Existing presets do not silently acquire
new overrides; their old LB/S rules remain intact. New presets save the sparse
overrides through the existing canonical settings control. A seeded parity audit
compares 39 legacy configurations with the preceding release.

Copy These Sources to Other Positions copies an independent exact source list
to the checked receivers, without changing Player Filters. The specific-player
picker can select all donors in the current position or select its highest-rated
N donors. Top-N replaces that position's selection and retains selections in
other positions. Donor identity, file fingerprint, eligibility and preset checks
are the same as manual selection; these shortcuts do not add another donor mode.

Remove Specific Item(s) in the Patcher offers categorized optional equipment
whose slots have a supported None representation. Helmets, facemasks and cleats
are excluded even where a catalog None asset exists. The same restriction is
enforced by backend validation. Old removal presets omit newly prohibited
choices; a pass with no remaining choices is disabled. Category/search bulk
selection affects only visible items. Existing player filters, protections,
last-pass order, exact preview/apply plans and storage checks remain in force.
