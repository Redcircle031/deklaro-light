/**
 * KSeF API Client
 * Handles communication with Polish National e-Invoice System
 */

import type {
  KSeFConfig,
  KSeFEnvironment,
  KSeFSessionToken,
  KSeFSubmissionResponse,
  KSeFInvoiceStatus,
  KSeFUPODocument,
  KSeFError,
} from './types';

const KSEF_URLS = {
  test: 'https://ksef-test.mf.gov.pl',
  production: 'https://ksef.mf.gov.pl',
  demo: 'https://ksef-demo.mf.gov.pl',
} as const;

// Note: The actual KSeF API endpoints require:
// 1. XML-based requests (not JSON)
// 2. Certificate-based authentication for production
// 3. Proper namespace declarations in XML
//
// Example endpoints:
// - POST /api/online/Session/InitToken
// - POST /api/online/Invoice/Send
// - GET /api/online/Invoice/Status/{invoiceId}
// - GET /api/online/Invoice/Upo/{ksefNumber}

export class KSeFClient {
  private config: KSeFConfig;
  private sessionToken: KSeFSessionToken | null = null;

  constructor(environment: KSeFEnvironment = 'test', nip: string) {
    this.config = {
      environment,
      apiUrl: KSEF_URLS[environment],
      nip,
    };
  }

  /**
   * Authenticate with KSeF and obtain session token
   *
   * IMPORTANT: This is a MOCK implementation for development.
   * The real KSeF API requires:
   * 1. XML-based requests (not JSON)
   * 2. Digital certificate authentication (.pfx/.p12 files)
   * 3. Proper XML namespaces and structure
   *
   * To implement real authentication, you need to:
   * - Load the digital certificate
   * - Create an XML InitSessionTokenRequest
   * - Sign the request with the certificate
   * - Send as application/octet-stream
   *
   * See: https://github.com/ksef4dev/sample-requests for real examples
   */
  async authenticate(): Promise<KSeFSessionToken> {
    try {
      // MOCK IMPLEMENTATION - Replace with real XML-based authentication
      const response = await fetch(`${this.config.apiUrl}/online/Session/InitToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: {
            challenge: await this.generateChallenge(),
            identifier: {
              type: 'onip',
              identifier: this.config.nip,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`KSeF authentication failed: ${response.statusText}`);
      }

      const data = await response.json();

      this.sessionToken = {
        token: data.sessionToken.token,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        sessionId: data.sessionToken.sessionId,
      };

      return this.sessionToken;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Submit invoice to KSeF
   */
  async submitInvoice(fa3Xml: string): Promise<KSeFSubmissionResponse> {
    await this.ensureAuthenticated();

    try {
      const response = await fetch(
        `${this.config.apiUrl}/online/Invoice/Send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            'SessionToken': this.sessionToken!.token,
          },
          body: fa3Xml,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: errorData.message || 'Submission failed',
            details: errorData,
          },
        };
      }

      const data = await response.json();

      return {
        success: true,
        ksefNumber: data.elementReferenceNumber,
        referenceNumber: data.processingCode,
        timestamp: new Date(data.timestamp),
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  /**
   * Check invoice status in KSeF
   */
  async getInvoiceStatus(ksefNumber: string): Promise<KSeFInvoiceStatus> {
    await this.ensureAuthenticated();

    try {
      const response = await fetch(
        `${this.config.apiUrl}/online/Invoice/Status/${ksefNumber}`,
        {
          method: 'GET',
          headers: {
            'SessionToken': this.sessionToken!.token,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get invoice status: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        ksefNumber,
        status: this.mapStatus(data.processingCode),
        upoUrl: data.upo?.url,
        processingDate: data.timestamp ? new Date(data.timestamp) : undefined,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Download UPO (Urzędowe Poświadczenie Odbioru) document
   */
  async downloadUPO(ksefNumber: string): Promise<KSeFUPODocument> {
    await this.ensureAuthenticated();

    try {
      const response = await fetch(
        `${this.config.apiUrl}/online/Invoice/Upo/${ksefNumber}`,
        {
          method: 'GET',
          headers: {
            'SessionToken': this.sessionToken!.token,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to download UPO: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      return {
        ksefNumber,
        content: buffer,
        contentType: response.headers.get('Content-Type') || 'application/pdf',
        fileName: `UPO_${ksefNumber}.pdf`,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Terminate session
   */
  async logout(): Promise<void> {
    if (!this.sessionToken) {
      return;
    }

    try {
      await fetch(`${this.config.apiUrl}/online/Session/Terminate`, {
        method: 'POST',
        headers: {
          'SessionToken': this.sessionToken.token,
        },
      });

      this.sessionToken = null;
    } catch (error) {
      console.error('Failed to terminate KSeF session:', error);
    }
  }

  /**
   * Private helpers
   */

  private async ensureAuthenticated(): Promise<void> {
    if (!this.sessionToken || this.isTokenExpired()) {
      await this.authenticate();
    }
  }

  private isTokenExpired(): boolean {
    if (!this.sessionToken) {
      return true;
    }
    return new Date() >= this.sessionToken.expiresAt;
  }

  private async generateChallenge(): Promise<string> {
    // Generate random challenge for authentication
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    }
    return Buffer.from(array).toString('base64');
  }

  private mapStatus(processingCode: number): 'PENDING' | 'ACCEPTED' | 'REJECTED' {
    if (processingCode === 200) return 'ACCEPTED';
    if (processingCode >= 400) return 'REJECTED';
    return 'PENDING';
  }

  private handleError(error: unknown): KSeFError {
    if (error instanceof Error) {
      return {
        code: 'CLIENT_ERROR',
        message: error.message,
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
    };
  }
}

/**
 * Create a KSeF client instance
 */
export function createKSeFClient(
  environment: KSeFEnvironment = 'test',
  nip: string
): KSeFClient {
  return new KSeFClient(environment, nip);
}
