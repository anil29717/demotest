export type NlpIntentResult = {
  intent: string;
  confidence: number;
  propertyType: string | null;
  city: string | null;
  locality: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  bedrooms: number | null;
  areaSqft: number | null;
  timeline: string | null;
  urgency: string | null;
};
