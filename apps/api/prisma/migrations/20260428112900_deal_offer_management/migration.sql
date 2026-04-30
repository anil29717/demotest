CREATE TABLE "DealOffer" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "offeredById" TEXT NOT NULL,
  "amountInr" DECIMAL(18,2) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DealOffer_dealId_createdAt_idx" ON "DealOffer"("dealId", "createdAt");

ALTER TABLE "DealOffer"
ADD CONSTRAINT "DealOffer_dealId_fkey"
FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DealOffer"
ADD CONSTRAINT "DealOffer_offeredById_fkey"
FOREIGN KEY ("offeredById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
