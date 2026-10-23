# v22.5 — Filter windows and control polish

## Interface

- Player Filters in both Equipment tools now have Positions, Class & Redshirt,
  Build & Overall, and Player Protection pages.
- Commentary IDs uses Teams, Positions, Class & Redshirt, and Individual Players.
  Team Boost uses Class & Redshirt and Individual Players. NIL Toggle uses all
  four scope pages.
- The reusable configuration-page helper moves existing draft controls; it does
  not rebuild selections or write canonical settings until Save. Keyboard users
  can use arrow keys, Home, and End on the tabs. Validation still checks numbers
  on hidden pages, while genuinely disabled/conditional settings stay inactive.
- Shared windows have a separately scrolling body and persistent header/footer.
  Button groups wrap at narrow widths. Picker toolbars, labels, help icons, and
  configuration entries have consistent spacing.
- Team Boost's position-adjustment button now has its own configuration entry.
- NIL Toggle's settings use a narrower column and two flag-choice cards instead
  of a visible dropdown. The existing canonical value remains compatible with
  saved sessions and presets.
- Jersey Renumber's allocation-mode labels use full foreground contrast, with a
  clearer selected outline. Neither mode is disabled.
- True Freshmen Only starts off in new Commentary configurations. Explicitly
  saved user choices are still restored.

## Dealbreaker Fixer

- Percentages use whole-number steps and validation.
- Playing Style is eligible at every position by default.
- `restrictPlayingStylePositions: true` enables the optional HB/RB, WR, TE rule.
  Existing invalid-style cleanup is available only with that restriction on.
- Eligibility status and the mix's Playing Style label update with this choice.
  Reports retain resolved options and recruiting-pitch changes.
- The Roster Generator explicitly retains its previous restricted finishing
  behavior; its generation rules were not changed by this tool-interface update.
- Dealbreaker settings restore before initial binding rather than waiting for
  the asynchronous protection-picker setup.

## Verification

- 766 source tests passed.
- Isolated real-renderer checks cover tab state, keyboard navigation, hidden-page
  validation, Save/Cancel/Escape/Reset, presets, navigation, flag cards, eligibility
  text, and responsive light/dark layouts.
- Copied-save tests verified both opt-in invalid-style cleanup and default
  all-position Playing Style assignment, matching recruiting pitches, backups,
  exact persistence, and unchanged original fixtures.
- Build: `dist/v22.5-filter-polish-test/win-unpacked`.

No installer release or GitHub publication was requested or performed.
