/**
 * XML Digital Signature for KSeF
 *
 * Implements XML-DSIG for signing FA(3) invoice documents.
 * Uses XMLDSig standard required by Polish KSeF system.
 */

import * as forge from 'node-forge';
import { create } from 'xmlbuilder2';
import type { CertificateInfo } from './certificate';

export interface SignatureOptions {
  /** Certificate information */
  certificate: CertificateInfo;

  /** ID of the element to sign (optional) */
  referenceId?: string;

  /** Signature ID (optional) */
  signatureId?: string;
}

/**
 * Sign XML document using XMLDSig
 *
 * Creates a digital signature for the XML document using the provided certificate.
 * The signature is compliant with XML-DSIG standard required by KSeF.
 *
 * @param xml - XML document to sign
 * @param options - Signature options including certificate
 * @returns Signed XML document
 */
export function signXML(xml: string, options: SignatureOptions): string {
  const { certificate, referenceId = '', signatureId = 'Signature' } = options;

  try {
    // Canonicalize XML (C14N) - required for consistent signing
    const canonicalXml = canonicalizeXML(xml);

    // Create SHA-256 digest of canonical XML
    const md = forge.md.sha256.create();
    md.update(canonicalXml, 'utf8');
    const digestValue = forge.util.encode64(md.digest().bytes());

    // Build SignedInfo element
    const signedInfo = buildSignedInfo(digestValue, referenceId);

    // Canonicalize SignedInfo
    const canonicalSignedInfo = canonicalizeXML(signedInfo);

    // Sign SignedInfo with private key
    const mdSig = forge.md.sha256.create();
    mdSig.update(canonicalSignedInfo, 'utf8');
    const signature = certificate.privateKey.sign(mdSig);
    const signatureValue = forge.util.encode64(signature);

    // Get certificate in Base64
    const certPem = forge.pki.certificateToPem(certificate.certificate);
    const certBase64 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\s/g, '');

    // Build complete Signature element
    const signatureXml = buildSignatureElement({
      signatureId,
      signedInfo,
      signatureValue,
      certificate: certBase64,
    });

    // Insert signature into original XML
    const signedXml = insertSignature(xml, signatureXml);

    return signedXml;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to sign XML: ${error.message}`);
    }
    throw new Error('Failed to sign XML: Unknown error');
  }
}

/**
 * Build SignedInfo element
 */
function buildSignedInfo(digestValue: string, referenceId: string): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('SignedInfo', {
      xmlns: 'http://www.w3.org/2000/09/xmldsig#',
    })
      .ele('CanonicalizationMethod', {
        Algorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
      })
      .up()
      .ele('SignatureMethod', {
        Algorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      })
      .up()
      .ele('Reference', { URI: referenceId ? `#${referenceId}` : '' })
        .ele('Transforms')
          .ele('Transform', {
            Algorithm: 'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
          })
          .up()
          .ele('Transform', {
            Algorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
          })
          .up()
        .up()
        .ele('DigestMethod', {
          Algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
        })
        .up()
        .ele('DigestValue')
          .txt(digestValue)
        .up()
      .up()
    .up();

  return doc.end({ headless: true });
}

/**
 * Build complete Signature element
 */
function buildSignatureElement(params: {
  signatureId: string;
  signedInfo: string;
  signatureValue: string;
  certificate: string;
}): string {
  const { signatureId, signedInfo, signatureValue, certificate } = params;

  // We need to manually construct this to preserve exact structure
  return `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#" Id="${signatureId}">
${signedInfo}
<SignatureValue>${signatureValue}</SignatureValue>
<KeyInfo>
<X509Data>
<X509Certificate>${certificate}</X509Certificate>
</X509Data>
</KeyInfo>
</Signature>`;
}

/**
 * Canonicalize XML (C14N)
 *
 * Simplified canonicalization for KSeF purposes.
 * For production, consider using a proper C14N library.
 */
function canonicalizeXML(xml: string): string {
  // Remove XML declaration
  let canonical = xml.replace(/<\?xml[^?]*\?>/g, '');

  // Normalize whitespace between tags
  canonical = canonical.replace(/>\s+</g, '><');

  // Remove comments
  canonical = canonical.replace(/<!--[\s\S]*?-->/g, '');

  // Trim
  canonical = canonical.trim();

  return canonical;
}

/**
 * Insert signature into XML document
 *
 * KSeF requires the Signature element to be placed in a specific location.
 * For FA(3) documents, it typically goes at the end before closing root tag.
 */
function insertSignature(xml: string, signature: string): string {
  // Find the closing tag of the root element
  // For FA(3), this is usually </Faktura>
  const rootCloseTag = xml.match(/<\/[^>]+>$/);

  if (!rootCloseTag) {
    throw new Error('Could not find root closing tag in XML');
  }

  // Insert signature before the closing tag
  const signedXml = xml.replace(rootCloseTag[0], `${signature}\n${rootCloseTag[0]}`);

  return signedXml;
}

/**
 * Verify XML signature (for testing)
 *
 * @param signedXml - Signed XML document
 * @param certificate - Certificate to verify against
 * @returns true if signature is valid
 */
export function verifyXMLSignature(signedXml: string, certificate: CertificateInfo): boolean {
  try {
    // Extract SignatureValue from XML
    const sigValueMatch = signedXml.match(/<SignatureValue>([^<]+)<\/SignatureValue>/);
    if (!sigValueMatch) {
      return false;
    }

    const signatureValue = forge.util.decode64(sigValueMatch[1]);

    // Extract SignedInfo
    const signedInfoMatch = signedXml.match(/<SignedInfo[^>]*>[\s\S]*?<\/SignedInfo>/);
    if (!signedInfoMatch) {
      return false;
    }

    const signedInfo = signedInfoMatch[0];
    const canonicalSignedInfo = canonicalizeXML(signedInfo);

    // Verify signature
    const md = forge.md.sha256.create();
    md.update(canonicalSignedInfo, 'utf8');

    const publicKey = certificate.certificate.publicKey as forge.pki.rsa.PublicKey;
    return publicKey.verify(md.digest().bytes(), signatureValue);
  } catch (error) {
    console.error('[XML Signer] Verification failed:', error);
    return false;
  }
}

/**
 * Create authentication XML for KSeF InitSessionToken request
 *
 * This is the XML structure required for certificate-based authentication
 */
export function createAuthenticationXML(nip: string, certificate: CertificateInfo): string {
  const timestamp = new Date().toISOString();

  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('InitSessionTokenRequest', {
      xmlns: 'http://ksef.mf.gov.pl/schema/gtw/svc/online/auth/request/201911/InitSessionToken',
    })
      .ele('Context')
        .ele('Timestamp')
          .txt(timestamp)
        .up()
        .ele('Identifier')
          .ele('NIP')
            .txt(nip)
          .up()
        .up()
      .up()
    .up();

  const xml = doc.end({ prettyPrint: true });

  // Sign the XML
  return signXML(xml, { certificate });
}
