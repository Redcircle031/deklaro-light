/**
 * FA(3) XML Converter
 * Converts invoice data to Polish FA(3) e-invoice format
 */

import { XMLBuilder } from 'fast-xml-parser';
import type { FA3Invoice, FA3LineItem } from './types';

/**
 * Convert FA3Invoice to XML string compliant with FA(3) schema
 */
export function convertToFA3Xml(invoice: FA3Invoice): string {
  const fa3Data = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8',
    },
    Faktura: {
      '@_xmlns': 'http://crd.gov.pl/wzor/2023/06/29/12648/',
      '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      Naglowek: {
        KodFormularza: {
          '@_kodSystemowy': 'FA (3)',
          '@_wersjaSchemy': '1-0E',
          '#text': 'FA',
        },
        WariantFormularza: '3',
        DataWytworzeniaFa: new Date().toISOString().split('T')[0],
        SystemInfo: 'Deklaro Invoice Management System v1.0',
      },
      Podmiot1: {
        // Seller (Sprzedawca)
        DaneIdentyfikacyjne: {
          NIP: invoice.parties.seller.nip.replace(/[^0-9]/g, ''),
          Nazwa: invoice.parties.seller.name,
        },
        Adres: {
          KodKraju: invoice.parties.seller.address.country,
          Wojewodztwo: 'PL', // Simplified - should be actual province
          Powiat: invoice.parties.seller.address.city,
          Gmina: invoice.parties.seller.address.city,
          Ulica: invoice.parties.seller.address.street,
          NrDomu: invoice.parties.seller.address.houseNumber,
          ...(invoice.parties.seller.address.apartmentNumber && {
            NrLokalu: invoice.parties.seller.address.apartmentNumber,
          }),
          Miejscowosc: invoice.parties.seller.address.city,
          KodPocztowy: invoice.parties.seller.address.postalCode.replace(
            /[^0-9]/g,
            ''
          ),
        },
      },
      Podmiot2: {
        // Buyer (Nabywca)
        DaneIdentyfikacyjne: {
          NIP: invoice.parties.buyer.nip.replace(/[^0-9]/g, ''),
          Nazwa: invoice.parties.buyer.name,
        },
        Adres: {
          KodKraju: invoice.parties.buyer.address.country,
          Wojewodztwo: 'PL',
          Powiat: invoice.parties.buyer.address.city,
          Gmina: invoice.parties.buyer.address.city,
          Ulica: invoice.parties.buyer.address.street,
          NrDomu: invoice.parties.buyer.address.houseNumber,
          ...(invoice.parties.buyer.address.apartmentNumber && {
            NrLokalu: invoice.parties.buyer.address.apartmentNumber,
          }),
          Miejscowosc: invoice.parties.buyer.address.city,
          KodPocztowy: invoice.parties.buyer.address.postalCode.replace(
            /[^0-9]/g,
            ''
          ),
        },
      },
      Fa: {
        P_1: invoice.header.issueDate, // Data wystawienia
        P_2: invoice.header.invoiceNumber, // Numer faktury
        ...(invoice.header.sellDate && { P_6: invoice.header.sellDate }), // Data sprzedaży
        P_13_1: formatAmount(invoice.summary.netAmount), // Wartość netto
        P_14_1: formatAmount(invoice.summary.vatAmount), // Kwota VAT
        P_15: formatAmount(invoice.summary.grossAmount), // Wartość brutto
        // Line items
        FaWiersz: invoice.lineItems.map((item) => convertLineItem(item)),
      },
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
  });

  return builder.build(fa3Data);
}

/**
 * Convert line item to FA(3) format
 */
function convertLineItem(item: FA3LineItem) {
  return {
    NrWierszaFa: item.lineNumber,
    P_7: item.description, // Nazwa towaru/usługi
    P_8A: item.quantity.toFixed(2), // Ilość
    P_8B: item.unitOfMeasure, // Jednostka miary
    P_9A: formatAmount(item.unitPrice), // Cena jednostkowa netto
    P_11: formatAmount(item.netAmount), // Wartość netto
    P_12: item.vatRate.toString(), // Stawka VAT
  };
}

/**
 * Format amount to 2 decimal places as string
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Validate FA(3) XML against basic schema rules
 */
export function validateFA3Xml(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic validation checks
  if (!xml.includes('xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/"')) {
    errors.push('Missing required XML namespace');
  }

  if (!xml.includes('<KodFormularza')) {
    errors.push('Missing KodFormularza element');
  }

  if (!xml.includes('FA (3)')) {
    errors.push('Invalid form code - must be FA (3)');
  }

  // Check for required seller/buyer data
  if (!xml.includes('<Podmiot1>') || !xml.includes('<Podmiot2>')) {
    errors.push('Missing seller or buyer data');
  }

  // Check for NIP numbers
  const nipMatches = xml.match(/<NIP>(\d{10})<\/NIP>/g);
  if (!nipMatches || nipMatches.length < 2) {
    errors.push('Invalid or missing NIP numbers');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse address string into components
 * Helper for extracting address from OCR text
 */
export function parseAddress(addressString: string): {
  street?: string;
  houseNumber?: string;
  apartmentNumber?: string;
  city?: string;
  postalCode?: string;
} {
  // Simple regex patterns for Polish addresses
  const postalCodeMatch = addressString.match(/(\d{2}-\d{3})/);
  const cityMatch = addressString.match(/\d{2}-\d{3}\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]+)/i);

  // Extract street and number (simplified)
  const streetMatch = addressString.match(/(?:ul\.|ulica)?\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]+)\s+(\d+[A-Za-z]?)(?:\/(\d+))?/i);

  return {
    postalCode: postalCodeMatch?.[1],
    city: cityMatch?.[1]?.trim(),
    street: streetMatch?.[1]?.trim(),
    houseNumber: streetMatch?.[2],
    apartmentNumber: streetMatch?.[3],
  };
}
