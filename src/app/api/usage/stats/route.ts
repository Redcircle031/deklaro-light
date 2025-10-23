/**
 * Usage Statistics API Endpoint
 * Returns current usage statistics for the tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUsageStats } from '@/lib/usage/tracker';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant ID from headers
    const tenantId = request.headers.get('x-deklaro-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context not found' },
        { status: 400 }
      );
    }

    // Get usage statistics
    const stats = await getUsageStats(tenantId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Usage API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
