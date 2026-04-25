# Feature Backlog — AR Buildwel
## All 44 Modules | Phase 1 & Phase 2

---

## Implementation Status Note (Code-Aligned)

This backlog is the target plan. To avoid roadmap-vs-code conflicts, track each module with:
- `Implemented`
- `Partial`
- `Planned`

Reference implementation source:
- `doc/04_Implementation_Status_and_Execution_Plan.md`

Current module snapshot (high-level):
- `Implemented` baseline: **Phase 1 modules 1–12, 16–18, 19–26, 28, 30–34, 37–40, 42–44** per `doc/05_Phase_Checklist.md` (2026-04-24 Phase 1 closeout).
- `Partial`: Phase 2 advanced slices only (e.g. M43 Advanced, M44 Advanced, Module 28 tuning as listed under Phase 2 in the checklist).
- `Planned`: AI-heavy and scale modules such as 13, 14, 15, 27, 29, 35, 36, 41 (and advanced Phase 2 parts of others).
- `Web-baseline`: Phase 1 workspace routes aligned to checklist; Phase 2-only UX gaps tracked under Phase 2 in `doc/05`.
- Evidence mapping for status uses both `apps/api/src` and `apps/web/src/app`.

Use this backlog as priority intent; do not treat all P0 items as already delivered.

---

## TIER 1 — Core Engines (Non-Negotiable, Build First)

### Module 1: WhatsApp Integration Engine
**Phase:** 1
**Execution status:** `Partial`

| # | Feature | Priority |
|---|---|---|
| 1.1 | Property posting via WhatsApp (text + images) → auto-parsed to structured listing | P0 |
| 1.2 | Requirement posting via WhatsApp → auto-entered into CRM as tagged lead | P0 |
| 1.3 | Auto-replies and intent detection (buy / sell / rent / institutional) | P0 |
| 1.4 | Shareable smart links auto-generated per listing | P0 |
| 1.5 | Institutional intent captured via WhatsApp → routed to Institutional Engine | P0 |
| 1.6 | All WhatsApp events trigger downstream CRM and notification actions | P0 |
| 1.7 | AI-based intent classification (NLP upgrade) | P1 — Phase 2 |

---

### Module 2: Multi-Tenant CRM Engine
**Phase:** 1
**Execution status:** `Implemented` (baseline)

| # | Feature | Priority |
|---|---|---|
| 2.1 | Private CRM workspace per org (isolated via organization_id) | P0 |
| 2.2 | Full deal pipeline: Lead → Requirement → Match → Site Visit → Negotiation → Legal → Loan → Insurance → Payment → Closure | P0 |
| 2.3 | Lead auto-capture from WhatsApp, portals, and social media | P0 |
| 2.4 | Manual lead entry | P0 |
| 2.5 | Lead scoring: Hot / Warm / Cold | P0 |
| 2.6 | Follow-ups, reminders, call logs, activity logs | P0 |
| 2.7 | Team roles: Admin, Agent, Viewer | P0 |
| 2.8 | Broker performance dashboard | P0 |
| 2.9 | SLA tracking per stage with automated delay alerts | P0 |
| 2.10 | Deal orchestration: stage completion auto-triggers next action | P0 |
| 2.11 | Institutional CRM pipeline (9 stages: Intent → NDA → Closure) | P0 |
| 2.12 | Investor mapping: track investor profiles against deals | P0 |
| 2.13 | EMD tracking for auction deals | P0 |

---

### Module 3: Requirement Marketplace Engine
**Phase:** 1
**Execution status:** `Implemented` (baseline)

| # | Feature | Priority |
|---|---|---|
| 3.1 | Buyer requirement posting (public/private) | P0 |
| 3.2 | Hot requirement tagging for high-intent urgent buyers | P0 |
| 3.3 | Reverse matching: brokers notified when requirement matches their listings | P0 |
| 3.4 | Co-broking enablement: requirements shareable with partner brokers | P0 |
| 3.5 | Institutional requirement posting with specific filters | P0 |

---

### Module 4: Matching Engine
**Phase:** 1 (rule-based), Phase 2 (AI)
**Execution status:** `Implemented` (rule-based), `Planned` (AI)

| # | Feature | Priority |
|---|---|---|
| 4.1 | Rule-based matching on: Location, Budget, Property Type, Deal Type, Area (sqft), Urgency | P0 |
| 4.2 | Match percentage score and ranked results | P0 |
| 4.3 | Hot Match tag when score exceeds threshold | P0 |
| 4.4 | Auto-run on every new listing and every new requirement | P0 |
| 4.5 | Push matches to CRM + WhatsApp + Daily Digest | P0 |
| 4.6 | Institutional matching (separate filter set) | P0 |
| 4.7 | AI-based matching: learn from click patterns and conversion history | P1 — Phase 2 |
| 4.8 | Recommended buyers for brokers based on listing characteristics | P1 — Phase 2 |
| 4.9 | Recommended properties for buyers based on history and behavior | P1 — Phase 2 |

---

### Module 5: Deal Pipeline Engine
**Phase:** 1
**Execution status:** `Implemented` (baseline)

| # | Feature | Priority |
|---|---|---|
| 5.1 | Stage-based deal tracking with status history | P0 |
| 5.2 | Stage auto-progression triggers | P0 |
| 5.3 | Deal health score (0–100 composite) | P0 |
| 5.4 | SLA breach counter per deal | P0 |
| 5.5 | Deal linking: property/institution + requirement + broker | P0 |

---

### Module 6: Trust & Reputation System
**Phase:** 1
**Execution status:** `Partial`

| # | Feature | Priority |
|---|---|---|
| 6.1 | Multi-factor trust score: deal rate + response time + reviews + activity + verification + geo | P0 |
| 6.2 | Verified badges: Verified User, Top Broker, Highly Rated, Institutional Specialist | P0 |
| 6.3 | Admin-moderated reviews (post verified interaction only) | P0 |
| 6.4 | Property ownership timestamp (dispute priority) | P0 |
| 6.5 | Auto-publish reviews with AI fraud filter | P1 — Phase 2 |
| 6.6 | AI-automated trust score computation | P1 — Phase 2 |

---

### Module 7: Daily Notification Engine
**Phase:** 1
**Execution status:** `Partial` (baseline notifications present)

| # | Feature | Priority |
|---|---|---|
| 7.1 | Personalized daily WhatsApp digest per user | P0 |
| 7.2 | Area-based market intelligence push | P0 |
| 7.3 | Match alerts and deal stage notifications | P0 |
| 7.4 | Auction alerts for matched investors | P0 |
| 7.5 | Notification intelligence: frequency and relevance tuning | P1 — Phase 2 |

---

### Module 8: Institutional Engine
**Phase:** 1 (basic), Phase 2 (full)
**Execution status:** `Implemented` (basic), `Partial/Planned` (advanced)

| # | Feature | Priority |
|---|---|---|
| 8.1 | Institutional listing creation: K-12, college, university | P0 |
| 8.2 | All listings confidential by default (name masked) | P0 |
| 8.3 | NDA workflow: request → sign → approve → data room access | P0 |
| 8.4 | Institutional buyer verification and badge | P0 |
| 8.5 | NDA-gated data room with version control and access logging | P0 |
| 8.6 | 9-stage institutional CRM pipeline | P0 |
| 8.7 | Institutional broker certification | P0 |
| 8.8 | Rule-based institutional matching | P0 |
| 8.9 | AI valuation: EBITDA model, enrollment trends, exit scoring | P1 — Phase 2 |
| 8.10 | AI regulatory compliance flagging (UGC, AICTE, CBSE) | P1 — Phase 2 |

---

## TIER 2 — Business & Revenue Engines

### Module 9: Distressed Deal Engine
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 9.1 | Distressed deal listing with investment score (0–100) | P0 |
| 9.2 | Tags: Urgent Sale / Financial Distress / Investor Exit / Time-Bound Sale | P0 |
| 9.3 | Liquidity/exit score: High / Medium / Low | P0 |
| 9.4 | Risk indicators displayed per deal | P0 |
| 9.5 | Access restricted to verified brokers, NRI, and HNI only | P0 |
| 9.6 | Mandatory brand rule: label as "High-Opportunity" never "Distressed" | P0 |
| 9.7 | AI deal scoring via ML refinement | P1 — Phase 2 |

---

### Module 10: Bank Auction Deal Engine
**Phase:** 1 (basic manual), Phase 2 (automated)

| # | Feature | Priority |
|---|---|---|
| 10.1 | Manual entry and display of bank auction data | P0 |
| 10.2 | SARFAESI auction data: price, EMD, date, possession, legal status | P0 |
| 10.3 | Auction alert push to matched investors | P0 |
| 10.4 | Institutional distressed asset routing to Institutional Engine | P0 |
| 10.5 | Automated auction data ingestion pipeline (crawler/parser) | P1 — Phase 2 |

---

### Module 11: NRI Management Module
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 11.1 | NRI dashboard: properties, service requests, status tracking | P0 |
| 11.2 | Buy / Sell / Rent workflows with assigned platform manager | P0 |
| 11.3 | Property monitoring and rental management | P0 |
| 11.4 | Document coordination and repatriation guidance | P0 |
| 11.5 | AI-based property monitoring alerts | P1 — Phase 2 |

---

### Module 12: HNI Investment Module
**Phase:** 1 (basic), Phase 2 (full)

| # | Feature | Priority |
|---|---|---|
| 12.1 | Curated investment deal access | P0 |
| 12.2 | Basic portfolio view | P0 |
| 12.3 | Full portfolio intelligence dashboard with ROI/yield/liquidity | P1 — Phase 2 |
| 12.4 | Advanced investment analytics and deal advisory | P1 — Phase 2 |
| 12.5 | PE fund deal flow curation | P1 — Phase 2 |

---

### Module 13: AI Investment & Market Intelligence Engine
**Phase:** 2

| # | Feature | Priority |
|---|---|---|
| 13.1 | Price trend analysis by area | P1 |
| 13.2 | Area growth scores | P1 |
| 13.3 | Investment potential scoring | P1 |
| 13.4 | ROI, rental yield, capital appreciation modeling with confidence intervals | P1 |

---

### Module 14: Liquidity / Saleability Scoring Engine
**Phase:** 2

| # | Feature | Priority |
|---|---|---|
| 14.1 | Full data-driven saleability score across all asset types | P1 |
| 14.2 | Historical conversion data integration | P1 |

---

### Module 15: Institutional Valuation Intelligence
**Phase:** 2

| # | Feature | Priority |
|---|---|---|
| 15.1 | EBITDA multiple valuation model | P1 |
| 15.2 | Enrollment trend analysis | P1 |
| 15.3 | Exit potential scoring | P1 |

---

### Module 16: SEO & Blog Content Engine
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 16.1 | CMS with automated metadata generation | P0 |
| 16.2 | Schema markup and internal linking | P0 |
| 16.3 | City landing pages (Buy/Sell/Rent in [City]) | P0 |
| 16.4 | Institutional SEO pages (School for Sale [City]) | P0 |
| 16.5 | 12 launch blog articles | P0 |
| 16.6 | Image compression and optimization | P0 |

---

### Module 17: Advertiser & Monetization System
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 17.1 | Homepage banners and featured listings | P0 |
| 17.2 | Area promotions | P0 |
| 17.3 | Subscription plans: monthly and annual | P0 |
| 17.4 | Institutional listing fee integration | P0 |

---

### Module 18: PWA + Mobile Experience
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 18.1 | Installable PWA without app store | P0 |
| 18.2 | 3G/4G optimized loading | P0 |
| 18.3 | Mobile-first, single-hand thumb navigation | P0 |
| 18.4 | Offline capability with cached listings and CRM | P0 |
| 18.5 | Background sync when connectivity restored | P0 |
| 18.6 | Push notifications for matches and deal alerts | P0 |

---

### Module 38: Investor Relationship Management (IRM) Engine
**Phase:** 1 (basic), Phase 2 (full)

| # | Feature | Priority |
|---|---|---|
| 38.1 | Investor profiling: asset class, ticket size, area preference | P0 |
| 38.2 | Deal preference tracking | P0 |
| 38.3 | Repeat investor deal history | P0 |
| 38.4 | Advanced behavior analytics | P1 — Phase 2 |

---

### Module 39: Advanced Deal Room / Data Room Engine
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 39.1 | NDA-gated data room access | P0 |
| 39.2 | Version-controlled document hosting | P0 |
| 39.3 | Access logging per document per user | P0 |
| 39.4 | Role-based access: all NDA signatories / admin only / buyer only | P0 |
| 39.5 | Download control per document | P0 |

---

### Module 40: Transaction Orchestration Engine
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 40.1 | Stage completion auto-triggers next action | P0 |
| 40.2 | SLA monitoring and breach alerts | P0 |
| 40.3 | Deal health score computation | P0 |

---

### Module 42: Partner Ecosystem Engine
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 42.1 | Lawyer, bank, insurance partner onboarding | P0 |
| 42.2 | Commission and referral fee tracking | P0 |
| 42.3 | Partner performance dashboard | P0 |

---

### Module 43: Notification Intelligence Engine
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 43.1 | Notification relevance scoring per user | P0 |
| 43.2 | Frequency control to avoid notification fatigue | P0 |
| 43.3 | Priority notification routing for high-ROI events | P0 |

---

## TIER 3 — Supporting & Scale Engines

### Module 19: Fraud Detection System
**Phase:** 1 (basic), Phase 2 (AI)

| # | Feature | Priority |
|---|---|---|
| 19.1 | Duplicate image and listing detection | P0 |
| 19.2 | Geo-validation with mismatch flagging | P0 |
| 19.3 | Text-level regex blocking (phone, email, URL, contact phrases) | P0 |
| 19.4 | Image upload restriction for visiting cards | P0 |
| 19.5 | AI behavioral anomaly detection | P1 — Phase 2 |
| 19.6 | OCR image scanning for contact data | P1 — Phase 2 |

---

### Module 20: Document Repository System
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 20.1 | Secure document storage with encrypted S3 URLs | P0 |
| 20.2 | Role-based access control | P0 |
| 20.3 | Version control | P0 |
| 20.4 | Document type tagging | P0 |

---

### Module 21: Property Due Diligence Module
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 21.1 | Document checklist per property type | P0 |
| 21.2 | Automated missing document detection | P0 |
| 21.3 | Checklist progress displayed in CRM pipeline | P0 |

---

### Module 22: Institutional Due Diligence + Data Room
**Phase:** 1 (basic), Phase 2 (full)

| # | Feature | Priority |
|---|---|---|
| 22.1 | Institutional document checklist | P0 |
| 22.2 | NDA-linked data room access | P0 |
| 22.3 | AI document classification and risk flagging | P1 — Phase 2 |

---

### Module 23: Analytics & Performance Dashboard
**Phase:** 1 (basic), Phase 2 (full)

| # | Feature | Priority |
|---|---|---|
| 23.1 | Lead count, conversion rate, area demand metrics | P0 |
| 23.2 | Broker activity and performance analytics | P0 |
| 23.3 | Full market intelligence dashboard | P1 — Phase 2 |

---

### Modules 24–26: Legal, Loan, Insurance
**Phase:** 1

| Module | Features | Priority |
|---|---|---|
| 24: Legal | Verified lawyer panel, basic service workflow, commission tracking | P0 |
| 25: Loan | Bank/NBFC integration, eligibility flow, referral tracking | P0 |
| 26: Insurance | Property, rental, title insurance surfaced at closure stage | P0 |

---

### Module 27: Data Ingestion Engine (Crawler/Parser/Filter)
**Phase:** 2

| # | Feature | Priority |
|---|---|---|
| 27.1 | Automated auction data crawler | P1 |
| 27.2 | Parser for structured data extraction | P1 |
| 27.3 | Filter for deduplication and quality control | P1 |

---

### Module 28: Advanced Search & Discovery
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 28.1 | Smart filters: type, budget, area, furnishing, urgency, trust score | P0 |
| 28.2 | Saved searches with persistent preferences | P0 |
| 28.3 | Instant alerts on new matching listings/requirements | P0 |
| 28.4 | Institutional search filters: institution type, board, campus size, budget | P0 |

---

### Module 29: Gamification & Engagement System
**Phase:** 2

| # | Feature | Priority |
|---|---|---|
| 29.1 | Points engine: points for listing, response, closure, review | P1 |
| 29.2 | Tier badges: Bronze, Silver, Gold, Platinum, Elite | P1 |
| 29.3 | Area-wide and platform-wide weekly leaderboards | P1 |
| 29.4 | Trust score integration with gamification points | P1 |

---

### Module 30: Localization & Multi-Language
**Phase:** 1 (Hindi + English), Phase 2 (regional)

| # | Feature | Priority |
|---|---|---|
| 30.1 | Full Hindi and English UI from launch | P0 |
| 30.2 | Regional expansion: Marathi, Telugu, Tamil | P1 — Phase 2 |

---

### Modules 31–34: Operations & Compliance
**Phase:** 1

| Module | Features | Priority |
|---|---|---|
| 31: Audit Logs | Legal-grade immutable timestamped user action logs; exportable | P0 |
| 32: Compliance Alerts | RERA, RBI, FEMA, UGC/AICTE/CBSE regulatory updates pushed to relevant users | P0 |
| 33: Data Export | CSV export of leads, CRM records, listings, deal history; role-based controls | P0 |
| 34: Onboarding Assist | Role-specific guided onboarding wizard; first listing/requirement assistance | P0 |

---

### Module 35: API Ecosystem
**Phase:** 2

| # | Feature | Priority |
|---|---|---|
| 35.1 | API endpoints: listing sync, lead push, CRM integration, match retrieval | P1 |
| 35.2 | Org-level API keys with rate limiting | P1 |
| 35.3 | Webhook support for real-time updates | P1 |

---

### Module 36: In-Platform Communication Layer
**Phase:** 2

| # | Feature | Priority |
|---|---|---|
| 36.1 | Direct messaging between platform-verified participants | P1 |
| 36.2 | Contact control rules enforced inside chat (no bypass) | P1 |

---

### Module 37: Broker Network Engine
**Phase:** 1

| # | Feature | Priority |
|---|---|---|
| 37.1 | Broker network graph: co-broking relationships and referral patterns | P0 |
| 37.2 | Commission split tracking | P0 |
| 37.3 | Institutional specialist broker badge | P0 |

---

### Module 41: Escrow & Secure Transaction Layer
**Phase:** 2

| # | Feature | Priority |
|---|---|---|
| 41.1 | Escrow account integration for deal payments | P1 |
| 41.2 | Token and booking amount collection | P1 |
| 41.3 | Secure transaction routing | P1 |

---

### Module 44: Reputation Graph Engine
**Phase:** 1 (basic), Phase 2 (full)

| # | Feature | Priority |
|---|---|---|
| 44.1 | Network-based trust scoring from broker relationships | P0 |
| 44.2 | Full reputation graph with ML-powered scoring | P1 — Phase 2 |

---

## Summary: Build Phases

| Phase | Modules | Goal |
|---|---|---|
| Phase 1 | 1–12 (basic), 16–21, 24–26, 28, 30–34, 37–40, 42–44 (basic) | Foundation, core engines, market entry, initial revenue |
| Phase 2 | 13–15, 27, 29, 35–36, 41, + all AI upgrades across all modules | AI intelligence, automation, scale, microservices |
