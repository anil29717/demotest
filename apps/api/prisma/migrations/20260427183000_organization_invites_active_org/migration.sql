-- Add active organization context to users
ALTER TABLE "User"
ADD COLUMN "activeOrganizationId" TEXT;

ALTER TABLE "User"
ADD CONSTRAINT "User_activeOrganizationId_fkey"
FOREIGN KEY ("activeOrganizationId")
REFERENCES "Organization"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Invite lifecycle enum
CREATE TYPE "OrganizationInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- Invite table
CREATE TABLE "OrganizationInvite" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "role" "OrgRole" NOT NULL DEFAULT 'AGENT',
  "status" "OrganizationInviteStatus" NOT NULL DEFAULT 'PENDING',
  "maxUses" INTEGER NOT NULL DEFAULT 1,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationInvite_code_key" ON "OrganizationInvite"("code");
CREATE UNIQUE INDEX "OrganizationInvite_token_key" ON "OrganizationInvite"("token");

ALTER TABLE "OrganizationInvite"
ADD CONSTRAINT "OrganizationInvite_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "OrganizationInvite"
ADD CONSTRAINT "OrganizationInvite_createdById_fkey"
FOREIGN KEY ("createdById")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
