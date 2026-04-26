-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "tag" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "accepted" BOOLEAN,
ADD COLUMN     "combinedScore" DOUBLE PRECISION,
ADD COLUMN     "convertedToDeal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "convertedToLead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feedbackGiven" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mlConfidence" DOUBLE PRECISION,
ADD COLUMN     "mlExplanation" JSONB,
ADD COLUMN     "mlScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Requirement" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'APP';

-- AlterTable
ALTER TABLE "WhatsAppIngest" ADD COLUMN     "createdLeadId" TEXT,
ADD COLUMN     "createdRequirementId" TEXT,
ADD COLUMN     "messageText" TEXT,
ADD COLUMN     "nlpConfidence" DOUBLE PRECISION,
ADD COLUMN     "nlpExtracted" JSONB,
ADD COLUMN     "nlpIntent" TEXT,
ADD COLUMN     "routedAt" TIMESTAMP(3),
ADD COLUMN     "routingStatus" TEXT;
