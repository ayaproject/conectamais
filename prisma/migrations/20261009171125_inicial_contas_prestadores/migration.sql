-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'PROVIDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdminPermission" AS ENUM ('APPROVE_PROVIDERS', 'SUSPEND_PROVIDERS', 'READ_AUDIT_LOG', 'MANAGE_ADMINS');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","role")
);

-- CreateTable
CREATE TABLE "user_admin_permissions" (
    "userId" TEXT NOT NULL,
    "permission" "AdminPermission" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,

    CONSTRAINT "user_admin_permissions_pkey" PRIMARY KEY ("userId","permission")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ProviderKind" NOT NULL DEFAULT 'INDIVIDUAL',
    "legalName" TEXT NOT NULL DEFAULT '',
    "displayName" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "experience" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "website" TEXT,
    "googleBusinessUrl" TEXT,
    "status" "ProviderStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_status_history" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "fromStatus" "ProviderStatus" NOT NULL,
    "toStatus" "ProviderStatus" NOT NULL,
    "reason" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_profiles_userId_key" ON "provider_profiles"("userId");

-- CreateIndex
CREATE INDEX "provider_profiles_status_submittedAt_idx" ON "provider_profiles"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "provider_status_history_providerId_createdAt_idx" ON "provider_status_history"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_admin_permissions" ADD CONSTRAINT "user_admin_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_status_history" ADD CONSTRAINT "provider_status_history_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_status_history" ADD CONSTRAINT "provider_status_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
