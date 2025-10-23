/**
 * KSeF Submission Service
 * Manages invoice submissions to KSeF with queue and retry logic
 */

import { PrismaClient } from '@prisma/client';
import { createKSeFClient } from './client';
import { convertToFA3Xml, validateFA3Xml } from './fa3-converter';
import type { FA3Invoice } from './types';

const prisma = new PrismaClient();

/**
 * Submit invoice to KSeF
 */
export async function submitInvoiceToKSeF(
  invoiceId: string,
  tenantNip: string
): Promise<{ success: boolean; ksefNumber?: string; error?: string }> {
  try {
    // Get invoice data
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'APPROVED' && invoice.status !== 'PROCESSED') {
      throw new Error('Invoice must be approved before KSeF submission');
    }

    // Check if already submitted
    const existingSubmission = await prisma.kSeFSubmission.findUnique({
      where: { invoiceId },
    });

    if (existingSubmission && existingSubmission.status === 'ACCEPTED') {
      return {
        success: true,
        ksefNumber: existingSubmission.ksefNumber || undefined,
      };
    }

    // Convert invoice data to FA(3) format
    const fa3Invoice = convertInvoiceToFA3(invoice);
    const fa3Xml = convertToFA3Xml(fa3Invoice);

    // Validate XML
    const validation = validateFA3Xml(fa3Xml);
    if (!validation.valid) {
      throw new Error(`FA(3) validation failed: ${validation.errors.join(', ')}`);
    }

    // Create or update submission record
    const submission = await prisma.kSeFSubmission.upsert({
      where: { invoiceId },
      create: {
        invoiceId,
        tenantId: invoice.tenantId,
        fa3Xml,
        status: 'PENDING',
      },
      update: {
        fa3Xml,
        status: 'SUBMITTING',
        retryCount: { increment: 1 },
      },
    });

    // Submit to KSeF
    const ksefClient = createKSeFClient('test', tenantNip);
    const result = await ksefClient.submitInvoice(fa3Xml);

    if (result.success && result.ksefNumber) {
      // Update submission as successful
      await prisma.kSeFSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'ACCEPTED',
          ksefNumber: result.ksefNumber,
          submittedAt: new Date(),
        },
      });

      // Update invoice
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          ksefNumber: result.ksefNumber,
          ksefStatus: 'ACCEPTED',
          ksefSubmittedAt: new Date(),
          status: 'SUBMITTED',
        },
      });

      return {
        success: true,
        ksefNumber: result.ksefNumber,
      };
    } else {
      // Handle submission failure
      await prisma.kSeFSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'FAILED',
          errorCode: result.error?.code,
          errorMessage: result.error?.message,
          errorDetails: result.error?.details as never,
        },
      });

      return {
        success: false,
        error: result.error?.message || 'Submission failed',
      };
    }
  } catch (error) {
    console.error('[KSeF] Submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download UPO document for submitted invoice
 */
export async function downloadUPODocument(
  invoiceId: string,
  tenantNip: string
): Promise<{ success: boolean; content?: Buffer; error?: string }> {
  try {
    const submission = await prisma.kSeFSubmission.findUnique({
      where: { invoiceId },
    });

    if (!submission || !submission.ksefNumber) {
      throw new Error('Invoice not submitted to KSeF');
    }

    const ksefClient = createKSeFClient('test', tenantNip);
    const upo = await ksefClient.downloadUPO(submission.ksefNumber);

    // Update submission with UPO URL
    await prisma.kSeFSubmission.update({
      where: { id: submission.id },
      data: {
        upoUrl: `upo/${submission.ksefNumber}.pdf`,
      },
    });

    return {
      success: true,
      content: upo.content,
    };
  } catch (error) {
    console.error('[KSeF] UPO download error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed',
    };
  }
}

/**
 * Convert Prisma invoice to FA(3) format
 */
function convertInvoiceToFA3(
  invoice: {
    invoiceNumber: string | null;
    invoiceDate: Date | null;
    dueDate: Date | null;
    currency: string;
    netAmount: unknown;
    vatAmount: unknown;
    grossAmount: unknown;
    extractedData: unknown;
    lineItems: Array<{
      lineNumber: number;
      description: string;
      quantity: unknown;
      unitPrice: unknown;
      vatRate: unknown;
      netAmount: unknown;
      vatAmount: unknown;
      grossAmount: unknown;
    }>;
  }
): FA3Invoice {
  const extracted = invoice.extractedData as {
    supplier?: { name?: string; vatId?: string; address?: string };
    buyer?: { name?: string; vatId?: string; address?: string };
  } | null;

  return {
    header: {
      invoiceNumber: invoice.invoiceNumber || 'UNKNOWN',
      issueDate: invoice.invoiceDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      sellDate: invoice.invoiceDate?.toISOString().split('T')[0],
      dueDate: invoice.dueDate?.toISOString().split('T')[0],
      currency: invoice.currency,
      invoiceType: 'VAT',
    },
    parties: {
      seller: {
        nip: extracted?.supplier?.vatId || '0000000000',
        name: extracted?.supplier?.name || 'Unknown Seller',
        address: {
          street: 'Unknown',
          houseNumber: '0',
          city: 'Unknown',
          postalCode: '00000',
          country: 'PL',
        },
      },
      buyer: {
        nip: extracted?.buyer?.vatId || '0000000000',
        name: extracted?.buyer?.name || 'Unknown Buyer',
        address: {
          street: 'Unknown',
          houseNumber: '0',
          city: 'Unknown',
          postalCode: '00000',
          country: 'PL',
        },
      },
    },
    lineItems: invoice.lineItems.map((item) => ({
      lineNumber: item.lineNumber,
      description: item.description,
      quantity: Number(item.quantity),
      unitOfMeasure: 'szt',
      unitPrice: Number(item.unitPrice),
      netAmount: Number(item.netAmount),
      vatRate: Number(item.vatRate),
      vatAmount: Number(item.vatAmount),
      grossAmount: Number(item.grossAmount),
    })),
    summary: {
      netAmount: Number(invoice.netAmount || 0),
      vatAmount: Number(invoice.vatAmount || 0),
      grossAmount: Number(invoice.grossAmount || 0),
      currency: invoice.currency,
    },
  };
}
