-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant";

-- CreateEnum
CREATE TYPE "public"."SubscriptionTier" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('OWNER', 'ACCOUNTANT', 'CLIENT');

-- CreateEnum
CREATE TYPE "tenant"."InvoiceStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'REVIEWING', 'APPROVED', 'SUBMITTED', 'COMPLETED', 'ERROR', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "tenant"."InvoiceType" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "tenant"."KSeFStatus" AS ENUM ('PENDING', 'SUBMITTING', 'ACCEPTED', 'REJECTED', 'UPO_DOWNLOADED');

-- CreateEnum
CREATE TYPE "tenant"."CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "tenant"."OCRJobStatus" AS ENUM ('QUEUED', 'PREPROCESSING', 'OCR_RUNNING', 'AI_PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "tenant"."KSeFSubmissionStatus" AS ENUM ('PENDING', 'SUBMITTING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "public"."tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subscription" "public"."SubscriptionTier" NOT NULL DEFAULT 'STARTER',
    "settings" JSONB,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenant_members" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usage_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "storageBytes" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "originalFileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "status" "tenant"."InvoiceStatus" NOT NULL DEFAULT 'UPLOADED',
    "invoiceType" "tenant"."InvoiceType",
    "ocrProcessedAt" TIMESTAMP(3),
    "ocrConfidence" DOUBLE PRECISION,
    "ocrResult" JSONB,
    "extractedData" JSONB,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "netAmount" DECIMAL(12,2),
    "vatAmount" DECIMAL(12,2),
    "grossAmount" DECIMAL(12,2),
    "ksefNumber" TEXT,
    "ksefSubmittedAt" TIMESTAMP(3),
    "ksefStatus" "tenant"."KSeFStatus",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."companies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'PL',
    "weisValidatedAt" TIMESTAMP(3),
    "weisStatus" "tenant"."CompanyStatus" NOT NULL DEFAULT 'UNKNOWN',
    "weisData" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."ocr_jobs" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "tenant"."OCRJobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "preprocessedAt" TIMESTAMP(3),
    "ocrStartedAt" TIMESTAMP(3),
    "ocrCompletedAt" TIMESTAMP(3),
    "aiStartedAt" TIMESTAMP(3),
    "aiCompletedAt" TIMESTAMP(3),
    "rawText" TEXT,
    "confidence" DOUBLE PRECISION,
    "extractedFields" JSONB,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."ksef_submissions" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fa3Xml" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "ksefNumber" TEXT,
    "upoUrl" TEXT,
    "status" "tenant"."KSeFSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ksef_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "public"."tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_stripeCustomerId_key" ON "public"."tenants"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "tenant_members_userId_idx" ON "public"."tenant_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_members_tenantId_userId_key" ON "public"."tenant_members"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "usage_records_tenantId_period_key" ON "public"."usage_records"("tenantId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_ksefNumber_key" ON "tenant"."invoices"("ksefNumber");

-- CreateIndex
CREATE INDEX "invoices_tenantId_status_idx" ON "tenant"."invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "invoices_tenantId_invoiceDate_idx" ON "tenant"."invoices"("tenantId", "invoiceDate");

-- CreateIndex
CREATE INDEX "invoices_tenantId_companyId_idx" ON "tenant"."invoices"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "invoices_ksefNumber_idx" ON "tenant"."invoices"("ksefNumber");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoiceId_idx" ON "tenant"."invoice_line_items"("invoiceId");

-- CreateIndex
CREATE INDEX "companies_tenantId_weisStatus_idx" ON "tenant"."companies"("tenantId", "weisStatus");

-- CreateIndex
CREATE UNIQUE INDEX "companies_tenantId_nip_key" ON "tenant"."companies"("tenantId", "nip");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_jobs_invoiceId_key" ON "tenant"."ocr_jobs"("invoiceId");

-- CreateIndex
CREATE INDEX "ocr_jobs_tenantId_status_idx" ON "tenant"."ocr_jobs"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ksef_submissions_invoiceId_key" ON "tenant"."ksef_submissions"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ksef_submissions_ksefNumber_key" ON "tenant"."ksef_submissions"("ksefNumber");

-- CreateIndex
CREATE INDEX "ksef_submissions_tenantId_status_idx" ON "tenant"."ksef_submissions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ksef_submissions_ksefNumber_idx" ON "tenant"."ksef_submissions"("ksefNumber");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "tenant"."audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "tenant"."audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "public"."tenant_members" ADD CONSTRAINT "tenant_members_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_records" ADD CONSTRAINT "usage_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "tenant"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."companies" ADD CONSTRAINT "companies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."ocr_jobs" ADD CONSTRAINT "ocr_jobs_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."ksef_submissions" ADD CONSTRAINT "ksef_submissions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

