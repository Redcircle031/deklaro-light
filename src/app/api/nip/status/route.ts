import { NextResponse } from 'next/server';
import { whiteListVATClient } from '@/lib/weis/client';

/**
 * GET /api/nip/status
 * Returns the current rate limit status for the White List VAT API
 */
export async function GET() {
  try {
    const status = whiteListVATClient.getRateLimitStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    return NextResponse.json(
      { error: 'Failed to get rate limit status' },
      { status: 500 }
    );
  }
}
