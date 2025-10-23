-- Deklaro Invoice Management Platform - Database Schema
-- Run this in Supabase SQL Editor
-- Generated: 2025-10-08

-- Create tenant schema for multi-tenancy
CREATE SCHEMA IF NOT EXISTS tenant;

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE "public"."SubscriptionTier" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');
CREATE TYPE "public"."UserRole" AS ENUM ('OWNER', 'ACCOUNTANT', 'CLIENT');
CREATE TYPE "tenant"."InvoiceStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'REVIEWING', 'APPROVED', 'SUBMITTED', 'COMPLETED', 'ERROR', 'ARCHIVED');
CREATE TYPE "tenant"."InvoiceType" AS ENUM ('INCOMING', 'OUTGOING');
CREATE TYPE "tenant"."KSeFStatus" AS ENUM ('PENDING', 'SUBMITTING', 'ACCEPTED', 'REJECTED', 'UPO_DOWNLOADED');
CREATE TYPE "tenant"."CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'UNKNOWN');
CREATE TYPE "tenant"."OCRJobStatus" AS ENUM ('QUEUED', 'PREPROCESSING', 'OCR_RUNNING', 'AI_PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING');
CREATE TYPE "tenant"."KSeFSubmissionStatus" AS ENUM ('PENDING', 'SUBMITTING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'FAILED', 'RETRYING');

-- ============================================================================
-- PUBLIC SCHEMA TABLES
-- ============================================================================

CREATE TABLE "public"."tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "subscription" "public"."SubscriptionTier" NOT NULL DEFAULT 'STARTER',
    "settings" JSONB,
    "stripeCustomerId" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "public"."tenant_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_members_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tenant_members_tenantId_userId_key" UNIQUE ("tenantId", "userId")
);

CREATE TABLE "public"."usage_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "storageBytes" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "usage_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "usage_records_tenantId_period_key" UNIQUE ("tenantId", "period")
);

-- ============================================================================
-- TENANT SCHEMA TABLES
-- ============================================================================

CREATE TABLE "tenant"."companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "companies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "companies_tenantId_nip_key" UNIQUE ("tenantId", "nip")
);

CREATE TABLE "tenant"."invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "ksefNumber" TEXT UNIQUE,
    "ksefSubmittedAt" TIMESTAMP(3),
    "ksefStatus" "tenant"."KSeFStatus",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "tenant"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "tenant"."invoice_line_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "tenant"."ocr_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL UNIQUE,
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
    CONSTRAINT "ocr_jobs_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "tenant"."ksef_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL UNIQUE,
    "tenantId" TEXT NOT NULL,
    "fa3Xml" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "ksefNumber" TEXT UNIQUE,
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
    CONSTRAINT "ksef_submissions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "tenant"."audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- tenant_members
CREATE INDEX "tenant_members_userId_idx" ON "public"."tenant_members"("userId");

-- companies
CREATE INDEX "companies_tenantId_weisStatus_idx" ON "tenant"."companies"("tenantId", "weisStatus");

-- invoices
CREATE INDEX "invoices_tenantId_status_idx" ON "tenant"."invoices"("tenantId", "status");
CREATE INDEX "invoices_tenantId_invoiceDate_idx" ON "tenant"."invoices"("tenantId", "invoiceDate");
CREATE INDEX "invoices_tenantId_companyId_idx" ON "tenant"."invoices"("tenantId", "companyId");
CREATE INDEX "invoices_ksefNumber_idx" ON "tenant"."invoices"("ksefNumber");

-- invoice_line_items
CREATE INDEX "invoice_line_items_invoiceId_idx" ON "tenant"."invoice_line_items"("invoiceId");

-- ocr_jobs
CREATE INDEX "ocr_jobs_tenantId_status_idx" ON "tenant"."ocr_jobs"("tenantId", "status");

-- ksef_submissions
CREATE INDEX "ksef_submissions_tenantId_status_idx" ON "tenant"."ksef_submissions"("tenantId", "status");
CREATE INDEX "ksef_submissions_ksefNumber_idx" ON "tenant"."ksef_submissions"("ksefNumber");

-- audit_logs
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "tenant"."audit_logs"("tenantId", "createdAt");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "tenant"."audit_logs"("entityType", "entityId");

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tenant schema tables
ALTER TABLE "tenant"."companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant"."invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant"."invoice_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant"."ocr_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant"."ksef_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant"."audit_logs" ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's tenant ID (with UUID to TEXT casting)
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS TEXT AS $$
  SELECT "tenantId"
  FROM "public"."tenant_members"
  WHERE "userId" = auth.uid()::text
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Policies for companies table
CREATE POLICY "Users can view their tenant's companies"
  ON "tenant"."companies" FOR SELECT
  USING ("tenantId" = get_user_tenant_id());

CREATE POLICY "Users can insert companies for their tenant"
  ON "tenant"."companies" FOR INSERT
  WITH CHECK ("tenantId" = get_user_tenant_id());

CREATE POLICY "Users can update their tenant's companies"
  ON "tenant"."companies" FOR UPDATE
  USING ("tenantId" = get_user_tenant_id());

CREATE POLICY "Users can delete their tenant's companies"
  ON "tenant"."companies" FOR DELETE
  USING ("tenantId" = get_user_tenant_id());

-- Policies for invoices table
CREATE POLICY "Users can view their tenant's invoices"
  ON "tenant"."invoices" FOR SELECT
  USING ("tenantId" = get_user_tenant_id());

CREATE POLICY "Users can insert invoices for their tenant"
  ON "tenant"."invoices" FOR INSERT
  WITH CHECK ("tenantId" = get_user_tenant_id());

CREATE POLICY "Users can update their tenant's invoices"
  ON "tenant"."invoices" FOR UPDATE
  USING ("tenantId" = get_user_tenant_id());

CREATE POLICY "Users can delete their tenant's invoices"
  ON "tenant"."invoices" FOR DELETE
  USING ("tenantId" = get_user_tenant_id());

-- Policies for invoice_line_items table
CREATE POLICY "Users can view line items for their tenant's invoices"
  ON "tenant"."invoice_line_items" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "tenant"."invoices"
      WHERE "id" = "invoice_line_items"."invoiceId"
      AND "tenantId" = get_user_tenant_id()
    )
  );

CREATE POLICY "Users can insert line items for their tenant's invoices"
  ON "tenant"."invoice_line_items" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "tenant"."invoices"
      WHERE "id" = "invoice_line_items"."invoiceId"
      AND "tenantId" = get_user_tenant_id()
    )
  );

-- Policies for ocr_jobs table
CREATE POLICY "Users can view OCR jobs for their tenant"
  ON "tenant"."ocr_jobs" FOR SELECT
  USING ("tenantId" = get_user_tenant_id());

-- Policies for ksef_submissions table
CREATE POLICY "Users can view KSeF submissions for their tenant"
  ON "tenant"."ksef_submissions" FOR SELECT
  USING ("tenantId" = get_user_tenant_id());

-- Policies for audit_logs table
CREATE POLICY "Users can view audit logs for their tenant"
  ON "tenant"."audit_logs" FOR SELECT
  USING ("tenantId" = get_user_tenant_id());

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Deklaro schema created successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run the seed data script to create demo tenant';
  RAISE NOTICE '2. Test RLS policies';
  RAISE NOTICE '3. Configure Supabase Storage buckets';
END $$;
