# Technical Architecture Specification
## AR Buildwel — Real Estate Transaction Operating System
**Version:** 1.0 | **Document Type:** System Architecture | **Phase:** 1 + 2

---

## Implementation Status Note (Code-Aligned)

This architecture document describes target architecture. Current repository reality is:
- `Implemented`: Modular monolith backend (`NestJS`), Prisma data model, **Phase 1 module surface complete** per `doc/05_Phase_Checklist.md` (2026-04-24).
- `Partial`: Phase 2 intelligence/scale items (AI, escrow, ingestion, advanced notification/reputation) and incremental hardening of Phase 1 features as listed under Phase 2 in the checklist.
- `Planned`: Full microservices split, complete AI layer, full ingestion automation, escrow-grade financial workflows.

Implementation reference:
- `doc/04_Implementation_Status_and_Execution_Plan.md`

---

## 1. Architecture Overview

AR Buildwel is built as a **modular monolith in Phase 1**, designed for seamless migration to a **microservices architecture in Phase 2**. All 44 modules are developed as isolated, independently testable units that share a common data layer and event bus — enabling Phase 2 decomposition without structural rewrites.

**Current execution status:** `Modular monolith implemented`; microservices decomposition remains `Planned`.

```
┌──────────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                               │
│   Next.js Web App   │   PWA (Mobile)   │   WhatsApp Bot          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                        API GATEWAY                               │
│   Auth Middleware │ Rate Limiting │ Role-Based Access Control     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                    APPLICATION LAYER (NestJS)                    │
│  CRM │ Matching │ Listings │ Institutional │ Trust │ Notifications│
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                       DATA LAYER                                 │
│  PostgreSQL │ Redis Cache │ Elasticsearch │ S3 / Cloudinary       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 14+ | SSR for SEO, static generation for city pages, built-in PWA support |
| Backend | Node.js + NestJS | Modular architecture, dependency injection, microservices-ready |
| Primary DB | PostgreSQL | Relational integrity, multi-tenant via `organization_id`, ACID compliance |
| Cache | Redis | Session management, hot data caching, match result caching, notification queues |
| Search | Elasticsearch | Full-text search, geospatial queries, matching engine queries |
| Media Storage | AWS S3 / Cloudinary | Image compression, CDN delivery, encrypted document storage |
| Payments | Razorpay / Stripe | Webhook support, INR + international currency, escrow-ready |
| Messaging | WhatsApp Business API | Primary intake and notification channel |
| Auth | JWT + OTP (Firebase/Twilio) | Stateless auth, mobile-first verification |
| Email | SendGrid / AWS SES | Transactional emails, document delivery |
| Hosting | AWS / GCP | Auto-scaling, availability zones for India |

---

### 2.1 Stack Reality Check (Current Codebase)

- Backend framework: `Implemented` (NestJS modules under `apps/api/src`).
- Primary database modeling: `Implemented` (Prisma schema under `apps/api/prisma/schema.prisma`).
- Redis use: `Partial` (present, not full intended queue/cache depth across all modules).
- Elasticsearch-first search: `Partial/Planned` (fallback/search simplification currently used).
- Full payments/escrow layer: `Partial/Planned` (escrow remains Phase 2).
- Frontend app architecture in this repository: `Implemented` baseline (`apps/web` Next.js app with workspace routes, auth context, SEO/i18n pages), with some pages still `Partial`/placeholder for advanced Phase 2 behaviors.

---

## 3. Database Schema (Core Tables)

### 3.1 Users
```sql
users (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  phone           TEXT ENCRYPTED NOT NULL,  -- never exposed in public API
  email           TEXT ENCRYPTED,
  role            ENUM('broker','buyer','seller','nri','hni','institutional_seller',
                       'institutional_buyer','legal','financial','admin'),
  organization_id UUID REFERENCES organizations(id),  -- multi-tenant isolation
  rera_id         TEXT,
  gst_number      TEXT,
  area_of_operation TEXT[],  -- mandatory for brokers
  trust_score     NUMERIC(5,2) DEFAULT 0,
  verified        BOOLEAN DEFAULT FALSE,
  kyc_status      ENUM('pending','verified','rejected'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
)
```

### 3.2 Organizations (Multi-Tenant)
```sql
organizations (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  org_type        ENUM('individual_broker','brokerage_firm','developer','institutional'),
  subscription_plan TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)
```

### 3.3 Properties
```sql
properties (
  id              UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  posted_by       UUID REFERENCES users(id),
  type            ENUM('residential','commercial','plot','distressed','bank_auction'),
  deal_type       ENUM('sale','rent','lease'),
  area_locality   TEXT NOT NULL,         -- public
  full_address    TEXT ENCRYPTED,        -- private, never shown publicly
  lat             DECIMAL(10,8),         -- mandatory for geo-validation
  lng             DECIMAL(11,8),         -- mandatory for geo-validation
  price           NUMERIC(15,2),
  area_sqft       NUMERIC(10,2),
  trust_score     NUMERIC(5,2),
  is_distressed   BOOLEAN DEFAULT FALSE,
  is_bank_auction BOOLEAN DEFAULT FALSE,
  investment_score NUMERIC(5,2),         -- 0–100
  verification_status ENUM('unverified','pending','verified'),
  timestamp       TIMESTAMPTZ DEFAULT NOW(),  -- used for dispute priority
  created_at      TIMESTAMPTZ DEFAULT NOW()
)
```

### 3.4 Requirements (Buyer Needs)
```sql
requirements (
  id              UUID PRIMARY KEY,
  posted_by       UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  type            ENUM('residential','commercial','plot','institutional'),
  deal_type       ENUM('sale','rent','lease'),
  area_locality   TEXT[],
  budget_min      NUMERIC(15,2),
  budget_max      NUMERIC(15,2),
  area_sqft_min   NUMERIC(10,2),
  area_sqft_max   NUMERIC(10,2),
  urgency         ENUM('high','medium','low'),
  is_hot          BOOLEAN DEFAULT FALSE,
  status          ENUM('active','matched','closed'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
)
```

### 3.5 Matches
```sql
matches (
  id              UUID PRIMARY KEY,
  property_id     UUID REFERENCES properties(id),
  requirement_id  UUID REFERENCES requirements(id),
  match_score     NUMERIC(5,2),          -- 0–100 weighted score
  is_hot_match    BOOLEAN DEFAULT FALSE,
  notified_at     TIMESTAMPTZ,
  broker_action   ENUM('pending','accepted','rejected','converted'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
)
```

### 3.6 Institutions
```sql
institutions (
  id                UUID PRIMARY KEY,
  posted_by         UUID REFERENCES users(id),
  institution_type  ENUM('k12_school','college','university','other'),
  board_affiliation TEXT,
  campus_size_sqft  NUMERIC(12,2),
  student_count     INTEGER,
  transaction_type  ENUM('sale','lease','jv','management_takeover'),
  asking_price      NUMERIC(15,2),
  ebitda_multiple   NUMERIC(5,2),
  revenue_annual    NUMERIC(15,2),
  lat               DECIMAL(10,8) NOT NULL,
  lng               DECIMAL(11,8) NOT NULL,
  confidential_flag BOOLEAN DEFAULT TRUE,
  nda_required      BOOLEAN DEFAULT TRUE,
  deal_score        NUMERIC(5,2),        -- Phase 2 AI scoring
  verification_status ENUM('unverified','pending','verified'),
  timestamp         TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

### 3.7 NDAs
```sql
ndas (
  id             UUID PRIMARY KEY,
  user_id        UUID REFERENCES users(id),
  institution_id UUID REFERENCES institutions(id),
  status         ENUM('pending','signed','revoked'),
  signed_at      TIMESTAMPTZ,
  ip_address     INET,                   -- legal record
  admin_approved BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
)
```

### 3.8 CRM Leads
```sql
crm_leads (
  id                   UUID PRIMARY KEY,
  organization_id      UUID REFERENCES organizations(id),  -- multi-tenant isolation
  user_id              UUID REFERENCES users(id),          -- owning broker
  lead_name            TEXT NOT NULL,
  phone                TEXT ENCRYPTED,                      -- never in public API
  source               ENUM('whatsapp','platform','portal','social','manual'),
  status               ENUM('hot','warm','cold','converted','lost'),
  linked_property_id   UUID REFERENCES properties(id),
  linked_institution_id UUID REFERENCES institutions(id),
  linked_requirement_id UUID REFERENCES requirements(id),
  pipeline_stage       TEXT,
  lead_score           NUMERIC(5,2),
  created_at           TIMESTAMPTZ DEFAULT NOW()
)
```

### 3.9 Deals
```sql
deals (
  id                UUID PRIMARY KEY,
  property_id       UUID REFERENCES properties(id),
  institution_id    UUID REFERENCES institutions(id),
  requirement_id    UUID REFERENCES requirements(id),
  stage             TEXT NOT NULL,
  value             NUMERIC(15,2),
  sla_breach_count  INTEGER DEFAULT 0,
  deal_health_score NUMERIC(5,2),
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

### 3.10 Documents
```sql
documents (
  id             UUID PRIMARY KEY,
  deal_id        UUID REFERENCES deals(id),
  institution_id UUID REFERENCES institutions(id),
  type           ENUM('sale_deed','agreement','id_proof','tax_doc','noc',
                      'affiliation_cert','other'),
  url            TEXT ENCRYPTED,    -- encrypted S3 URL, never public
  uploaded_by    UUID REFERENCES users(id),
  version        INTEGER DEFAULT 1,
  access_level   ENUM('all_nda_signatories','admin_only','buyer_only'),
  download_allowed BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
)
```

### 3.11 Activity Logs (Immutable)
```sql
activity_logs (
  id          UUID PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  action      TEXT NOT NULL,           -- standardized action code
  entity_type ENUM('property','requirement','deal','institution','document'),
  entity_id   UUID NOT NULL,
  timestamp   TIMESTAMPTZ DEFAULT NOW(),  -- immutable
  ip_address  INET
)
-- NOTE: No UPDATE or DELETE permitted on this table
```

---

## 4. Key Relationships

```
users          1 ──── M  properties
users          1 ──── M  requirements
users          1 ──── M  crm_leads
organizations  1 ──── M  users          (multi-tenant isolation)
properties     M ──── M  requirements   (via matches table)
deals          M ──── 1  properties / institutions
deals          M ──── M  documents
users          M ──── M  institutions   (via ndas table)
```

---

## 5. API Architecture

### 5.1 API Design Principles
- RESTful controller routes currently use direct prefixes (for example: `/auth`, `/properties`, `/requirements`, `/deals`) instead of a universal `/api/v1` namespace.
- JWT authentication on all protected routes
- Role-based access control (RBAC) enforced at middleware level
- Contact data never returned in any public endpoint
- NDA status checked before any institutional data query

### 5.2 Core API Endpoints

#### Authentication
```
POST   /auth/login                    Send OTP to phone
POST   /auth/verify-otp               Verify OTP, return JWT
```

#### Listings
```
POST   /properties                    Create listing
GET    /properties                    List public listings
GET    /properties/mine               List my listings
GET    /properties/:id                Get listing detail (no contact data)
POST   /properties/upload-url         Generate media upload URL
```

#### Requirements
```
POST   /requirements                  Post buyer requirement
GET    /requirements                  List public requirements
GET    /requirements/mine             List my requirements
```

#### Matching
```
GET    /matching/property/:id         Get matches for a property
GET    /matching/requirement/:id      Get matches for a requirement
GET    /matching/me                   Get user-relevant matches
POST   /matching/run/property/:id     Manually trigger match run (property)
POST   /matching/run/requirement/:id  Manually trigger match run (requirement)
```

#### CRM
```
POST   /leads                         Create lead
GET    /leads                         Get org leads (filtered by organizationId)
PUT    /leads/:id                     Update lead
POST   /leads/:id/notes               Add lead note
POST   /leads/:id/followup            Schedule follow-up
```

#### Institutional
```
GET    /institutions                  Search (masked, no confidential data)
GET    /institutions/:id              Detail (NDA check enforced server-side)
POST   /nda/sign                      Sign NDA for institution
GET    /nda/status                    Check NDA status
```

#### Trust
```
GET    /user/:id/trust-score          Get trust score
POST   /reviews                       Submit review (post verified interaction)
```

#### Notifications
```
GET    /notifications                 Get user notifications
PUT    /notifications/:id/read        Mark as read
```

### 5.3 Security Rules for All API Endpoints

| Rule | Enforcement Point |
|---|---|
| No contact data in response | API serializer layer — strip before response |
| Institutional data behind NDA | Middleware: check `ndas.status = 'signed' AND admin_approved = true` |
| CRM data isolated by org | All CRM queries MUST include `WHERE organization_id = :orgId` |
| Role-based route access | NestJS Guards on every controller |
| Input validation for contact bypass | Regex validation before every database write |

---

## 6. Controlled Contact Architecture (Mandatory System Rule)

This is enforced at **4 independent layers** — failure of any one layer must not expose data:

### Layer 1: Database
```sql
-- Contact fields stored in isolated, never-joined tables
-- Phone, email, address NEVER appear in property/listing SELECT queries
SELECT p.id, p.area_locality, p.price, p.area_sqft, p.trust_score
FROM properties p
-- ❌ Never: JOIN users u ON p.posted_by = u.id (would expose phone/email)
```

### Layer 2: API
```typescript
// NestJS serializer strips contact fields before every response
@Exclude()
phone: string;

@Exclude()
email: string;

@Exclude()
full_address: string;
```

### Layer 3: Input Validation (Before DB Write)
```typescript
const CONTACT_PATTERNS = [
  /(\+91|0)?[6-9]\d{9}/g,          // Indian mobile numbers
  /[\w.-]+@[\w.-]+\.[a-z]{2,}/gi,  // Email addresses
  /(https?:\/\/)[^\s]+/gi,          // URLs
  /(call|contact|whatsapp|reach)\s*(me|at|on)/gi  // Contact phrases
];

function validateNoContactData(text: string): boolean {
  return !CONTACT_PATTERNS.some(pattern => pattern.test(text));
}
```

### Layer 4: Frontend
```typescript
// Contact fields never rendered in any listing component
// Even if API accidentally returns them, frontend template ignores them
```

---

## 7. Matching Engine — Technical Design

### Phase 1: Rule-Based Matching

```typescript
interface MatchScore {
  propertyId: string;
  requirementId: string;
  totalScore: number;    // 0–100
  breakdown: {
    locationScore: number;     // weight: 35%
    budgetScore: number;       // weight: 25%
    typeScore: number;         // weight: 20%
    areaScore: number;         // weight: 10%
    urgencyBonus: number;      // weight: 10%
  };
  isHotMatch: boolean;  // totalScore >= 80
}

// Trigger: runs on every new property or requirement creation
async function runMatchingEngine(entityType: 'property' | 'requirement', entityId: string) {
  // 1. Fetch entity details
  // 2. Query all active counterparts from Elasticsearch
  // 3. Score each pair using weighted rules
  // 4. Store scores in matches table
  // 5. Push top matches to CRM + WhatsApp notification queue
}
```

### Phase 2: AI-Based Matching
- Train on historical match → broker_action → deal_outcome data
- Feature vector: location match score, budget overlap %, property type match, area match, broker activity in area, historical conversion rate for similar matches
- Model: XGBoost or LightGBM for ranking
- Retrain weekly on new conversion data
- A/B test AI scores against rule-based scores for 4 weeks before full rollout

---

## 8. WhatsApp Integration Architecture

```
WhatsApp Message
       │
       ▼
WhatsApp Business API Webhook
       │
       ▼
Intent Classifier
  ├── PROPERTY_POST   → Parse fields → Create listing draft → Notify broker to confirm
  ├── REQUIREMENT     → Parse fields → Create CRM lead → Assign to broker
  ├── INSTITUTIONAL   → Route to Institutional Engine intake queue
  ├── ENQUIRY         → Route to matching engine → Return top 3 matches
  └── UNCLASSIFIED    → Fallback response with menu
       │
       ▼
CRM Auto-Entry (source_tag: 'whatsapp')
       │
       ▼
Notification Trigger → downstream events
```

---

## 9. Notification System Architecture

```
Event Sources → Redis Queue → Notification Engine → Delivery Channels
   │                              │
   ├── New match found            ├── WhatsApp (Phase 1 primary)
   ├── Deal stage changed         ├── In-app push notification
   ├── SLA breach alert           ├── Email (secondary)
   ├── New auction listing        └── In-platform chat (Phase 2)
   ├── Requirement hot-tagged
   └── Institutional NDA approved
```

**Notification Intelligence (Module 43):**
- Per-user frequency cap to prevent notification fatigue
- Relevance scoring: only deliver if score > threshold
- Priority override for high-ROI events (auction alerts, hot matches)
- Daily digest: batch non-urgent notifications into single daily WhatsApp message

---

## 10. Multi-Tenant Isolation

Every table that stores organizational data includes `organization_id`:

```typescript
// All CRM queries MUST enforce this at service layer
async getLeads(orgId: string, userId: string) {
  return this.db.query(
    'SELECT * FROM crm_leads WHERE organization_id = $1 AND user_id = $2',
    [orgId, userId]
  );
}

// NestJS guard enforces org isolation
@UseGuards(OrgIsolationGuard)
@Get('crm/leads')
getLeads(@OrgId() orgId: string) { ... }
```

---

## 11. Institutional Confidentiality Gate — Technical Flow

```
Request: GET /api/v1/institutions/:id

1. Extract JWT → get user_id
2. Check users.role = 'institutional_buyer' OR admin
3. Check ndas WHERE user_id = ? AND institution_id = ? AND status = 'signed' AND admin_approved = true
4. IF NDA not found or not approved → return masked record (name hidden, details hidden)
5. IF NDA valid → return full record including data room documents
6. Log every access to activity_logs (immutable)
```

---

## 12. Phase 2 AI Services Architecture

Each AI service runs as an independent microservice:

| Service | Model Type | Input | Output |
|---|---|---|---|
| Matching Engine AI | LightGBM ranking | Property + Requirement features | Match score 0–100 |
| Fraud Detection | Anomaly detection + OCR | Listing text, images, patterns | Fraud risk flag |
| Trust Scoring | Weighted ML | Activity, deals, reviews, geo | Trust score 0–100 |
| Deal Prediction | Classification | Pipeline stage, activity, timing | Closure probability % |
| Lead Scoring | Logistic regression | Behavior signals | Hot/Warm/Cold |
| Market Intelligence | Time-series forecasting | Historical price data | Price trend, growth score |
| Institutional Valuation | Regression | EBITDA, enrollment, location | Valuation range |
| Buyer Intent Scoring | Behavioral ML | Browse patterns, engagement | Intent score, 30-day prediction |

---

## 13. Infrastructure & Deployment

### Phase 1: Monolith Deployment
```
AWS / GCP
├── Application Server: ECS or EC2 (NestJS monolith)
├── Database: RDS PostgreSQL (Multi-AZ for HA)
├── Cache: ElastiCache Redis
├── Search: Elasticsearch (managed AWS OpenSearch)
├── Storage: S3 (encrypted at rest)
├── CDN: CloudFront for media delivery
├── Messaging: WhatsApp Business API via approved BSP
└── CI/CD: GitHub Actions → staging → production
```

### Phase 2: Microservices Migration
```
Kubernetes (EKS / GKE)
├── crm-service
├── matching-service
├── notification-service
├── institutional-service
├── trust-service
├── ai-scoring-service
├── auction-ingestion-service
└── api-gateway (Kong / AWS API Gateway)

Inter-service communication: Event-driven via Apache Kafka
```

---

## 14. Security Architecture

| Concern | Measure |
|---|---|
| Authentication | JWT + OTP; tokens expire in 24h; refresh token in httpOnly cookie |
| Data encryption | All PII encrypted at rest (AES-256); S3 encrypted; DB column-level encryption for phone/email |
| API security | Rate limiting per user and per IP; CORS whitelist; Helmet.js headers |
| Contact bypass prevention | Regex validation at input; serializer stripping at output; DB isolation |
| DPDP Act 2023 | Consent management; data minimization; right to export (Module 33); audit logs |
| Institutional data | NDA + admin approval required; all access logged immutably |
| Document security | Encrypted S3 URLs with expiring signed URLs (15-minute TTL) |
| Fraud prevention | Geo-validation; duplicate detection; suspicious pattern flagging |

---

## 15. SEO & Performance Architecture

| Concern | Approach |
|---|---|
| City landing pages | Next.js Static Site Generation (SSG) — generated at build time |
| Dynamic listing pages | Next.js SSR with ISR (revalidate every 60 seconds) |
| Image optimization | Next.js Image component + Cloudinary auto-compression |
| Core Web Vitals | Target LCP < 2.5s, FID < 100ms, CLS < 0.1 |
| PWA | next-pwa with workbox; service worker for offline caching |
| Search indexing | Elasticsearch with custom analyzers for Indian locality names |
| Schema markup | JSON-LD for RealEstateListing, Organization, FAQPage |

---

## 16. Build Rules Checklist (Non-Negotiable)

- [ ] All 44 modules included — none removed
- [ ] `organization_id` on every tenant table — multi-tenant isolation enforced
- [ ] Contact fields NEVER in any public API response
- [ ] NDA check enforced server-side before institutional data access
- [ ] Regex contact validation runs before every database write
- [ ] Activity logs table is append-only — no UPDATE or DELETE permitted
- [ ] `lat/lng` mandatory on all property and institution listings
- [ ] DPDP Act 2023 compliance baseline in place from Phase 1
- [ ] Monolith structured as modules to enable Phase 2 microservices decomposition
- [ ] All deal flow pipeline stages strictly followed in sequence
