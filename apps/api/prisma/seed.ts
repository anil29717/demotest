import {
  DealStage,
  DealType,
  LeadStatus,
  MatchStatus,
  OrgRole,
  PrismaClient,
  PropertyType,
  Urgency,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

function isSchemaMismatchError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const maybeCode = (error as { code?: string }).code;
  return maybeCode === 'P2021' || maybeCode === 'P2022';
}

async function optionalSeedStep(stepName: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      console.warn(`Skipping ${stepName}: schema mismatch in current database.`);
      return;
    }
    throw error;
  }
}

async function seedUsers() {
  const users = [
    {
      id: 'demo_user_admin',
      phoneHash: 'demo_hash_admin',
      phoneEnc: '+91-9000000001',
      email: 'admin.demo@arbuildwel.local',
      name: 'Demo Admin',
      role: UserRole.ADMIN,
      verified: true,
      trustScore: 93,
      reputationScore: 91,
      onboardingStep: 'completed',
      serviceAreas: ['Mumbai', 'Pune'],
    },
    {
      id: 'demo_user_broker_1',
      phoneHash: 'demo_hash_broker_1',
      phoneEnc: '+91-9000000002',
      email: 'broker1.demo@arbuildwel.local',
      name: 'Rohan Broker',
      role: UserRole.BROKER,
      verified: true,
      trustScore: 82,
      reputationScore: 76,
      onboardingStep: 'completed',
      reraId: 'RERA-MH-1101',
      serviceAreas: ['Mumbai', 'Thane'],
      notificationPrefs: {
        matchAlerts: true,
        dailyDigest: true,
        digestHourLocal: 9,
        digestMinuteLocal: 30,
        whatsappDigest: true,
        whatsappDigestTo: '9000000002',
      },
    },
    {
      id: 'demo_user_broker_2',
      phoneHash: 'demo_hash_broker_2',
      phoneEnc: '+91-9000000003',
      email: 'broker2.demo@arbuildwel.local',
      name: 'Neha Broker',
      role: UserRole.BROKER,
      verified: true,
      trustScore: 79,
      reputationScore: 74,
      onboardingStep: 'completed',
      reraId: 'RERA-MH-1102',
      serviceAreas: ['Bengaluru'],
      notificationPrefs: {
        matchAlerts: true,
        dailyDigest: false,
        whatsappDigest: false,
      },
    },
    {
      id: 'demo_user_buyer',
      phoneHash: 'demo_hash_buyer',
      phoneEnc: '+91-9000000004',
      email: 'buyer.demo@arbuildwel.local',
      name: 'Asha Buyer',
      role: UserRole.BUYER,
      verified: true,
      trustScore: 67,
      reputationScore: 62,
      onboardingStep: 'active',
      serviceAreas: ['Mumbai'],
      notificationPrefs: {
        matchAlerts: true,
        dailyDigest: true,
        digestHourLocal: 8,
        digestMinuteLocal: 45,
      },
    },
    {
      id: 'demo_user_seller',
      phoneHash: 'demo_hash_seller',
      phoneEnc: '+91-9000000005',
      email: 'seller.demo@arbuildwel.local',
      name: 'Vikram Seller',
      role: UserRole.SELLER,
      verified: true,
      trustScore: 70,
      reputationScore: 68,
      onboardingStep: 'active',
      serviceAreas: ['Pune'],
    },
    {
      id: 'demo_user_nri',
      phoneHash: 'demo_hash_nri',
      phoneEnc: '+1-555-0101',
      email: 'nri.demo@arbuildwel.local',
      name: 'Ananya NRI',
      role: UserRole.NRI,
      verified: true,
      trustScore: 75,
      reputationScore: 71,
      serviceAreas: ['Mumbai', 'Hyderabad'],
    },
    {
      id: 'demo_user_hni',
      phoneHash: 'demo_hash_hni',
      phoneEnc: '+91-9000000006',
      email: 'hni.demo@arbuildwel.local',
      name: 'Karan HNI',
      role: UserRole.HNI,
      verified: true,
      trustScore: 84,
      reputationScore: 83,
      serviceAreas: ['Delhi', 'Gurugram'],
    },
    {
      id: 'demo_user_inst_buyer',
      phoneHash: 'demo_hash_inst_buyer',
      phoneEnc: '+91-9000000007',
      email: 'instbuyer.demo@arbuildwel.local',
      name: 'Institution Buyer',
      role: UserRole.INSTITUTIONAL_BUYER,
      verified: true,
      trustScore: 88,
      reputationScore: 85,
      serviceAreas: ['Bengaluru'],
    },
    {
      id: 'demo_user_inst_seller',
      phoneHash: 'demo_hash_inst_seller',
      phoneEnc: '+91-9000000008',
      email: 'instseller.demo@arbuildwel.local',
      name: 'Institution Seller',
      role: UserRole.INSTITUTIONAL_SELLER,
      verified: true,
      trustScore: 86,
      reputationScore: 82,
      serviceAreas: ['Chennai'],
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }
}

async function seedOrganizations() {
  await prisma.organization.upsert({
    where: { id: 'demo_org_alpha' },
    update: { name: 'Alpha Realty Network', reraNumber: 'RERA-ALPHA-01', gstNumber: '27ABCDE1234F1Z5' },
    create: {
      id: 'demo_org_alpha',
      name: 'Alpha Realty Network',
      reraNumber: 'RERA-ALPHA-01',
      gstNumber: '27ABCDE1234F1Z5',
    },
  });

  await prisma.organization.upsert({
    where: { id: 'demo_org_institution' },
    update: { name: 'Institution Desk India', reraNumber: 'RERA-INST-09', gstNumber: '29ABCDE9999F1Z5' },
    create: {
      id: 'demo_org_institution',
      name: 'Institution Desk India',
      reraNumber: 'RERA-INST-09',
      gstNumber: '29ABCDE9999F1Z5',
    },
  });

  const orgMembers = [
    { organizationId: 'demo_org_alpha', userId: 'demo_user_admin', role: OrgRole.ADMIN },
    { organizationId: 'demo_org_alpha', userId: 'demo_user_broker_1', role: OrgRole.ADMIN },
    { organizationId: 'demo_org_alpha', userId: 'demo_user_broker_2', role: OrgRole.AGENT },
    { organizationId: 'demo_org_institution', userId: 'demo_user_inst_seller', role: OrgRole.ADMIN },
    { organizationId: 'demo_org_institution', userId: 'demo_user_inst_buyer', role: OrgRole.VIEWER },
  ];

  for (const member of orgMembers) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: member.organizationId,
          userId: member.userId,
        },
      },
      update: { role: member.role },
      create: member,
    });
  }
}

async function seedPropertiesAndRequirements() {
  const properties = [
    {
      id: 'demo_prop_mumbai_office',
      organizationId: 'demo_org_alpha',
      postedById: 'demo_user_broker_1',
      title: 'BKC Grade-A Office Floor',
      description: 'Ready office floor with parking and metro access.',
      propertyType: PropertyType.COMMERCIAL,
      dealType: DealType.SALE,
      price: '185000000',
      areaSqft: 4200,
      city: 'Mumbai',
      areaPublic: 'Bandra Kurla Complex',
      localityPublic: 'BKC',
      addressPrivate: 'Block C, BKC, Mumbai',
      latitude: 19.0604,
      longitude: 72.8696,
      trustScore: 84,
      status: 'active',
      distressedLabel: 'standard',
      isBankAuction: false,
      imageUrls: ['/demo/property-bkc-1.jpg'],
    },
    {
      id: 'demo_prop_pune_plot',
      organizationId: 'demo_org_alpha',
      postedById: 'demo_user_seller',
      title: 'Distressed Development Plot',
      description: 'Clear title plot suited for mixed-use development.',
      propertyType: PropertyType.PLOT,
      dealType: DealType.SALE,
      price: '68000000',
      areaSqft: 12000,
      city: 'Pune',
      areaPublic: 'Baner',
      localityPublic: 'Balewadi-Baner Road',
      addressPrivate: 'Plot 44, Baner, Pune',
      latitude: 18.5636,
      longitude: 73.7798,
      trustScore: 73,
      status: 'active',
      distressedLabel: 'high_opportunity',
      isBankAuction: false,
      imageUrls: ['/demo/property-pune-plot.jpg'],
    },
    {
      id: 'demo_prop_blr_auction',
      organizationId: 'demo_org_institution',
      postedById: 'demo_user_inst_seller',
      title: 'Bank Auction Industrial Shed',
      description: 'Auction-ready industrial asset with DD pack.',
      propertyType: PropertyType.INSTITUTIONAL,
      dealType: DealType.SALE,
      price: '245000000',
      areaSqft: 18500,
      city: 'Bengaluru',
      areaPublic: 'Peenya',
      localityPublic: 'Peenya Phase 2',
      addressPrivate: 'Survey 110, Peenya, Bengaluru',
      latitude: 13.036,
      longitude: 77.5145,
      trustScore: 88,
      status: 'active',
      distressedLabel: 'auction',
      isBankAuction: true,
      imageUrls: ['/demo/property-blr-auction.jpg'],
    },
    {
      id: 'demo_prop_hyd_resi_rent',
      organizationId: 'demo_org_alpha',
      postedById: 'demo_user_broker_2',
      title: 'Premium 3BHK in Gachibowli',
      description: 'Semi-furnished apartment in gated community.',
      propertyType: PropertyType.RESIDENTIAL,
      dealType: DealType.RENT,
      price: '120000',
      areaSqft: 2200,
      city: 'Hyderabad',
      areaPublic: 'Gachibowli',
      localityPublic: 'Financial District',
      addressPrivate: 'Tower 7, Gachibowli, Hyderabad',
      latitude: 17.4435,
      longitude: 78.3772,
      trustScore: 78,
      status: 'active',
      distressedLabel: 'standard',
      isBankAuction: false,
      imageUrls: ['/demo/property-hyd-rent.jpg'],
    },
    {
      id: 'demo_prop_delhi_commercial',
      organizationId: 'demo_org_alpha',
      postedById: 'demo_user_broker_1',
      title: 'Connaught Place Retail Block',
      description: 'High-footfall retail unit with long-term tenants.',
      propertyType: PropertyType.COMMERCIAL,
      dealType: DealType.SALE,
      price: '325000000',
      areaSqft: 3100,
      city: 'Delhi',
      areaPublic: 'Connaught Place',
      localityPublic: 'Inner Circle',
      addressPrivate: 'Block N, Connaught Place, Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      trustScore: 86,
      status: 'active',
      distressedLabel: 'standard',
      isBankAuction: false,
      imageUrls: ['/demo/property-delhi-retail.jpg'],
    },
  ];

  for (const property of properties) {
    await prisma.property.upsert({
      where: { id: property.id },
      update: property,
      create: property,
    });
  }

  const requirements = [
    {
      id: 'demo_req_buyer_mumbai',
      userId: 'demo_user_buyer',
      budgetMin: '150000000',
      budgetMax: '220000000',
      city: 'Mumbai',
      areas: ['BKC', 'Lower Parel'],
      propertyType: PropertyType.COMMERCIAL,
      dealType: DealType.SALE,
      areaSqftMin: 2500,
      areaSqftMax: 5000,
      urgency: Urgency.WITHIN_30_DAYS,
      tag: 'HOT',
      active: true,
    },
    {
      id: 'demo_req_hni_delhi',
      userId: 'demo_user_hni',
      budgetMin: '250000000',
      budgetMax: '500000000',
      city: 'Delhi',
      areas: ['Connaught Place', 'Aerocity'],
      propertyType: PropertyType.COMMERCIAL,
      dealType: DealType.SALE,
      areaSqftMin: 2000,
      areaSqftMax: 5000,
      urgency: Urgency.FLEXIBLE,
      tag: 'WARM',
      active: true,
    },
    {
      id: 'demo_req_nri_hyd',
      userId: 'demo_user_nri',
      budgetMin: '90000',
      budgetMax: '150000',
      city: 'Hyderabad',
      areas: ['Gachibowli', 'Kondapur'],
      propertyType: PropertyType.RESIDENTIAL,
      dealType: DealType.RENT,
      areaSqftMin: 1500,
      areaSqftMax: 2600,
      urgency: Urgency.IMMEDIATE,
      tag: 'HOT',
      active: true,
    },
    {
      id: 'demo_req_inst_blr',
      userId: 'demo_user_inst_buyer',
      budgetMin: '200000000',
      budgetMax: '320000000',
      city: 'Bengaluru',
      areas: ['Peenya'],
      propertyType: PropertyType.INSTITUTIONAL,
      dealType: DealType.SALE,
      areaSqftMin: 12000,
      areaSqftMax: 25000,
      urgency: Urgency.WITHIN_30_DAYS,
      tag: 'WARM',
      active: true,
    },
  ];

  for (const requirement of requirements) {
    await prisma.requirement.upsert({
      where: { id: requirement.id },
      update: requirement,
      create: requirement,
    });
  }
}

async function seedCoreExecution() {
  const matches = [
    {
      propertyId: 'demo_prop_mumbai_office',
      requirementId: 'demo_req_buyer_mumbai',
      matchScore: 92,
      matchFactors: { city: true, price: true, sqft: true, type: true },
      status: MatchStatus.ACCEPTED,
      hotMatch: true,
    },
    {
      propertyId: 'demo_prop_delhi_commercial',
      requirementId: 'demo_req_hni_delhi',
      matchScore: 88,
      matchFactors: { city: true, price: true, sqft: true, type: true },
      status: MatchStatus.ACTIVE,
      hotMatch: true,
    },
    {
      propertyId: 'demo_prop_hyd_resi_rent',
      requirementId: 'demo_req_nri_hyd',
      matchScore: 90,
      matchFactors: { city: true, price: true, sqft: true, type: true },
      status: MatchStatus.VIEWED,
      hotMatch: true,
    },
    {
      propertyId: 'demo_prop_blr_auction',
      requirementId: 'demo_req_inst_blr',
      matchScore: 87,
      matchFactors: { city: true, price: true, sqft: true, type: true, auction: true },
      status: MatchStatus.ACTIVE,
      hotMatch: true,
    },
  ];

  for (const match of matches) {
    await prisma.match.upsert({
      where: {
        propertyId_requirementId: {
          propertyId: match.propertyId,
          requirementId: match.requirementId,
        },
      },
      update: match,
      create: match,
    });
  }

  const leads = [
    {
      id: 'demo_lead_1',
      organizationId: 'demo_org_alpha',
      ownerId: 'demo_user_broker_1',
      leadName: 'Asha Buyer',
      phoneEnc: '+91-9000000004',
      source: 'whatsapp',
      status: LeadStatus.HOT,
      pipelineStage: 'contacted',
      propertyId: 'demo_prop_mumbai_office',
      requirementId: 'demo_req_buyer_mumbai',
    },
    {
      id: 'demo_lead_2',
      organizationId: 'demo_org_alpha',
      ownerId: 'demo_user_broker_2',
      leadName: 'Ananya NRI',
      phoneEnc: '+1-555-0101',
      source: 'web',
      status: LeadStatus.WARM,
      pipelineStage: 'site_visit',
      propertyId: 'demo_prop_hyd_resi_rent',
      requirementId: 'demo_req_nri_hyd',
    },
    {
      id: 'demo_lead_3',
      organizationId: 'demo_org_institution',
      ownerId: 'demo_user_inst_seller',
      leadName: 'Institution Buyer',
      phoneEnc: '+91-9000000007',
      source: 'referral',
      status: LeadStatus.HOT,
      pipelineStage: 'negotiation',
      propertyId: 'demo_prop_blr_auction',
      requirementId: 'demo_req_inst_blr',
    },
  ];

  for (const lead of leads) {
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: lead,
      create: lead,
    });
  }

  await prisma.leadNote.upsert({
    where: { id: 'demo_lead_note_1' },
    update: { body: 'Buyer asked for rent-roll and maintenance ledger.' },
    create: {
      id: 'demo_lead_note_1',
      leadId: 'demo_lead_1',
      userId: 'demo_user_broker_1',
      body: 'Buyer asked for rent-roll and maintenance ledger.',
    },
  });

  const tomorrowAtNoon = new Date();
  tomorrowAtNoon.setDate(tomorrowAtNoon.getDate() + 1);
  tomorrowAtNoon.setHours(12, 0, 0, 0);

  await prisma.leadFollowUp.upsert({
    where: { id: 'demo_followup_1' },
    update: { dueAt: tomorrowAtNoon, note: 'Share revised offer and arrange second visit.' },
    create: {
      id: 'demo_followup_1',
      leadId: 'demo_lead_1',
      userId: 'demo_user_broker_1',
      dueAt: tomorrowAtNoon,
      note: 'Share revised offer and arrange second visit.',
      completed: false,
    },
  });

  const deals = [
    {
      id: 'demo_deal_1',
      organizationId: 'demo_org_alpha',
      propertyId: 'demo_prop_mumbai_office',
      requirementId: 'demo_req_buyer_mumbai',
      stage: DealStage.NEGOTIATION,
      valueInr: '182000000',
      slaBreachCount: 0,
      dealHealthScore: 82,
      coBrokerInviteEmail: 'cobroker.mumbai@arbuildwel.local',
      commissionSplitPct: 25,
    },
    {
      id: 'demo_deal_2',
      organizationId: 'demo_org_alpha',
      propertyId: 'demo_prop_hyd_resi_rent',
      requirementId: 'demo_req_nri_hyd',
      stage: DealStage.SITE_VISIT,
      valueInr: '135000',
      slaBreachCount: 1,
      dealHealthScore: 71,
      coBrokerInviteEmail: null,
      commissionSplitPct: null,
    },
    {
      id: 'demo_deal_3',
      organizationId: 'demo_org_institution',
      propertyId: 'demo_prop_blr_auction',
      requirementId: 'demo_req_inst_blr',
      stage: DealStage.LEGAL,
      valueInr: '238000000',
      slaBreachCount: 0,
      dealHealthScore: 88,
      coBrokerInviteEmail: 'inst.partner@arbuildwel.local',
      commissionSplitPct: 15,
    },
  ];

  for (const deal of deals) {
    await prisma.deal.upsert({
      where: { id: deal.id },
      update: deal,
      create: deal,
    });
  }
}

async function seedSupportingModules() {
  const notifications = [
    {
      id: 'demo_notif_1',
      userId: 'demo_user_buyer',
      channel: 'in_app',
      title: 'New hot match in Mumbai',
      body: 'A Grade-A office floor in BKC matches your requirement.',
      read: false,
    },
    {
      id: 'demo_notif_2',
      userId: 'demo_user_broker_1',
      channel: 'in_app',
      title: 'Deal advanced to negotiation',
      body: 'Deal demo_deal_1 moved to NEGOTIATION.',
      read: true,
    },
    {
      id: 'demo_notif_3',
      userId: 'demo_user_nri',
      channel: 'whatsapp',
      title: 'Daily digest',
      body: '1 new rental match in Hyderabad and 1 pending follow-up.',
      read: false,
    },
  ];

  for (const notification of notifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: notification,
      create: notification,
    });
  }

  await optionalSeedStep('SavedSearch', async () => {
    await prisma.savedSearch.upsert({
      where: { id: 'demo_saved_search_1' },
      update: {
        name: 'Mumbai Offices 1.5Cr-2.2Cr',
        filters: {
          city: 'Mumbai',
          propertyType: 'COMMERCIAL',
          dealType: 'SALE',
          budgetMin: 150000000,
          budgetMax: 220000000,
        },
      },
      create: {
        id: 'demo_saved_search_1',
        userId: 'demo_user_buyer',
        name: 'Mumbai Offices 1.5Cr-2.2Cr',
        filters: {
          city: 'Mumbai',
          propertyType: 'COMMERCIAL',
          dealType: 'SALE',
          budgetMin: 150000000,
          budgetMax: 220000000,
        },
      },
    });
  });

  const activityLogs = [
    {
      id: 'demo_activity_1',
      userId: 'demo_user_broker_1',
      action: 'DEAL_STAGE_ADVANCED',
      entityType: 'Deal',
      entityId: 'demo_deal_1',
      metadata: { from: 'SITE_VISIT', to: 'NEGOTIATION' },
      ipAddress: '10.0.0.11',
    },
    {
      id: 'demo_activity_2',
      userId: 'demo_user_admin',
      action: 'FRAUD_CASE_REVIEWED',
      entityType: 'FraudCase',
      entityId: 'demo_fraud_1',
      metadata: { status: 'review' },
      ipAddress: '10.0.0.12',
    },
  ];

  for (const activity of activityLogs) {
    await prisma.activityLog.upsert({
      where: { id: activity.id },
      update: activity,
      create: activity,
    });
  }

  const institutions = [
    {
      id: 'demo_inst_1',
      postedById: 'demo_user_inst_seller',
      institutionName: 'Bright Future School Chain',
      institutionType: 'school',
      city: 'Bengaluru',
      maskedSummary: 'South-zone school campus portfolio.',
      askingPriceCr: '32.5000',
      studentEnrollment: 2400,
      latitude: 12.9716,
      longitude: 77.5946,
      confidential: true,
      ndaRequired: true,
      verificationStatus: 'verified',
      dealScore: 79,
    },
    {
      id: 'demo_inst_2',
      postedById: 'demo_user_inst_seller',
      institutionName: 'Metro Healthcare Assets',
      institutionType: 'hospital',
      city: 'Chennai',
      maskedSummary: 'Multi-city healthcare assets pipeline.',
      askingPriceCr: '58.0000',
      studentEnrollment: null,
      latitude: 13.0827,
      longitude: 80.2707,
      confidential: true,
      ndaRequired: true,
      verificationStatus: 'verified',
      dealScore: 84,
    },
  ];

  for (const institution of institutions) {
    await prisma.institution.upsert({
      where: { id: institution.id },
      update: institution,
      create: institution,
    });
  }

  const ndas = [
    {
      userId: 'demo_user_inst_buyer',
      institutionId: 'demo_inst_1',
      status: 'signed',
      signedAt: new Date('2026-04-20T10:00:00.000Z'),
      ipAddress: '10.0.0.44',
    },
    {
      userId: 'demo_user_admin',
      institutionId: 'demo_inst_2',
      status: 'pending',
      signedAt: null,
      ipAddress: null,
    },
  ];

  for (const nda of ndas) {
    await prisma.nda.upsert({
      where: {
        userId_institutionId: {
          userId: nda.userId,
          institutionId: nda.institutionId,
        },
      },
      update: nda,
      create: nda,
    });
  }

  const documents = [
    {
      id: 'demo_doc_1',
      dealId: 'demo_deal_1',
      institutionId: null,
      type: 'title_deed',
      storageKey: 'demo/deals/demo_deal_1/title-deed.pdf',
      uploadedById: 'demo_user_broker_1',
      version: 2,
      accessLevel: 'internal',
      downloadAllowed: true,
    },
    {
      id: 'demo_doc_2',
      dealId: null,
      institutionId: 'demo_inst_1',
      type: 'financials',
      storageKey: 'demo/institutions/demo_inst_1/financials.pdf',
      uploadedById: 'demo_user_inst_seller',
      version: 1,
      accessLevel: 'nda_required',
      downloadAllowed: false,
    },
    {
      id: 'demo_doc_3',
      dealId: 'demo_deal_3',
      institutionId: 'demo_inst_1',
      type: 'dd_checklist',
      storageKey: 'demo/deals/demo_deal_3/dd-checklist.xlsx',
      uploadedById: 'demo_user_admin',
      version: 1,
      accessLevel: 'admin',
      downloadAllowed: false,
    },
  ];

  for (const document of documents) {
    await prisma.document.upsert({
      where: { id: document.id },
      update: document,
      create: document,
    });
  }

  await optionalSeedStep('FraudCase', async () => {
    await prisma.fraudCase.upsert({
      where: { id: 'demo_fraud_1' },
      update: {
        subjectUserId: 'demo_user_seller',
        propertyId: 'demo_prop_pune_plot',
        dealId: null,
        status: 'review',
        score: 72,
        reason: 'Duplicate title snippets detected across two listings.',
        resolvedById: null,
      },
      create: {
        id: 'demo_fraud_1',
        subjectUserId: 'demo_user_seller',
        propertyId: 'demo_prop_pune_plot',
        dealId: null,
        status: 'review',
        score: 72,
        reason: 'Duplicate title snippets detected across two listings.',
        resolvedById: null,
      },
    });

    await prisma.fraudCase.upsert({
      where: { id: 'demo_fraud_2' },
      update: {
        subjectUserId: 'demo_user_broker_2',
        propertyId: 'demo_prop_hyd_resi_rent',
        dealId: 'demo_deal_2',
        status: 'open',
        score: 44,
        reason: 'Velocity spike from repeated edits in short interval.',
        resolvedById: null,
      },
      create: {
        id: 'demo_fraud_2',
        subjectUserId: 'demo_user_broker_2',
        propertyId: 'demo_prop_hyd_resi_rent',
        dealId: 'demo_deal_2',
        status: 'open',
        score: 44,
        reason: 'Velocity spike from repeated edits in short interval.',
        resolvedById: null,
      },
    });
  });

  const reviews = [
    {
      id: 'demo_review_1',
      reviewerId: 'demo_user_buyer',
      targetUserId: 'demo_user_broker_1',
      propertyId: 'demo_prop_mumbai_office',
      rating: 5,
      comment: 'Very responsive and transparent during negotiation.',
      status: 'approved',
    },
    {
      id: 'demo_review_2',
      reviewerId: 'demo_user_nri',
      targetUserId: 'demo_user_broker_2',
      propertyId: 'demo_prop_hyd_resi_rent',
      rating: 4,
      comment: 'Good local support and virtual walkthrough quality.',
      status: 'pending',
    },
    {
      id: 'demo_review_3',
      reviewerId: 'demo_user_inst_buyer',
      targetUserId: 'demo_user_inst_seller',
      propertyId: 'demo_prop_blr_auction',
      rating: 4,
      comment: 'Institution pack was complete and timely.',
      status: 'approved',
    },
  ];

  for (const review of reviews) {
    await prisma.review.upsert({
      where: { id: review.id },
      update: review,
      create: review,
    });
  }

  const partners = [
    { id: 'demo_partner_legal', type: 'legal', name: 'LexBridge Partners', verified: true },
    { id: 'demo_partner_loan', type: 'loan', name: 'FinanceFlow Advisory', verified: true },
  ];

  for (const partner of partners) {
    await prisma.partner.upsert({
      where: { id: partner.id },
      update: partner,
      create: partner,
    });
  }

  const serviceRequests = [
    {
      id: 'demo_sr_1',
      organizationId: 'demo_org_alpha',
      dealId: 'demo_deal_1',
      type: 'legal',
      status: 'in_progress',
      partnerId: 'demo_partner_legal',
    },
    {
      id: 'demo_sr_2',
      organizationId: 'demo_org_alpha',
      dealId: 'demo_deal_2',
      type: 'insurance',
      status: 'open',
      partnerId: null,
    },
    {
      id: 'demo_sr_3',
      organizationId: 'demo_org_institution',
      dealId: 'demo_deal_3',
      type: 'loan',
      status: 'assigned',
      partnerId: 'demo_partner_loan',
    },
  ];

  for (const request of serviceRequests) {
    await prisma.serviceRequest.upsert({
      where: { id: request.id },
      update: request,
      create: request,
    });
  }

  await prisma.nriProfile.upsert({
    where: { userId: 'demo_user_nri' },
    update: {
      country: 'United States',
      assignedManager: 'demo_user_broker_2',
      serviceNotes: 'Prefers evening IST updates and video-first walkthroughs.',
    },
    create: {
      userId: 'demo_user_nri',
      country: 'United States',
      assignedManager: 'demo_user_broker_2',
      serviceNotes: 'Prefers evening IST updates and video-first walkthroughs.',
    },
  });

  await prisma.hniProfile.upsert({
    where: { userId: 'demo_user_hni' },
    update: {
      ticketMinCr: 25,
      ticketMaxCr: 55,
      preferences: { preferredCities: ['Delhi', 'Mumbai'], assetClass: ['commercial'] },
    },
    create: {
      userId: 'demo_user_hni',
      ticketMinCr: 25,
      ticketMaxCr: 55,
      preferences: { preferredCities: ['Delhi', 'Mumbai'], assetClass: ['commercial'] },
    },
  });

  await optionalSeedStep('InvestorPreference', async () => {
    await prisma.investorPreference.upsert({
      where: { userId: 'demo_user_hni' },
      update: {
        assetClasses: ['commercial', 'institutional'],
        minTicketCr: 20,
        maxTicketCr: 60,
        geography: ['Delhi', 'Mumbai', 'Bengaluru'],
      },
      create: {
        userId: 'demo_user_hni',
        assetClasses: ['commercial', 'institutional'],
        minTicketCr: 20,
        maxTicketCr: 60,
        geography: ['Delhi', 'Mumbai', 'Bengaluru'],
      },
    });
  });

  await optionalSeedStep('AuctionListing', async () => {
    await prisma.auctionListing.upsert({
      where: { id: 'demo_auction_1' },
      update: {
        source: 'bank_portal',
        title: 'Auction Notice: Industrial Asset Bengaluru',
        city: 'Bengaluru',
        auctionDate: new Date('2026-05-05T10:30:00.000Z'),
        emdAmount: '12500000',
        startPrice: '210000000',
        metadata: { branch: 'Peenya', reference: 'AUC-2026-05-001' },
      },
      create: {
        id: 'demo_auction_1',
        source: 'bank_portal',
        title: 'Auction Notice: Industrial Asset Bengaluru',
        city: 'Bengaluru',
        auctionDate: new Date('2026-05-05T10:30:00.000Z'),
        emdAmount: '12500000',
        startPrice: '210000000',
        metadata: { branch: 'Peenya', reference: 'AUC-2026-05-001' },
      },
    });
  });

  await optionalSeedStep('WhatsAppIngest', async () => {
    await prisma.whatsAppIngest.upsert({
      where: { dedupeKey: 'demo_whatsapp_msg_001' },
      update: {
        rawPayload: { from: '9000000004', text: 'Need office in BKC', id: 'demo_whatsapp_msg_001' },
        intent: 'inquiry_text',
        leadId: 'demo_lead_1',
        messageType: 'text',
        fromWaId: '9000000004',
      },
      create: {
        id: 'demo_whatsapp_ingest_1',
        dedupeKey: 'demo_whatsapp_msg_001',
        rawPayload: { from: '9000000004', text: 'Need office in BKC', id: 'demo_whatsapp_msg_001' },
        intent: 'inquiry_text',
        leadId: 'demo_lead_1',
        messageType: 'text',
        fromWaId: '9000000004',
      },
    });
  });

  const extraLeads = [
    {
      id: 'demo_lead_4',
      organizationId: 'demo_org_alpha',
      ownerId: 'demo_user_broker_1',
      leadName: 'Priya Sharma',
      source: 'whatsapp',
      status: LeadStatus.WARM,
      pipelineStage: 'site_visit',
      propertyId: 'demo_prop_mumbai_office',
      requirementId: 'demo_req_buyer_mumbai',
    },
    {
      id: 'demo_lead_5',
      organizationId: 'demo_org_alpha',
      ownerId: 'demo_user_broker_1',
      leadName: 'Rahul Mehta',
      source: 'portal',
      status: LeadStatus.HOT,
      pipelineStage: 'negotiation',
      propertyId: 'demo_prop_delhi_commercial',
      requirementId: 'demo_req_hni_delhi',
    },
    {
      id: 'demo_lead_6',
      organizationId: 'demo_org_alpha',
      ownerId: 'demo_user_broker_1',
      leadName: 'Anita Patel',
      source: 'manual',
      status: LeadStatus.WARM,
      pipelineStage: 'legal',
      propertyId: 'demo_prop_pune_plot',
      requirementId: 'demo_req_buyer_mumbai',
    },
    {
      id: 'demo_lead_7',
      organizationId: 'demo_org_alpha',
      ownerId: 'demo_user_broker_1',
      leadName: 'Vikram Singh',
      source: 'referral',
      status: LeadStatus.WARM,
      pipelineStage: 'match',
      propertyId: 'demo_prop_hyd_resi_rent',
      requirementId: 'demo_req_nri_hyd',
    },
    {
      id: 'demo_lead_8',
      organizationId: 'demo_org_alpha',
      ownerId: 'demo_user_broker_1',
      leadName: 'Deepa Nair',
      source: 'whatsapp',
      status: LeadStatus.CONVERTED,
      pipelineStage: 'closure',
      propertyId: 'demo_prop_delhi_commercial',
      requirementId: 'demo_req_hni_delhi',
    },
  ];

  for (const lead of extraLeads) {
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: lead,
      create: lead,
    });
  }

  const extraDeals = [
    {
      id: 'demo_deal_4',
      organizationId: 'demo_org_alpha',
      propertyId: 'demo_prop_mumbai_office',
      requirementId: 'demo_req_buyer_mumbai',
      stage: DealStage.NEGOTIATION,
      valueInr: '25000000',
      dealHealthScore: 78,
      slaBreachCount: 0,
    },
    {
      id: 'demo_deal_5',
      organizationId: 'demo_org_alpha',
      propertyId: 'demo_prop_pune_plot',
      requirementId: 'demo_req_buyer_mumbai',
      stage: DealStage.LEGAL,
      valueInr: '18500000',
      dealHealthScore: 85,
      slaBreachCount: 0,
    },
  ];

  for (const deal of extraDeals) {
    await prisma.deal.upsert({
      where: { id: deal.id },
      update: deal,
      create: deal,
    });
  }

  const extraNotifications = [
    {
      id: 'demo_notif_4',
      userId: 'demo_user_broker_1',
      channel: 'in_app',
      title: 'New hot match found',
      body: 'Your Bandra listing matched a buyer requirement — 91% score',
      read: false,
    },
    {
      id: 'demo_notif_5',
      userId: 'demo_user_broker_1',
      channel: 'in_app',
      title: 'Deal stage advanced',
      body: 'Deal for Powai property moved to Negotiation stage',
      read: false,
    },
    {
      id: 'demo_notif_6',
      userId: 'demo_user_broker_1',
      channel: 'in_app',
      title: 'Compliance alert',
      body: 'NDA required before accessing institutional data room',
      read: false,
    },
    {
      id: 'demo_notif_7',
      userId: 'demo_user_broker_1',
      channel: 'in_app',
      title: 'Requirement matched 3 listings',
      body: 'A new requirement in Mumbai matched 3 of your properties',
      read: true,
    },
    {
      id: 'demo_notif_8',
      userId: 'demo_user_broker_1',
      channel: 'in_app',
      title: 'SLA warning',
      body: 'Deal at Site Visit stage is overdue by 2 days',
      read: false,
    },
  ];

  for (const notification of extraNotifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: notification,
      create: notification,
    });
  }

  await optionalSeedStep('AuctionListing-extra', async () => {
    const extraAuctions = [
      {
        id: 'demo_auction_2',
        title: 'SARFAESI Commercial Plot — Andheri East',
        city: 'Mumbai',
        source: 'sarfaesi',
        startPrice: '12500000',
        emdAmount: '1250000',
        auctionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: { possessionStatus: 'VACANT', legalStatus: 'CLEAR', investmentScore: 78, liquidityScore: 'HIGH' },
      },
      {
        id: 'demo_auction_3',
        title: 'Bank Auction — 4BHK Residential Pune',
        city: 'Pune',
        source: 'bank_portal',
        startPrice: '8500000',
        emdAmount: '850000',
        auctionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        metadata: { possessionStatus: 'TENANT_OCCUPIED', legalStatus: 'PENDING', investmentScore: 62, liquidityScore: 'MEDIUM' },
      },
      {
        id: 'demo_auction_4',
        title: 'NPA Industrial Warehouse — Bhiwandi',
        city: 'Mumbai',
        source: 'nbfc',
        startPrice: '32000000',
        emdAmount: '3200000',
        auctionDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        metadata: { possessionStatus: 'VACANT', legalStatus: 'CLEAR', investmentScore: 84, liquidityScore: 'HIGH' },
      },
    ];

    for (const auction of extraAuctions) {
      await prisma.auctionListing.upsert({
        where: { id: auction.id },
        update: auction,
        create: auction,
      });
    }
  });

  await optionalSeedStep('FraudCase-extra', async () => {
    await prisma.fraudCase.upsert({
      where: { id: 'demo_fraud_3' },
      update: {
        subjectUserId: 'demo_user_broker_1',
        propertyId: 'demo_prop_mumbai_office',
        dealId: null,
        status: 'open',
        score: 88,
        reason: 'User posted 8 listings in 2 hours — velocity threshold exceeded',
        resolvedById: null,
      },
      create: {
        id: 'demo_fraud_3',
        subjectUserId: 'demo_user_broker_1',
        propertyId: 'demo_prop_mumbai_office',
        dealId: null,
        status: 'open',
        score: 88,
        reason: 'User posted 8 listings in 2 hours — velocity threshold exceeded',
        resolvedById: null,
      },
    });
  });

  const extraInstitution = {
    id: 'demo_inst_3',
    postedById: 'demo_user_broker_1',
    institutionName: 'Hyderabad College Asset',
    institutionType: 'college',
    city: 'Hyderabad',
    maskedSummary: 'Accredited private college campus.',
    askingPriceCr: '85.0000',
    studentEnrollment: 3200,
    latitude: 17.385,
    longitude: 78.4867,
    ndaRequired: true,
    confidential: true,
    verificationStatus: 'verified',
    dealScore: 81,
  };

  await prisma.institution.upsert({
    where: { id: extraInstitution.id },
    update: extraInstitution,
    create: extraInstitution,
  });
}

async function main() {
  console.log('Seeding Phase 1 demo data (upsert-safe)...');
  await seedUsers();
  await seedOrganizations();
  await seedPropertiesAndRequirements();
  await seedCoreExecution();
  await seedSupportingModules();
  console.log('Phase 1 demo data seed complete.');
}

main()
  .catch((error) => {
    console.error('Phase 1 demo seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
