# AR Buildwel — Phase 2 Roadmap
**Version:** 1.0 | **Status:** Planning | **Start:** Q2 2026

---

## 1. Phase 2 Mission

Phase 1 built the operating system.
Phase 2 makes it intelligent, financial, and scalable.

| Phase 1 (Done) | Phase 2 (Building) |
|---|---|
| Rule-based matching | AI matching that learns |
| Manual deal flow | Automated orchestration |
| Static trust scores | Behavioral intelligence |
| Subscription revenue only | 5 revenue streams |
| NestJS monolith | Microservices at scale |
| Human-moderated content | AI fraud + auto-publish |
| WhatsApp intake only | Full NLP intent mapping |
| Basic search | Semantic Elasticsearch |

---

## 2. Phase 2 Goals

### Business goals
- Activate 5 revenue streams (subscription + 
  transaction fee + escrow + API + data room)
- Reach 10,000 active brokers
- Process ₹500 Cr in deal value through platform
- Launch institutional vertical as standalone product
- Expand to 10 Indian cities

### Technical goals
- AI matching engine live and learning
- Escrow module processing real payments
- Microservices handling 100x Phase 1 load
- Crawler ingesting 500+ listings per day
- Full Elasticsearch relevance tuning live
- In-platform chat replacing WhatsApp dependency

### Product goals
- Every user action generates intelligence
- Platform earns on every closed deal
- Brokers cannot imagine working without it
- Institutional vertical becomes category leader

---

## 3. Phase 2 Architecture

### Current (Phase 1)
- NestJS monolith (`apps/api`)
- Next.js frontend (`apps/web`)
- Prisma + PostgreSQL
- Redis cache
- WhatsApp webhook integration
- Basic Elasticsearch upsert hooks

### New infrastructure
- **Kafka/RabbitMQ** — event bus between services
- **Python ML service** — AI matching and scoring
- **Socket.io** — real-time chat and notifications
- **Razorpay escrow** — fund holding and release
- **Stripe** — subscription lifecycle (replace stub)
- **Google Vision / Tesseract** — OCR on uploads
- **Elasticsearch** — full semantic search

---

## 4. Phase 2 Features — Complete List

### Area 1: AI Intelligence Stack

#### F1 — AI Matching Engine
**Status:** ❌ Not started
**Priority:** P0
**Revenue impact:** High (increases conversion = more deal fees)

How it works:
- Phase 1 uses fixed weights: Location 35%, Budget 25%, 
  Type 20%, Area 15%, Urgency 5%
- Phase 2 weights evolve per broker based on:
  - Which matches they clicked
  - Which matches converted to deals
  - Which deals closed successfully
- Model: collaborative filtering + gradient boosting
- Input features: location_match, budget_overlap, 
  type_match, area_ratio, urgency_delta, 
  broker_history, buyer_history
- Output: ranked match list with confidence score

What changes in code:
- New Python service: apps/ml/matching_service.py
- NestJS calls ML service via HTTP after rule-based pre-filter
- Match score now = rule_score * 0.4 + ml_score * 0.6
- Fallback: if ML service down → rule-based only

Completion: 0%
Estimated effort: 6-8 weeks

---

#### F2 — WhatsApp NLP Intent Classification
**Status:** ❌ Not started
**Priority:** P0
**Revenue impact:** High (unlocks WhatsApp as acquisition channel)

How it works:
- Phase 1 maps basic message types manually
- Phase 2: GPT-4o API classifies any free text into:
  BUY_INTENT / SELL_INTENT / RENT_INTENT / 
  INSTITUTIONAL_INQUIRY / PRICE_INQUIRY / SUPPORT
- Auto-extracts: property type, city, budget, 
  bedrooms, timeline from message text
- Creates structured CRM entry from WhatsApp message
- Routes to correct broker/pipeline

Example:
  Input: "looking for 3bhk in bandra west 2-3cr"
  Output: {
    intent: BUY_INTENT,
    type: RESIDENTIAL,
    bedrooms: 3,
    locality: "Bandra West",
    city: "Mumbai",
    budget_min: 20000000,
    budget_max: 30000000
  }

What changes in code:
- apps/api/src/whatsapp/whatsapp-nlp.service.ts (new)
- Calls OpenAI API with structured prompt
- Result piped to requirements.service.create()
- WhatsApp → requirement → auto-match in one flow

Completion: 0%
Estimated effort: 2-3 weeks

---

#### F3 — AI Fraud Detection (OCR + Behavioral)
**Status:** ❌ Not started
**Priority:** P1

How it works:
- Phase 1: regex blocking + velocity check
- Phase 2 adds:
  - OCR scan every uploaded image for:
    phone numbers, emails, watermarks,
    competing platform logos
  - Behavioral ML: posting pattern analysis,
    price outlier detection, account similarity
  - Auto-publish reviews passing AI filter

What changes in code:
- apps/api/src/fraud/ocr.service.ts (new)
- apps/api/src/fraud/behavioral-ml.service.ts (new)
- Google Vision API or Tesseract integration
- Review auto-publish with confidence threshold

Completion: 0%
Estimated effort: 4-5 weeks

---

#### F4 — Institutional AI Valuation
**Status:** ❌ Not started
**Priority:** P1

How it works:
- Input: enrollment, fee structure, EBITDA,
  campus sqft, board, city tier, established year
- Output: valuation range with confidence band
- Model: regression on comparable transactions
- EBITDA multiple approach for schools (3-6x typical)
- Enrollment trend analysis: 3-year data → growth rate
- Exit scoring: liquidity + demand + regulatory safety

What changes in code:
- apps/ml/valuation_service.py (new)
- apps/api/src/institutions/valuation.service.ts (new)
- New API: GET /institutions/:id/valuation
- UI: valuation card on institution detail page

Completion: 0%
Estimated effort: 6-8 weeks

---

#### F5 — Predictive Deal Scoring
**Status:** ❌ Not started
**Priority:** P2

How it works:
- ML model predicts probability deal closes
- Features: stage, days in stage, broker score,
  buyer engagement, property quality, price vs market
- Output: closure probability % per deal
- Alerts broker when deal at risk of dying

Completion: 0%
Estimated effort: 4-5 weeks

---

### Area 2: Financial Infrastructure

#### F6 — Real Stripe Billing
**Status:** ⚠️ Stub exists (Phase 1)
**Priority:** P0
**Revenue impact:** CRITICAL — enables subscription revenue

How it works:
- Replace POST /billing/checkout-session stub
- Full Stripe Checkout session creation
- Stripe webhook: payment.succeeded → 
  activate plan in DB → unlock features
- Subscription model: monthly + annual
- Plan enforcement: feature gates per plan tier
- Invoice generation and email delivery
- Dunning: retry failed payments, cancel on 3 fails

What changes in code:
- apps/api/src/billing/billing.service.ts (major update)
- apps/api/src/billing/billing-webhook.service.ts (new)
- Stripe SDK integration
- Plan feature gate middleware
- apps/web/src/app/(workspace)/billing/ (full rebuild)

Completion: 30% (stub exists, webhook stub exists)
Estimated effort: 2-3 weeks

---

#### F7 — Escrow Module
**Status:** ❌ Not started
**Priority:** P0
**Revenue impact:** CRITICAL — enables transaction fee revenue

How it works:
- Buyer pays token amount (1-2% of deal value)
- Platform holds in Razorpay escrow account
- State machine: HELD → RELEASED / REFUNDED / DISPUTED
- On deal closure: split payment:
  - Seller: deal value minus platform fee
  - Broker: commission amount
  - Platform: facilitation fee (0.25-0.5%)
- Dispute: funds frozen, admin resolves

New Prisma models needed:
  EscrowAccount { id, dealId, amount, status,
    heldAt, releasedAt, beneficiaryId }
  EscrowTransaction { id, escrowId, type,
    amount, razorpayId, createdAt }

What changes in code:
- apps/api/src/escrow/ (new module)
- Razorpay escrow API integration
- apps/api/prisma/schema.prisma (new models)
- apps/web/src/app/(workspace)/deals/[id]/page.tsx
  (add escrow section to deal detail)

Completion: 0%
Estimated effort: 4-6 weeks

---

#### F8 — Transaction Facilitation Fee
**Status:** ❌ Not started
**Priority:** P0

How it works:
- When deal reaches CLOSURE stage:
  - Platform auto-calculates fee: deal_value * 0.003
  - Invoice generated for broker/org
  - Collected via saved payment method
  - Split: 70% platform, 20% sales, 10% product

What changes in code:
- apps/api/src/deals/deals.service.ts
  (add fee calculation on advance to CLOSURE)
- apps/api/src/billing/fee.service.ts (new)

Completion: 0%
Estimated effort: 1-2 weeks

---

#### F9 — Razorpay Payment Gateway
**Status:** ❌ Not started
**Priority:** P1

How it works:
- UPI / NetBanking / card for Indian users
- NRI international card support
- Token booking payments
- Service fee collection
- Automatic receipt generation

Completion: 0%
Estimated effort: 2-3 weeks

---

### Area 3: Infrastructure & Scale

#### F10 — Microservices Decomposition
**Status:** ❌ Not started
**Priority:** P2 (Phase 1 monolith works to ~500 concurrent)

Services to extract:
  matching-service → Python, scales independently
  notification-service → handles 100k+ notifications
  institution-service → separate DB for confidentiality
  fraud-service → ML workloads separate
  analytics-service → read-heavy, cache-heavy
  billing-service → financial isolation
  chat-service → Socket.io, stateful

What changes in code:
- Each service: separate NestJS app or Python service
- API Gateway: route requests to correct service
- Inter-service: Kafka events (property.created →
  matching-service.runForProperty)
- Shared: JWT validation at gateway level

Completion: 0%
Estimated effort: 12-16 weeks

---

#### F11 — Portal Crawler / Ingestion Pipeline
**Status:** ❌ Not started
**Priority:** P1

How it works:
- Crawl: MagicBricks, 99acres, Housing.com
- Parser: extract title, price, city, type, images
- Dedup: hash-based deduplication
- Quality score: completeness + image quality + price
- Import: auto-create Property records
- Attribution: source = "MAGICBRICKS" etc.

What changes in code:
- apps/crawler/ (new service)
- Puppeteer/Playwright for JS-rendered pages
- apps/api/src/ingestion/ (new module)
- Cron: run daily at 2 AM IST
- Admin UI: crawler status + import queue

Completion: 0%
Estimated effort: 6-8 weeks

---

#### F12 — Full Elasticsearch
**Status:** ⚠️ Partial (ES upsert on status change exists)
**Priority:** P1

How it works:
- Phase 1: Prisma fallback for all search
- Phase 2: ES as primary, Prisma as emergency fallback
- Custom analyzer: Indian city names, property terms
- Relevance: BM25 + geo-distance + price boost + freshness
- Autocomplete: locality suggestions as user types
- Faceted search: filter counts without extra queries

What changes in code:
- apps/api/src/search/search.service.ts (major update)
- ES index mapping with custom analyzers
- Sync: full re-index nightly, incremental on change
- apps/web/src/app/(workspace)/search/ (autocomplete UI)

Completion: 20% (upsert exists, no full query routing)
Estimated effort: 4-5 weeks

---

#### F13 — External API Product
**Status:** ❌ Not started
**Priority:** P2

How it works:
- API key management for builder firms
- Rate limiting per key (per-call billing)
- Endpoints: search, match, post listing
- Developer docs: auto-generated from OpenAPI
- Usage metering: track calls per key per day
- Webhook support: push matches to builder CRM

Completion: 0%
Estimated effort: 4-5 weeks

---

### Area 4: Communication Layer

#### F14 — In-Platform Chat
**Status:** ❌ Not started
**Priority:** P1

How it works:
- Socket.io for real-time messaging
- Broker ↔ buyer ↔ seller within platform
- No phone number exchange (controlled contact)
- Messages stored in DB, linked to deal
- File sharing: documents in chat thread
- Read receipts
- Deal-thread: every deal has a chat thread
- Admin can view any thread (compliance)

New Prisma models:
  ChatThread { id, dealId, participants[] }
  ChatMessage { id, threadId, senderId,
    content, type, readAt, createdAt }

What changes in code:
- apps/api/src/chat/ (new module with Socket.io)
- apps/web/src/app/(workspace)/chat/ (new page)
- Sidebar: add Chat item for BROKER/BUYER/SELLER
- Deal detail: chat panel alongside timeline

Completion: 0%
Estimated effort: 5-7 weeks

---

#### F15 — Regional Languages
**Status:** ⚠️ Stub (en/hi middleware exists)
**Priority:** P2

How it works:
- Full translation: Hindi, Tamil, Telugu, Marathi
- i18next with translation JSON files
- Language selector in user profile
- RTL support for Urdu if needed
- WhatsApp messages in regional language

Completion: 5% (middleware only, no translations)
Estimated effort: 4-6 weeks (translation work heavy)

---

### Area 5: Advanced Intelligence

#### F16 — Advanced Reputation Graph
**Status:** ⚠️ Basic graph exists
**Priority:** P1

How it works:
- Network centrality: PageRank on broker graph
- Deal velocity: avg time per stage per broker
- Referral quality: how good are referred deals
- Co-broking success rate
- Behavioral trust signals: response time trends
- Comparative ranking within city/specialization

Completion: 20% (basic graph endpoint exists)
Estimated effort: 4-5 weeks

---

#### F17 — HNI Portfolio Intelligence
**Status:** ⚠️ Basic workspace exists
**Priority:** P1

How it works:
- IRR calculation per investment
- Exit modeling: 1yr / 3yr / 5yr projections
- Yield comparison across asset classes
- Market appreciation data integration
- Portfolio diversification score
- Liquidity analysis

Completion: 15% (basic workspace, no calculations)
Estimated effort: 4-5 weeks

---

#### F18 — Regulatory Compliance AI (Institutional)
**Status:** ❌ Not started
**Priority:** P1

How it works:
- UGC recognition check for colleges
- AICTE approval status for engineering colleges
- CBSE/ICSE affiliation validity for schools
- NCTE status for teacher training
- Auto-flag compliance risks on institution listing
- DB: regulatory status updated weekly via crawl

Completion: 0%
Estimated effort: 5-6 weeks

---

### Area 6: Vertical Deepening

#### F19 — Builder/Developer Portal
**Status:** ❌ Not started
**Priority:** P1

How it works:
- Project-level listings (not individual units)
- Phase-wise availability: Phase 1 / Phase 2 / Phase 3
- Unit mix: 2BHK / 3BHK counts per phase
- Booking management: unit reservation + payment
- Construction updates: % complete with photos
- RERA project ID mandatory

New role: BUILDER
New sidebar: Projects / Availability / Bookings / 
             Analytics / Compliance

Completion: 0%
Estimated effort: 8-10 weeks

---

#### F20 — IRM Premium
**Status:** ⚠️ Basic IRM exists
**Priority:** P2

How it works:
- Meeting scheduling with investors
- Deal memo generation (auto PDF)
- Portfolio reporting: monthly PDF to investor
- Pipeline sharing: broker shares deal pipeline
  with specific investor
- Engagement tracking: investor interest signals

Completion: 10% (basic preference form exists)
Estimated effort: 4-5 weeks

---

#### F21 — NRI Concierge Service
**Status:** ⚠️ Basic NRI workspace exists
**Priority:** P2

How it works:
- Dedicated manager portal (internal tool)
- Task management per NRI client
- SLA tracking: response within 24hrs
- Document coordination workflow
- Rental income tracking and transfer
- Property inspection with photo reports

Completion: 25% (workspace + service requests exist)
Estimated effort: 4-6 weeks

---

## 5. Phase 2 Revenue Model

| Stream | Source | When | Est. Revenue |
|--------|--------|------|-------------|
| Subscriptions | Broker Pro / NRI / HNI plans | Monthly | ₹2,000/broker/month |
| Transaction fee | 0.3% of deal value on closure | Per deal | ₹75,000 avg per deal |
| Escrow fee | 0.1% of held amount | Per token | ₹15,000 avg |
| API access | Per-call for builder firms | Usage | ₹5/call |
| Data room fee | Per institutional deal | Per deal | ₹25,000 per deal |

Break-even scenario:
  500 brokers × ₹2,000 = ₹10L/month subscription
  50 deals/month × ₹75,000 = ₹37.5L/month txn fee
  Total: ₹47.5L/month at 500 brokers + 50 deals

---

## 6. Phase 2 Timeline

### Month 1-2: Revenue foundation
- [ ] F6: Real Stripe billing
- [ ] F9: Razorpay payment gateway  
- [ ] F8: Transaction facilitation fee
- [ ] F2: WhatsApp NLP (GPT-4o)

### Month 2-3: Core intelligence
- [ ] F7: Escrow module
- [ ] F14: In-platform chat
- [ ] F1: AI matching engine (v1)
- [ ] F3: AI fraud detection OCR

### Month 3-4: Deepening
- [ ] F4: Institutional AI valuation
- [ ] F12: Full Elasticsearch
- [ ] F16: Advanced reputation graph
- [ ] F17: HNI portfolio intelligence

### Month 4-6: Scale
- [ ] F11: Portal crawler (MagicBricks + 99acres)
- [ ] F13: External API product
- [ ] F18: Regulatory compliance AI
- [ ] F19: Builder/developer portal

### Month 6-9: Infrastructure
- [ ] F10: Microservices decomposition
- [ ] F15: Regional languages (Hindi, Tamil)
- [ ] F20: IRM premium
- [ ] F21: NRI concierge
- [ ] F5: Predictive deal scoring

---

## 7. Phase 2 Completion Tracker

| Feature | Status | % Done | ETA |
|---------|--------|--------|-----|
| F1: AI Matching | ❌ Not started | 0% | Month 2-3 |
| F2: WhatsApp NLP | ❌ Not started | 0% | Month 1 |
| F3: AI Fraud OCR | ❌ Not started | 0% | Month 3 |
| F4: Institutional Valuation | ❌ Not started | 0% | Month 4 |
| F5: Predictive Deal Score | ❌ Not started | 0% | Month 7 |
| F6: Real Stripe Billing | ⚠️ Stub | 30% | Month 1 |
| F7: Escrow | ❌ Not started | 0% | Month 2 |
| F8: Transaction Fee | ❌ Not started | 0% | Month 2 |
| F9: Razorpay | ❌ Not started | 0% | Month 2 |
| F10: Microservices | ❌ Not started | 0% | Month 7 |
| F11: Crawler | ❌ Not started | 0% | Month 5 |
| F12: Full Elasticsearch | ⚠️ Partial | 20% | Month 4 |
| F13: External API | ❌ Not started | 0% | Month 6 |
| F14: In-platform Chat | ❌ Not started | 0% | Month 3 |
| F15: Regional Languages | ⚠️ Stub | 5% | Month 8 |
| F16: Reputation Graph | ⚠️ Basic | 20% | Month 4 |
| F17: HNI Portfolio | ⚠️ Basic | 15% | Month 4 |
| F18: Regulatory AI | ❌ Not started | 0% | Month 5 |
| F19: Builder Portal | ❌ Not started | 0% | Month 5 |
| F20: IRM Premium | ⚠️ Basic | 10% | Month 7 |
| F21: NRI Concierge | ⚠️ Basic | 25% | Month 7 |

**Overall Phase 2 completion: 6%**

---

## 8. Technical Decisions & Standards

### ML stack
- Language: Python 3.11+
- Framework: FastAPI (ML microservice)
- Libraries: scikit-learn, pandas, numpy
- Model storage: S3 + versioning
- Feature store: Redis for real-time features
- Training: weekly retrain on new deal data
- Serving: REST API called from NestJS

### Event bus
- Technology: RabbitMQ (simpler) or Kafka (scale)
- Decision: start with RabbitMQ, migrate to
  Kafka when >10k events/day
- Events:
    property.created → matching, fraud, search
    requirement.created → matching, notification
    deal.advanced → orchestration, compliance
    nda.approved → institution, notification
    payment.received → billing, escrow

### Chat infrastructure
- Socket.io with Redis adapter (multi-server)
- Message persistence: PostgreSQL
- Media: S3 with CDN
- Max message size: 10MB (files)
- Retention: 2 years

### Payment architecture
- Stripe: subscriptions (international cards, NRI)
- Razorpay: UPI + Indian cards + escrow
- Never store card data (PCI compliance)
- All payments go through payment providers

---

## 9. Phase 1 → Phase 2 Migration Rules

- Phase 1 monolith stays running during Phase 2
- Extract services one at a time (strangler fig)
- Each extracted service: must pass all existing
  integration tests before traffic switch
- DB: shared Postgres in Phase 2 start,
  separate DBs as services mature
- No feature flags needed for most changes
  (new endpoints, not replacing existing)
- WhatsApp NLP: adds to existing webhook,
  existing flow untouched

---

## 10. Success Metrics for Phase 2

| Metric | Target | Measurement |
|--------|--------|-------------|
| AI match acceptance rate | >60% | matches accepted / total |
| Deal closure rate lift | +25% vs Phase 1 | closed deals / total deals |
| Escrow transactions | 50/month by month 6 | DB count |
| Crawler listings ingested | 500/day | ingestion logs |
| Chat messages sent | 1000/day by month 4 | message count |
| API calls (external) | 10,000/month | API gateway logs |
| Revenue per broker | ₹5,000/month avg | billing data |
| Subscription churn | <5%/month | Stripe data |

---

*Last updated: [AUTO-UPDATE DATE ON EACH CHANGE]*
*Owner: AR Buildwel Engineering*
*Next review: Monthly*
