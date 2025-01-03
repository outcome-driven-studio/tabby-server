-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "TabSummary" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "summary" TEXT,
    "keyPoints" TEXT,
    "tags" TEXT[],
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TabSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TabSummary_createdAt_idx" ON "TabSummary"("createdAt");

-- CreateIndex
CREATE INDEX "TabSummary_status_idx" ON "TabSummary"("status");
