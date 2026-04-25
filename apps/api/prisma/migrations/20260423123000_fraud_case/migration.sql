-- CreateTable
CREATE TABLE "FraudCase" (
    "id" TEXT NOT NULL,
    "subjectUserId" TEXT,
    "propertyId" TEXT,
    "dealId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudCase_pkey" PRIMARY KEY ("id")
);
