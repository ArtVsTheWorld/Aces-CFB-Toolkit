# v0.18.1 — Helmet and Mouthpiece Follow-up

- With standard Vicis Zero 2 enabled, helmet targets are 68% SpeedFlex, 15% F7 / F7 Pro, 14% Axiom, and 3% Vicis Zero 2.
- Vicis can only be added to quarterbacks, tight ends, linebackers, and defensive linemen. Balancing adjusts achievable targets when too few eligible recipients exist. Vicis-off behavior is unchanged.
- Known non-mouthpiece assets stored in MouthWear are labeled as invalid in previews and repaired when Add Mouthpieces is enabled. Valid existing mouthpieces remain unchanged unless reroll is selected. Unknown custom assets are not assumed invalid.
- Equipment donors cannot pass known wrong-slot mouthpiece assets to recipients. This guard applies to single, mixed, cross-position, and selected donors.

The supplied TAPETEST backup already had Adidas Freak Ultra 23 cleat IDs in 13 active East Point players' mouthpiece slots. The latest Patcher run replaced them with valid mouthpieces. The origin of the malformed input is not established.

Personal settings, custom accent colors, uploaded logos, and uploaded headers remain in the local Windows user-data folder and are not distributed in installers. Built-in artwork continues to ship normally.

Publish these changes as v0.18.1, leaving the already published v0.18.0 assets intact. Upload the matching installer, installer blockmap, and latest.yml together.
