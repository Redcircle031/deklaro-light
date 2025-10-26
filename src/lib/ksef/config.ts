/**
 * KSeF Configuration Module
 *
 * Handles loading KSeF configuration from environment variables,
 * including certificate loading and validation.
 */

import {
  loadCertificate,
  loadCertificateFromBase64,
  validateCertificate,
  isCertificateExpiringSoon,
  type CertificateInfo,
} from './certificate';
import type { KSeFEnvironment } from './types';

export interface KSeFConfig {
  /** KSeF environment (test, production, demo) */
  environment: KSeFEnvironment;

  /** Tenant NIP (Polish tax ID) */
  nip: string;

  /** Certificate information (if certificate auth is configured) */
  certificate?: CertificateInfo;

  /** Whether to use certificate authentication (vs mock) */
  useCertificateAuth: boolean;
}

/**
 * Load KSeF configuration from environment variables
 *
 * Environment variables:
 * - KSEF_ENVIRONMENT: 'test' | 'production' | 'demo' (default: 'test')
 * - KSEF_CERT_PATH: Path to .pfx/.p12 certificate file
 * - KSEF_CERT_BASE64: Base64-encoded certificate (alternative to path)
 * - KSEF_CERT_PASSWORD: Certificate password
 * - KSEF_USE_CERT_AUTH: 'true' to enable certificate auth (default: 'false')
 */
export function loadKSeFConfig(tenantNip: string): KSeFConfig {
  const environment = (process.env.KSEF_ENVIRONMENT || 'test') as KSeFEnvironment;
  const useCertificateAuth = process.env.KSEF_USE_CERT_AUTH === 'true';

  console.log('[KSeF Config] Loading configuration:', {
    environment,
    useCertificateAuth,
    nip: tenantNip,
  });

  // If certificate auth is not enabled, return basic config
  if (!useCertificateAuth) {
    console.log('[KSeF Config] Certificate authentication disabled, using mock mode');
    return {
      environment,
      nip: tenantNip,
      useCertificateAuth: false,
    };
  }

  // Load certificate
  const certificate = loadKSeFCertificate();

  if (!certificate) {
    console.warn('[KSeF Config] Certificate authentication enabled but no certificate found, falling back to mock mode');
    return {
      environment,
      nip: tenantNip,
      useCertificateAuth: false,
    };
  }

  // Validate certificate
  try {
    validateCertificate(certificate);
  } catch (error) {
    console.error('[KSeF Config] Certificate validation failed:', error);
    throw error;
  }

  // Check if certificate is expiring soon
  if (isCertificateExpiringSoon(certificate)) {
    const daysUntilExpiry = Math.floor(
      (certificate.validity.notAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    console.warn(`[KSeF Config] ⚠️  Certificate will expire in ${daysUntilExpiry} days!`);
  }

  console.log('[KSeF Config] Certificate loaded successfully:', {
    subject: certificate.subject.commonName,
    validUntil: certificate.validity.notAfter.toISOString(),
  });

  return {
    environment,
    nip: tenantNip,
    certificate,
    useCertificateAuth: true,
  };
}

/**
 * Load certificate from environment variables
 */
function loadKSeFCertificate(): CertificateInfo | null {
  const certPath = process.env.KSEF_CERT_PATH;
  const certBase64 = process.env.KSEF_CERT_BASE64;
  const certPassword = process.env.KSEF_CERT_PASSWORD;

  if (!certPassword) {
    console.error('[KSeF Config] KSEF_CERT_PASSWORD is required when using certificate authentication');
    return null;
  }

  // Try loading from file path first
  if (certPath) {
    try {
      console.log('[KSeF Config] Loading certificate from file:', certPath);
      return loadCertificate(certPath, certPassword);
    } catch (error) {
      console.error('[KSeF Config] Failed to load certificate from file:', error);
      // Don't return null yet, try Base64 next
    }
  }

  // Try loading from Base64
  if (certBase64) {
    try {
      console.log('[KSeF Config] Loading certificate from Base64 string');
      return loadCertificateFromBase64(certBase64, certPassword);
    } catch (error) {
      console.error('[KSeF Config] Failed to load certificate from Base64:', error);
      return null;
    }
  }

  console.error('[KSeF Config] Neither KSEF_CERT_PATH nor KSEF_CERT_BASE64 is set');
  return null;
}

/**
 * Get tenant NIP from database
 *
 * In production, this should fetch the NIP from the tenant settings table.
 * For now, returns a placeholder.
 */
export async function getTenantNip(tenantId: string): Promise<string> {
  // TODO: Fetch from database
  // const tenant = await prisma.tenant.findUnique({
  //   where: { id: tenantId },
  //   select: { nip: true },
  // });
  // return tenant?.nip || '';

  // For now, return from environment variable or placeholder
  return process.env.KSEF_DEFAULT_NIP || '0000000000';
}

/**
 * Validate NIP format
 */
export function isValidNip(nip: string): boolean {
  // Remove any dashes or spaces
  const cleaned = nip.replace(/[-\s]/g, '');

  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(cleaned)) {
    return false;
  }

  // Validate checksum (Polish NIP algorithm)
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }

  const checksum = sum % 11;
  const lastDigit = parseInt(cleaned[9]);

  return checksum === lastDigit;
}
