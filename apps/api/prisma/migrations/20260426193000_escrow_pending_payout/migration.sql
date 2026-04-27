-- AlterEnum
ALTER TYPE "EscrowStatus" ADD VALUE 'PENDING_PAYOUT';

-- AlterTable
ALTER TABLE "EscrowAccount" ADD COLUMN IF NOT EXISTS "pendingPayoutAt" TIMESTAMP(3);
ALTER TABLE "EscrowAccount" ADD COLUMN IF NOT EXISTS "payoutReference" TEXT;
