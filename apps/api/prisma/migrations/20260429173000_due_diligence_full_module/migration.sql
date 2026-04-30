-- CreateEnum
CREATE TYPE "DdCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DdItemStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DdEventType" AS ENUM ('CASE_CREATED', 'CASE_STATUS_CHANGED', 'ITEMS_SYNCED', 'ITEM_ASSIGNED', 'ITEM_STATUS_CHANGED', 'EVIDENCE_ADDED', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "DueDiligenceCase" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "institutionId" TEXT,
    "organizationId" TEXT,
    "status" "DdCaseStatus" NOT NULL DEFAULT 'OPEN',
    "ownerUserId" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DueDiligenceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DueDiligenceItem" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" "DdItemStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DueDiligenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DueDiligenceEvidence" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "documentId" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DueDiligenceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DueDiligenceEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "itemId" TEXT,
    "actorUserId" TEXT,
    "type" "DdEventType" NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DueDiligenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DueDiligenceCase_dealId_key" ON "DueDiligenceCase"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "DueDiligenceCase_institutionId_key" ON "DueDiligenceCase"("institutionId");

-- CreateIndex
CREATE INDEX "DueDiligenceCase_organizationId_status_idx" ON "DueDiligenceCase"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DueDiligenceItem_caseId_key_key" ON "DueDiligenceItem"("caseId", "key");

-- CreateIndex
CREATE INDEX "DueDiligenceItem_caseId_status_sortOrder_idx" ON "DueDiligenceItem"("caseId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "DueDiligenceEvidence_itemId_createdAt_idx" ON "DueDiligenceEvidence"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "DueDiligenceEvent_caseId_createdAt_idx" ON "DueDiligenceEvent"("caseId", "createdAt");

-- AddForeignKey
ALTER TABLE "DueDiligenceCase" ADD CONSTRAINT "DueDiligenceCase_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligenceCase" ADD CONSTRAINT "DueDiligenceCase_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligenceCase" ADD CONSTRAINT "DueDiligenceCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligenceCase" ADD CONSTRAINT "DueDiligenceCase_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligenceItem" ADD CONSTRAINT "DueDiligenceItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "DueDiligenceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligenceItem" ADD CONSTRAINT "DueDiligenceItem_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligenceEvidence" ADD CONSTRAINT "DueDiligenceEvidence_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "DueDiligenceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligenceEvidence" ADD CONSTRAINT "DueDiligenceEvidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligenceEvidence" ADD CONSTRAINT "DueDiligenceEvidence_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligenceEvent" ADD CONSTRAINT "DueDiligenceEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "DueDiligenceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligenceEvent" ADD CONSTRAINT "DueDiligenceEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "DueDiligenceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligenceEvent" ADD CONSTRAINT "DueDiligenceEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
