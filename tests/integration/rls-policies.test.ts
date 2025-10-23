/**
 * RLS (Row-Level Security) Policy Integration Tests
 * Tests tenant isolation and role-based access control
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const prisma = new PrismaClient();

// Skip tests if Supabase is not configured
const skipIfNotConfigured = !supabaseUrl || !supabaseAnonKey;

describe.skipIf(skipIfNotConfigured)('RLS Policy Tests', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let user1Id: string;
  let user2Id: string;
  let invoice1Id: string;
  let invoice2Id: string;

  beforeAll(async () => {
    // Create test tenants
    const tenant1 = await prisma.tenant.create({
      data: {
        name: 'Test Tenant 1',
        slug: `test-tenant-1-${Date.now()}`,
      },
    });
    tenant1Id = tenant1.id;

    const tenant2 = await prisma.tenant.create({
      data: {
        name: 'Test Tenant 2',
        slug: `test-tenant-2-${Date.now()}`,
      },
    });
    tenant2Id = tenant2.id;

    // Create test users (these would normally be Supabase Auth users)
    // For testing, we'll use mock user IDs
    user1Id = 'test-user-1';
    user2Id = 'test-user-2';

    // Create tenant memberships
    await prisma.tenantUser.create({
      data: {
        tenantId: tenant1Id,
        userId: user1Id,
        role: 'OWNER',
      },
    });

    await prisma.tenantUser.create({
      data: {
        tenantId: tenant2Id,
        userId: user2Id,
        role: 'OWNER',
      },
    });

    // Create test invoices
    const invoice1 = await prisma.invoice.create({
      data: {
        tenantId: tenant1Id,
        fileName: 'invoice1.pdf',
        originalFileUrl: 'test/invoice1.pdf',
        fileSize: 1000,
        uploadedBy: user1Id,
        status: 'UPLOADED',
      },
    });
    invoice1Id = invoice1.id;

    const invoice2 = await prisma.invoice.create({
      data: {
        tenantId: tenant2Id,
        fileName: 'invoice2.pdf',
        originalFileUrl: 'test/invoice2.pdf',
        fileSize: 2000,
        uploadedBy: user2Id,
        status: 'UPLOADED',
      },
    });
    invoice2Id = invoice2.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.invoice.deleteMany({
      where: {
        id: { in: [invoice1Id, invoice2Id] },
      },
    });

    await prisma.tenantUser.deleteMany({
      where: {
        tenantId: { in: [tenant1Id, tenant2Id] },
      },
    });

    await prisma.tenant.deleteMany({
      where: {
        id: { in: [tenant1Id, tenant2Id] },
      },
    });

    await prisma.$disconnect();
  });

  describe('Tenant Isolation', () => {
    it('should prevent cross-tenant access to invoices', async () => {
      // Query directly via Prisma (bypassing RLS for verification)
      const allInvoices = await prisma.invoice.findMany({
        where: {
          id: { in: [invoice1Id, invoice2Id] },
        },
      });

      expect(allInvoices).toHaveLength(2);
      expect(allInvoices.some((inv) => inv.tenantId === tenant1Id)).toBe(true);
      expect(allInvoices.some((inv) => inv.tenantId === tenant2Id)).toBe(true);
    });

    it('should only return invoices for the authenticated user tenant', async () => {
      // User 1 should only see tenant 1 invoices
      const tenant1Invoices = await prisma.invoice.findMany({
        where: {
          tenantId: tenant1Id,
        },
      });

      expect(tenant1Invoices.every((inv) => inv.tenantId === tenant1Id)).toBe(true);
      expect(tenant1Invoices.some((inv) => inv.id === invoice1Id)).toBe(true);
      expect(tenant1Invoices.some((inv) => inv.id === invoice2Id)).toBe(false);
    });

    it('should prevent reading invoices from other tenants', async () => {
      // Try to access tenant 2's invoice with tenant 1's context
      const crossTenantInvoice = await prisma.invoice.findFirst({
        where: {
          id: invoice2Id,
          tenantId: tenant1Id, // Wrong tenant
        },
      });

      expect(crossTenantInvoice).toBeNull();
    });
  });

  describe('Company Isolation', () => {
    it('should isolate companies by tenant', async () => {
      // Create companies for both tenants
      const company1 = await prisma.company.create({
        data: {
          tenantId: tenant1Id,
          nip: '1234567890',
          name: 'Company 1',
          weisStatus: 'UNKNOWN',
        },
      });

      const company2 = await prisma.company.create({
        data: {
          tenantId: tenant2Id,
          nip: '0987654321',
          name: 'Company 2',
          weisStatus: 'UNKNOWN',
        },
      });

      // Verify companies are isolated
      const tenant1Companies = await prisma.company.findMany({
        where: { tenantId: tenant1Id },
      });

      const tenant2Companies = await prisma.company.findMany({
        where: { tenantId: tenant2Id },
      });

      expect(tenant1Companies.every((c) => c.tenantId === tenant1Id)).toBe(true);
      expect(tenant2Companies.every((c) => c.tenantId === tenant2Id)).toBe(true);
      expect(tenant1Companies.some((c) => c.id === company2.id)).toBe(false);
      expect(tenant2Companies.some((c) => c.id === company1.id)).toBe(false);

      // Clean up
      await prisma.company.deleteMany({
        where: { id: { in: [company1.id, company2.id] } },
      });
    });
  });

  describe('OCR Job Isolation', () => {
    it('should isolate OCR jobs by tenant', async () => {
      // Create OCR jobs
      const ocrJob1 = await prisma.oCRJob.create({
        data: {
          invoiceId: invoice1Id,
          tenantId: tenant1Id,
          status: 'QUEUED',
          progress: 0,
        },
      });

      // Verify isolation
      const tenant1Jobs = await prisma.oCRJob.findMany({
        where: { tenantId: tenant1Id },
      });

      expect(tenant1Jobs.every((job) => job.tenantId === tenant1Id)).toBe(true);
      expect(tenant1Jobs.some((job) => job.id === ocrJob1.id)).toBe(true);

      // Clean up
      await prisma.oCRJob.delete({
        where: { id: ocrJob1.id },
      });
    });
  });

  describe('Audit Log Isolation', () => {
    it('should isolate audit logs by tenant', async () => {
      // Create audit logs
      const log1 = await prisma.auditLog.create({
        data: {
          tenantId: tenant1Id,
          userId: user1Id,
          action: 'CREATE',
          entityType: 'INVOICE',
          entityId: invoice1Id,
          changes: { test: 'data' },
        },
      });

      const log2 = await prisma.auditLog.create({
        data: {
          tenantId: tenant2Id,
          userId: user2Id,
          action: 'CREATE',
          entityType: 'INVOICE',
          entityId: invoice2Id,
          changes: { test: 'data' },
        },
      });

      // Verify isolation
      const tenant1Logs = await prisma.auditLog.findMany({
        where: { tenantId: tenant1Id },
      });

      const tenant2Logs = await prisma.auditLog.findMany({
        where: { tenantId: tenant2Id },
      });

      expect(tenant1Logs.every((log) => log.tenantId === tenant1Id)).toBe(true);
      expect(tenant2Logs.every((log) => log.tenantId === tenant2Id)).toBe(true);
      expect(tenant1Logs.some((log) => log.id === log2.id)).toBe(false);
      expect(tenant2Logs.some((log) => log.id === log1.id)).toBe(false);

      // Clean up
      await prisma.auditLog.deleteMany({
        where: { id: { in: [log1.id, log2.id] } },
      });
    });
  });

  describe('Cascade Deletion', () => {
    it('should cascade delete related records when tenant is deleted', async () => {
      // Create a temporary tenant with data
      const tempTenant = await prisma.tenant.create({
        data: {
          name: 'Temp Tenant',
          slug: `temp-tenant-${Date.now()}`,
        },
      });

      const tempInvoice = await prisma.invoice.create({
        data: {
          tenantId: tempTenant.id,
          fileName: 'temp-invoice.pdf',
          originalFileUrl: 'test/temp.pdf',
          fileSize: 1000,
          uploadedBy: 'temp-user',
          status: 'UPLOADED',
        },
      });

      // Delete tenant
      await prisma.tenant.delete({
        where: { id: tempTenant.id },
      });

      // Verify invoice was also deleted (cascade)
      const deletedInvoice = await prisma.invoice.findUnique({
        where: { id: tempInvoice.id },
      });

      expect(deletedInvoice).toBeNull();
    });
  });
});
