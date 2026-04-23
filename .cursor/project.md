
AR BUILDWEL
Real Estate Transaction Operating System
FINAL CONSOLIDATED PLATFORM VISION

ABOUT THIS DOCUMENT
This is the Final Consolidated Platform Vision for AR Buildwel an end-to-end Real Estate Transaction Operating System.
It supersedes all earlier versions and integrates every module, engine, architectural decision, product requirement, database design, and API structure into one unified reference document.

Version History:
V1-V3: Initial vision, core modules, early architecture
V4: Comprehensive consolidation added 37 modules, 2-phase plan, Institutional Engine
V5 (This Document): Full upgrade 44 modules, Matching Engine expanded, PRD + DB + API architecture added, 7 new engines embedded

Build Rules (Non-Negotiable):
Modular architecture: Monolith Phase 1, Microservices-ready Phase 2
No module removal - all 44 modules are part of the platform
Phase-based build: Phase 1= Foundation & Core, Phase 2= Intelligence & Scale
Strict adherence to deal flow logic and pipeline stages
NDA + data security are critical for the institutional layer - not optional
Contact control architecture is a system-level requirement, not a Ul feature

1. PLATFORM IDENTITY & POSITIONING
India's First End-to-End Real Estate Transaction Operating System.
AR Buildwel is not a listing portal. It is not a CRM tool. It is not a marketplace.
It is a Real Estate Transaction Operating System -full-stack infrastructure that digitizes how real estate transactions actually happen, from the first WhatsApp message to legal closure, across residential, commercial, distressed, bank auction, and institutional asset categories.

What this platform combines:
Deal Execution structured pipeline from lead to legal closure
Trust Infrastructure - verified identities, scored reputations, dispute resolution 
Financial Integration - loan, insurance, payment gateway, escrow layer 
Institutional Asset Marketplace - K-12 schools, colleges, universities 
Al Intelligence - matching, scoring, prediction, valuation 
Network Effects - broker graph, co-broking, referral ecosystem

Core positioning statement: From Lead to Closure Fully Systemized.

--- PAGE 2 ---

1.1 Core Philosophy - 4 Layers
WhatsApp - Entry Layer: Adoption Driver. Zero-learning-curve onboarding. Converts offline market into structured data.
Platform Execution Layer: Operational Control. Deal execution infrastructure. All workflows managed on platform.
Notifications Engagement Layer: Retention Engine. Daily market intelligence. Users return every day.
Trust + Data - Defensibility Layer: Competitive Moat. Network effects plus verified data. Impossible to replicate quickly.

1.2 Industry Gaps This Platform Solves
Current market runs on WhatsApp groups, offline brokers, fragmented data, and zero trust layer
Existing platforms are listing-focused only no deal execution, no CRM, no intelligence, no trust scoring
Result: Inefficient, unstructured, low-trust, low-conversion real estate market 
New gap identified: Zero institutional deal infrastructure exists for schools, colleges, and universities in India a multi-thousand-crore market with no organized platform

1.3 Platform Objective
To unify Supply (properties + institutional assets), Demand (buyer requirements), Intermediaries (brokers + advisors), Transactions (deals), and Trust (reputation + verification) into one operating system covering every real estate asset class - residential, commercial, distressed, bank auction, and institutional.

1.4 Final Positioning

Deal Engine - structured pipeline, deal execution, CRM
Trust Engine - verified identities, reputation scoring, fraud detection
What A R Buildwel Is
Network Engine - broker graph, co-broking, referral ecosystem 
Investment Engine - NRI, HNI, distressed deals, bank auctions 
Financial Engine - loan, insurance, payment, escrow integration 
Intelligence Engine - Al matching, market trends, deal prediction
Institutional Engine - schools, colleges, universities (first in India)

2. ECOSYSTEM PARTICIPANTS
Every participant on the platform receives: Verified Identity, Activity History, Trust Score, Deal Participation Record.

Brokers / Agents: Deal intermediaries, lead managers, co-broking partners
Buyers / Investors: Property seekers, requirement posters

--- PAGE 3 ---

Sellers / Owners: Listing publishers
Builders / Developers: Project listers, co-broking participants, API integration candidates
NRI / OCI Holders: Remote property management - buy, sell, rent
HNI Investors: High-ticket deal participants, portfolio management
PG/ Co-living Operators: Rental asset managers
Institutional Sellers: Schools (K-12 and above), private colleges, universities sale, lease, JV, management takeover
Institutional Buyers: Education groups, PE funds, family offices, trusts, individual promoters 
Legal Professionals: Due diligence, title verification, agreement drafting
Financial Partners: Banks, NBFCs, loan agents, insurance providers

3. PLATFORM ARCHITECTURE - 7 CORE ENGINES + 7 EXTENDED MODULES
The platform is built on 7 interconnected Core Engines plus 7 Extended Modules (Modules 38-44).
Each engine has a distinct role, revenue stream, and strategic value. Engines share data, trust scores, and deal pipelines seamlessly.
No engine operates in isolation.

ENGINE 1: WHATSAPP INTEGRATION ENGINE - Entry Layer
Role: Primary Adoption Driver. Converts offline market into structured platform data.

Property posting via WhatsApp (text + images) - auto-parsed into structured listing fields
Requirement posting via WhatsApp - auto-entered into CRM as a tagged lead 
Lead capture organization CRM updated automatically with source tag 'WhatsApp'
Chat parsing structured data conversion with automatic field extraction 
Auto-replies and intent detection: classifies messages as buy / sell / rent / institutional interest
Intent classification upgrades to Al-based in Phase 2 
Shareable smart links: each listing auto-generates a WhatsApp-shareable link
Institutional intake: school or college sale intent captured via WhatsApp and auto-routed to Institutional Engine
Notification trigger integration: all WhatsApp events trigger downstream CRM and notification actions

Strategic Value: Solves adoption problem. Converts unstructured market into structured data. Creates distribution moat. Zero-learning-curve onboarding. Works as the shadow interface of the platform.

ENGINE 2: MULTI-TENANT CRM ENGINE
Execution Core
Role: Central Operating System for brokers, teams, and deal management.
Every broker or company gets a private CRM workspace (multi-tenant via organization_id). Data is fully isolated per organization.

Lead management: auto-capture from WhatsApp + manual entry + from Reoperty Portals like grames, Magic Bricks, Honory etc. and Social Media & Digital marketing leads (auto - capture)

--- PAGE 4 ---

Full deal pipeline: Lead → Requirement→ Match → Site Visit → Negotiation → Legal→ Loan Insurance Payment Closure
Follow-ups, reminders, call logs, activity logs
Team roles and permissions: Admin, Agent, Viewer
Lead scoring: Hot / Warm / Cold - based on activity, responsiveness, and match quality 
Broker performance dashboard: closure rate, response time, lead conversion rate, activity score
Conversion tracking and EMD tracking for auction deals
Investor mapping: track investor profiles against available deals
SLA tracking per pipeline stage: each stage has a defined expected time window; delays trigger alerts
Deal orchestration triggers: stage completion auto-triggers next action (linked to Transaction Orchestration Engine, Module 40)
Institutional CRM pipeline track: Intent → Buyer Qualification → NDA Executed → Data Room Access → Site Visit Valuation → Legal Due Diligence → Offer and Negotiation → Closure

Strategic Value: Locks users into platform. Enables deal execution, not just discovery. Drives recurring subscription revenue. Creates daily usage habit.

ENGINE 3: NRI + HNI INVESTMENT ENGINE Premium Vertical

A. NRI Module
Core Service Engine
Dedicated NRI dashboard: owned properties, service requests, status tracking 
Buy / Sell / Rent workflows with assigned platform manager
Property management services: monitoring, rental management, document coordination 
Legal and tax guidance: FEMA/RBI basics, TDS implications, repatriation basics (non-advisory)
Status tracking: all service requests tracked with timeline updates
Institutional buyer support: NRI education trusts and foundations acquiring school or college campuses in India are fully supported

B. HNI Investor Module
Premium Layer
Curated investment deals: distressed properties, bank auctions, institutional assets 
Portfolio dashboard: all investments tracked with ROI, yield, and liquidity scores 
Investment intelligence: ROI estimation, rental yield, capital appreciation projection 
Deal advisory layer: non-legal guidance on deal structure and risk-return profile 
Institutional investor segmentation: categorize HNI investors by asset class preference including institutional
Investor behavior tracking: monitor which deal types, areas, and ticket sizes each investor engages with
Repeat investor intelligence: integrated with IRM Engine (Module 38) to track deal history and preferences
Institutional investment track: schools and colleges treated as investment-grade assets EBITDA yield analysis, PE and trust deal facilitation

--- PAGE 5 ---

C
Strategic Value: High ticket size. Premium positioning. Repeat investors. Global capital inflow engine. High-margin revenue stream.
How to futtch Pata

ENGINE 4: BANK & DISTRESSED DEAL ENGINE

A. Bank / Institutional Properties
Exclusive Inventory
Sources: SARFAESI bank auctions, NBFC repossessions, ARC assets, liquidation properties
Data captured: auction price, EMD amount, auction date, possession status, legal status (indicative only)
Auction alerts: personalized push notifications for new matching auctions based on investor profile
Notification priority integration: high-ROI auction deals trigger priority alerts to matched investors
Institutional distressed assets: bank-auctioned school and college properties are identified and routed to Institutional Engine with SARFAESI data
whats TWHP

B. Distressed Property-Market
Deal sourcing: brokers (primary source), direct sellers, internal CRM leads, auction module integration
Input tags: Urgent Sale / Financial Distress / Investor Exit / Time-Bound Sale
Deal structuring: property details, distress indicators, timeline urgency, seller motivation level
Market comparison: estimated market value, discount percentage, investment score (0-100)
Liquidity and exit score: High / Medium / Low based on area demand, buyer activity, and price segment
Risk indicators: Documentation pending / Possession unclear / Legal complexity / Tenant occupied
Access control: restricted to verified brokers, NRI investors, and HNI investors only not visible to casual users
CRM pipeline: Lead→ Deal Interest → Due Diligence → Negotiation → Closure 
Al deal scoring enhancement in Phase 2: machine learning refines deal scores based on historical conversion data

C. Critical Positioning Rule
Distressed deals must never be labeled as 'Distressed' or 'Disputed' in the user interface.
They must be presented as: 'High-Opportunity Investment Deals' or 'Special Situation Properties'. This is a brand and trust requirement.
Every such deal must display a mandatory disclaimer.

Strategic Value: Attracts serious investors. High deal margins. Clear platform differentiation. Low-competition inventory not available on any other platform.

--- PAGE 6 ---

ENGINE 5: DEAL, TRUST & INTELLIGENCE ENGINE - Core Platform Logic
This engine powers the core transaction conversion of the platform.
It contains the most critical sub-systems.

5.1 Requirement Marketplace - Primary Differentiator
Buyer-first system: buyer requirements are posted and matched to listings this reverses the traditional model
Hot requirement tagging: urgent buyers with high intent are flagged and surfaced to brokers immediately
Reverse matching: brokers are auto-notified when a new requirement matches their active listings
Co-broking enablement: requirements can be shared with partner brokers to expand deal reach

5.2 Property-Requirement Matching Engine - Primary System Engine (Non-Negotiable)
This is the core conversion driver of the platform and must be built with full priority.
The matching engine powers every deal that starts on the platform.

Purpose
Match properties to buyer requirements and match buyer requirements to properties bidirectionally, automatically, and continuously.

Phase 1- Rule-Based Matching
Matching parameters (all weighted):
Location: exact area match plus nearby radius match 
Budget: buyer budget range overlaps with property price 
Property type: residential, commercial, plot, institutional must match requirement
Deal type: sale or rent - must match
Area in square feet: requirement area range overlaps with listing
Urgency: high urgency requirements get higher match priority weighting

Output per match:
Match percentage score using basic weighted logic
Ranked results list: highest relevance first
Hot Match tag applied when score exceeds threshold

System behavior:
When a new property is posted: matching engine runs automatically against all active requirements
When a new requirement is posted: matching engine runs automatically against all active listings
Matches are pushed to: CRM dashboard of the broker, WhatsApp notification to broker, Daily Notification Engine for digest inclusion
Instead of Notification dealers/owners Duyas, et should come directly to Platform whoren turn contact the Brodeen obuyer every ded wuest route through us

--- PAGE 7 ---

Phase 2 - Al-Based Matching Engine
Behavior-based learning: system learns from which matches brokers accept, click, and convert
Click pattern analysis: high-engagement match types get higher weighting 
Conversion history: matches that historically led to deals get boosted in ranking 
Broker activity patterns: active brokers in an area are prioritized for relevant matches

Phase 2 outputs:
Smart match scoring with machine-learning-refined weights 
Recommended buyers surfaced to brokers based on listing characteristics 
Recommended properties surfaced to buyers based on requirement history and behavior

Advanced Matching Features
Reverse marketplace: requirement-first model where demand drives supply visibility 
Co-broking via shared matches: matches can be shared with partner brokers with one click Bayny them to contact us
Institutional matching: separate filter set - institution type, board, campus size, budget, acquisition intent, regulatory fit

5.3 Trust & Reputation System
Multi-factor trust score: deal completion rate + response time + review score + activity level + verification status + geo-validation of listings
Verified badges: Verified User, Top Broker, Highly Rated, Institutional Specialist Broker 
Review flow Phase 1: reviews allowed only after verified interaction, admin approval required before publishing
Review flow Phase 2: auto-publish with Al fraud detection filtering fake reviews 
Property ownership timestamp: exact timestamp plus user ID stored on every listing first valid entry gets priority recognition in disputes

5.4 Fraud Detection System
Duplicate image and listing detection across all property submissions
Geo-validation: properties with lat/long coordinates get higher trust score and better search visibility
Geo mismatch detection: cross-compare image metadata, location data, and broker patterns
Suspicious activity flagging: multiple brokers claiming same property, rapid re-uploads, anomalous submission patterns
Text-level blocking: regex-based auto-rejection of mobile numbers (all formats), email IDs, website links, and contact phrases in listing text
Image-level blocking Phase 1: restrict uploads of visiting cards and contact-bearing images

--- PAGE 8 ---

Image-level blocking Phase 2: OCR-based scanning of all uploaded images for phone numbers, email IDs, and addresses

5.5 Due Diligence Engine
Document checklist system with automated detection of missing documents 
Ownership chain validation (basic): title chain tracing, encumbrance awareness, possession risk indicators
NRI-specific considerations and tax implication guidance
Phase 2: Al document classification, risk flagging, and anomaly detection in submitted documents

5.6 Document Repository
Secure cloud storage linked to properties, requirements, and deals
Role-based access control: Owner, Broker, Buyer, Admin each role sees only what they are permitted to see
Document types accepted: Sale deed, Agreement to sell, ID proofs, Tax documents, NOCs, Encumbrance certificates
Institutional data room: NDA-gated encrypted document storage for institutional deal documents version controlled, access logged, download restricted

5.7 Deal Intelligence Dashboard
Conversion rates by area, property type, and broker
Area demand trends: which localities are seeing rising buyer requirements where deals are dying
Pipeline analytics: stage-wise deal drop-off analysis 
Smart recommendations: Al-suggested properties surfaced to brokers, Al-suggested buyers surfaced to sellers

5.8 Dispute Resolution System
Internal case creation with evidence upload capability
Admin resolution dashboard with full timeline logs
Covers: broker disputes, duplicate listing conflicts, fake claim reports, institutional data access disputes

5.9 Transaction Orchestration Engine - Module 40
This sub-engine automates the progression of deals through the pipeline.
Auto-trigger next pipeline stage when current stage requirements are met
Dependency tracking: Stage N cannot start until Stage N-1 is marked complete
Delay alerts: if a stage sits without action beyond the SLA window, alerts are sent to broker and admin
SLA monitoring: each pipeline stage has a defined expected completion window tracked by system

--- PAGE 9 ---

5.10 Reputation Graph Engine - Module 44
Network-based trust scoring that goes beyond individual behavior.
Co-broker validation: trust scores are influenced by the quality of brokers a user works with
Interaction-weighted scoring: high-quality interactions (completed deals, positive reviews) carry more weight than volume
Network-based trust: a broker vouched for by many high-trust brokers gets elevated score

5.11 Advanced Audit Layer
Legal-grade activity logs: every user action is timestamped and stored with immutable records
Dispute reconstruction: full action trail can be reconstructed for any deal or interaction 
NDA activity logs: all document access, download attempts, and sharing actions inside institutional data rooms are logged separately

Strategic Value: The matching engine is the core conversion driver. The trust system is the defensibility moat.
Together they make the platform irreplaceable for brokers.

ENGINE 6: AI-POWERED INVESTMENT, MARKET & ADVISORY ENGINE - Decision Layer
Objective: Transform the platform from a transaction tool into a decision-making engine. Help users answer: Where should I invest?
What is the risk? How easily can I exit? What are the tax implications?

6.1 Al Market Intelligence Engine
Inputs: historical property prices, transaction trends (internal + external), buyer demand from requirements posted, supply from listings volume, user engagement patterns, rental data where available.
Outputs: Price trend analysis (rising / stable / declining), area growth score, investment potential score, recommended investment areas.
Example output: Gurgaon Sector 57 -High demand growth, 12 percent price appreciation trend, strong rental yield - Recommended for mid-term investment.

6.2 Investment Guidance Engine (Non-Advisory)
ROI estimation (indicative), rental yield calculation, capital appreciation projection (non-guaranteed)
Budget-based property recommendations, portfolio suggestions for HNI users 
Buyer intent scoring: Al identifies buyers most likely to transact based on behavior 
Deal failure prediction: identifies deals at risk of falling through before they collapse 
Broker performance prediction: identifies which brokers are likely to close more deals 
Institutional valuation benchmarking: benchmarks school and college asking prices against comparable transactions

--- PAGE 10 ---

[Handwritten notes: Regd. ..., Demand is mapped]
Market
DISCLAIMER: This is indicative guidance based on available data. It is not financial advice.
Users must consult a qualified financial professional before making investment decisions.

6.3 Liquidity / Saleability Score - Key Differentiator
This answers the biggest investor fear: how easy will it be to sell this property when I want to exit?
Factors: area demand vs supply ratio, historical transaction velocity, price segment demand, buyer activity levels, time-to-sale indicators
Denand is Mapped
Output: High Liquidity (fast sale expected), Moderate Liquidity, Low Liquidity (slow exit risk)
Applied to all asset types including institutional assets

6.4 Tax & Compliance Guidance Engine
For Buyers: stamp duty basics, registration charges, holding period awareness. 
For Sellers: capital gains basics, TDS rules.
For NRIs: FEMA and RBI considerations (high-level), repatriation basics, TDS implications on property sale.
Format: simplified checklist-based scenario guidance, not legal advice.
DISCLAIMER: Tax rules vary by state and situation. Consult a qualified CA for exact calculations and compliance before transacting.

6.5 Blog & Content Authority Engine
Content categories: Buyers, Brokers, NRI, Investment, Legal and Compliance, Market Trends, Distressed Deals, Institutional
Article structure: Problem statement, Explanation, Step-by-step guidance, Risk factors, Key takeaways, Call to action
SEO integration: city-based pages, area-based pages, investment pages, institutional acquisition pages with full internal linking
Institutional content: EBITDA-based school and college valuation, enrollment trend analysis, regulatory compliance guides

Strategic Value: Organic lead generation. Trust building. Education creates market adoption. Content moat is hard to replicate.

ENGINE 7: INSTITUTIONAL SALE / PURCHASE ENGINE
New Category (First in India)
Strategic Significance: India's institutional real estate market - K-12 schools, private colleges, universities - represents a multi-thousand-crore, completely unorganized segment.
No platform anywhere in India offers structured deal infrastructure for these transactions.
A R Buildwel creates an entirely new asset category on a real estate platform.

--- PAGE 11 ---

Covered Asset Classes
K-12 Schools: CBSE, ICSE, IB, State Board affiliated - minimum K-12 scale required 
Private Colleges: Engineering, Management, Medical, Arts, Commerce, Law 
Universities: Deemed universities, Private universities, Upcoming Greenfield university projects
International Schools and Campuses: IB and Cambridge affiliated 
Coaching and Test-Prep Centers: at institutional campus scale only 
Vocational and Skill Training Institutes: NSDC affiliated, large format

7.1 Institutional Listing System
Institution name: masked in public view by default - confidentiality ON unless seller opts out
Institution type, board/affiliation, year established
Campus area in sq ft and acres, building count, infrastructure details
Student enrollment (current count), faculty count
NOC status: Valid / Pending / Expired / Not Applicable
Regulatory approvals: CBSE/UGC/AICTE / State Board status per approval
Land ownership: Owned / Leased / Trust-held / Mixed
Transaction type: Full Sale / Stake Sale / Lease / JV / Management Takeover
Asking price in INR Crores, revenue multiple (indicative), EBITDA multiple (indicative, self-reported)
Annual revenue in INR Crores (self-reported)
Geolocation - lat/long coordinates are MANDATORY for geo-validation and trust scoring
Institutional broker certification: only certified institutional brokers can list institutional assets
Institutional deal ranking: deals ranked by data completeness, regulatory clarity, and deal score

7.2 Institutional Buyer System
Buyer type: Education Group / PE Fund / Family Office / Trust / Individual Promoter 
Budget range, preferred geography, preferred institution type
Acquisition intent: Greenfield expansion / Portfolio acquisition / Turnaround investment 
NDA and confidentiality agreement integrated into platform before any data is shared enforced at system level
Verified buyer badge required before access to any sensitive institutional data 
Investor matching via IRM Engine (Module 38): repeat institutional investors tracked and matched proactively

7.3 Confidentiality and Data Access Control
Default setting: CONFIDENTIAL institution name never shown publicly
Public view shows only: general description such as 'K-12 School, 800 students, South Delhi, Asking INR XX Cr'

--- PAGE 12 ---

Full institutional data unlocked only after: Verified Buyer Badge confirmed + NDA signed via platform + Admin approval granted
Same zero-bypass contact control applies as for all other platform listings

7.4 Institutional Deal Pipeline
9 Stages
Stage 1 - Intent Received: WhatsApp or platform intake, initial screening by platform representative
Stage 2 - Buyer Qualification: Verified buyer badge confirmed, financial capacity checked 
Stage 3 NDA Executed: Confidentiality agreement signed via platform, access gates opened
Stage 4 Data Room Access: Documents shared under NDA via encrypted Document Repository access logged
Stage 5 Site Visit: Campus visit coordinated by platform representative
Stage 6 - Valuation Discussion: EBITDA multiple or asset-based multiple negotiation begins 
Stage 7 - Legal Due Diligence: Title, trust deed, and regulatory compliance review by legal panel
Stage 8 - Offer and Negotiation: Term sheet drafted, counter-offers tracked in CRM 
Stage 9 Closure: Agreement execution, payment via gateway, deal record created

7.5 Institutional Due Diligence Module
Regulatory document checklist: NOC, affiliation certificate, land records, fire NOC, trust deed
Ownership chain validation: land + building + trust or promoter structure 
Encumbrance check guidance: bank loans against property, litigation flags
Student enrollment audit trail (basic verification)
RERA and municipal compliance for campus land
Phase 2: Al-based risk flagging for regulatory non-compliance automated detection of missing approvals
DISCLAIMER: Due diligence guidance on this platform is indicative only.
All institutional transactions must involve qualified legal professionals and chartered accountants for full independent verification before proceeding.

7.6 Institutional Valuation Intelligence - Phase 2
EBITDA-linked valuation: EBITDA multiplied by sector multiple for revenue-generating institutions
Asset-based valuation: land value + building replacement cost + brand value + regulatory approval value
Enrollment trend analysis: declining / stable / growing - impacts valuation multiple 
Replacement cost estimation: cost to build an equivalent institution from scratch in the same location
Exit potential score: how liquid is institutional asset resale in that geography 
Institutional valuation benchmarking: compare asking price against comparable closed transactions
whats EBITDA  How to get EBITDA Based Data

--- PAGE 13 ---

7.7 Institutional Monetization Streams
Transaction advisory fee: fixed fee or percentage of deal value on successful institutional closure
Premium listing fee: institutional sellers pay to list on the platform
Data room fee: secure document hosting fee per active institutional deal
Institutional buyer subscription: PE funds and trusts pay for access to curated institutional deal flow
Institutional legal referral commissions: large-ticket legal panel referrals for institutional deals
DISCLAIMER: A R Buildwel is an information and facilitation platform only.
Institutional asset transactions involve complex regulatory, legal, and financial considerations.
All parties must conduct full independent due diligence with qualified professionals before entering any agreement.
The platform bears no liability for accuracy of self-reported institutional data.

4. EXTENDED ENGINE MODULES MODULES 38 TO 44
These seven modules extend the core 7 engines. They were added in Version 5 to strengthen deal conversion, investor management, transaction security, and partner ecosystem capabilities.

Module 38: Investor Relationship Management Engine (IRM Engine)
Purpose: Build long-term relationships with high-value investors so the platform becomes their primary deal source.
Investor profiling: detailed profile per investor covering asset class preferences, geographic focus, ticket size range, deal type preferences
Ticket size tracking: all investments made by an investor are tracked with deal value, asset type, and outcome
Repeat investor logic: system identifies investors who have transacted before and proactively surfaces relevant new deals
Investor behavior analytics: which deal types does this investor engage with most, click, shortlist, and ultimately close
Integration with HNI Module, NRI Module, and Institutional Engine all investor segments feed into IRM
Phase 2: Al-powered investor-deal matching using historical behavior and preference learning

Module 39: Advanced Deal Room / Data Room Engine
Purpose: Secure, controlled document sharing for high-stakes deals institutional, distressed, ΗΝΙ.

--- PAGE 14 ---

NDA-gated access: documents only accessible after NDA is signed and admin approves access
Version control: every document version tracked sellers can update documents without losing previous versions
Access logs: every view, download attempt, and sharing action is logged with timestamp and user ID
Download restriction: configurable - seller can allow or block downloads; watermarking option in Phase 2
Role-based access per document: some documents visible to all NDA signatories, some only to admin or verified buyers
Integration with Institutional Engine (primary use case), Distressed Deals, and HNI deals

Module 40: Transaction Orchestration Engine
Purpose: Automate and monitor deal progression so no deal gets stuck or forgotten.
Stage automation: when a deal stage is marked complete, the next stage is auto-created in CRM with default actions
SLA tracking: each pipeline stage has a maximum expected duration; system tracks time elapsed
Delay alerts: if SLA is breached, alerts sent to broker and admin with escalation path 
Dependency enforcement: Stage 4 (Data Room Access) cannot begin until Stage 3 (NDA) is complete - hard system rule
Deal health score: calculated from stage completion speed, document completeness, and engagement level

Module 41: Escrow & Secure Transaction Layer - Phase 2
Purpose: Handle financial transactions within the platform securely for high-value deals.
Token payment handling: buyer deposits token amount into escrow held by platform 
Escrow readiness: platform acts as intermediary holding funds pending deal milestone completion
Milestone-based release: funds released to seller on confirmed milestones site visit completion, legal clearance, registration
Full audit trail: all escrow transactions logged with timestamps and approvals 
This is a Phase 2 feature - regulatory compliance review required before activation

Module 42: Partner Ecosystem Engine
Purpose: Onboard, manage, and track commissions for all service partners on the platform.
Partner types: Verified lawyers, banks and NBFCs, insurance providers, property management firms
Partner onboarding: structured verification process - credentials, experience, service areas
Commission tracking: platform automatically tracks referrals and commissions owed to platform from each partner
Partner performance scoring: rated by users after each service interaction

--- PAGE 15 ---

Deal linkage: every partner engagement is linked to a specific deal in the CRM pipeline 
Integration with Legal Module, Loan Module, Insurance Module, and Institutional Engine

Module 43: Notification Intelligence Engine
Purpose: Move beyond generic notifications to behavior-driven, priority-ranked alerts.
Behavioral alerts: notifications triggered by specific user behavior patterns - e.g., broker has not followed up on a hot lead in 48 hours
Priority notifications: high-ROI distressed deals, hot institutional matches, and urgent requirements trigger priority push
Notification fatigue control: system learns which notification types each user engages with and reduces low-engagement types
Multi-channel delivery: WhatsApp (primary), in-app push, SMS backup
Notification scheduling: market update notifications sent in the 9:30 to 10:30 AM window when broker engagement is highest
Institutional deal alerts: new institutional listing matched to verified buyer profile triggers immediate priority notification

Module 44: Reputation Graph Engine
Purpose: Network-level trust scoring that cannot be easily gamed by individual actors.

Network-based trust: a broker's trust score is influenced by the quality and trust level of all brokers they co-broke with
Co-broker validation: successfully completing a deal with a high-trust broker raises both parties' trust scores
Interaction-weighted scoring: a completed deal with a verified buyer carries more weight than 100 listing views
Fraud resistance: network scoring makes it harder to inflate trust scores artificially gaming one metric does not move the overall score
Phase 2: graph visualization showing broker network connectivity and trust propagation

5. TRANSACTION ECOSYSTEM LEGAL, LOAN, INSURANCE & PAYMENT
Integrated Deal Flow: Lead Requirement Match → Site Visit Negotiation → Legal Verification → Loan Processing → Insurance Selection → Payment Closure
This flow is system-orchestrated, auto-triggered at each stage, and SLA-monitored by the Transaction Orchestration Engine (Module 40).

5.1 Legal Integration Module
Panel of verified lawyers available directly within the platform- pre-vetted, rated by users

--- PAGE 16 ---

Services: Property due diligence, title verification, agreement drafting, registration support
Workflow: User raises legal request → Lawyer assigned or selected by user → Document sharing via platform → Status tracked in deal pipeline
Linked with Due Diligence Module and Document Repository - no duplicate document uploads
Legal actions tracked within CRM deal pipeline stage - visible to broker and client 
Institutional-scale legal panel: lawyers with verified experience in school, college, and university transactions
Commission model: platform earns referral commission on each legal service booked

5.2 Loan / Financing Module
Integration with: Banks, NBFCs, and loan agents - panel onboarded via Partner Ecosystem Engine (Module 42)
User flow: Apply from platform → Upload financial documents → Basic eligibility check → Status tracked
Phase 2: Al-based loan eligibility estimation and best loan recommendation engine comparing multiple lenders
Commission model: platform earns referral commission on each loan application routed to a partner

5.3 Insurance Module
Coverage types: Property insurance, Rental insurance, Title insurance where applicable 
Insurance options surfaced during deal closure stage and property ownership transfer 
Integration with insurance providers and policy issuance APIs via Partner Ecosystem Engine
Commission model: platform earns referral commission on policies sold

5.4 Payment Gateway Integration

Phase 1 Basic Integration:
Payment gateway: Razorpay or Stripe equivalent
Use cases: NRI service payments, membership plan billing, CRM subscription billing

Phase 2- Advanced Financial Layer:
Token and booking amount collection for deal confirmation
Escrow-based transactions via Module 41 for high-value deals
Automated invoice generation for all platform transactions
Payment tracking inside CRM deal pipeline payment status visible per deal

--- PAGE 17 ---

6. ENGAGEMENT & GROWTH LAYERS

6.1 Daily Market Notification Engine

Personalized daily updates delivered in the 9:30 to 10:30 AM window when broker engagement is highest
Area-based filtering: each user receives only notifications relevant to their selected localities
WhatsApp-first delivery (primary channel) plus in-app push notification
Daily content: new properties in area, new buyer requirements, urgent deals, market alerts, investment signals
Sample message: 12 new properties in your area, 5 new buyers today, 2 urgent deals, 1 high-ROI investment alert
Institutional alerts: New school listing in your region, Institutional deal matched to your verified buyer profile
Powered by Notification Intelligence Engine (Module 43) for behavioral targeting

6.2 SEO + Content Engine
CMS with automated metadata generation, schema markup, and internal linking 
City pages: Buy Property in Delhi, Flats in Gurgaon, Property Investment Noida 
Area pages: locality-specific landing pages for every high-demand area 
Institutional SEO pages: School for sale Delhi, Private college acquisition India, Buy K-12 school, Acquire engineering college
Image compression.

6.3 Broker Network Engine
Broker network graph: tracks who works with whom, co-broking relationships, referral patterns
Co-broking ecosystem: deal sharing, referral system, commission split tracking 
Institutional specialist broker network: dedicated badge for brokers with verified institutional deal experience
Feeds into Reputation Graph Engine (Module 44) for network-based trust scoring

6.4 PWA + Mobile Experience
Installable Progressive Web App: works like a native app on mobile without requiring app store install
Optimized for low-bandwidth networks: fast loading on 3G and 4G
Mobile-first design: every workflow optimized for single-hand thumb navigation 
Offline capability: listings, CRM data, and notifications cached locally
Background sync: data syncs automatically when connectivity is restored
Push notifications: deal alerts and match notifications delivered even when app is not open

--- PAGE 18 ---

6.5 Communication Layer
Phase 1: WhatsApp automation for all deal-stage notifications, match alerts, and daily updates
Phase 2: In-platform chat direct messaging between platform-verified participants, controlled routing, does not bypass contact control rules

6.6 Gamification & Engagement System
Points engine: users earn points for every platform action listing, response, deal closure, review given
Tier badges: Bronze, Silver, Gold, Platinum, Elite tier upgrades based on points and deal volume
Leaderboards: area-wise and platform-wide broker rankings updated weekly fast response, active engagement
Activity rewards: recognition awards for consistent activity listing, deal completions
Trust-linked scoring: gamification points feed into trust score calculation equals credibility

6.7 Advanced Search & Discovery
Prop brop facing
Smart filters: property type, budget, area, furnishing, urgency, trust score, deal type, 
Saved searches: persistent search preferences stored with automatic alert triggers 
Alerts for new matches: instant notification when a new listing or requirement matches a saved search
Institutional search filters: institution type, board affiliation, campus size, transaction type, budget range

6.8 Localization & Multi-Language
Phase 1: Hindi and English - complete Ul and content available in both languages from launch
Phase 2: Regional language expansion based on geographic growth - Marathi, Telugu, Tamil, others

7. ADDITIONAL STRATEGIC MODULES

7.1 Audit & Activity Logs
Full user activity tracking: logins, listing edits, CRM actions, document access, search queries
Legal-grade logs: immutable timestamped records suitable for dispute resolution and regulatory review
en

--- PAGE 19 ---

Admin audit dashboard: platform admin can view any user's complete action history 
Dispute-ready logs: full action trail reconstructable for any deal or interaction 
Exportable audit trail: admin can export logs in structured format for legal proceedings 
NDA activity logs: all document access inside institutional data rooms logged separately with user identity

7.2 Compliance & Risk Alerts
Market advisories: regulatory updates affecting real estate transactions pushed to users
RERA Compliance alerts: deadline reminders for registered builders Plugin Manual
RBI and FEMA alerts: regulatory changes relevant to NRI property transactions 
Deal-stage risk alerts: system flags unusual patterns or missing steps in active deals 
Institutional regulatory alerts: UGC, AICTE, and CBSE compliance updates pushed to institutional users

7.3 Data Ownership & Export System
Users can export their own data: Leads in CSV, CRM records, Listings, Deal history 
Builds platform trust: users know their data is not held hostage
Role-based export controls: Agents can export only their own records; Admins can export full organization data
Scheduled export: Phase 2 - automated periodic data exports delivered to user email

7.4 Onboarding Assist System
Guided onboarding flow by role: Broker, Buyer, Seller, NRI, HNI, Institutional Seller, Institutional Buyer, 
Berkus must shar tell their Area of operation.
First listing assistance: step-by-step wizard for posting first property listing 
First requirement assistance: guided form for posting first buyer requirement
First success action guidance: system shows user the most important next action to take on the platform
Institutional onboarding: dedicated guided flow for school, college, or university listing

7.5 Geo-Location Based Validation - Anti-Fraud Layer
Properties with lat/long geo-tags receive: higher trust score, better search ranking, priority in matching results
Fraud control: system cross-compares image metadata, GPS coordinates, and broker submission patterns
Geo mismatch flagging: if image EXIF data and stated location do not match, listing is flagged for review
Address leakage prevention: only Area and Locality shown publicly full property address kept private

--- PAGE 20 ---

7.6 API Ecosystem
Phase 2
Allows builders and broker firms to integrate their internal systems with the platform via API
API endpoints for: listing sync, lead push, CRM integration, match retrieval 
Authenticated access using organization-level API keys with rate limiting 
Webhook support: external systems receive real-time updates when matches, leads, or deal stages change

7.7 Smart Recommendations
Suggested properties: shown to buyers based on posted requirements, browsing behavior, and match history
Suggested buyers: shown to brokers based on their active listings and buyer activity patterns in the area
Institutional deal recommendations: relevant institutional listings matched and surfaced to verified institutional buyers

8. COMPLETE MODULE LIST
ALL 44 MODULES
Every module classified by tier and build phase. Tier 1 is non-negotiable for Phase 1. Tier 2 drives revenue.
Tier 3 builds scale and defensibility.

TIER 1
CORE ENGINES (Build First, Non-Negotiable)
Module 1: WhatsApp Integration Engine - Phase 1
Module 2: Multi-Tenant CRM Engine - Phase 1
Module 3: Requirement Marketplace Engine Phase 1
Module 4: Matching Engine (Rule-based Phase 1, Al Phase 2)
Module 5: Deal Pipeline Engine - Phase 1
Module 6: Trust & Reputation System - Phase 1
Module 7: Daily Notification Engine - Phase 1
Module 8: Institutional Sale / Purchase Engine (Basic Phase 1, Full Phase 2)

TIER 2-BUSINESS & REVENUE ENGINES (Build in Phase 1 and Phase 2)
Module 9: Distressed Deal Engine - Phase 1
Module 10: Bank Auction Deal Engine (Basic Phase 1, Automated Phase 2) 
Module 11: NRI Management Module Phase 1
Module 12: HNI Investment Module (Basic Phase 1, Full Phase 2) 
Module 13: Al Investment & Market Intelligence Engine - Phase 2 
Module 14: Liquidity / Saleability Scoring Engine - Phase 2 
Module 15: Institutional Valuation Intelligence Phase 2 
Module 16: SEO & Blog Content Engine - Phase 1
Module 17: Advertiser & Monetization System - Phase 1

--- PAGE 21 ---

Module 18: PWA + Mobile Experience - Phase 1
Module 38: Investor Relationship Management Engine (IRM) - Phase 1 Basic, Phase 2 Full
Module 39: Advanced Deal Room / Data Room Engine
Module 40: Transaction Orchestration Engine - Phase 1
Module 42: Partner Ecosystem Engine - Phase 1
Module 43: Notification Intelligence Engine Phase 1

TIER 3-SUPPORTING & SCALE ENGINES
Module 19: Fraud Detection System (Basic Phase 1, Al Phase 2)
Module 20: Document Repository System - Phase 1
Module 21: Property Due Diligence Module Phase 1
Module 22: Institutional Due Diligence + Data Room (Basic Phase 1, Full Phase 2) 
Module 23: Analytics & Performance Dashboard (Basic Phase 1, Full Phase 2)
Module 24: Legal Integration Module Phase 1
Module 25: Loan / Financing Module - Phase 1
Module 26: Insurance Module - Phase 1
Module 27: Data Ingestion Engine - Crawler, Parser, Filter - Phase 2
Module 28: Advanced Search & Discovery - Phase 1
Module 29: Gamification & Engagement System - Phase 2
Module 30: Localization & Multi-Language (Hindi + English Phase 1, Regional Phase 2)
Module 31: Audit & Activity Logs - Phase 1
Module 32: Compliance & Risk Alerts - Phase 1
Module 33: Data Ownership & Export System Phase 1
Module 34: Onboarding Assist System - Phase 1
Module 35: API Ecosystem - Phase 2
Module 36: In-Platform Communication Layer - Phase 2
Module 37: Broker Network Engine - Phase 1
Module 41: Escrow & Secure Transaction Layer - Phase 2
Module 44: Reputation Graph Engine - Phase 1 Basic, Phase 2 Full

9. TWO-PHASE DEVELOPMENT PLAN
All original phase structures (Phase 1, Phase 1.1, Phase 2, Phase 3) are consolidated into two execution phases.
Nothing is dropped. Every capability. is mapped to Phase 1 or Phase 2.

PHASE 1: FOUNDATION, CORE ENGINES & MARKET ENTRY
Goal: Build the core operating system. Establish market presence. Generate initial revenue. Onboard brokers at scale.
Prove the deal execution model.

Engine 1-WhatsApp Integration
Property and requirement posting via WhatsApp 
Lead capture auto-entry into CRM

--- PAGE 22 ---

Auto-replies and intent detection 
Institutional deal intake via WhatsApp

Engine 2- CRM

Multi-tenant private CRM workspaces
Full deal pipeline: Lead → Closure
Lead scoring, follow-ups, call logs, activity logs
Broker performance dashboard
Investor mapping
SLA tracking per stage
Institutional CRM pipeline: Intent →NDA → Closure

Engine 3 NRI + HNI (Phase 1 Basic)
NRI dashboard: buy, sell, rent workflows, property monitoring, service requests
HNI basic: curated deal access, portfolio view
Investor profiling (basic, feeds into IRM Module 38)

Engine 4- Bank & Distressed (Phase 1 Basic)
Distressed deal listings: deal structuring, investment scoring, access control
Bank auction data: basic manual entry and display
CRM pipeline for distressed and auction deals

Engine 5- Deal, Trust & Intelligence
Requirement Marketplace: buyer-first with hot tagging and co-broking
Matching Engine: rule-based on location, budget, type, area, and urgency
Trust system: basic multi-factor scoring, admin-approved reviews
Fraud detection: basic duplicate detection and geo-validation
Due diligence: document checklist and missing document detection 
Document Repository: secure storage with role-based access
Dispute resolution: case creation and admin resolution dashboard 
Transaction Orchestration Engine (Module 40): stage auto-trigger and SLA monitoring 
Institutional rule-based matching

Engine 7-Institutional (Phase 1 Foundation)
K-12, College, and University listings with confidentiality default
Institutional buyer system with NDA workflow
Basic rule-based institutional matching
Institutional CRM pipeline - all 9 stages 
Institutional due diligence checklist (basic) 
NDA-gated data room (Module 39)
Institutional broker certification system

--- PAGE 23 ---

Supporting Modules - Phase 1

Property Listing System: add, edit, delete, image compression, SEO metadata, trust score
User & Profile System: OTP login, role-based onboarding, area selection mandatory, RERA and GST verification
Trust & Reputation: verified badges, admin-moderated reviews, ownership timestamp 
Daily Notification Engine: personalized WhatsApp and in-app, area-based, powered by Module 43
SEO & Blog Engine: CMS, city pages, institutional SEO pages, 12+ launch articles 
Legal Integration Module: verified lawyer panel, basic service workflow, commission tracking
Loan Module: bank and NBFC integration, basic eligibility flow 
Insurance Module: property, rental, title insurance options surfaced during closure 
Payment Gateway: Razorpay or Stripe - NRI services, memberships, subscriptions
Advertiser & Monetization: homepage banners, featured listings, area promotions 
Analytics Dashboard: basic leads, conversions, area demand metrics
PWA + Mobile Experience: installable, fast loading, offline capable, background sync 
Advanced Search & Discovery: smart filters, saved searches, match alerts 
Localization: Hindi and English full Ul from launch
Audit & Activity Logs: legal-grade user action tracking
Compliance & Risk Alerts: market advisories and regulatory updates 
Data Ownership & Export: leads, CRM, listings export in CSV
Onboarding Assist: guided onboarding by role with first-action guidance 
Geo-location validation: lat/long mandatory, anti-fraud priority system
Broker Network Engine: co-broking relationships, referral tracking, commission split 
Controlled Contact Architecture: zero-bypass enforcement - regex blocking plus basic image validation
IRM Engine (Module 38): basic investor profiling and deal preference tracking 
Advanced Deal Room (Module 39): NDA gated, version controlled, access logged 
Partner Ecosystem Engine (Module 42): lawyer, bank, insurance partner onboarding and commission tracking
Reputation Graph Engine (Module 44): basic network trust scoring

Phase 1 Success Criteria
WhatsApp to Platform conversion: active daily flow of users from WhatsApp into platform 
CRM in daily use: brokers managing leads inside the platform every working day
Deal closures tracked: end-to-end deal execution records on platform
Trust badges adopted: verified profile adoption by majority of active brokers 
NRI and HNI investors onboarded and active
Institutional listings live: active K-12, college, and university listings on platform 
SEO traffic: organic traffic from city pages and institutional keyword pages 
Mobile and PWA usage: majority of users accessing via mobile
Revenue active: subscriptions, NRI service fees, advertising, institutional listing fees

--- PAGE 24 ---

PHASE 2: INTELLIGENCE, SCALE & FULL ECOSYSTEM
Goal: Activate Al across all engines. Automate data ingestion. Scale to microservices. Complete premium verticals. Build network effects.

Engine 6 Al Intelligence (Full Activation)

Al Matching Engine: machine learning from click patterns, conversion history, broker behavior
Al Market Intelligence: price trend analysis, area growth scores, investment potential scoring
Al Investment Guidance: ROI, rental yield, capital appreciation modeling with confidence intervals
Liquidity and Saleability Score: full data-driven scoring across all asset types
Al Fraud Detection: behavioral anomaly detection, OCR image scanning for contact data 
Al Lead Scoring: predictive Hot/Warm/Cold classification based on behavior patterns
Al Trust Scoring: automated multi-weight trust computation updated continuously 
Al Deal Prediction: closure probability scoring per pipeline stage
Al Document Intelligence: document classification, risk flagging, anomaly detection 
Buyer intent scoring: predict which buyers will transact in the next 30 days 
Deal failure prediction: identify deals at risk before they collapse
Broker performance prediction: identify which brokers are likely to close more deals 
Institutional Valuation AI: EBITDA model, enrollment trend analysis, exit potential scoring 
Institutional Regulatory Compliance Al: automated flagging of non-compliant institutional listings

Engine 3-NRI + HNI (Full Expansion)
NRI: advanced document coordination, Al-based property monitoring alerts
HNI: full portfolio intelligence dashboard, deal advisory layer, advanced investment analytics
HNI Institutional track: PE fund deal flow curation, turnaround investment matching 
IRM Engine (Module 38): full Al-powered investor-deal matching and proactive outreach triggers

Engine 4 Bank & Distressed (Full Automation)
Data Ingestion Engine (Module 27): fully automated crawler, parser, normalizer, filter, publisher pipeline
Site-specific crawlers: crawler_sbi.js, crawler_ibapi.js, crawler_mstc.js plus master scheduler
Crawl schedule: every 6 to 12 hours via cron jobs, near real-time publishing 
Al-based PDF parsing for auction documents including hand-typed PDFs
Auto market price estimation for discount percentage calculation
Smart deal scoring with Al-refined weights based on conversion history

--- PAGE 25 ---

C
L
Institutional distressed: bank-auctioned school and college properties auto-identified and routed to Institutional Engine

Engine 5 Deal Intelligence (Phase 2)
Deal probability scoring per pipeline stage based on historical conversion rates 
Price prediction for listings based on comparable transaction data 
Investment scoring dashboard for brokers and investors showing ROI, yield, risk

Full Reputation Graph Engine (Module 44): network visualization, trust propagation

Engine 7 Institutional (Full Intelligence)
Full Al Valuation Intelligence: EBITDA model, asset-based, enrollment trend, replacement cost, exit score
Institutional buyer Al matching: advanced compatibility scoring beyond rule-based 
Institutional distressed deal section: bank-auctioned school and college assets 
PE fund and trust subscriber module: curated institutional deal flow subscription 
Institutional deal analytics: conversion rates, deal size distribution, stage drop-off analysis

Platform Scale & Infrastructure Phase 2
Microservices migration: each engine becomes independently deployable and scalable 
API Ecosystem (Module 35): builders and firms integrate their systems via authenticated APIs with webhooks
In-Platform Communication Layer (Module 36): controlled chat between verified participants
Gamification full system (Module 29): points engine, tier badges Bronze to Elite, leaderboards, activity rewards
Advanced Analytics & BI: full market intelligence dashboard, area demand heatmaps, broker performance comparisons
Loan Module Al: eligibility estimation engine, best loan recommendation across multiple lenders
Advanced Fraud Detection: OCR-based image scanning, behavioral anomaly machine learning
Escrow Layer (Module 41): secure token payment and milestone-based fund release 
Regional language expansion: Marathi, Telugu, Tamil, and others based on market data 
Notification Intelligence Engine (Module 43): full behavioral targeting, fatigue control, priority scoring

Phase 2 Success Criteria
Al matching measurably improving conversion rates versus Phase 1 baseline 
Automated auction data ingestion running without manual intervention
Al investment intelligence actively driving NRI and HNI investment decisions 
Institutional Al valuation being used in active deal negotiations
Microservices infrastructure stable with independent deployment cycles per engine

--- PAGE 26 ---

API ecosystem adopted by at least one builder firm or broker network 
Revenue from Al-tier subscriptions, institutional deal closures, and HNI advisory fees 
Platform positioned as India's go-to institutional real estate deal infrastructure

10. DATA & FIELD ARCHITECTURE

10.1 User Profile
Basic Info: Name, Mobile (OTP verified), Email, Role
Business Info Brokers: Firm name, RERA number, GST number, Years of experience, Operating areas (MANDATORY)
Trust Data: Verification status, Trust score, Reviews received, Deals completed, Institutional Specialist flag

10.2 Property Listing
Core: Title, Property type (residential / commercial / plot), Deal type (sale / rent), Price or rent, Area in sq ft
Location: Address (stored privately), City, Area and Locality (shown publicly), Latitude and Longitude (MANDATORY)
Specs: Bedrooms, Bathrooms, Floor number, Total floors, Furnishing status, Amenities list 
Media: Images (auto-compressed on upload), Videos
System Fields: Posted by (user_id), Timestamp (ISO 8601 used in dispute priority), Trust score, Status (active / sold / expired)

10.3 Requirement
Buyer Info: User ID, Budget minimum, Budget maximum
Requirement: Location preference, Property type, Deal type, Area requirement in sq ft
Urgency: Immediate / Within 30 days / Flexible
System Fields: Tag (Hot / Warm / Cold), Timestamp, Match score, Active status

10.4 Matches (Core Table)
id: Primary key
property_id: Foreign key to properties
requirement_id: Foreign key to requirements
match_score: Numeric 0-100 based on weighted matching rules
match_factors: JSON - breakdown of score by location, budget, type, urgency
status: active / viewed / accepted / rejected
created_at: ISO 8601 timestamp

--- PAGE 27 ---

10.5 Institutional Listing
institution_name: Masked in public view - confidentiality default ON
institution_type: K12_school/college/university/coaching/vocational / international 
board_affiliation: CBSE/ICSE/IB/UGC/AICTE/State Board / Other
year_established: Numeric
campus_area_acres: Decimal
campus_area_sqft: Decimal
student_enrollment: Integer - current count
faculty_count: Integer
noc_status: Valid / Pending / Expired / Not Applicable
land_ownership: Owned / Leased / Trust-held / Mixed
transaction_type: Full Sale / Stake Sale / Lease / JV / Management Takeover
asking_price: Numeric in INR Crores
ebitda_multiple: Numeric indicative, self-reported
revenue_annual: Numeric in INR Crores - self-reported
lat/Ing: MANDATORY - used for geo-validation and trust scoring
confidential_flag: Boolean - true by default
nda_required: Boolean - true by default
deal_score: 0-100 Phase 2 Al scoring
posted_by_user_id: Foreign key to users
timestamp: ISO 8601 - dispute priority system
verification_status: unverified / pending / verified

10.6 Deals
id: Primary key
property_id or institution_id: Foreign key
requirement_id: Foreign key
stage: Current pipeline stage
value: Deal value in INR
sla_breach_count: Number of SLA violations in this deal
deal_health_score: 0-100 composite score
created_at: ISO 8601

10.7 NDAs
id: Primary key
user_id: Foreign key to users - the signer
institution_id: Foreign key to institutional listings
status: pending / signed / revoked
signed_at: ISO 8601
ip_address: IP of signer for legal record

--- PAGE 28 ---

10.8 CRM Leads
id: Primary key
organization_id: Foreign key - multi-tenant isolation 
user_id: Foreign key - the broker who owns this lead
lead_name: Text
phone: Stored encrypted - never exposed in public API 
source: WhatsApp/platform/ manual
status: Hot/Warm/Cold / Converted / Lost
linked_property_id or institution_id: Foreign key
linked_requirement_id: Foreign key
pipeline_stage: Current stage of deal
created_at: ISO 8601

10.9 Documents
id: Primary key
deal_id or institution_id: Foreign key
type: Sale deed / Agreement / ID proof / Tax doc / NOC / Affiliation cert / Other
url: Encrypted S3 URL - never public
uploaded_by: User ID
version: Integer - version control for data room
access_level: all_nda_signatories / admin_only / buyer_only
download_allowed: Boolean
created_at: ISO 8601

10.10 Activity Logs
id: Primary key
user_id: Foreign key
action: Text - standardized action code, e.g. LISTING_CREATED, DOCUMENT_VIEWED, NDA_SIGNED
entity_type: property / requirement / deal / institution / document
entity_id: ID of the entity acted upon
timestamp: ISO 8601-immutable
ip_address: For legal-grade audit trail

10.11 Key Relationships
Users to Properties: one user can post many properties (1:M)
Users to Requirements: one user can post many requirements (1:M) 
Properties to Requirements: many-to-many relationship via matches table 
Deals: linked to one property (or institution) and one requirement 
Deals to Documents: one deal can have many documents
Users to NDAs: one user can sign NDAs for multiple institutions

--- PAGE 29 ---

Organizations to Users: one organization has many users multi-tenant isolation via organization_id

11. CONTROLLED CONTACT ARCHITECTURE - SYSTEM RULE MANDATORY
This is a core architectural requirement enforced at system level from Phase 1 MVP.
Contact details must NEVER be exposed publicly for any listing type. No exceptions. No partial masking. No workarounds permitted.

11.1 Contact Visibility Rule
Only the Name and assigned platform contact number of the internal representative is shown publicly
Actual mobile number, email, and address of broker, owner, or institution are NEVER displayed
Applies to: property listings, buyer requirements, distressed deals, bank auctions, institutional listings

11.2 Zero Bypass Enforcement Mechanisms

Text-Level Blocking
Regex-based auto-detection and rejection before save: mobile numbers (all Indian and international formats), email IDs, website URLs, contact phrases such as 'call me', 'reach at', 'contact', 'whatsapp'
Address leakage prevention: only Area and Locality fields shown publicly full address stored privately, never exposed
Any listing or requirement containing restricted data must be rejected before saving no moderation dependency, fully automated

Image-Level Blocking
Phase 1: basic image validation restrict uploads of known visiting card dimensions and text-heavy images
Phase 2: OCR-based scanning of all uploaded images detect and reject images containing phone numbers, email IDs, and addresses

Institutional Confidentiality Gate
Institution name and identity masked by default - cannot be bypassed by listing user 
Full institutional data only accessible after: Verified Buyer Badge confirmed, NDA signed via platform, Admin approval granted

--- PAGE 30 ---

11.3 No Direct User-to-User Connection
Buyers never connect directly with owners, brokers, or institution management 
All communication routed through platform-controlled representative
Institutional data room accessible only after NDA no direct document sharing between parties

11.4 Implementation by Layer
Database Layer: Contact fields stored in separate secure tables, never joined in public-facing queries
API Layer: No API endpoint returns actual contact data without explicit role authorization check 
Frontend Layer: Contact fields never rendered in any public listing component or search result 
Validation Layer: Input validation rejects content matching contact patterns before any database write
Institutional Layer: NDA status checked and verified before any institutional data query executes

11.5 Future Configurability
The system must support a configurable toggle at system level: Current model (controlled contact - default), Future model (direct contact visibility for paid or verified users at admin discretion).
This must be implemented as a configuration flag, not a structural change.

12. ΜΟΝΕΤTIZATION LAYER
CRM Subscriptions: Monthly and annual SaaS plans for brokers and broker teams primary recurring revenue
NRI Service Plans: Membership fee plus per-service fee for managed NRI property services 
HNI Investment Access: Premium subscription for curated high-value deal flow
Advertising: Homepage banners, featured listings, area promotions
Legal Commissions: Referral fee on legal services booked through platform legal panel 
Loan Referral Commissions: Lead referral commission from bank and NBFC partners 
Insurance Commissions: Referral commission on policies sold through platform
Token and Booking Payments: Phase 2 - booking amount collection via payment gateway 
Transaction Revenue: Phase 2 - deal facilitation fee on closed deals above threshold value 
Institutional Listing Fee: Premium listing fee for schools, colleges, and universities
Institutional Transaction Fee: Fixed fee or percentage of deal value on successful institutional closure
Data Room Fee: Secure document hosting fee per active institutional deal
Institutional Buyer Subscription: PE funds and trusts pay for access to curated institutional deal flow
Institutional Legal Referral: Large-ticket referral commissions for institutional-scale legal work

--- PAGE 31 ---

7
IRM Premium: Advanced investor tracking and deal matching for high-volume investors 
API Access Fee: Phase 2 - builders and broker firms pay for API integration access

13. TECHNOLOGY ARCHITECTURE

13.1 Technology Stack
Frontend: Next.js - SEO optimization, server-side rendering, PWA support 
Backend: Node.js with NestJS - modular, scalable, microservices-ready 
Database: PostgreSQL - relational, multi-tenant with organization_id column on all tenant tables
Cache: Redis session management, hot data caching, notification queues, match result caching
Search: Elasticsearch full-text search, matching engine queries, smart filters
Media: Cloudinary or AWS S3 image compression, optimization, CDN delivery
Payments: Razorpay or Stripe or equivalent PG with webhook support
Messaging: WhatsApp Business API for notifications, intake, and automation
Document Room: Encrypted AWS S3 with role-based IAM policies and NDA-gated presigned URLS

13.2 Architecture Approach
Phase 1: Modular Monolith single deployable unit, fast development, clear module boundaries
Phase 2: Microservices - each engine becomes independently deployable, horizontally scalable

13.3 Al Technology Roadmap
Phase 2
Matching intelligence: ML-based scoring with feedback loops from conversion data 
Fraud detection: behavioral anomaly models and OCR image analysis 
Lead scoring: predictive Hot/Warm/Cold classification based on activity and deal velocity 
Trust scoring: automated multi-weight computation updated on every new interaction 
Deal prediction: closure probability scoring per stage using historical pipeline data 
Document intelligence: document type classification, missing field detection, risk flagging 
Market price intelligence: comparable transaction-based pricing for any area 
Institutional valuation: EBITDA model, enrollment trend analysis, exit potential scoring 
Buyer intent scoring: predict likelihood to transact in next 30 days 
Broker performance prediction: identify high-potential brokers early

13.4 Data Ingestion Engine - Phase 2 (5-Layer Auction Crawler Pipeline)
Layer 1- Crawler: Site-specific crawlers: crawler_sbi.js, crawler_ibapi.js, crawler_mstc.js, plus master scheduler.
Run every 6 to 12 hours via cron.

--- PAGE 32 ---

Layer 2 - Parser: HTML and PDF parsers with regex extraction of price, location, auction date, EMD amount
Layer 3 - Normalization: Standardize price to numeric, dates to ISO 8601, add geo-coordinates, clean text, map property categories
Layer 4 - Filter and Score: Location filter, data completeness filter, price opportunity filter, liquidity filter, risk filter. Assign deal_score 0-100.
Layer 5 - Publishing: Only curated deals with deal_score above threshold published. We do not show all deals.
Only the right deals.
Error handling: failed parsing marked as 'needs_review', duplicates removed, missing fields flagged for manual review.
Institutional distressed assets: identified in crawler output and auto-routed to Institutional Engine for separate display and pipeline.

14. PRODUCT REQUIREMENT DOCUMENT
PRD
SCREEN-BY-SCREEN
This section defines the build requirements for every primary screen on the platform. This is the developer-facing specification.

Screen 1: Login / Signup
Input: Mobile number
Action: OTP sent via SMS
Input: OTP verification
On success: Role selection screen shown
Roles available: Broker, Buyer, Seller, NRI, HNI, Institutional Seller, Institutional Buyer 
New users proceed to onboarding.
Returning users go to Home Dashboard.

Screen 2: Onboarding
Broker onboarding: Area selection (mandatory - multi-select), firm name, RERA number (optional at signup), preferences
Buyer onboarding: Budget range, preferred areas, property type preference, urgency 
NRI onboarding: Country of residence, property interest type, assigned manager introduction
Institutional Seller onboarding: Institution type, location, basic info
Institutional Buyer onboarding: Buyer type (PE Fund / Trust / etc.), budget, geography, intent
First success action guidance shown after onboarding completion

Screen 3: Home Dashboard
Sections shown: Daily market update notification strip

--- PAGE 33 ---

Quick action buttons: Post Property, Post Requirement
Recommended matches feed: Al or rule-based matched listings/requirements for this user
Hot requirements section: highest urgency buyer requirements in user's area 
Latest properties in user's area
Notification bell: unread alerts count
For institutional users: Institutional deals section and my institutional listings

Screen 4: Post Property
Fields required:
Title - text
Property type - dropdown
Deal type - Sale or Rent
Price numeric
Area in sq ft - numeric
Location - area and locality selectors (not free text to prevent address leakage)
Geolocation- lat/long captured via map picker (MANDATORY)
Images - multi-upload with auto-compression
Videos optional

System actions on submission:
Validate: reject if any contact data detected in title, description, or images 
Assign initial trust score based on user profile and listing completeness
Trigger matching engine: run against all active requirements
Push matches to CRM and notifications

Screen 5: Post Requirement
Fields required:
Budget range - minimum and maximum numeric
Location preference area and locality multi-select
Property type - dropdown
Deal type - Sale or Rent
Area requirement in sq ft - range
Urgency - Immediate / Within 30 days / Flexible

System actions on submission:
Auto-tag as Hot, Warm, or Cold based on urgency and budget
Trigger matching engine: run against all active listings
Push matches to CRM of brokers with matching listings

Screen 6: Matching Screen Core Engine Display
Display: Match percentage for each result
Ranked list: highest match score shown first

--- PAGE 34 ---

Hot Match tag shown on results above threshold
Each result shows: property/requirement summary, match score, listing trust score 
Actions: View full details, Contact via platform, Save to CRM, Share for co-broking 
System behavior: auto-refresh when new matches arrive
Institutional matching shown as separate section with dedicated filters

Screen 7: CRM Dashboard
Lead management view: all incoming leads with source, status, score
Pipeline view: Kanban or list view of all active deals by stage
Pipeline stages: Lead, Match, Visit, Negotiation, Legal, Loan, Insurance, Payment, Closure
Deal detail: linked property or institution, linked requirement, documents, activities, timeline
Notes: add call notes, meeting notes, next steps
Follow-up scheduling: set reminder with date and time
Activity log: all actions on this deal shown chronologically
SLA indicator: color-coded warning if stage is approaching or past SLA
For institutional deals: institutional pipeline stages shown with NDA status indicator

Screen 8: Deal Detail Screen
Linked property or institution: summary card with key details
Linked requirement: buyer profile and requirement summary
Timeline: full chronological history of all deal actions
Documents section: all documents linked to this deal with access control
Activities: calls logged, notes added, meetings scheduled
Legal status: legal request status if legal module engaged 
Loan status: loan application status if loan module engaged 
Insurance status: insurance status if insurance module engaged 
Payment status: any token or payment status

Screen 9: Institutional Module
Public view: masked institution listings showing only type, city, enrollment range, price range
Buyer verification gate: prompt to get verified buyer badge before viewing details
NDA gate: NDA signing flow before data room access is unlocked
Private view (post-NDA): full institution details, contact with platform rep, data room access
Data room: document list with view/download controls per document
Deal pipeline tracker: current stage of this institutional deal

Screen 10: Legal / Loan / Insurance

--- PAGE 35 ---

S
Service selection: choose legal, loan, or insurance service
Legal flow: describe requirement, relevant documents auto-linked from repository, lawyer assigned, status tracked
Loan flow: income and property value input, document upload, eligibility check, lender options shown, application submitted
Insurance flow: property details pre-filled, coverage options shown, policy selected, confirmation
All service requests visible in deal pipeline and CRM

Screen 11: Analytics Dashboard
Broker performance: total leads, conversion rate, average response time, deals closed, revenue generated
Deal conversion funnel: leads to match, match to visit, visit to negotiation, negotiation to closure - drop-off at each stage
Area demand: which localities are seeing most requirements posted and most listings claimed
Market trends: price direction by area, transaction volume, hot areas
Institutional analytics (Phase 2): institutional deal pipeline stats, valuation benchmarks

Screen 12: Notification Center
Daily market update: full digest of area activity
Match alerts: new matches for my listings and requirements
Deal-stage alerts: reminders and SLA warnings for active deals
Institutional deal alerts: new institutional listings matched to profile
System alerts: compliance updates, regulatory news
Notification preferences: user can control which types of notifications they receive and via which channel
T

15. API ARCHITECTURE

Authentication APIs
POST/auth/login: Submit mobile number to receive OTP
POST /auth/verify-otp: Submit OTP to receive JWT access token
POST /auth/refresh: Refresh JWT using refresh token

User APIs
GET/user/profile: Get current user's full profile 
PUT/user/profile: Update user profile fields

--- PAGE 36 ---

1
GET /user/:id/trust-score: Get trust score breakdown for a user

Property APIs
POST /properties: Create new property listing - triggers matching engine
GET /properties: List properties with filters search and discovery
GET/properties/:id: Get full property details
PUT/properties/:id: Update property listing
DELETE/properties/:id: Mark property as inactive

Requirement APIs
POST /requirements: Post new buyer requirement - triggers matching engine
GET /requirements: List requirements with filters
GET /requirements/:id: Get requirement details
PUT/requirements/:id: Update requirement

Matching APIs Core Engine
POST /matching/run: Manually trigger matching for a property or requirement ID
GET/matches/property/:id: Get all matches for a property
GET/matches/requirement/:id: Get all matches for a requirement
GET /matches/user/:id: Get all matches relevant to a user (their listings + requirements) 
PUT/matches/:id/status: Update match status accepted, rejected, viewed

CRM APIs
GET /leads: Get all leads for organization filtered by status, score, source
POST /leads: Create new lead manually
PUT /leads/:id: Update lead status, score, or pipeline stage
POST /leads/:id/notes: Add note to lead
POST /leads/:id/followup: Schedule follow-up for lead

Deal APIs
POST/deals: Create new deal linked to property/institution and requirement 
PUT/deals/:id/stage: Advance deal to next pipeline stage - triggers Transaction Orchestration Engine
GET /deals: List all deals for organization with stage filter
GET /deals/:id: Get full deal details including documents, activities, timeline

Institution APIs
POST /institutions: Create institutional listing confidential by default

--- PAGE 37 ---

GET /institutions: List institutional listings - public masked view only 
GET /institutions/:id: Get full institutional details - NDA check enforced 
PUT/institutions/:id: Update institutional listing

NDA APIs
POST/nda/sign: Submit NDA signature for an institutional listing
GET /nda/status: Check NDA status for current user and a specific institution 
GET /nda/:id/access-log: Get access log for this NDA - admin and seller only

Document APIs
POST/documents: Upload document - linked to deal or institution
GET /documents/:deal_id: Get all documents for a deal - access controlled 
GET/documents/:id/presigned-url: Get temporary download URL NDA and role check enforced
DELETE /documents/:id: Soft delete document - audit log retained

Notification APIs
GET /notifications: Get all notifications for current user - paginated 
POST/notifications/send: Admin: send system notification to user segment 
PUT/notifications/:id/read: Mark notification as read
PUT/notifications/preferences: Update notification channel preferences

Analytics APIs
GET /analytics/broker/:id: Get performance metrics for a broker 
GET /analytics/deals: Get deal funnel analytics for organization admin and premium users
GET /analytics/area-demand: Get demand trends by area

System Flow - Step by Step
1. User posts property listing or requirement.
2. System validates: checks for contact data, validates geo-location, assigns initial trust score.
3. Matching engine runs automatically: finds all relevant matches, scores them.
4. Matches stored in matches table with scores and factors.
5. CRM updated: matches appear as hot leads in broker's CRM pipeline.
6. Notifications triggered: broker receives WhatsApp and in-app notification of new matches.
7. Deal created: broker initiates deal from match - deal enters pipeline at Lead stage.
8. Transaction Orchestration Engine monitors deal: SLA tracking, stage auto-triggers. 
9. Deal progresses: Legal verification, Loan processing, Insurance selection, Payment.
10. Closure: agreement executed, payment confirmed, deal record finalized, trust scores updated.

--- PAGE 38 ---

16. BRAND IDENTITY & UI CONTENT

16.1 Brand Identity
Positioning: Real Estate Transaction Operating System 
Tagline 1: "Where Deals Actually Happen" 
Tagline 2: "Beyond Listings. Built for Deals."
Tagline 3: "From Lead to Closure - One Platform"
Tone: Professional but simple. Trust-building. Action-oriented. Not corporate jargon.
Microcopy: Post in 1 minute. Get verified leads. Track every deal. Close faster with confidence.

16.2 Module-Wise Headings, Subtext, and CTAS
Home Page: Heading: India's First Real Estate Deal Execution Platform. Subtext: Connect. Match. Close deals with trust, speed, and intelligence.
CTAs: Post Property | Find Buyers | Explore Deals

User Profile: Heading: Complete Your Profile. Subtext: Build your trusted identity to connect with verified buyers, sellers, and brokers.
CTA: Save and Continue

Property Listing: Heading: Post Your Property in 1 Minute. Subtext: Reach verified buyers instantly and start getting leads.
CTA: Post Property

Requirement: Heading: Post Your Requirement. Subtext: Let brokers and owners find the perfect property for you. CTA: Submit Requirement

Matching Screen: Heading: Your Best Matches. Subtext: Properties and buyers matched based on your needs. CTAs: Contact Now | Save

CRM Dashboard: Heading: Your Deal Dashboard. Subtext: Track leads, manage follow-ups, and close deals faster. CTA: View Pipeline

Trust and Reviews: Heading: Trust and Reviews. Subtext: Build your reputation with verified reviews and completed deals. CTA: View Profile

Due Diligence: Heading: Property Verification and Due Diligence. Subtext: Understand ownership, risks, and legal requirements before deciding. CTA: Start Verification

NRI Module: Heading: NRI Property Services. Subtext: Manage, buy, sell, or rent your property in India from anywhere in the world.
CTA: Manage My Property

Legal Module: Heading: Legal Assistance. Subtext: Get expert help for property verification, agreements, and registration. CTA: Request Legal Support

Loan Module: Heading: Home Loan Assistance. Subtext: Check your eligibility and get the best financing options. CTA: Apply for Loan

Insurance Module: Heading: Protect Your Property. Subtext: Explore insurance options for your property and investment. CTA: Explore Insurance

Payment: Heading: Secure Payments. Subtext: Make safe and seamless payments for services and memberships. CTA: Proceed to Pay

Notifications: Heading: Your Daily Market Update. Content: 12 new properties, 5 new buyers, 2 urgent deals in your area.
CTA: View All

--- PAGE 39 ---

ال
Advertiser: Heading: Promote Your Listings. Subtext: Boost visibility and reach more buyers instantly. CTA: Advertise Now

Analytics: Heading: Performance Insights. Subtext: Track your leads, conversions, and market activity. CTA: View Dashboard

Al Module: Heading: Smart Insights. Subtext: Al-powered recommendations for better investment decisions. CTA: Explore Insights

Institutional Module: Heading: Buy or Sell a School, College or University.
Subtext: India's first structured platform for institutional education asset transactions. CTAs: List Institution | Find Institutions

Fraud Alert: Heading: This Listing is Under Review. Subtext: We are verifying details to ensure accuracy and trust.
CTA: Report Issue

17. SEO & BLOG CONTENT SYSTEM

17.1 Blog Content Categories and Topics
Buyers: Complete guide to buying property in India 2026. Checklist before buying. Stamp duty and registration guide.
Brokers: How to close deals faster. How to handle clients professionally. Co-broking strategies that work.
NRI: How NRIs can buy property in India. Legal and tax rules for NRIs. Property management for NRIs remotely.
Investment: Best areas to invest in 2026. Price trend analysis by city. Rental yield insights. Distressed property investment guide.
Legal and Compliance: Property documents explained. Title verification guide. RERA rules for buyers and sellers.
Fraud Protection: Common property frauds and how to avoid them. Red flags in property listings. How to verify a broker.
Institutional: How to buy a school in India complete guide. Regulatory checklist for college acquisition. Valuing an educational institution - EBITDA vs asset approach. Risks and returns in school and college deals.
How PE funds acquire education assets in India.

17.2 Launch Blog Articles - 12 Ready to Write and Post
Blog 1: Complete Guide to Buying Property in India (2026) 
Blog 2: How to Verify Property Documents in India 
Blog 3: NRI Guide to Buying Property in India
Blog 4: How Brokers Can Close More Deals Faster
Blog 5: Property Investment Guide Best Areas and Trends
Blog 6: Common Property Frauds and How to Avoid Them
Blog 7: Stamp Duty and Registration Charges Explained
Blog 8: How to Sell Property Faster
Blog 9: Home Loan Process Explained Step by Step

--- PAGE 40 ---

Blog 10: Property Insurance Guide for Buyers
Blog 11: How to Buy a School in India - Complete Guide
Blog 12: Valuing a Private College - EBITDA vs Asset Approach

17.3 SEO City Landing Pages
Buy Property in Delhi: South Delhi, Dwarka, Rohini coverage. Latest verified listings. Investment insights.
Buy Property in Gurgaon: Commercial hubs, rental yield data, high-growth sectors.
Buy Property in Noida: Emerging corridors, IT and commercial zones, budget options.
Sell Property in Delhi: Seller-focused page: verified buyer requirements, fast matching.
Flats for Rent in Delhi NCR: Rental listings, area-based filters, direct broker contact via platform.
School for Sale Delhi NCR: Institutional buyer-focused: K-12 listings, acquisition support, regulatory guidance.
College Acquisition India: Regulatory guide, verified institutional listings, deal facilitation explained.

17.4 Core SEO Keywords
Buy property in Delhi, flats in Gurgaon, property investment India, NRI property services 
Bank auction properties India, distressed property deals India, co-broking platform India 
School for sale Delhi, private college acquisition India, buy K-12 school, university campus for sale, acquire engineering college India

18. WEBSITE STRUCTURE FULL SITEMAP

Core Pages
Home, About, Contact

User Landing Pages
Broker Page, Buyer Page, Seller Page, NRI Page, HNI Investor Page 
Institutional Page: Buy or Sell a School, College or University

Functional Pages
Post Property, Post Requirement, Post Institutional Listing, Dashboard, CRM

--- PAGE 41 ---

Service Pages
Legal Services, Loan Assistance, Insurance, Due Diligence, Document Repository

Content Pages
Blog, Guides, Investment Reports, Institutional Acquisition Guides

SEO City Pages
Buy Property in [City], Sell Property in [City], Rent Property in [City] one page per major city
School for Sale [City], Acquire College [City], University Campus for Sale one page per major city

Business Pages
Advertise, Pricing and Subscriptions, Partner with Us

19. COMPLIANCE FRAMEWORK & FINAL POSITIONING

19.1 What AR Buildwel Is and Is Not
AR Buildwel is an information and facilitation platform only. It is NOT a real estate agent, financial advisor, legal advisor, education regulator, or SEBI-registered entity.
All transactions on the platform are subject to independent verification by the parties involved.

19.2 Mandatory Disclaimers by Context
All property listings: Verify independently before transacting. Platform does not guarantee accuracy of listing data.
Auction data: Sourced from public auction notices. Verify with the auctioning institution before bidding.
Al outputs: Indicative guidance only. Not financial or legal advice. Consult a qualified professional.
Distressed deals: Special situation property. Independent legal and financial due diligence is required before proceeding.
Institutional deals: Institutional asset transactions involve complex regulatory, legal, and financial considerations.
Engage a qualified CA, legal counsel, and regulatory expert before entering any agreement.
Investment guidance: ROI, yield, and appreciation projections are indicative and based on available data. Not guaranteed. Not investment advice.

--- PAGE 42 ---

19.3 Data and Privacy
Zero public display of contact details across all user types and listing types 
Institutional data shared only after NDA execution via platform - no exceptions 
DPDP Act (India) 2023 compliance baseline built into architecture from Phase 1 
All users solely responsible for accuracy of information they submit
Platform disclaims all liability for misrepresentation, fraud, or false claims by any user

19.4 Success Metrics - Both Phases
WhatsApp to Platform Conversion: Active daily user flow from WhatsApp intake to platform engagement
CRM Daily Usage: Brokers managing leads inside CRM every working day 
Deal Closures: End-to-end deal execution tracked and completed on platform
Trust Badge Adoption: Verified profile badges adopted by majority of active brokers 
Investor Onboarding: NRI, HNI, and Institutional buyer registrations growing month on month 
Distressed Deal Pipeline: Curated distressed deal listings active and converting 
SEO Traffic: Organic traffic from city pages, area pages, and institutional keyword pages 
Mobile and PWA Usage: Majority of active users accessing via mobile or installed PWA 
Institutional Listings Live: Active K-12, college, and university listings on platform 
Institutional Deal Closures: Revenue from transaction advisory fees on institutional deal closures
Phase 2 Al Activation: Al matching, fraud detection, and valuation systems live and measurably improving outcomes
Phase 2 Automation: Auction data ingestion pipeline running without manual intervention

19.5 Final Platform Positioning

AR BUILDWEL IS:
Deal Engine - structured pipeline, deal execution from lead to legal closure
Trust Engine - verified identities, reputation scoring, fraud detection, dispute resolution
Network Engine - broker graph, co-broking ecosystem, referral infrastructure 
Investment Engine - NRI services, HNI deal flow, distressed deals, bank auctions 
Financial Engine loan, insurance, payment gateway, escrow integration 
Intelligence Engine - Al matching, market trends, deal prediction, investment guidance 
Institutional Engine schools, colleges, universities first structured platform in India