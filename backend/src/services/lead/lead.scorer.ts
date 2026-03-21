import { Priority } from '../../types/business.types';
import { RawBusiness } from '../../types/business.types';

// ---------------------------------------------------------------------------
// Lead Scoring
//
// Assigns a priority score (0–100) to a business based on how much it
// needs online help. Higher score = higher priority lead.
//
// Rules are plain objects — add/remove/adjust without touching logic.
// ---------------------------------------------------------------------------

interface ScoringRule {
  label: string;
  points: number;
  condition: (b: Partial<RawBusiness>) => boolean;
}

const SCORING_RULES: ScoringRule[] = [
  {
    label: 'No website',
    points: 40,
    condition: (b) => b.website === false,
  },
  {
    label: 'No reviews',
    points: 20,
    condition: (b) => b.reviewCount === 0 || b.reviewCount === null,
  },
  {
    label: 'Low rating',
    points: 15,
    condition: (b) => b.rating !== null && b.rating !== undefined && b.rating < 3.5,
  },
  {
    label: 'No description',
    points: 10,
    condition: (b) => !b.description,
  },
  {
    label: 'Few reviews',
    points: 10,
    condition: (b) => b.reviewCount !== null && b.reviewCount !== undefined && b.reviewCount < 10,
  },
  {
    label: 'Strong online presence',
    points: -15,
    condition: (b) => b.website === true && b.rating !== null && (b.rating ?? 0) >= 4.5 && (b.reviewCount ?? 0) > 100,
  },
];

export interface ScoreResult {
  score: number;
  priority: Priority;
  reasons: string[];
}

export function scoreLead(business: Partial<RawBusiness>): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  for (const rule of SCORING_RULES) {
    if (rule.condition(business)) {
      score += rule.points;
      if (rule.points > 0) reasons.push(rule.label);
    }
  }

  // Clamp to 0–100
  score = Math.max(0, Math.min(100, score));

  const priority: Priority =
    score >= 55 ? 'high' :
    score >= 25 ? 'medium' : 'low';

  return { score, priority, reasons };
}
