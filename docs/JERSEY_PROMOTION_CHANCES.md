# Jersey promotion chances

The Jersey Settings modal has a Promotion Chances page with separate whole percentages for each position. Defaults come from the existing position rules. Only edited positions receive overrides; older presets without overrides retain the previous behavior.

The configuration applies to both Standard and No Duplicates. A configured player gets one promotion decision for the run. A failed decision also excludes optional collision upgrades and Standard's final low-number fill. Setting a position to 0% prevents its optional upgrades, while 100% allows an eligible upgrade whenever a suitable number is available. Required duplicate, illegal-number and team-tradition corrections remain active.

Existing eligibility restrictions remain. Offensive linemen, kickers and punters do not use optional promotions, and their controls are disabled. No Duplicates retains its existing fullback/freshman exclusions. Player locks, original EA player protection, number ranges, retired numbers and availability still apply.

Save commits promotion settings with the other jersey pages. Cancel discards the draft, and Reset restores toolkit defaults. The canonical saved configuration is `jersey-custom-json.promotionChances`. Runtime chance decisions are kept outside native save fields.
