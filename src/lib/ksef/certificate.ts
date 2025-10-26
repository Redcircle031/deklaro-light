/**
 * KSeF Certificate Management
 *
 * Handles loading and validating digital certificates for KSeF authentication.
 * Supports .pfx and .p12 certificate formats.
 */

import * as forge from 'node-forge';
import { readFileSync } from 'fs';

export interface CertificateInfo {
  /** Certificate in forge format */
  certificate: forge.pki.Certificate;

  /** Private key */
  privateKey: forge.pki.PrivateKey;

  /** Subject (certificate holder) information */
  subject: {
    commonName?: string;
    organization?: string;
    country?: string;
  };

  /** Issuer information */
  issuer: {
    commonName?: string;
    organization?: string;
  };

  /** Validity period */
  validity: {
    notBefore: Date;
    notAfter: Date;
  };

  /** Certificate serial number */
  serialNumber: string;

  /** Whether the certificate is currently valid */
  isValid: boolean;
}

/**
 * Load certificate from .pfx/.p12 file
 *
 * @param certPath - Path to certificate file
 * @param password - Certificate password
 * @returns Certificate information
 */
export function loadCertificate(certPath: string, password: string): CertificateInfo {
  try {
    // Read certificate file
    const certBuffer = readFileSync(certPath);
    const certBase64 = certBuffer.toString('base64');

    // Parse PKCS#12 certificate
    const p12Asn1 = forge.asn1.fromDer(forge.util.decode64(certBase64));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Get certificate bags
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const pkeyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

    // Extract certificate
    const certBag = certBags[forge.pki.oids.certBag];
    if (!certBag || certBag.length === 0) {
      throw new Error('No certificate found in .pfx file');
    }

    const cert = certBag[0].cert;
    if (!cert) {
      throw new Error('Invalid certificate data');
    }

    // Extract private key
    const pkeyBag = pkeyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (!pkeyBag || pkeyBag.length === 0) {
      throw new Error('No private key found in .pfx file');
    }

    const privateKey = pkeyBag[0].key;
    if (!privateKey) {
      throw new Error('Invalid private key data');
    }

    // Extract subject information
    const subjectAttrs = cert.subject.attributes;
    const subject = {
      commonName: findAttribute(subjectAttrs, 'commonName'),
      organization: findAttribute(subjectAttrs, 'organizationName'),
      country: findAttribute(subjectAttrs, 'countryName'),
    };

    // Extract issuer information
    const issuerAttrs = cert.issuer.attributes;
    const issuer = {
      commonName: findAttribute(issuerAttrs, 'commonName'),
      organization: findAttribute(issuerAttrs, 'organizationName'),
    };

    // Check validity
    const now = new Date();
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;
    const isValid = now >= notBefore && now <= notAfter;

    return {
      certificate: cert,
      privateKey,
      subject,
      issuer,
      validity: {
        notBefore,
        notAfter,
      },
      serialNumber: cert.serialNumber,
      isValid,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load certificate: ${error.message}`);
    }
    throw new Error('Failed to load certificate: Unknown error');
  }
}

/**
 * Load certificate from Base64-encoded string
 *
 * Useful when certificate is stored in environment variable
 */
export function loadCertificateFromBase64(certBase64: string, password: string): CertificateInfo {
  try {
    // Parse PKCS#12 certificate
    const p12Asn1 = forge.asn1.fromDer(forge.util.decode64(certBase64));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Get certificate bags
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const pkeyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

    // Extract certificate
    const certBag = certBags[forge.pki.oids.certBag];
    if (!certBag || certBag.length === 0) {
      throw new Error('No certificate found');
    }

    const cert = certBag[0].cert;
    if (!cert) {
      throw new Error('Invalid certificate data');
    }

    // Extract private key
    const pkeyBag = pkeyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (!pkeyBag || pkeyBag.length === 0) {
      throw new Error('No private key found');
    }

    const privateKey = pkeyBag[0].key;
    if (!privateKey) {
      throw new Error('Invalid private key data');
    }

    // Extract information
    const subjectAttrs = cert.subject.attributes;
    const issuerAttrs = cert.issuer.attributes;

    const now = new Date();
    const isValid = now >= cert.validity.notBefore && now <= cert.validity.notAfter;

    return {
      certificate: cert,
      privateKey,
      subject: {
        commonName: findAttribute(subjectAttrs, 'commonName'),
        organization: findAttribute(subjectAttrs, 'organizationName'),
        country: findAttribute(subjectAttrs, 'countryName'),
      },
      issuer: {
        commonName: findAttribute(issuerAttrs, 'commonName'),
        organization: findAttribute(issuerAttrs, 'organizationName'),
      },
      validity: {
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter,
      },
      serialNumber: cert.serialNumber,
      isValid,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load certificate from Base64: ${error.message}`);
    }
    throw new Error('Failed to load certificate from Base64: Unknown error');
  }
}

/**
 * Validate certificate
 *
 * @param certInfo - Certificate information
 * @throws Error if certificate is invalid or expired
 */
export function validateCertificate(certInfo: CertificateInfo): void {
  const now = new Date();

  // Check if expired
  if (now < certInfo.validity.notBefore) {
    throw new Error(
      `Certificate is not yet valid. Valid from: ${certInfo.validity.notBefore.toISOString()}`
    );
  }

  if (now > certInfo.validity.notAfter) {
    throw new Error(
      `Certificate has expired. Valid until: ${certInfo.validity.notAfter.toISOString()}`
    );
  }

  // Check subject
  if (!certInfo.subject.commonName) {
    throw new Error('Certificate does not have a Common Name');
  }

  console.log('[Certificate] Validation passed:', {
    subject: certInfo.subject.commonName,
    validUntil: certInfo.validity.notAfter.toISOString(),
  });
}

/**
 * Get certificate PEM format (for debugging)
 */
export function getCertificatePEM(certInfo: CertificateInfo): string {
  return forge.pki.certificateToPem(certInfo.certificate);
}

/**
 * Get private key PEM format (for debugging - handle with care!)
 */
export function getPrivateKeyPEM(certInfo: CertificateInfo): string {
  return forge.pki.privateKeyToPem(certInfo.privateKey);
}

/**
 * Helper function to find attribute in certificate
 */
function findAttribute(
  attributes: forge.pki.CertificateField[],
  name: string
): string | undefined {
  const attr = attributes.find((a) => a.name === name || a.shortName === name);
  return attr?.value as string | undefined;
}

/**
 * Check if certificate will expire soon
 *
 * @param certInfo - Certificate information
 * @param daysThreshold - Number of days before expiration to warn (default: 30)
 * @returns true if certificate will expire within threshold
 */
export function isCertificateExpiringSoon(
  certInfo: CertificateInfo,
  daysThreshold: number = 30
): boolean {
  const now = new Date();
  const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  return certInfo.validity.notAfter <= threshold;
}
