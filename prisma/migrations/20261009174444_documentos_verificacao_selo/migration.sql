-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RG', 'CNH', 'CNPJ_CARD', 'COMPANY_ACT');

-- CreateEnum
CREATE TYPE "DocumentSubject" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "BadgeDecision" AS ENUM ('GRANTED', 'REVOKED');

-- AlterEnum
ALTER TYPE "AdminPermission" ADD VALUE 'VERIFY_DOCUMENTS';

-- CreateTable
CREATE TABLE "verification_documents" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "subject" "DocumentSubject" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_badge_events" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "decision" "BadgeDecision" NOT NULL,
    "criteria" JSONB NOT NULL,
    "validUntil" TIMESTAMP(3),
    "note" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_badge_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verification_documents_storageKey_key" ON "verification_documents"("storageKey");

-- CreateIndex
CREATE INDEX "verification_documents_providerId_subject_status_idx" ON "verification_documents"("providerId", "subject", "status");

-- CreateIndex
CREATE INDEX "verification_badge_events_providerId_createdAt_idx" ON "verification_badge_events"("providerId", "createdAt");

-- AddForeignKey
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_badge_events" ADD CONSTRAINT "verification_badge_events_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_badge_events" ADD CONSTRAINT "verification_badge_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
