import { NextRequest, NextResponse } from 'next/server';
import { whiteListVATClient } from '@/lib/weis/client';

/**
 * POST /api/nip/validate
 * Validates a single NIP or multiple NIPs against the Polish White List VAT registry
 *
 * Request body:
 * - Single NIP: { "nip": "1234567890" }
 * - Multiple NIPs: { "nips": ["1234567890", "0987654321"] }
 *
 * Response:
 * - Single: VATValidationResult
 * - Multiple: VATValidationResult[]
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Single NIP validation
    if (body.nip) {
      const result = await whiteListVATClient.searchByNIP(body.nip);
      return NextResponse.json(result);
    }

    // Multiple NIPs validation
    if (body.nips && Array.isArray(body.nips)) {
      if (body.nips.length === 0) {
        return NextResponse.json(
          { error: 'At least one NIP is required' },
          { status: 400 }
        );
      }

      if (body.nips.length > 30) {
        return NextResponse.json(
          { error: 'Maximum 30 NIPs per request' },
          { status: 400 }
        );
      }

      const results = await whiteListVATClient.checkMultipleNIPs(body.nips);
      return NextResponse.json(results);
    }

    return NextResponse.json(
      { error: 'Either "nip" or "nips" parameter is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('NIP validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate NIP' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nip/validate?nip=1234567890
 * Validates a single NIP using query parameter
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const nip = searchParams.get('nip');

  if (!nip) {
    return NextResponse.json(
      { error: 'NIP parameter is required' },
      { status: 400 }
    );
  }

  try {
    const result = await whiteListVATClient.searchByNIP(nip);
    return NextResponse.json(result);
  } catch (error) {
    console.error('NIP validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate NIP' },
      { status: 500 }
    );
  }
}
