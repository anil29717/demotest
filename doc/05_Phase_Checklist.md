# AR Buildwel - Phase Checklist

Last updated: 2026-04-24
Scope: execution tracker aligned to current codebase

## Tracking Metadata

- Owner: `TBD`
- Target Date: `TBD`
- Last Reviewed: `2026-04-24`
- Current Sprint Focus: `Phase 2 — intelligence and scale (post Phase 1 closeout)`

---

## Latest Batch Progress

- `[x]` Phase 1 checklist closeout (2026-04-24): WhatsApp Meta message-type mapping → CRM lead (`WhatsappIngestService`), in-process webhook metrics + `GET /admin/whatsapp/*` + admin UI + `doc/runbooks/whatsapp-meta.md` + `ALERT_WEBHOOK_URL`; email prefs stub (`emailMatchAlerts` / `emailDailyDigest`); `FraudCase` + `GET/PATCH/POST /admin/fraud/cases` + admin UI; compliance feed NDA deal gaps; `PUT /reviews/dispute/:id`; `PATCH /properties/:id` with ES upsert; document presigned access → `ActivityLog`; billing `GET /plans` + `POST /billing/webhook/stripe`; services request status machine `PUT /services/requests/:id/status` + web; PWA `public/sw.js` + registration in `AppShell`; `GET /user/broker-network`.

- `[x]` Phase 1 full-depth program slice (2026-04-23 execution):
  - API: `ContactPolicyService` centralizes publishable-text checks for requirements + property public fields (extends prior `validateNoContactLeak` usage).
  - API: `ComplianceService` deal-stage rules + `recordDealStageAdvance` audit hook from transaction orchestration; optional `COMPLIANCE_RULES_JSON`.
  - API: `WhatsappOutboundService` + env `WHATSAPP_CLOUD_API_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID`; daily digest cron mirrors a short WhatsApp message when user prefs enable `whatsappDigest` + valid `whatsappDigestTo` and Cloud API is configured.
  - API: `GET /fraud/listing-velocity/me`, `GET /reputation/graph/me`, `PATCH /properties/:id/status` (owner or `ADMIN`) with best-effort Elasticsearch `upsertFromProperty` on status change.
  - Web: workspace `/export` (CSV downloads via existing `/export/*` endpoints), notification settings for WhatsApp digest fields, reputation page loads review graph payload.
  - API: `GET /dd/property/:propertyId/checklist`, `GET /institutions/:id/dd-pack`, `GET /services/catalog`, `GET /partners/program/summary` (Phase 1 depth scaffolds for M21/M22/M24–M26/M42).
  - Web: `robots.ts` + `sitemap.ts` for crawlable marketing paths (M16 SEO slice).

- `[x]` Phase 2 Module 28 — optional Elasticsearch property search:
  - API: `@elastic/elasticsearch` client; `PropertySearchIndexService` (`ensureIndex`, `upsertFromProperty`, `reindexAll`); index mapping for search fields + `cityLower` for wildcard city parity; env `ELASTICSEARCH_URL`, `ELASTICSEARCH_INDEX`, optional `ELASTICSEARCH_API_KEY`.
  - API: `GET /search/properties` (and saved-run) uses ES when URL set, with Prisma fallback on failure; `POST /search/admin/reindex-properties` (ADMIN only) bulk backfills index.
  - API: `PropertiesService.create` best-effort `upsertFromProperty` after listing create.

- `[x]` Phase 2 Module 43 — daily digest cron:
  - API: `@nestjs/schedule` + `ScheduleModule.forRoot()`; `NotificationsDigestScheduler` runs `0 9 * * *` in `DIGEST_TZ` (default `Asia/Kolkata`, overridable); `DISABLE_DIGEST_CRON=true` skips runs.
  - API: `NotificationsService.sendDailyDigestSummaries()` creates one in-app row titled `Daily digest` when `dailyDigest` is on, user has unread non-digest notifications, and no digest in the last ~22h (WhatsApp delivery still separate).

- `[x]` Phase 2 Module 43 slice (notification prefs enforcement):
  - API: `normalizeNotificationPrefs` + digest window helper; `digestPreview` reads `User.notificationPrefs` — when `dailyDigest` is off, returns empty `items`, `windowLocal: N/A`, and an explanatory `note`; when on, uses optional `digestHourLocal` / `digestMinuteLocal` (validated on `PUT /user/notification-preferences`, default 09:30) for `windowLocal`.
  - API: `notifyMatch` batch-loads prefs for targets and skips in-app notification rows when `matchAlerts` is false (defaults match prior UX: on when unset).
  - Web: `/settings/notifications` — digest hour/minute inputs, digest preview shows API `note`.

- `[x]` Phase 2 search-first slice (Module 28 deepening):
  - API: `GET /search/properties` with `class-validator` query DTO (text `q` plus city, `propertyType`, `dealType`, price/sqft bounds, `isBankAuction`, `distressedLabel`); single Prisma `where` (`status: active` + structured `AND` + optional text `OR`); measured `tookMs`.
  - API: `GET /search/saved/:id/run` (JWT + roles) executes stored `filters` JSON through the same search path; `DELETE /search/saved/:id` hardened with `deleteMany` by `id` + `userId`.
  - Web: workspace `/search` filter form, save full filter payload, Run / Delete / Load into form for saved searches.

- `[x]` Phase 1 close-out batch (pre–Phase 2):
  - WhatsApp: `NestExpressApplication` + `rawBody`; `X-Hub-Signature-256` HMAC verify when `WHATSAPP_WEBHOOK_SECRET` set; `dedupeKey` on `WhatsAppIngest` for idempotent retries; `GET /webhooks/whatsapp` Meta verify when `WHATSAPP_WEBHOOK_VERIFY_TOKEN` set (run `prisma migrate` / `db push` for new column).
  - Controlled contact: `validateNoContactLeak` on requirement `city` + `areas`; property guard extended to `areaPublic` + `localityPublic` (public copy only; `toPublic` still omits private address).
  - Fraud: `FraudService.duplicateListingRisk` shared with `POST /fraud/duplicate-check`; non-blocking `listingRisk` on `POST /properties` response.
  - Compliance: `GET /compliance/feed` returns role-filtered static items (NDA + data-room extras for institutional/admin paths).

- `[x]` Batch 1 hardening applied for core transaction flow security and consistency:
  - auth role assignment guardrails for OTP signup
  - deal organization authorization checks for list/advance
  - stricter deal creation validation (XOR property/institution + reference checks)
  - property and requirement intake validation hardening
  - non-blocking matching side-effects and lead deduplication
  - institutional NDA gate validation tightened
- `[x]` RBAC + dashboard phase applied for core roles (`ADMIN`, `BROKER`, `BUYER`, `SELLER`):
  - centralized `@Roles` decorator + `RolesGuard`
  - role restrictions on high-risk API endpoints (deals/leads/listing/requirements mutations)
  - role-aware dashboard summary payloads in API
  - role-specific dashboard sections in web workspace
- `[x]` Role-based sidebar and access alignment applied for extended roles (`NRI`, `HNI`, `INSTITUTIONAL_BUYER`, `INSTITUTIONAL_SELLER`):
  - single web role-permission matrix for sidebar + route decisions
  - sidebar options filtered by role
  - workspace route guard redirects unauthorized role/path combinations
  - middleware redirects unauthenticated users away from protected workspace routes
  - API controller `@Roles` alignment updated to match sidebar-access expectations

## How to use this file

- Use this as the working checklist for delivery tracking.
- Update status here first when implementation changes.
- Keep module names consistent with `doc/02_Feature_Backlog_AR_Buildwel.md`.

Legend:
- `[x]` Done
- `[-]` Partial / In progress
- `[ ]` Not started

Layer annotations used in this file:
- `API: Implemented/Partial/Planned`
- `Web: Implemented/Partial/Planned`

---

## Phase 1 - Foundation and Core

Status summary (current):
- Done: 26
- Partial: 0
- Not started: 0

### Tier 1 Core Engines

- `Module 1: WhatsApp Integration Engine` - `[x]` (`API: Implemented`, `Web: Implemented`) HMAC + dedupe + verify GET + Cloud outbound + Meta `messages[]` type mapping + org-routed lead create + `WhatsAppIngest` fields + in-process metrics + optional `ALERT_WEBHOOK_URL`; admin `/admin/whatsapp` UI + runbook `doc/runbooks/whatsapp-meta.md`
- `Module 2: Multi-Tenant CRM Engine` - `[x]` (`API: Implemented`, `Web: Implemented`) baseline leads/deals/pipeline operational
- `Module 3: Requirement Marketplace Engine` - `[x]` (`API: Implemented`, `Web: Implemented`) baseline posting and flow operational
- `Module 4: Matching Engine (Rule-based)` - `[x]` (`API: Implemented`, `Web: Implemented`) core rule-based matching implemented
- `Module 5: Deal Pipeline Engine` - `[x]` (`API: Implemented`, `Web: Implemented`) stage progression + orchestration baseline
- `Module 6: Trust & Reputation System` - `[x]` (`API: Implemented`, `Web: Implemented`) reputation score + graph/me + review dispute path (`PUT /reviews/dispute/:id`) + web reputation flows
- `Module 7: Daily Notification Engine` - `[x]` (`API: Implemented`, `Web: Implemented`) in-app + prefs + digest cron + WhatsApp mirror + **email stub** prefs (`emailMatchAlerts` / `emailDailyDigest`)
- `Module 8: Institutional Engine (Basic)` - `[x]` (`API: Implemented`, `Web: Implemented`) baseline listing + NDA gate flow implemented

### Tier 2 Business and Revenue Engines

- `Module 9: Distressed Deal Engine` - `[x]` (`API: Implemented`, `Web: Implemented`) distressed labels on properties + search filters + presentation copy (`high_opportunity`)
- `Module 10: Bank Auction Deal Engine (Basic)` - `[x]` (`API: Implemented`, `Web: Implemented`) `isBankAuction` on properties + auctions workspace + DD checklist hook for auction
- `Module 11: NRI Management Module` - `[x]` (`API: Implemented`, `Web: Implemented`) `NriProfile` + `/verticals/nri` workspace
- `Module 12: HNI Investment Module (Basic)` - `[x]` (`API: Implemented`, `Web: Implemented`) `HniProfile` + `/verticals/hni` workspace
- `Module 16: SEO & Blog Content Engine` - `[x]` (`API: Implemented`, `Web: Implemented`) city/blog routes + `robots.ts` + `sitemap.ts`
- `Module 17: Advertiser & Monetization System` - `[x]` (`API: Implemented`, `Web: Implemented`) `GET /billing/plans`, checkout stub, `POST /billing/webhook/stripe`, web billing page
- `Module 18: PWA + Mobile Experience` - `[x]` (`API: Implemented`, `Web: Implemented`) manifest + `public/sw.js` shell cache + `AppShell` service worker registration (`NEXT_PUBLIC_PWA` opt-out)
- `Module 38: Investor Relationship Management Engine (Basic)` - `[x]` (`API: Implemented`, `Web: Implemented`) `InvestorPreference` + `/irm` workspace
- `Module 39: Advanced Deal Room / Data Room Engine (Basic)` - `[x]` (`API: Implemented`, `Web: Implemented`) documents + deal activity + presigned access audit log + NDAs
- `Module 40: Transaction Orchestration Engine` - `[x]` (`API: Implemented`, `Web: Implemented`) baseline orchestration logic implemented
- `Module 42: Partner Ecosystem Engine` - `[x]` (`API: Implemented`, `Web: Implemented`) partners API + `/partners` + program summary endpoint
- `Module 43: Notification Intelligence Engine (Basic)` - `[x]` (`API: Implemented`, `Web: Implemented`) multi-channel prefs (in-app + WhatsApp + email stub) + digest + settings UI

### Tier 3 Supporting and Scale Engines (Phase 1 commitments)

- `Module 19: Fraud Detection System (Basic)` - `[x]` (`API: Implemented`, `Web: Implemented`) duplicate + velocity + `FraudCase` admin workflow + listing/user effects on `blocked`
- `Module 20: Document Repository System` - `[x]` (`API: Implemented`, `Web: Implemented`) baseline implemented
- `Module 21: Property Due Diligence Module` - `[x]` (`API: Implemented`, `Web: Implemented`) `GET /dd/property/:id/checklist` + deal checklist
- `Module 22: Institutional Due Diligence + Data Room (Basic)` - `[x]` (`API: Implemented`, `Web: Implemented`) `GET /institutions/:id/dd-pack`
- `Module 23: Analytics & Performance Dashboard (Basic)` - `[x]` (`API: Implemented`, `Web: Implemented`) baseline analytics/dashboard present
- `Module 24: Legal Integration Module` - `[x]` (`API: Implemented`, `Web: Implemented`) services `legal` type + catalog + services-hub web
- `Module 25: Loan / Financing Module` - `[x]` (`API: Implemented`, `Web: Implemented`) services `loan` type + status pipeline + web
- `Module 26: Insurance Module` - `[x]` (`API: Implemented`, `Web: Implemented`) services `insurance` type + status pipeline + web
- `Module 28: Advanced Search & Discovery` - `[x]` (`API: Implemented`, `Web: Implemented`) Prisma + optional ES + index on create + status PATCH + **full listing PATCH** (`PATCH /properties/:id`) ES upsert + saved search web
- `Module 30: Localization & Multi-Language (Hindi + English target)` - `[x]` (`API: Implemented`, `Web: Implemented`) middleware `x-locale` + supported `en`/`hi` (expand copy incrementally in Phase 2)
- `Module 31: Audit & Activity Logs` - `[x]` (`API: Implemented`, `Web: Implemented`) baseline audit logging model/support present
- `Module 32: Compliance & Risk Alerts` - `[x]` (`API: Implemented`, `Web: Implemented`) feed + stage rules + **NDA deal-gap items** + web compliance page
- `Module 33: Data Ownership & Export System` - `[x]` (`API: Implemented`, `Web: Implemented`) export endpoints + workspace `/export` CSV download UI (org-scoped)
- `Module 34: Onboarding Assist System` - `[x]` (`API: Implemented`, `Web: Implemented`) onboarding routes + `PUT /user/onboarding` server-enforced broker completion rule
- `Module 37: Broker Network Engine` - `[x]` (`API: Implemented`, `Web: Implemented`) `GET /user/broker-network` org memberships (flat Phase 1; hierarchy Phase 2)
- `Module 44: Reputation Graph Engine (Basic)` - `[x]` (`API: Implemented`, `Web: Implemented`) `GET /reputation/graph/me` + web graph summary

### Phase 1 Key Deliverables Checklist

- `[x]` Auth foundation (OTP/JWT) is operational.
- `[x]` Property and requirement posting pipeline is live.
- `[x]` Rule-based matching is connected to lead/deal flow.
- `[x]` Core deal pipeline and orchestration baseline is available.
- `[x]` Institutional baseline with NDA gate is available.
- `[x]` Controlled contact architecture validation hardening (`ContactPolicyService` on requirement public surfaces + property listing public text; shared `validatePublishableTextParts`).
- `[x]` WhatsApp production-grade hardening and monitoring (signature + dedupe + verify + outbound + digest + structured logs + in-process metrics + optional `ALERT_WEBHOOK_URL` + admin ops UI + runbook; external Meta Business dashboards remain operator-side).
- `[x]` Full trust/fraud/compliance depth completion for Phase 1 bar (heuristics + `FraudCase` admin actions + compliance NDA deal gaps + review dispute + reputation graph slice; deeper case automation in Phase 2).

---

## Phase 2 - Intelligence and Scale

Status summary (current):
- Done: 0
- Partial: 2
- Not started: 8

### AI and Intelligence Engines

- `Module 13: AI Investment & Market Intelligence Engine` - `[ ]`
- `Module 14: Liquidity / Saleability Scoring Engine` - `[ ]`
- `Module 15: Institutional Valuation Intelligence` - `[ ]`
- `Module 29: Gamification & Engagement System` - `[ ]`
- `Module 43: Notification Intelligence Engine (Advanced)` - `[-]` (prefs-aware + daily in-app digest cron; multi-channel / WhatsApp digest send still pending)
- `Module 44: Reputation Graph Engine (Advanced)` - `[-]` (basic baseline exists; advanced graph intelligence pending)

### Platform Scale and Ecosystem

- `Module 27: Data Ingestion Engine (Crawler/Parser/Filter)` - `[ ]`
- `Module 35: API Ecosystem` - `[ ]`
- `Module 36: In-Platform Communication Layer` - `[ ]`
- `Module 41: Escrow & Secure Transaction Layer` - `[ ]`

### Phase 2 Key Deliverables Checklist

- `[ ]` AI matching in production and conversion lift validated.
- `[ ]` Automated auction ingestion running without manual intervention.
- `[ ]` Institutional AI valuation active in deal workflows.
- `[ ]` Escrow workflow compliant and enabled.
- `[ ]` Microservices migration plan executed in deployable slices.

---

## Cross-Phase Governance Checklist

- `[x]` `doc/01_PRD_AR_Buildwel.md` includes implementation status note.
- `[x]` `doc/02_Feature_Backlog_AR_Buildwel.md` includes implementation status note.
- `[x]` `doc/03_Technical_Architecture_AR_Buildwel.md` includes implementation status note.
- `[x]` `doc/04_Implementation_Status_and_Execution_Plan.md` maintained as execution truth source.
- `[ ]` Add a weekly status review ritual (owner + date + updates).
- `[ ]` Add release-level API docs vs controller route audit before each milestone.
- `[ ]` Add test coverage target tracking per module.

---

## Update Rules (Do not skip)

- If code changes, update this file first.
- Then sync affected sections in PRD/backlog/architecture docs.
- Do not mark Phase 2 items complete unless code exists and is verified.

