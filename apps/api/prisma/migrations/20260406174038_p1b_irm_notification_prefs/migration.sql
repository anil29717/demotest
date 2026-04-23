-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationPrefs" JSONB;

-- CreateTable
CREATE TABLE "InvestorPreference" (
    "userId" TEXT NOT NULL,
    "assetClasses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minTicketCr" DOUBLE PRECISION,
    "maxTicketCr" DOUBLE PRECISION,
    "geography" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "InvestorPreference_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "InvestorPreference" ADD CONSTRAINT "InvestorPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
