# Product Requirements Document (PRD)
## AR Buildwel — Real Estate Transaction Operating System
**Version:** 5.0 | **Status:** Final Consolidated | **Date:** 2026

---

## Implementation Status Note (Code-Aligned)

This PRD is the product target-state document. For execution clarity, every feature should be interpreted with this legend:
- `Implemented` - available in current codebase
- `Partial` - present with limited depth or placeholders
- `Planned` - not yet implemented

Primary implementation truth source:
- `doc/04_Implementation_Status_and_Execution_Plan.md`

Current high-level status (Phase 1 checklist closed 2026-04-24; see `doc/05_Phase_Checklist.md`):
- Core backend modules for auth, properties, requirements, matching, leads, deals, institutions, NDA, and basic analytics are `Implemented`.
- Fraud/compliance/reputation, WhatsApp, and search have additional Phase 1 depth slices (contact policy module, listing-velocity + review-graph endpoints, deal-stage compliance hooks + optional JSON rules, Cloud API outbound + optional digest mirror, ES upsert on listing status change, org CSV export UI); full case management, inbound WA intent mapping, relevance tuning, and billing remain `Partial`.
- AI intelligence stack, escrow, advanced ingestion automation, and full microservices split remain `Planned`.
- `apps/web` is now present and active with Phase 1 UI baselines (login, dashboard, CRM, properties, requirements, matches, deals, institutions, notifications, onboarding, export workspace, and SEO/i18n pages), while advanced intelligence and automation remain `Partial`/`Planned`.
- Status labels in this PRD are interpreted across both layers: API delivery depth and Web delivery depth.

---

## 1. Executive Summary

AR Buildwel is India's first end-to-end **Real Estate Transaction Operating System (RTOS)**. It is not a listing portal, CRM tool, or marketplace. It is full-stack infrastructure that digitizes how real estate transactions actually happen — from the first WhatsApp message to legal closure — across residential, commercial, distressed, bank auction, and institutional asset categories.

**Core Positioning:** *From Lead to Closure — Fully Systemized.*

---

## 2. Problem Statement

| Problem | Current Reality |
|---|---|
| Fragmented deal execution | Market runs on WhatsApp groups and offline brokers |
| No trust layer | Zero verification, fraud rampant, no reputation scoring |
| No deal infrastructure | Existing platforms are listing-focused only |
| No institutional marketplace | Zero structured platform for schools/colleges/universities in India |
| Low conversion | Unstructured leads, no pipeline, no matching intelligence |

---

## 3. Platform Objectives

To unify:
- **Supply** — properties + institutional assets
- **Demand** — buyer requirements
- **Intermediaries** — brokers + advisors
- **Transactions** — deal pipelines
- **Trust** — reputation + verification

Into one operating system covering every real estate asset class.

---

## 4. Target Users (Ecosystem Participants)

Every participant receives: Verified Identity, Activity History, Trust Score, and Deal Participation Record.

| User Type | Role |
|---|---|
| Brokers / Agents | Deal intermediaries, lead managers, co-broking partners |
| Buyers / Investors | Property seekers, requirement posters |
| Sellers / Owners | Listing publishers |
| Builders / Developers | Project listers, co-broking participants |
| NRI / OCI Holders | Remote property management — buy, sell, rent |
| HNI Investors | High-ticket deal participants, portfolio management |
| PG / Co-living Operators | Rental asset managers |
| Institutional Sellers | Schools, colleges, universities — sale, lease, JV, takeover |
| Institutional Buyers | Education groups, PE funds, family offices, trusts |
| Legal Professionals | Due diligence, title verification, drafting |
| Financial Partners | Banks, NBFCs, loan agents, insurance providers |

---

## 5. Core Platform Architecture — 7 Engines

### Engine 1: WhatsApp Integration Engine
**Role:** Primary adoption driver. Converts offline market into structured data.
**Execution status:** `Partial`

**Requirements:**
- Property and requirement posting via WhatsApp (text + images)
- Auto-parse WhatsApp messages into structured CRM fields
- Lead capture with automatic source tag 'WhatsApp'
- Intent detection: classify messages as buy / sell / rent / institutional
- Auto-generate shareable smart links per listing
- Institutional intake: school/college sale intent captured and routed
- All WhatsApp events trigger downstream CRM and notification actions
- Phase 2: Upgrade intent classification to AI-based NLP

---

### Engine 2: Multi-Tenant CRM Engine
**Role:** Central operating system for brokers, teams, and deal management.
**Execution status:** `Implemented` (Phase 1 baseline)

**Requirements:**
- Private CRM workspace per broker/organization (isolated via `organization_id`)
- Full deal pipeline: Lead → Requirement → Match → Site Visit → Negotiation → Legal → Loan → Insurance → Payment → Closure
- Auto-capture from WhatsApp, portals (MagicBricks, 99acres, Housing), social media
- Lead scoring: Hot / Warm / Cold based on activity and responsiveness
- Follow-ups, reminders, call logs, activity logs
- Team roles: Admin, Agent, Viewer
- Broker performance dashboard: closure rate, response time, conversion rate
- SLA tracking per pipeline stage with automated delay alerts
- Deal orchestration: stage completion auto-triggers next action
- Institutional CRM pipeline (9 stages): Intent → Buyer Qualification → NDA → Data Room → Site Visit → Valuation → Legal Due Diligence → Offer → Closure

---

### Engine 3: NRI + HNI Investment Engine
**Role:** Premium vertical for high-value investor segments.
**Execution status:** `Partial`

**NRI Module Requirements:**
- Dedicated NRI dashboard: owned properties, service requests, status tracking
- Buy / Sell / Rent workflows with assigned platform manager
- Property monitoring, rental management, document coordination
- FEMA/RBI basics, TDS implications, repatriation guidance (non-advisory)
- Full status tracking with timeline updates
- Support for NRI education trusts acquiring institutional assets

**HNI Module Requirements:**
- Curated investment deal access: distressed, bank auctions, institutional assets
- Portfolio dashboard: ROI, yield, liquidity scores per investment
- Investment intelligence: ROI estimation, rental yield, capital appreciation
- Deal advisory layer (non-legal)
- Institutional investor segmentation by asset class preference
- EBITDA yield analysis for school/college assets
- Phase 2: Full portfolio intelligence dashboard, advanced analytics

---

### Engine 4: Bank & Distressed Deal Engine
**Role:** Exclusive high-opportunity investment inventory.
**Execution status:** `Partial`

**Requirements:**
- Sources: SARFAESI bank auctions, NBFC repossessions, ARC assets, liquidation properties
- Data captured: auction price, EMD amount, auction date, possession status, legal status
- Auction alerts: personalized push notifications matched to investor profile
- Distressed deal tagging: Urgent Sale / Financial Distress / Investor Exit / Time-Bound Sale
- Investment score per deal (0–100)
- Liquidity/exit score: High / Medium / Low
- Risk indicators: Documentation pending / Possession unclear / Legal complexity / Tenant occupied
- **Brand Rule:** Never label deals as "Distressed" or "Disputed" — always present as "High-Opportunity Investment Deals" or "Special Situation Properties"
- Mandatory disclaimer on every such deal
- Access restricted to: verified brokers, NRI investors, HNI investors only
- Phase 2: AI deal scoring refinement via ML

---

### Engine 5: Deal, Trust & Intelligence Engine
**Role:** Core transaction conversion and trust infrastructure.
**Execution status:** `Implemented` (matching/deal core), `Partial` (trust/fraud/intelligence depth)

**5.1 Requirement Marketplace:**
- Buyer-first system: requirements posted and matched to listings
- Hot requirement tagging for urgent, high-intent buyers
- Reverse matching: brokers auto-notified when requirements match their listings
- Co-broking enablement for expanded deal reach

**5.2 Matching Engine (Non-Negotiable Core System):**

Phase 1 — Rule-Based:
- Match parameters (weighted): Location, Budget, Property Type, Deal Type, Area (sqft), Urgency
- Output: Match percentage score, ranked results, Hot Match tag
- Triggers: auto-run on every new listing and every new requirement
- Matches pushed to: CRM dashboard + WhatsApp notification + Daily Digest

Phase 2 — AI-Based:
- Learn from broker click patterns and conversion history
- Smart match scoring with ML-refined weights
- Recommended buyers surfaced to brokers
- Recommended properties surfaced to buyers

**5.3 Trust & Reputation System:**
- Multi-factor trust score: deal completion + response time + reviews + activity + verification + geo-validation
- Verified badges: Verified User, Top Broker, Highly Rated, Institutional Specialist
- Phase 1: Admin-moderated reviews (post verified interaction only)
- Phase 2: Auto-publish with AI fraud filter

**5.4 Fraud Detection:**
- Duplicate image and listing detection
- Geo-validation: lat/long mandatory; geo-mismatch triggers review flag
- Text blocking: regex auto-reject of mobile numbers, emails, URLs, contact phrases
- Image blocking Phase 1: restrict visiting card uploads
- Image blocking Phase 2: OCR scan of all uploaded images

**5.5 Due Diligence Engine:**
- Document checklist with automated missing-document detection
- Secure document repository with role-based access
- Dispute resolution: case creation and admin resolution dashboard
- Transaction Orchestration (Module 40): stage auto-trigger and SLA monitoring

---

### Engine 6: Network & Intelligence Engine
**Role:** Platform growth, scale, and AI intelligence layer.
**Execution status:** `Partial` (selected support modules), `Planned` (full intelligence stack)

**Requirements:**
- Broker network graph: co-broking relationships, referral patterns
- Commission split tracking
- SEO engine: CMS, city landing pages, institutional keyword pages
- PWA: installable, offline-capable, background sync, push notifications
- Gamification: points engine, tier badges (Bronze → Elite), weekly leaderboards
- Smart filters: property type, budget, area, furnishing, urgency, deal type, trust score
- Saved searches with instant match alerts
- Hindi + English UI from Day 1 (Phase 2: regional languages)

---

### Engine 7: Institutional Engine
**Role:** India's first structured platform for institutional education asset transactions.
**Execution status:** `Implemented` (baseline flow + NDA gate), `Partial` (advanced depth)

**Requirements:**
- Asset types: K-12 schools, private colleges, universities
- Transaction types: Sale, Lease, JV, Management Takeover
- All listings confidential by default (institution name masked)
- Full institutional data gated behind: Verified Buyer + NDA signed + Admin approval
- Institutional matching: institution type, board, campus size, budget, acquisition intent
- Institutional CRM: all 9 pipeline stages
- NDA-gated data room (Module 39): version-controlled, access-logged
- Institutional broker certification badge
- Phase 2: AI valuation (EBITDA model, enrollment trends, exit scoring)
- Phase 2: Regulatory compliance AI (UGC, AICTE, CBSE flagging)

---

## 6. Non-Functional Requirements

### 6.1 Controlled Contact Architecture (Mandatory — System Level)
- Contact details NEVER shown publicly under any circumstance
- Only platform representative name and number shown
- Enforced at: Database, API, Frontend, Validation, and Institutional layers
- Regex-based auto-rejection of contact data in all text fields
- Configurable toggle for future model (stored as config flag, not structural change)

### 6.2 Data Privacy & Security
- DPDP Act (India) 2023 compliance from Phase 1
- Zero public display of contact details across all user types
- Institutional data shared only post-NDA execution
- All contact fields stored in separate secure tables, never joined in public queries
- Encrypted S3 URLs for all documents

### 6.3 Architecture Rules (Non-Negotiable)
- Monolith in Phase 1 — microservices-ready by design
- All 44 modules must be built — none can be removed
- Strict adherence to deal flow logic and pipeline stages
- NDA + data security are mandatory for institutional layer

### 6.4 Performance
- Mobile-first design, optimized for 3G/4G
- PWA with offline capability and background sync
- Redis caching for hot data, notification queues, match results
- Elasticsearch for full-text search and matching queries

---

## 7. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (SSR, SEO, PWA) |
| Backend | Node.js + NestJS (modular, microservices-ready) |
| Database | PostgreSQL (multi-tenant via `organization_id`) |
| Cache | Redis |
| Search | Elasticsearch |
| Media | Cloudinary / AWS S3 |
| Payments | Razorpay / Stripe |
| Messaging | WhatsApp Business API |

---

## 8. Monetization Model

| Revenue Stream | Phase |
|---|---|
| CRM Subscriptions (monthly/annual SaaS) | Phase 1 |
| NRI Service Plans (membership + per-service) | Phase 1 |
| Advertising (banners, featured listings) | Phase 1 |
| Legal / Loan / Insurance Referral Commissions | Phase 1 |
| Institutional Listing Fee | Phase 1 |
| HNI Investment Access Subscription | Phase 1 |
| Institutional Transaction Fee | Phase 1 |
| Data Room Fee per active institutional deal | Phase 1 |
| Token/Booking Payment Gateway | Phase 2 |
| Transaction Facilitation Fee (on closed deals) | Phase 2 |
| API Access Fee (for builders/firms) | Phase 2 |
| IRM Premium | Phase 2 |

---

## 9. Compliance & Disclaimers

AR Buildwel is an **information and facilitation platform only** — not a real estate agent, financial advisor, legal advisor, education regulator, or SEBI-registered entity.

Mandatory disclaimers apply to: property listings, auction data, AI outputs, distressed deals, institutional deals, and investment guidance.

---

## 10. Success Metrics

| Metric | Description |
|---|---|
| WhatsApp → Platform Conversion | Daily active flow from WhatsApp to platform |
| CRM Daily Usage | Brokers managing leads daily |
| Deal Closures | End-to-end tracked completions |
| Trust Badge Adoption | Majority of active brokers verified |
| Institutional Listings Live | Active school/college/university listings |
| SEO Organic Traffic | City and institutional keyword pages |
| Mobile/PWA Usage | Majority accessing via mobile |
| Phase 2 AI Activation | Matching, fraud detection, valuation live |
