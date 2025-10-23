/**
 * White List VAT API Client (Biała Lista Podatników VAT)
 * Polish Government API for NIP/VAT validation
 *
 * API Documentation: https://www.gov.pl/web/kas/api-wykazu-podatnikow-vat
 * Base URL: https://wl-api.mf.gov.pl
 */

export interface CompanyData {
  name: string;
  nip: string;
  regon?: string;
  pesel?: string;
  krs?: string;
  residenceAddress?: string;
  workingAddress?: string;
  registrationLegalDate?: string;
  registrationDenialBasis?: string;
  registrationDenialDate?: string;
  restorationBasis?: string;
  restorationDate?: string;
  removalBasis?: string;
  removalDate?: string;
  accountNumbers?: string[];
  hasVirtualAccounts?: boolean;
}

export interface SearchResponse {
  result: {
    subject: CompanyData;
    requestDateTime: string;
    requestId: string;
  };
}

export interface CheckResponse {
  result: {
    subjects: CompanyData[];
    requestDateTime: string;
    requestId: string;
  };
}

export interface VATValidationResult {
  isValid: boolean;
  nip: string;
  companyData?: CompanyData;
  error?: string;
  cached?: boolean;
}

/**
 * Validates a Polish NIP (Tax Identification Number)
 * Format: Must be exactly 10 numeric digits (no spaces, hyphens, or letters)
 * Use formatNIP() first to clean input before validation
 */
export function validateNIPFormat(nip: string): boolean {
  // Must be exactly 10 digits, no spaces/hyphens/letters allowed
  if (!/^\d{10}$/.test(nip)) {
    return false;
  }

  // Validate checksum using Polish NIP algorithm
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const digits = nip.split('').map(Number);

  const sum = weights.reduce((acc, weight, index) => {
    return acc + weight * digits[index];
  }, 0);

  const checksum = sum % 11;
  const lastDigit = digits[9];

  return checksum === 10 ? lastDigit === 0 : checksum === lastDigit;
}

/**
 * Formats NIP by removing non-numeric characters
 * Returns clean numeric string without validation
 */
export function formatNIP(nip: string, withHyphens = false): string {
  // Remove all non-numeric characters (spaces, hyphens, letters, etc.)
  const cleanNIP = nip.replace(/\D/g, '');

  // If withHyphens is true and NIP is 10 digits, format it
  if (withHyphens && cleanNIP.length === 10) {
    return `${cleanNIP.slice(0, 3)}-${cleanNIP.slice(3, 6)}-${cleanNIP.slice(6, 8)}-${cleanNIP.slice(8)}`;
  }

  return cleanNIP;
}

/**
 * White List VAT API Client
 */
class WhiteListVATClient {
  private baseURL = 'https://wl-api.mf.gov.pl';
  private cache: Map<string, { data: VATValidationResult; timestamp: number }> = new Map();
  private cacheExpiryMs = 24 * 60 * 60 * 1000; // 24 hours

  // Rate limiting
  private searchRequestsToday = 0;
  private checkRequestsToday = 0;
  private lastRequestDate = new Date().toDateString();
  private readonly SEARCH_DAILY_LIMIT = 100;
  private readonly CHECK_DAILY_LIMIT = 5000;

  /**
   * Reset rate limits at midnight
   */
  private resetRateLimitsIfNeeded() {
    const today = new Date().toDateString();
    if (today !== this.lastRequestDate) {
      this.searchRequestsToday = 0;
      this.checkRequestsToday = 0;
      this.lastRequestDate = today;
    }
  }

  /**
   * Check if cached data is still valid
   */
  private getCachedResult(nip: string): VATValidationResult | null {
    const cached = this.cache.get(nip);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheExpiryMs) {
      this.cache.delete(nip);
      return null;
    }

    return { ...cached.data, cached: true };
  }

  /**
   * Cache a validation result
   */
  private cacheResult(nip: string, result: VATValidationResult) {
    this.cache.set(nip, {
      data: result,
      timestamp: Date.now(),
    });
  }

  /**
   * Validate and fetch company data for a single NIP using the "search" method
   * Limit: 100 requests per day, up to 30 entities per request
   */
  async searchByNIP(nip: string): Promise<VATValidationResult> {
    // Validate format first
    if (!validateNIPFormat(nip)) {
      return {
        isValid: false,
        nip,
        error: 'Invalid NIP format',
      };
    }

    const cleanNIP = formatNIP(nip, false);

    // Check cache
    const cached = this.getCachedResult(cleanNIP);
    if (cached) {
      return cached;
    }

    // Check rate limits
    this.resetRateLimitsIfNeeded();
    if (this.searchRequestsToday >= this.SEARCH_DAILY_LIMIT) {
      return {
        isValid: false,
        nip: cleanNIP,
        error: `Daily search limit reached (${this.SEARCH_DAILY_LIMIT} requests). Try again tomorrow.`,
      };
    }

    try {
      // Call the White List VAT API
      const response = await fetch(`${this.baseURL}/api/search/nip/${cleanNIP}?date=${new Date().toISOString().split('T')[0]}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      this.searchRequestsToday++;

      if (!response.ok) {
        if (response.status === 404) {
          const result: VATValidationResult = {
            isValid: false,
            nip: cleanNIP,
            error: 'NIP not found in VAT register',
          };
          this.cacheResult(cleanNIP, result);
          return result;
        }

        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();

      if (data.result && data.result.subject) {
        const result: VATValidationResult = {
          isValid: true,
          nip: cleanNIP,
          companyData: data.result.subject,
        };
        this.cacheResult(cleanNIP, result);
        return result;
      }

      const result: VATValidationResult = {
        isValid: false,
        nip: cleanNIP,
        error: 'No data returned from API',
      };
      this.cacheResult(cleanNIP, result);
      return result;

    } catch (error) {
      console.error('White List VAT API error:', error);
      return {
        isValid: false,
        nip: cleanNIP,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Validate multiple NIPs using the "check" method
   * Limit: 5000 entities per day
   */
  async checkMultipleNIPs(nips: string[]): Promise<VATValidationResult[]> {
    // Validate and clean NIPs
    const validNIPs: string[] = [];
    const results: VATValidationResult[] = [];

    for (const nip of nips) {
      if (!validateNIPFormat(nip)) {
        results.push({
          isValid: false,
          nip,
          error: 'Invalid NIP format',
        });
        continue;
      }

      const cleanNIP = formatNIP(nip, false);

      // Check cache
      const cached = this.getCachedResult(cleanNIP);
      if (cached) {
        results.push(cached);
        continue;
      }

      validNIPs.push(cleanNIP);
    }

    if (validNIPs.length === 0) {
      return results;
    }

    // Check rate limits
    this.resetRateLimitsIfNeeded();
    if (this.checkRequestsToday + validNIPs.length > this.CHECK_DAILY_LIMIT) {
      return results.concat(
        validNIPs.map((nip) => ({
          isValid: false,
          nip,
          error: `Daily check limit would be exceeded (${this.CHECK_DAILY_LIMIT} entities per day)`,
        }))
      );
    }

    try {
      const response = await fetch(`${this.baseURL}/api/check/nip/${validNIPs.join(',')}?date=${new Date().toISOString().split('T')[0]}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      this.checkRequestsToday += validNIPs.length;

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: CheckResponse = await response.json();

      if (data.result && data.result.subjects) {
        for (const subject of data.result.subjects) {
          const result: VATValidationResult = {
            isValid: true,
            nip: subject.nip,
            companyData: subject,
          };
          this.cacheResult(subject.nip, result);
          results.push(result);
        }
      }

      return results;

    } catch (error) {
      console.error('White List VAT API error:', error);
      return results.concat(
        validNIPs.map((nip) => ({
          isValid: false,
          nip,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }))
      );
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus() {
    this.resetRateLimitsIfNeeded();
    return {
      search: {
        used: this.searchRequestsToday,
        limit: this.SEARCH_DAILY_LIMIT,
        remaining: this.SEARCH_DAILY_LIMIT - this.searchRequestsToday,
      },
      check: {
        used: this.checkRequestsToday,
        limit: this.CHECK_DAILY_LIMIT,
        remaining: this.CHECK_DAILY_LIMIT - this.checkRequestsToday,
      },
      resetsAt: 'Midnight (00:00 CET/CEST)',
    };
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const whiteListVATClient = new WhiteListVATClient();
