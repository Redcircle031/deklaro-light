/**
 * KSeF API Client
 * Handles communication with Polish National e-Invoice System
 *
 * Supports both certificate-based authentication (production) and mock mode (development).
 */

import type {
  KSeFEnvironment,
  KSeFSessionToken,
  KSeFSubmissionResponse,
  KSeFInvoiceStatus,
  KSeFUPODocument,
  KSeFError,
} from './types';
import type { KSeFConfig } from './config';
import { createAuthenticationXML, signXML } from './xml-signer';

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
  private apiUrl: string;

  constructor(config: KSeFConfig) {
    this.config = config;
    this.apiUrl = KSEF_URLS[config.environment];

    console.log('[KSeF Client] Initialized:', {
      environment: config.environment,
      useCertAuth: config.useCertificateAuth,
      nip: config.nip,
    });
  }

  /**
   * Authenticate with KSeF and obtain session token
   *
   * Supports both certificate-based authentication (production) and mock mode (development).
   */
  async authenticate(): Promise<KSeFSessionToken> {
    try {
      // Use certificate-based authentication if configured
      if (this.config.useCertificateAuth && this.config.certificate) {
        return await this.authenticateWithCertificate();
      }

      // Fall back to mock authentication for development
      return await this.authenticateMock();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Certificate-based authentication (production)
   */
  private async authenticateWithCertificate(): Promise<KSeFSessionToken> {
    if (!this.config.certificate) {
      throw new Error('Certificate is required for certificate-based authentication');
    }

    console.log('[KSeF Client] Authenticating with certificate...');

    // Create signed authentication XML
    const authXml = createAuthenticationXML(this.config.nip, this.config.certificate);

    // Send authentication request
    const response = await fetch(`${this.apiUrl}/api/online/Session/InitToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Accept': 'application/json',
      },
      body: authXml,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`KSeF authentication failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    this.sessionToken = {
      token: data.sessionToken?.token || data.token,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour (KSeF default)
      sessionId: data.sessionToken?.sessionId || data.referenceNumber,
    };

    console.log('[KSeF Client] ✅ Authentication successful (certificate-based)');

    return this.sessionToken;
  }

  /**
   * Mock authentication (development/testing)
   */
  private async authenticateMock(): Promise<KSeFSessionToken> {
    console.log('[KSeF Client] ⚠️  Using MOCK authentication (development mode)');

    // Generate mock token
    const mockToken = `mock-token-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    this.sessionToken = {
      token: mockToken,
      expiresAt: new Date(Date.now() + 3600000),
      sessionId: `mock-session-${Date.now()}`,
    };

    return this.sessionToken;
  }

  /**
   * Submit invoice to KSeF
   *
   * @param fa3Xml - FA(3) invoice XML document
   * @returns Submission response with KSeF number if successful
   */
  async submitInvoice(fa3Xml: string): Promise<KSeFSubmissionResponse> {
    await this.ensureAuthenticated();

    try {
      // Sign the XML if using certificate authentication
      let xmlToSend = fa3Xml;

      if (this.config.useCertificateAuth && this.config.certificate) {
        console.log('[KSeF Client] Signing invoice XML with certificate...');
        xmlToSend = signXML(fa3Xml, {
          certificate: this.config.certificate,
          referenceId: 'Faktura',
          signatureId: 'Signature',
        });
        console.log('[KSeF Client] ✅ Invoice XML signed');
      } else {
        console.log('[KSeF Client] ⚠️  Submitting unsigned XML (mock mode)');
      }

      const response = await fetch(
        `${this.apiUrl}/api/online/Invoice/Send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            'SessionToken': this.sessionToken!.token,
            'Accept': 'application/json',
          },
          body: xmlToSend,
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

      console.log('[KSeF Client] ✅ Invoice submitted successfully');

      return {
        success: true,
        ksefNumber: data.elementReferenceNumber || data.ksefReferenceNumber,
        referenceNumber: data.processingCode || data.referenceNumber,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      };
    } catch (error) {
      console.error('[KSeF Client] Invoice submission failed:', error);
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
 * Create a KSeF client instance with configuration
 */
export function createKSeFClient(config: KSeFConfig): KSeFClient {
  return new KSeFClient(config);
}
