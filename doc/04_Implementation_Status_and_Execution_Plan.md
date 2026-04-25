# AR Buildwel - Implementation Status and Execution Plan

Last updated: 2026-04-24 (Phase 1 checklist marked complete in `doc/05`; prior 2026-04-23 depth slice: `ContactPolicyService`, compliance deal-stage hooks + optional `COMPLIANCE_RULES_JSON`, WhatsApp Cloud outbound + optional digest mirror, `GET /fraud/listing-velocity/me`, `GET /reputation/graph/me`, `PATCH /properties/:id/status` with Elasticsearch upsert, workspace `/export` CSV UI, notification prefs `whatsappDigest` / `whatsappDigestTo`.)
Workspace: `D:/Projects/propertyserch`

---

## 1) Why this document exists

This file is the **single working reference** to align:
- Product vision from `.cursor/project.md`
- Existing docs in `doc/`
- Actual implementation currently present in code

Its purpose is to reduce conflicts by clearly separating:
- **Implemented now**
- **Partially implemented / in progress**
- **Planned (not yet built)**

---

## 2) Source references used

- `/.cursor/project.md` (master product vision and module definitions)
- `/doc/01_PRD_AR_Buildwel.md`
- `/doc/02_Feature_Backlog_AR_Buildwel.md`
- `/doc/03_Technical_Architecture_AR_Buildwel.md`
- Backend implementation under `/apps/api/src/*`
- Data model under `/apps/api/prisma/schema.prisma`
- Web implementation under `/apps/web/src/*`

---

## 3) Requirement and platform goal (condensed)

### Core problem being solved
- Real estate workflow is fragmented (WhatsApp/offline/manual)
- No structured trust and controlled-contact deal infrastructure
- No true transaction operating system from lead to closure
- Institutional segment (schools/colleges/universities) is unstructured

### Platform goal
- Build a **Real Estate Transaction Operating System (RTOS)** with:
  - Lead/requirement/listing intake
  - Rule-based then AI-driven matching
  - CRM + deal pipeline orchestration
  - Trust, compliance, fraud controls
  - Institutional deal confidentiality and NDA-gated access
  - Monetization and scale path from Phase 1 -> Phase 2

---

## 4) Current architecture status (what exists now)

### Architecture shape
- Current implementation is a **modular NestJS backend monolith** (`/apps/api/src/app.module.ts`)
- Data layer via **Prisma + PostgreSQL** (`/apps/api/prisma/schema.prisma`)
- Supporting infra pieces exist for Redis and containerized local setup (`/infra/docker-compose.yml`)
- A **Next.js web app** exists in `apps/web` with workspace and public route surfaces.

### Implemented core domain modules (present in code)
- Auth/OTP/JWT
- Users/profile context
- Properties
- Requirements
- Matching (rule-based)
- Leads (CRM backbone)
- Deals and stage movement
- Transaction orchestration (SLA/stage logic)
- Institutions
- NDA handling
- Documents/data room primitives
- Notifications
- Dashboard/analytics/export
- Compliance/fraud/reputation (basic first-pass)
- WhatsApp webhook intake (partial hardening pending)

### Important implementation reality
- Backend foundation is substantial and aligned to Phase 1 direction.
- Several advanced components are still stubs or partial (especially Phase 2 intelligence and financial orchestration).

### Web execution snapshot (current)
- **Implemented baseline:** login/session context, workspace shell, dashboard, CRM, properties, requirements, matching, deals, institutions, notifications, onboarding, and SEO/i18n pages.
- **Partial:** billing, full vertical/service depth, advanced search tuning, and some phase2-oriented pages.
- **Planned:** full AI-assisted UX, escrow and advanced financial workflows, and complete Phase 2 automation surfaces.

---

## 5) Status by phase and feature

## Phase 1 (Foundation/Core) - current status

### Completed or largely operational
- OTP + JWT authentication flow
- Property + requirement APIs with validation and persistence
- Rule-based matching with scoring and hot-match behavior
- Lead/deal creation and stage progression hooks
- Basic transaction orchestration and SLA-aware flow
- Institutional listing + NDA-gated data access baseline
- Basic notifications + dashboard + analytics + export endpoints
- RBAC primitives (`@Roles`, `RolesGuard`) and role-scoped dashboard behavior for core roles (`ADMIN`, `BROKER`, `BUYER`, `SELLER`)
- Role-based sidebar visibility and route-access alignment for extended roles (`NRI`, `HNI`, `INSTITUTIONAL_BUYER`, `INSTITUTIONAL_SELLER`) across web + API permission surfaces

### Phase 1 closeout (2026-04-24)
- WhatsApp: inbound Meta message mapping, metrics, admin ops UI, runbook, optional alerts.
- Fraud/compliance/reputation: `FraudCase` admin workflow, NDA deal-gap compliance items, review dispute, graph slice.
- Search: ES upsert on listing PATCH + status change; Prisma fallback remains.
- Billing: plans catalog + Stripe webhook stub + checkout stub; full PSP lifecycle is Phase 2 merchant work.

## Phase 2 (Intelligence/Scale) - mostly planned
- AI matching and prediction layers
- Automated crawler/parser ingestion pipelines
- Escrow and advanced secure financial workflows
- In-platform communication/chat
- Full microservices decomposition
- Advanced reputation graph and behavioral intelligence

---

## 6) End-to-end flow (as implemented + target)

### Current practical flow
1. User authenticates (OTP/JWT).
2. User posts property or requirement.
3. Validation runs (including contact-control style checks where implemented).
4. Rule-based matching runs and stores match records.
5. Match side-effects trigger leads/notifications.
6. Broker/organization progresses deals through pipeline stages.
7. Orchestration/SLA logic monitors and advances workflow.
8. Institutional flows additionally pass NDA and access controls.

### Target expanded flow (from roadmap)
1. Multi-channel ingestion (WhatsApp + portal + crawler).
2. AI-assisted ranking, scoring, and recommendation.
3. Full trust/fraud/compliance automation.
4. Financial modules (loan/insurance/escrow) deeply integrated.
5. Microservice-scale execution and external API ecosystem.

---

## 7) Conflict-safe architecture rules (must follow)

To avoid future document/code conflicts:

- Treat this file as the **implementation-truth index**.
- Keep PRD/backlog docs as **target-state** references.
- Label every feature as one of: `Implemented`, `Partial`, `Planned`.
- Do not describe Phase 2 features as live unless code exists.
- Keep route examples synced with actual controllers before publishing API docs.
- Keep terminology normalized:
  - user-facing language: "High-Opportunity / Special Situation"
  - internal technical flags may still use "distressed"

---

## 8) What is completed vs pending (module-oriented snapshot)

### Completed baseline (code-backed)
- Module 2 style capability: CRM foundations (leads/deals/pipeline basics)
- Module 3/4 baseline: requirement marketplace + rule-based matching
- Module 5 baseline: deal stages and orchestration hooks
- Module 8 baseline: institutional + NDA gate
- Supporting analytics/notification/export baseline

### Partial baseline (exists but not full spec depth)
- Module 1 WhatsApp engine (intake path present, full production depth pending)
- Module 6 trust/reputation (basic; advanced scoring still pending)
- Module 9/10 distressed and auction depth (partial implementation pattern)
- Search and discovery advanced behavior (partial)

### Planned (not yet implemented fully)
- AI intelligence family (modules 13, 14, 15 and related predictive layers)
- Escrow (module 41)
- Full API ecosystem + microservice split (module 35 and Phase 2 infra)
- Full communication layer and advanced behavior-based automation

---

## 9) Prioritized TODO list (execution-ready)

## P0 - Stabilize current foundation
- Add a strict `implementation status` tag system in docs (`Implemented/Partial/Planned`) across all major docs.
- Reconcile API docs with actual route prefixes/controllers.
- Harden WhatsApp webhook security and failure handling.
- Add stronger validation + test coverage for matching and deal orchestration paths.
- Tighten institutional NDA access checks and audit trails.

## P1 - Complete missing Phase 1 depth
- Expand fraud/compliance/reputation from baseline to full Phase 1 expectation.
- Improve search/filtering behavior to match backlog depth.
- Complete billing/payment workflows currently stubbed.
- Add integration tests across property -> match -> lead -> deal pipeline.

## P2 - Prepare Phase 2 entry
- Define clear contracts for AI services (inputs/outputs/events).
- Finalize crawler/parser ingestion architecture and error-handling policy.
- Design service boundaries for monolith-to-microservice migration.
- Define rollout metrics for conversion lift, SLA adherence, and trust outcomes.

---

## 10) Recommended documentation governance

- Keep `doc/04_Implementation_Status_and_Execution_Plan.md` updated weekly.
- On each feature PR, update:
  - Current status section
  - Module snapshot
  - TODO completion checklist
- If roadmap changes in `.cursor/project.md`, update this file first, then sync PRD/backlog docs.

---

## 11) Final alignment statement

The repository currently reflects a **strong Phase 1 backend foundation plus a meaningful web baseline** with selective partial implementations and explicit Phase 2 placeholders.  
This document should be used as the conflict-control layer between product vision and actual API/web execution state.

