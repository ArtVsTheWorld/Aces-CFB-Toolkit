# Cutoff pants frequencies in v24.6

Cutoff pants now round fractional per-team, per-position limits up to a whole player. Previously, 5% of ten receivers became a zero-player limit. It now permits one recipient. A zero percentage still permits no capped additions, and a 100% limit still covers the full group.

Fill to Frequency starts enabled for Cutoff Pants in Patcher and in Quickstart when Unlocked is selected. Existing cutoff pants count first. Disabling Fill restores chance rolls at the configured percentage, subject to the whole-player limit. Explicit saved percentages and Fill settings remain valid.

| Position group | Default |
| --- | ---: |
| QB | 0% |
| HB | 5% |
| FB | 0% |
| WR | 10% |
| TE | 5% |
| OL | 0% |
| EDGE | 5% |
| DT | 0% |
| LB | 5% |
| CB | 10% |
| FS | 10% |
| SS | 10% |
| K/P | 20% |

Patcher passes remain opt-in. Quickstart enables cutoff pants only with Unlocked. Its K/P frequency is applied in a separate cutoff-only correction; specialist randomization remains donor-only, and the other Quickstart corrections remain excluded for K/P. Selected Quickstart donors remain unchanged and are excluded from recipient counts and tracking.

The change retains leg-layer exclusions, player protection, shared-row protection, team/position separation, original-pants eligibility, the explicit Below-Knee Pants override and compatible outfit adjustment. It does not strip leg layers to create eligibility. Existing cutoff pants above the limit are preserved. Other passes retain their rounding behavior.

Validation includes small groups, 0%/100%, explicit chance mode, Fill, existing gear, protection, leg layers, team separation, saved settings, native Preview/Apply/reopen and a full unprotected three-mod Quickstart on the reported East Point backup. The original save and backup remain unchanged; all write tests use separate copies.

The separate jersey/undershirt bypass test failed on Kaseem Buck, so the production jersey/undershirt restrictions and outfit adjustment remain in place.
