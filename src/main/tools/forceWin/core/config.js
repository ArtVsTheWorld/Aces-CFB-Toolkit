const FORCE_WIN_CONFIG = Object.freeze({
  version: "4.0",
  // Involvement controls which mismatch categories the tool decides, not team strength.
  involvement: Object.freeze({
    default: "medium",
    probabilityFloor: 0.01,
    probabilityCap: 0.999,
    levels: Object.freeze({
      minimum: Object.freeze({ label: "Minimum", categories: Object.freeze(["extreme"]), automatic: false }),
      low: Object.freeze({ label: "Low", categories: Object.freeze(["high", "extreme"]), automatic: false }),
      medium: Object.freeze({ label: "Medium", categories: Object.freeze(["medium", "high", "extreme"]), automatic: false }),
      high: Object.freeze({ label: "High", categories: Object.freeze(["small", "medium", "high", "extreme"]), automatic: false }),
      protect: Object.freeze({ label: "Protect Favorites", categories: Object.freeze(["medium", "high", "extreme"]), automatic: false, policy: "protect-favorites" }),
      maximum: Object.freeze({ label: "Maximum", categories: Object.freeze(["small", "medium", "high", "extreme"]), automatic: true })
    })
  }),
  // Profiles adjust how the same verified inputs are interpreted; no school-specific data is added.
  modelProfiles: Object.freeze({
    default: "balanced",
    profiles: Object.freeze({
      ratings: Object.freeze({
        label: "Ratings First",
        description: "Team ratings dominate; coaching and matchup fit have less influence.",
        baseWeight: 0.75,
        matchupWeight: 0.25,
        coachingScale: 0.50,
        probabilityCompression: 1.00,
        disparityScale: 1.00
      }),
      balanced: Object.freeze({
        label: "Balanced",
        description: "Matchup fit leads, anchored by starter composite, coaching, and venue.",
        baseWeight: 0.45,
        matchupWeight: 0.55,
        coachingScale: 1.00,
        probabilityCompression: 1.00,
        disparityScale: 1.00
      }),
      coaching: Object.freeze({
        label: "Coaching Heavy",
        description: "Coach levels and game-impact skill trees matter substantially more.",
        baseWeight: 0.55,
        matchupWeight: 0.45,
        coachingScale: 1.50,
        probabilityCompression: 1.00,
        disparityScale: 0.93
      }),
      matchup: Object.freeze({
        label: "Matchup Heavy",
        description: "QB and unit-versus-unit matchups matter more than headline ratings.",
        baseWeight: 0.35,
        matchupWeight: 0.65,
        coachingScale: 0.75,
        probabilityCompression: 1.00,
        disparityScale: 1.30
      }),
      chaos: Object.freeze({
        label: "Chaos",
        description: "Uses balanced scoring but pulls probabilities toward 50% for more volatility.",
        baseWeight: 0.45,
        matchupWeight: 0.55,
        coachingScale: 1.00,
        probabilityCompression: 0.50,
        disparityScale: 1.00
      })
    })
  }),
  // Talent is intentionally one calibrated starter composite. OFF/DEF and
  // position groups feed matchup scoring instead of being counted twice here.
  baseStrengthWeights: Object.freeze({
    overall: 1.00,
    offense: 0.00,
    defense: 0.00,
    positionComposite: 0.00
  }),
  positionWeights: Object.freeze({
    qb: 0.24,
    ol: 0.14,
    dl: 0.14,
    db: 0.11,
    lb: 0.10,
    wr: 0.08,
    rb: 0.08,
    te: 0.06,
    st: 0.05
  }),
  // Quarterback drives more than half of each passing-unit comparison.
  passingPersonnelWeights: Object.freeze({
    qb: 0.55,
    wr: 0.30,
    te: 0.15
  }),
  matchupWeights: Object.freeze({
    passingOffense: 0.25,
    rushingOffense: 0.25,
    passDefense: 0.20,
    runDefense: 0.20,
    specialTeams: 0.10
  }),
  finalWeights: Object.freeze({
    baseStrengthDifference: 0.60,
    matchupAdvantage: 0.40
  }),
  homeField: Object.freeze({
    home: 1.0,
    neutral: 0.0,
    away: -1.0
  }),
  // Coaching can materially separate otherwise similar teams, especially at head coach.
  coaching: Object.freeze({
    maximumLevel: 80,
    levelPointScale: 0.14,
    disparityMultiplier: 2.0,
    roleWeights: Object.freeze({
      headCoach: 0.70,
      offensiveCoordinator: 0.15,
      defensiveCoordinator: 0.15
    }),
    archetypeRoleWeights: Object.freeze({
      headCoach: 1.00,
      offensiveCoordinator: 0.25,
      defensiveCoordinator: 0.25
    }),
    archetypeBonuses: Object.freeze({
      Schemer: 0.50,
      SchemeGuru: 0.90,
      Motivator: 0.50,
      MasterMotivator: 0.90
    }),
    // SeasonsWithTeam is a direct coach-table field. Year one is neutral;
    // continuity is deliberately capped below a single meaningful roster point.
    continuity: Object.freeze({
      enabled: true,
      neutralSeasons: 1,
      maximumCreditedSeasons: 5,
      pointScale: 0.12,
      maximumBonus: 0.60,
      roleWeights: Object.freeze({
        headCoach: 0.70,
        offensiveCoordinator: 0.15,
        defensiveCoordinator: 0.15
      })
    })
  }),
  // These benefits belong to the home team and are disabled at confirmed neutral sites.
  homeContext: Object.freeze({
    atmosphereBonuses: Object.freeze({ Aminus: 0.40, A: 0.70, Aplus: 1.00 }),
    topRankedMaximum: 15,
    topRankedBonus: 0.75
  }),
  // Display-only model lines derived from the same matchup edge as the force-win decision.
  bettingLines: Object.freeze({
    spreadPointsPerDisparity: 1.25,
    maximumSpread: 45,
    totalBaseline: 48,
    offenseTotalWeight: 0.22,
    defenseTotalWeight: 0.18,
    minimumTotal: 35.5,
    maximumTotal: 75.5,
    // Converts the model spread into projected win probability and American moneylines.
    moneylineSpreadScale: 6.5,
    moneylineProbabilityFloor: 0.01,
    moneylineProbabilityCap: 0.99,
    moneylineRoundingStep: 5
  }),
  // Rivalries remain eligible, but their mismatch is compressed to preserve volatility.
  rivalry: Object.freeze({
    disparityMultiplier: 0.75
  }),
  // Every matchup with a built-in FCS underdog receives the full disparity multiplier.
  fcs: Object.freeze({
    disparityMultiplier: 2.5
  }),
  // Labels are intentionally broader and easier to interpret than raw decimal scores.
  disparityLevels: Object.freeze([
    Object.freeze({ min: 17, label: "extreme", description: "overwhelming mismatch" }),
    Object.freeze({ min: 10, label: "high", description: "large mismatch" }),
    Object.freeze({ min: 4.5, label: "medium", description: "clear favorite" }),
    Object.freeze({ min: Number.NEGATIVE_INFINITY, label: "small", description: "close matchup" })
  ]),
  // Probability is linearly interpolated between these anchors instead of being flat by label.
  probabilityCurve: Object.freeze([
    Object.freeze({ score: 0, probability: 0.01 }),
    Object.freeze({ score: 4.5, probability: 0.10 }),
    Object.freeze({ score: 6, probability: 0.20 }),
    Object.freeze({ score: 10, probability: 0.50 }),
    Object.freeze({ score: 13, probability: 0.70 }),
    Object.freeze({ score: 17, probability: 0.85 }),
    Object.freeze({ score: 20, probability: 0.92 }),
    Object.freeze({ score: 24, probability: 0.95 }),
    Object.freeze({ score: 30, probability: 0.999 })
  ])
});

export default FORCE_WIN_CONFIG;
