/**
 * Contract Test: POST /api/ocr/process
 *
 * Tests the OCR processing endpoint according to the OpenAPI specification.
 * These tests MUST FAIL initially (endpoint not implemented yet) per TDD approach.
 *
 * @see specs/002-ocr-pipeline/contracts/ocr-process.yaml
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { ProcessOCRRequestSchema, ProcessOCRResponseSchema } from '@/lib/ai/schemas/invoice-schema';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

describe('POST /api/ocr/process - Contract Tests', () => {
  let supabase: ReturnType<typeof createClient>;
  let authToken: string;
  let tenantId: string;
  let testInvoiceId: string;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Sign in test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@deklaro.com',
      password: 'Test123456789',
    });

    if (authError) throw new Error(`Auth failed: ${authError.message}`);
    authToken = authData.session!.access_token;

    // Get tenant ID
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', authData.user.id)
      .single();

    if (tenantError) throw new Error(`Tenant fetch failed: ${tenantError.message}`);
    tenantId = tenantData.tenant_id;

    // Create a test invoice for OCR processing
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        tenant_id: tenantId,
        original_file_url: 'test-invoices/sample.pdf',
        file_name: 'test-invoice.pdf',
        file_size: 50000,
        uploaded_by: authData.user.id,
        status: 'UPLOADED',
        currency: 'PLN',
      })
      .select()
      .single();

    if (invoiceError) throw new Error(`Invoice creation failed: ${invoiceError.message}`);
    testInvoiceId = invoiceData.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testInvoiceId) {
      await supabase.from('invoices').delete().eq('id', testInvoiceId);
    }
    await supabase.auth.signOut();
  });

  it('should create OCR job with valid invoice_id and return 201', async () => {
    const requestBody = {
      invoice_id: testInvoiceId,
    };

    // Validate request schema
    expect(() => ProcessOCRRequestSchema.parse(requestBody)).not.toThrow();

    const response = await fetch(`${API_URL}/api/ocr/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(201);

    const data = await response.json();

    // Validate response schema
    expect(() => ProcessOCRResponseSchema.parse(data)).not.toThrow();

    // Verify response structure
    expect(data).toHaveProperty('job_id');
    expect(data).toHaveProperty('invoice_id', testInvoiceId);
    expect(data).toHaveProperty('status');
    expect(['QUEUED', 'PROCESSING']).toContain(data.status);
    expect(data).toHaveProperty('created_at');
    expect(data).toHaveProperty('estimated_completion');

    // Verify job was created in database
    const { data: jobData, error } = await supabase
      .from('ocr_jobs')
      .select('*')
      .eq('id', data.job_id)
      .single();

    expect(error).toBeNull();
    expect(jobData).not.toBeNull();
    expect(jobData?.invoice_id).toBe(testInvoiceId);
  });

  it('should return 400 when invoice_id is missing', async () => {
    const requestBody = {};

    const response = await fetch(`${API_URL}/api/ocr/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('invoice_id');
  });

  it('should return 400 when invoice_id is not a valid UUID', async () => {
    const requestBody = {
      invoice_id: 'not-a-uuid',
    };

    const response = await fetch(`${API_URL}/api/ocr/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('should return 404 when invoice does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const requestBody = {
      invoice_id: nonExistentId,
    };

    const response = await fetch(`${API_URL}/api/ocr/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('should return 409 when OCR job already exists and is processing', async () => {
    // Create an existing OCR job for the invoice
    const { data: existingJob, error: jobError } = await supabase
      .from('ocr_jobs')
      .insert({
        tenant_id: tenantId,
        invoice_id: testInvoiceId,
        status: 'PROCESSING',
      })
      .select()
      .single();

    expect(jobError).toBeNull();

    const requestBody = {
      invoice_id: testInvoiceId,
    };

    const response = await fetch(`${API_URL}/api/ocr/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(409);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('existing_job_id', existingJob!.id);

    // Clean up
    await supabase.from('ocr_jobs').delete().eq('id', existingJob!.id);
  });

  it('should accept optional processing options', async () => {
    const requestBody = {
      invoice_id: testInvoiceId,
      options: {
        skip_preprocessing: true,
        force_reprocess: false,
        language: 'pol' as const,
      },
    };

    // Validate request schema with options
    expect(() => ProcessOCRRequestSchema.parse(requestBody)).not.toThrow();

    const response = await fetch(`${API_URL}/api/ocr/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(requestBody),
    });

    // Should still succeed even with options
    expect([201, 409]).toContain(response.status);
  });
});
