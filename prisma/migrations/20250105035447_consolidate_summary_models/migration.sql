/*
  Warnings:

  - You are about to drop the column `content` on the `Summary` table. All the data in the column will be lost.
  - The `keyPoints` column on the `Summary` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `TabSummary` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `rawContent` to the `Summary` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'SKIPPED';

-- DropForeignKey
ALTER TABLE "SlackWorkspace" DROP CONSTRAINT "SlackWorkspace_userId_fkey";

-- DropForeignKey
ALTER TABLE "Summary" DROP CONSTRAINT "Summary_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserPreferences" DROP CONSTRAINT "UserPreferences_userId_fkey";

-- AlterTable
ALTER TABLE "Summary" DROP COLUMN "content",
ADD COLUMN     "error" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "rawContent" TEXT NOT NULL,
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "summary" TEXT,
ALTER COLUMN "url" DROP NOT NULL,
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "type" DROP NOT NULL,
DROP COLUMN "keyPoints",
ADD COLUMN     "keyPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "quietHours" JSONB;

-- DropTable
DROP TABLE "TabSummary";

-- CreateIndex
CREATE INDEX "SlackWorkspace_teamId_idx" ON "SlackWorkspace"("teamId");

-- CreateIndex
CREATE INDEX "SlackWorkspace_userId_idx" ON "SlackWorkspace"("userId");

-- CreateIndex
CREATE INDEX "Summary_status_idx" ON "Summary"("status");

-- CreateIndex
CREATE INDEX "Summary_createdAt_idx" ON "Summary"("createdAt");

-- CreateIndex
CREATE INDEX "Summary_userId_idx" ON "Summary"("userId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserPreferences_userId_idx" ON "UserPreferences"("userId");

-- AddForeignKey
ALTER TABLE "Summary" ADD CONSTRAINT "Summary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackWorkspace" ADD CONSTRAINT "SlackWorkspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
