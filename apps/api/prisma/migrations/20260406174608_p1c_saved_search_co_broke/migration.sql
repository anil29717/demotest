-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "coBrokerInviteEmail" TEXT,
ADD COLUMN     "commissionSplitPct" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingStep" TEXT,
ADD COLUMN     "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
