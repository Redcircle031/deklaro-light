/**
 * Virus Scanner Module
 *
 * Provides file virus scanning capabilities with multiple backend support:
 * - ClamAV (for self-hosted deployments)
 * - VirusTotal API (for cloud scanning)
 * - File type validation (always enabled)
 *
 * Configuration via environment variables:
 * - VIRUS_SCAN_ENABLED: Enable/disable virus scanning (default: false)
 * - VIRUS_SCAN_PROVIDER: 'clamav' | 'virustotal' | 'none' (default: 'none')
 * - VIRUSTOTAL_API_KEY: API key for VirusTotal
 * - CLAMAV_HOST: ClamAV host (default: localhost)
 * - CLAMAV_PORT: ClamAV port (default: 3310)
 */

export interface ScanResult {
  /** Whether the file is safe */
  safe: boolean;

  /** Whether the scan was performed (or skipped) */
  scanned: boolean;

  /** Scanner provider used */
  provider: 'clamav' | 'virustotal' | 'file-validation' | 'none';

  /** Detection details if virus found */
  detection?: {
    /** Name of detected threat */
    threat: string;

    /** Additional details */
    details?: string;
  };

  /** Error details if scan failed */
  error?: string;
}

interface ScanOptions {
  /** File buffer to scan */
  buffer: Buffer;

  /** Original filename */
  filename: string;

  /** MIME type */
  mimeType: string;

  /** Force scan even if disabled in config */
  force?: boolean;
}

/**
 * Allowed file types for uploads
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
  'application/pdf',
];

/**
 * Maximum file size (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Suspicious file extensions that should always be rejected
 */
const BLOCKED_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.scr',
  '.vbs',
  '.js',
  '.jar',
  '.sh',
  '.app',
  '.dmg',
  '.pkg',
  '.deb',
  '.rpm',
];

/**
 * Validate file type and extension
 */
function validateFile(options: ScanOptions): ScanResult {
  const { buffer, filename, mimeType } = options;

  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      safe: false,
      scanned: true,
      provider: 'file-validation',
      detection: {
        threat: 'FileToolargeError',
        details: `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      },
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      safe: false,
      scanned: true,
      provider: 'file-validation',
      detection: {
        threat: 'InvalidFileType',
        details: `File type ${mimeType} is not allowed`,
      },
    };
  }

  // Check file extension
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return {
      safe: false,
      scanned: true,
      provider: 'file-validation',
      detection: {
        threat: 'BlockedExtension',
        details: `File extension ${ext} is blocked for security reasons`,
      },
    };
  }

  // Basic file signature validation (magic bytes)
  const magicBytes = buffer.slice(0, 4);
  const signatures: Record<string, Buffer> = {
    pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
    jpeg: Buffer.from([0xff, 0xd8, 0xff]),
    png: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  };

  // Verify PDF signature
  if (mimeType === 'application/pdf') {
    if (!magicBytes.slice(0, 4).equals(signatures.pdf)) {
      return {
        safe: false,
        scanned: true,
        provider: 'file-validation',
        detection: {
          threat: 'InvalidFileSignature',
          details: 'File claims to be PDF but has invalid signature',
        },
      };
    }
  }

  // Verify JPEG signature
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    if (!magicBytes.slice(0, 3).equals(signatures.jpeg)) {
      return {
        safe: false,
        scanned: true,
        provider: 'file-validation',
        detection: {
          threat: 'InvalidFileSignature',
          details: 'File claims to be JPEG but has invalid signature',
        },
      };
    }
  }

  // Verify PNG signature
  if (mimeType === 'image/png') {
    if (!magicBytes.slice(0, 4).equals(signatures.png)) {
      return {
        safe: false,
        scanned: true,
        provider: 'file-validation',
        detection: {
          threat: 'InvalidFileSignature',
          details: 'File claims to be PNG but has invalid signature',
        },
      };
    }
  }

  return {
    safe: true,
    scanned: true,
    provider: 'file-validation',
  };
}

/**
 * Scan file with ClamAV
 */
async function scanWithClamAV(options: ScanOptions): Promise<ScanResult> {
  try {
    const { NodeClam } = await import('clamscan');

    const clamHost = process.env.CLAMAV_HOST || 'localhost';
    const clamPort = parseInt(process.env.CLAMAV_PORT || '3310', 10);

    const clamscan = await new NodeClam().init({
      clamdscan: {
        host: clamHost,
        port: clamPort,
      },
      preference: 'clamdscan',
    });

    const { isInfected, viruses } = await clamscan.scanBuffer(options.buffer);

    if (isInfected && viruses.length > 0) {
      return {
        safe: false,
        scanned: true,
        provider: 'clamav',
        detection: {
          threat: viruses[0],
          details: `Virus detected: ${viruses.join(', ')}`,
        },
      };
    }

    return {
      safe: true,
      scanned: true,
      provider: 'clamav',
    };
  } catch (error) {
    console.error('[VirusScanner] ClamAV scan failed:', error);
    return {
      safe: true, // Fail open - don't block uploads if scanner fails
      scanned: false,
      provider: 'clamav',
      error: error instanceof Error ? error.message : 'ClamAV scan failed',
    };
  }
}

/**
 * Scan file with VirusTotal
 */
async function scanWithVirusTotal(options: ScanOptions): Promise<ScanResult> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;

  if (!apiKey) {
    return {
      safe: true,
      scanned: false,
      provider: 'virustotal',
      error: 'VirusTotal API key not configured',
    };
  }

  try {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', options.buffer, options.filename);

    // Upload file for scanning
    const uploadResponse = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: {
        'x-apikey': apiKey,
      },
      body: form as any,
    });

    if (!uploadResponse.ok) {
      throw new Error(`VirusTotal upload failed: ${uploadResponse.statusText}`);
    }

    const uploadData = await uploadResponse.json();
    const analysisId = uploadData.data?.id;

    if (!analysisId) {
      throw new Error('VirusTotal did not return analysis ID');
    }

    // Wait a bit for analysis to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get analysis results
    const analysisResponse = await fetch(
      `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
      {
        headers: {
          'x-apikey': apiKey,
        },
      }
    );

    if (!analysisResponse.ok) {
      throw new Error(`VirusTotal analysis fetch failed: ${analysisResponse.statusText}`);
    }

    const analysisData = await analysisResponse.json();
    const stats = analysisData.data?.attributes?.stats;

    if (!stats) {
      throw new Error('VirusTotal did not return analysis stats');
    }

    // If any scanner detected malware, mark as unsafe
    if (stats.malicious > 0 || stats.suspicious > 0) {
      return {
        safe: false,
        scanned: true,
        provider: 'virustotal',
        detection: {
          threat: 'Malware',
          details: `Detected by ${stats.malicious} scanner(s), ${stats.suspicious} marked suspicious`,
        },
      };
    }

    return {
      safe: true,
      scanned: true,
      provider: 'virustotal',
    };
  } catch (error) {
    console.error('[VirusScanner] VirusTotal scan failed:', error);
    return {
      safe: true, // Fail open
      scanned: false,
      provider: 'virustotal',
      error: error instanceof Error ? error.message : 'VirusTotal scan failed',
    };
  }
}

/**
 * Scan a file for viruses
 *
 * @param options - Scan options
 * @returns Scan result
 */
export async function scanFile(options: ScanOptions): Promise<ScanResult> {
  // Always perform file validation first
  const validationResult = validateFile(options);

  if (!validationResult.safe) {
    console.warn('[VirusScanner] File validation failed:', validationResult.detection);
    return validationResult;
  }

  // Check if virus scanning is enabled
  const scanEnabled = process.env.VIRUS_SCAN_ENABLED === 'true' || options.force;

  if (!scanEnabled) {
    console.log('[VirusScanner] Virus scanning disabled, skipping');
    return {
      safe: true,
      scanned: false,
      provider: 'none',
    };
  }

  const provider = (process.env.VIRUS_SCAN_PROVIDER || 'none') as 'clamav' | 'virustotal' | 'none';

  console.log(`[VirusScanner] Scanning file with provider: ${provider}`);

  switch (provider) {
    case 'clamav':
      return await scanWithClamAV(options);

    case 'virustotal':
      return await scanWithVirusTotal(options);

    default:
      return {
        safe: true,
        scanned: false,
        provider: 'none',
      };
  }
}

/**
 * Create a user-friendly error message from scan result
 */
export function getScanErrorMessage(result: ScanResult): string {
  if (result.safe) {
    return '';
  }

  if (result.detection) {
    return `File rejected: ${result.detection.threat}. ${result.detection.details || ''}`;
  }

  return 'File rejected for security reasons';
}
