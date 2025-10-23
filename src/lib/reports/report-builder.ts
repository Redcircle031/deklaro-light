/**
 * Report Generation Service
 * Generates various financial and invoice reports for Polish SMEs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface VATSummaryReport {
  period: {
    startDate: string;
    endDate: string;
    month?: string;
    year?: number;
  };
  summary: {
    totalNetAmount: number;
    totalVATAmount: number;
    totalGrossAmount: number;
    invoiceCount: number;
  };
  byVATRate: Array<{
    rate: number;
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
    invoiceCount: number;
  }>;
  byType: {
    purchase: {
      netAmount: number;
      vatAmount: number;
      grossAmount: number;
      count: number;
    };
    sale: {
      netAmount: number;
      vatAmount: number;
      grossAmount: number;
      count: number;
    };
  };
}

export interface InvoiceVolumeReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalInvoices: number;
    averagePerDay: number;
    averagePerWeek: number;
  };
  byMonth: Array<{
    month: string;
    year: number;
    count: number;
    netAmount: number;
    grossAmount: number;
  }>;
  byType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export interface SpendingAnalysisReport {
  period: {
    startDate: string;
    endDate: string;
  };
  topVendors: Array<{
    companyId: string;
    companyName: string;
    nip: string;
    invoiceCount: number;
    totalSpent: number;
    averageInvoiceAmount: number;
  }>;
  byCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
    invoiceCount: number;
  }>;
  trends: {
    currentPeriod: number;
    previousPeriod: number;
    changePercentage: number;
    trend: 'up' | 'down' | 'stable';
  };
}

/**
 * Generate Monthly VAT Summary Report
 */
export async function generateVATSummaryReport(
  tenantId: string,
  dateRange: DateRange
): Promise<VATSummaryReport> {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        lineItems: true,
      },
    });

    // Calculate totals
    let totalNet = 0;
    let totalVAT = 0;
    let totalGross = 0;

    const vatRatesMap = new Map<number, { net: number; vat: number; gross: number; count: number }>();
    const typeMap = {
      purchase: { net: 0, vat: 0, gross: 0, count: 0 },
      sale: { net: 0, vat: 0, gross: 0, count: 0 },
    };

    for (const invoice of invoices) {
      const net = invoice.netAmount ? parseFloat(invoice.netAmount.toString()) : 0;
      const vat = invoice.vatAmount ? parseFloat(invoice.vatAmount.toString()) : 0;
      const gross = invoice.grossAmount ? parseFloat(invoice.grossAmount.toString()) : 0;

      totalNet += net;
      totalVAT += vat;
      totalGross += gross;

      // Group by type
      const type = invoice.invoiceType?.toLowerCase() === 'sale' ? 'sale' : 'purchase';
      typeMap[type].net += net;
      typeMap[type].vat += vat;
      typeMap[type].gross += gross;
      typeMap[type].count++;

      // Group by VAT rate from line items
      for (const item of invoice.lineItems) {
        const rate = item.vatRate ? parseFloat(item.vatRate.toString()) : 0;
        const itemNet = item.netAmount ? parseFloat(item.netAmount.toString()) : 0;
        const itemVAT = item.vatAmount ? parseFloat(item.vatAmount.toString()) : 0;
        const itemGross = item.grossAmount ? parseFloat(item.grossAmount.toString()) : 0;

        if (!vatRatesMap.has(rate)) {
          vatRatesMap.set(rate, { net: 0, vat: 0, gross: 0, count: 0 });
        }

        const rateData = vatRatesMap.get(rate)!;
        rateData.net += itemNet;
        rateData.vat += itemVAT;
        rateData.gross += itemGross;
        rateData.count++;
      }
    }

    // Convert VAT rates map to array
    const byVATRate = Array.from(vatRatesMap.entries())
      .map(([rate, data]) => ({
        rate,
        netAmount: data.net,
        vatAmount: data.vat,
        grossAmount: data.gross,
        invoiceCount: data.count,
      }))
      .sort((a, b) => b.rate - a.rate);

    return {
      period: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        month: dateRange.startDate.toLocaleDateString('en-US', { month: 'long' }),
        year: dateRange.startDate.getFullYear(),
      },
      summary: {
        totalNetAmount: totalNet,
        totalVATAmount: totalVAT,
        totalGrossAmount: totalGross,
        invoiceCount: invoices.length,
      },
      byVATRate,
      byType: {
        purchase: {
          netAmount: typeMap.purchase.net,
          vatAmount: typeMap.purchase.vat,
          grossAmount: typeMap.purchase.gross,
          count: typeMap.purchase.count,
        },
        sale: {
          netAmount: typeMap.sale.net,
          vatAmount: typeMap.sale.vat,
          grossAmount: typeMap.sale.gross,
          count: typeMap.sale.count,
        },
      },
    };
  } catch (error) {
    console.error('VAT Summary Report generation error:', error);
    throw error;
  }
}

/**
 * Generate Invoice Volume Report
 */
export async function generateInvoiceVolumeReport(
  tenantId: string,
  dateRange: DateRange
): Promise<InvoiceVolumeReport> {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
    });

    // Group by month
    const monthMap = new Map<string, { count: number; net: number; gross: number }>();
    const typeMap = new Map<string, number>();
    const statusMap = new Map<string, number>();

    for (const invoice of invoices) {
      const date = new Date(invoice.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { count: 0, net: 0, gross: 0 });
      }

      const monthData = monthMap.get(monthKey)!;
      monthData.count++;
      monthData.net += invoice.netAmount ? parseFloat(invoice.netAmount.toString()) : 0;
      monthData.gross += invoice.grossAmount ? parseFloat(invoice.grossAmount.toString()) : 0;

      // Count by type
      const type = invoice.invoiceType || 'UNKNOWN';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);

      // Count by status
      const status = invoice.status;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    }

    // Calculate averages
    const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeksDiff = daysDiff / 7;

    const byMonth = Array.from(monthMap.entries())
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        return {
          month: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long' }),
          year: parseInt(year),
          count: data.count,
          netAmount: data.net,
          grossAmount: data.gross,
        };
      })
      .sort((a, b) => a.year - b.year);

    const byType = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: (count / invoices.length) * 100,
    }));

    const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: (count / invoices.length) * 100,
    }));

    return {
      period: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      },
      summary: {
        totalInvoices: invoices.length,
        averagePerDay: invoices.length / daysDiff,
        averagePerWeek: invoices.length / weeksDiff,
      },
      byMonth,
      byType,
      byStatus,
    };
  } catch (error) {
    console.error('Invoice Volume Report generation error:', error);
    throw error;
  }
}

/**
 * Generate Spending Analysis Report
 */
export async function generateSpendingAnalysisReport(
  tenantId: string,
  dateRange: DateRange
): Promise<SpendingAnalysisReport> {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceType: 'PURCHASE',
        invoiceDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        company: true,
      },
    });

    // Group by company
    const companyMap = new Map<string, { name: string; nip: string; count: number; total: number }>();

    for (const invoice of invoices) {
      if (!invoice.company) continue;

      const companyId = invoice.company.id;
      const amount = invoice.grossAmount ? parseFloat(invoice.grossAmount.toString()) : 0;

      if (!companyMap.has(companyId)) {
        companyMap.set(companyId, {
          name: invoice.company.name,
          nip: invoice.company.nip,
          count: 0,
          total: 0,
        });
      }

      const companyData = companyMap.get(companyId)!;
      companyData.count++;
      companyData.total += amount;
    }

    // Top vendors
    const topVendors = Array.from(companyMap.entries())
      .map(([companyId, data]) => ({
        companyId,
        companyName: data.name,
        nip: data.nip,
        invoiceCount: data.count,
        totalSpent: data.total,
        averageInvoiceAmount: data.total / data.count,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Calculate current period total
    const currentTotal = invoices.reduce((sum, inv) => {
      return sum + (inv.grossAmount ? parseFloat(inv.grossAmount.toString()) : 0);
    }, 0);

    // Calculate previous period for trends
    const periodLength = dateRange.endDate.getTime() - dateRange.startDate.getTime();
    const previousStart = new Date(dateRange.startDate.getTime() - periodLength);
    const previousEnd = new Date(dateRange.startDate);

    const previousInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceType: 'PURCHASE',
        invoiceDate: {
          gte: previousStart,
          lte: previousEnd,
        },
      },
    });

    const previousTotal = previousInvoices.reduce((sum, inv) => {
      return sum + (inv.grossAmount ? parseFloat(inv.grossAmount.toString()) : 0);
    }, 0);

    const changePercentage = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
    const trend = changePercentage > 5 ? 'up' : changePercentage < -5 ? 'down' : 'stable';

    return {
      period: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      },
      topVendors,
      byCategory: [], // Would require categorization system
      trends: {
        currentPeriod: currentTotal,
        previousPeriod: previousTotal,
        changePercentage,
        trend,
      },
    };
  } catch (error) {
    console.error('Spending Analysis Report generation error:', error);
    throw error;
  }
}

/**
 * Utility function to get common date ranges
 */
export function getDateRange(period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom', customRange?: DateRange): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };

    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return {
        startDate: weekStart,
        endDate: now,
      };

    case 'month':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: now,
      };

    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        startDate: new Date(now.getFullYear(), quarter * 3, 1),
        endDate: now,
      };

    case 'year':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: now,
      };

    case 'custom':
      if (!customRange) throw new Error('Custom range requires startDate and endDate');
      return customRange;

    default:
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: now,
      };
  }
}
