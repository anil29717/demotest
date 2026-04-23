/**
 * Phase 2 scope markers (ML, crawlers, microservices, escrow, OCR).
 * Imported by docs-only surfaces; API can reference for feature flags.
 */
export const PHASE2_FEATURES = [
  'ml_matching',
  'auction_crawler_pipeline',
  'microservices_split',
  'api_ecosystem_webhooks',
  'escrow_milestone_release',
  'ocr_image_contact_scan',
  'reputation_graph_viz',
  'in_platform_chat_routed',
] as const;

export type Phase2Feature = (typeof PHASE2_FEATURES)[number];
