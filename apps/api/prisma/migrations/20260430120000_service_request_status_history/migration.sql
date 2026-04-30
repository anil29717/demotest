-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable: new columns
ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "requestHistory" JSONB;
ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "status_new" "ServiceRequestStatus";

-- Map legacy string status -> enum
UPDATE "ServiceRequest" SET "status_new" = CASE LOWER(COALESCE("status"::text, 'open'))
  WHEN 'open' THEN 'OPEN'::"ServiceRequestStatus"
  WHEN 'assigned' THEN 'IN_PROGRESS'::"ServiceRequestStatus"
  WHEN 'in_progress' THEN 'IN_PROGRESS'::"ServiceRequestStatus"
  WHEN 'completed' THEN 'COMPLETED'::"ServiceRequestStatus"
  WHEN 'cancelled' THEN 'CANCELLED'::"ServiceRequestStatus"
  ELSE 'OPEN'::"ServiceRequestStatus"
END
WHERE "status_new" IS NULL;

UPDATE "ServiceRequest" SET "updatedAt" = "createdAt";

-- Drop old status column (text) and rename
ALTER TABLE "ServiceRequest" DROP COLUMN IF EXISTS "status";
ALTER TABLE "ServiceRequest" RENAME COLUMN "status_new" TO "status";

ALTER TABLE "ServiceRequest" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "ServiceRequest" ALTER COLUMN "status" SET DEFAULT 'OPEN'::"ServiceRequestStatus";

-- Foreign keys
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ServiceRequest_dealId_status_idx" ON "ServiceRequest"("dealId", "status");
CREATE INDEX IF NOT EXISTS "ServiceRequest_organizationId_createdAt_idx" ON "ServiceRequest"("organizationId", "createdAt");
