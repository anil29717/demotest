-- CreateEnum
CREATE TYPE "ComplianceAlertType" AS ENUM ('MISSING_NDA', 'MISSING_RERA');

-- CreateEnum
CREATE TYPE "ComplianceAlertSeverity" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ComplianceAlertStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "ComplianceAlert" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "ComplianceAlertType" NOT NULL,
    "severity" "ComplianceAlertSeverity" NOT NULL,
    "status" "ComplianceAlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,

    CONSTRAINT "ComplianceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceAlert_dealId_type_key" ON "ComplianceAlert"("dealId", "type");

-- CreateIndex
CREATE INDEX "ComplianceAlert_organizationId_status_idx" ON "ComplianceAlert"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ComplianceAlert_dealId_idx" ON "ComplianceAlert"("dealId");

-- AddForeignKey
ALTER TABLE "ComplianceAlert" ADD CONSTRAINT "ComplianceAlert_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAlert" ADD CONSTRAINT "ComplianceAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAlert" ADD CONSTRAINT "ComplianceAlert_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
