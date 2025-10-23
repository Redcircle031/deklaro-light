/**
 * Company Auto-Creation Service
 * Automatically creates company records from NIP numbers found in invoices
 * Validates NIPs via White List VAT API and prevents duplicates
 */

import { PrismaClient } from '@prisma/client';
import { whiteListVATClient, formatNIP } from '@/lib/weis/client';

const prisma = new PrismaClient();

export interface CompanyCreationResult {
  success: boolean;
  companyId?: string;
  nip: string;
  action: 'created' | 'found_existing' | 'invalid_nip' | 'validation_failed' | 'creation_failed';
  message: string;
  companyData?: {
    id: string;
    name: string;
    nip: string;
    regon?: string | null;
    krs?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
  };
}

/**
 * Automatically create or find a company by NIP
 * 1. Validates NIP format
 * 2. Checks for existing company (deduplication)
 * 3. Validates NIP via White List VAT API
 * 4. Creates company with VAT registry data
 */
export async function autoCreateCompanyByNIP(
  nip: string,
  tenantId: string
): Promise<CompanyCreationResult> {
  try {
    // Clean and format NIP
    const cleanNIP = formatNIP(nip, false);

    // Step 1: Check if company already exists (deduplication)
    const existingCompany = await prisma.company.findFirst({
      where: {
        nip: cleanNIP,
        tenantId,
      },
    });

    if (existingCompany) {
      return {
        success: true,
        companyId: existingCompany.id,
        nip: cleanNIP,
        action: 'found_existing',
        message: 'Company already exists in database',
        companyData: {
          id: existingCompany.id,
          name: existingCompany.name,
          nip: existingCompany.nip,
          regon: existingCompany.regon,
          krs: existingCompany.krs,
          address: existingCompany.address,
          city: existingCompany.city,
          postalCode: existingCompany.postalCode,
        },
      };
    }

    // Step 2: Validate NIP via White List VAT API
    const validationResult = await whiteListVATClient.searchByNIP(cleanNIP);

    if (!validationResult.isValid) {
      return {
        success: false,
        nip: cleanNIP,
        action: 'invalid_nip',
        message: validationResult.error || 'NIP validation failed',
      };
    }

    if (!validationResult.companyData) {
      return {
        success: false,
        nip: cleanNIP,
        action: 'validation_failed',
        message: 'No company data returned from VAT registry',
      };
    }

    // Step 3: Parse address from VAT registry data
    const addressData = parseAddress(
      validationResult.companyData.workingAddress ||
      validationResult.companyData.residenceAddress
    );

    // Step 4: Create company record
    const newCompany = await prisma.company.create({
      data: {
        tenantId,
        name: validationResult.companyData.name,
        nip: cleanNIP,
        regon: validationResult.companyData.regon || null,
        krs: validationResult.companyData.krs || null,
        address: addressData.street || validationResult.companyData.workingAddress || null,
        city: addressData.city || null,
        postalCode: addressData.postalCode || null,
        country: 'Poland',
        email: null, // Not available from VAT registry
        phone: null, // Not available from VAT registry
        // Store additional metadata
        vatRegistrationDate: validationResult.companyData.registrationLegalDate
          ? new Date(validationResult.companyData.registrationLegalDate)
          : null,
      },
    });

    return {
      success: true,
      companyId: newCompany.id,
      nip: cleanNIP,
      action: 'created',
      message: 'Company created successfully from VAT registry',
      companyData: {
        id: newCompany.id,
        name: newCompany.name,
        nip: newCompany.nip,
        regon: newCompany.regon,
        krs: newCompany.krs,
        address: newCompany.address,
        city: newCompany.city,
        postalCode: newCompany.postalCode,
      },
    };

  } catch (error) {
    console.error('Company auto-creation error:', error);
    return {
      success: false,
      nip,
      action: 'creation_failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Parse Polish address into components
 * Format: "ul. Marszałkowska 1, 00-001 Warszawa"
 */
function parseAddress(address?: string): {
  street?: string;
  city?: string;
  postalCode?: string;
} {
  if (!address) return {};

  // Try to extract postal code (XX-XXX format)
  const postalCodeMatch = address.match(/\b\d{2}-\d{3}\b/);
  const postalCode = postalCodeMatch ? postalCodeMatch[0] : undefined;

  // Try to extract city (after postal code or after comma)
  let city: string | undefined;
  if (postalCode) {
    const afterPostalCode = address.split(postalCode)[1];
    city = afterPostalCode?.trim().split(',')[0].trim();
  } else {
    const parts = address.split(',');
    if (parts.length > 1) {
      city = parts[parts.length - 1].trim();
    }
  }

  // Extract street (before postal code or before last comma)
  let street: string | undefined;
  if (postalCode) {
    street = address.split(postalCode)[0].trim().replace(/,$/, '').trim();
  } else {
    const parts = address.split(',');
    if (parts.length > 1) {
      street = parts.slice(0, -1).join(',').trim();
    } else {
      street = address;
    }
  }

  return {
    street: street || undefined,
    city: city || undefined,
    postalCode: postalCode || undefined,
  };
}

/**
 * Batch create companies from multiple NIPs
 * Useful for processing multiple invoices
 */
export async function autoCreateCompaniesByNIPs(
  nips: string[],
  tenantId: string
): Promise<CompanyCreationResult[]> {
  const results: CompanyCreationResult[] = [];

  // Process NIPs sequentially to avoid overwhelming the API
  for (const nip of nips) {
    const result = await autoCreateCompanyByNIP(nip, tenantId);
    results.push(result);

    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Find or create company by NIP
 * Simplified interface that just returns the company ID
 */
export async function findOrCreateCompanyByNIP(
  nip: string,
  tenantId: string
): Promise<string | null> {
  const result = await autoCreateCompanyByNIP(nip, tenantId);
  return result.companyId || null;
}
