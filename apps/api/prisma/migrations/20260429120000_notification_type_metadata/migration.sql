-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MATCH', 'NDA', 'DEAL', 'ALERT');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "type" "NotificationType" NOT NULL DEFAULT 'ALERT';
ALTER TABLE "Notification" ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");
CREATE INDEX "Notification_userId_type_idx" ON "Notification"("userId", "type");
