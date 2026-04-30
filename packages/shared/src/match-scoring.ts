/**
 * Rule-based match scoring weights (must sum to 1).
 * Emphasis: location, budget, and area drive fit for property–requirement pairing.
 */
export const MATCH_WEIGHTS = {
  location: 0.3,
  budget: 0.28,
  propertyType: 0.12,
  dealType: 0.08,
  areaSqft: 0.2,
  urgency: 0.02,
} as const;

/** Combined score at or above this is flagged as a “hot” match in UI and filters. */
export const HOT_MATCH_THRESHOLD = 75;
