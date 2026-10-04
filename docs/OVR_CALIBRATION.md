# Team Boost OVR calibration

Source: `docs/reference/CFB27_OVR_Formulas.json` (79 position/archetype formulas; 99.86% exact validation across 16,418 players).

The app's embedded archetype weights were compared field-by-field with every supplied formula. Six stale profiles were corrected: the Free Safety Run Support and Zone weight sets had been transposed, and kicker/punter Accurate and Power profiles incorrectly used Acceleration where the supplied formulas use Awareness. All 79 supplied profiles now match exactly.

Physical ratings are direct athletic or power traits: Speed, Strength, Agility, Acceleration, Change of Direction, Jumping, Throw Power, and Kick Power. Kick Power was added because the formulas show it materially drives kicker and punter OVR. Hit Power, Break Tackle, Stiff Arm, and position techniques remain non-physical: although physical ability contributes to them, the game models them as learned football outcomes rather than raw athletic measurements. This boundary is necessarily interpretive; the formula establishes importance, not a built-in physical/non-physical label.

The formula file contains no LS position formula and no `LS_Accurate` or `LS_Power` profile. Those archetypes therefore cannot be validated as functional through the supplied OVR model and are not assigned by the toolkit.
