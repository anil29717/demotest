-- User role
DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE 'BUILDER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Property crawler fields
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "listingHash" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "isCrawled" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "Property_listingHash_key" ON "Property" ("listingHash");

-- Crawler runs
CREATE TABLE IF NOT EXISTS "CrawlerRun" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "listingsFound" INTEGER NOT NULL DEFAULT 0,
  "listingsImported" INTEGER NOT NULL DEFAULT 0,
  "listingsSkipped" INTEGER NOT NULL DEFAULT 0,
  "listingsFailed" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrawlerRun_pkey" PRIMARY KEY ("id")
);

-- API product
CREATE TABLE IF NOT EXISTS "ApiKey" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orgId" TEXT,
  "plan" TEXT NOT NULL DEFAULT 'FREE',
  "callsPerDay" INTEGER NOT NULL DEFAULT 100,
  "callsPerMonth" INTEGER NOT NULL DEFAULT 1000,
  "totalCalls" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyHash_key" ON "ApiKey" ("keyHash");
ALTER TABLE "ApiKey"
  ADD CONSTRAINT "ApiKey_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ApiUsage" (
  "id" TEXT NOT NULL,
  "apiKeyId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "responseStatus" INTEGER NOT NULL,
  "responseTimeMs" INTEGER NOT NULL,
  "billedAmount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ApiUsage"
  ADD CONSTRAINT "ApiUsage_apiKeyId_fkey"
  FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Builder portal
CREATE TABLE IF NOT EXISTS "BuilderProject" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "builderId" TEXT NOT NULL,
  "orgId" TEXT,
  "city" TEXT NOT NULL,
  "locality" TEXT,
  "reraProjectId" TEXT NOT NULL,
  "totalUnits" INTEGER NOT NULL DEFAULT 0,
  "phases" JSONB,
  "pricePerSqft" DOUBLE PRECISION,
  "priceMin" DECIMAL(18,2),
  "priceMax" DECIMAL(18,2),
  "amenities" JSONB,
  "imageUrls" JSONB,
  "possessionDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "isCrawled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BuilderProject_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "BuilderProject"
  ADD CONSTRAINT "BuilderProject_builderId_fkey"
  FOREIGN KEY ("builderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ProjectUnit" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "unitType" TEXT NOT NULL,
  "floor" INTEGER,
  "unitNumber" TEXT NOT NULL,
  "areaSqft" DOUBLE PRECISION,
  "price" DECIMAL(18,2),
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectUnit_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ProjectUnit"
  ADD CONSTRAINT "ProjectUnit_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ProjectBooking" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "amount" DECIMAL(18,2),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  CONSTRAINT "ProjectBooking_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ProjectBooking"
  ADD CONSTRAINT "ProjectBooking_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBooking"
  ADD CONSTRAINT "ProjectBooking_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "ProjectUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBooking"
  ADD CONSTRAINT "ProjectBooking_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
