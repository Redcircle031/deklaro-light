/**
 * Accept Invitation API
 *
 * Handles accepting tenant invitations via token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit/logger';

// Lazy-initialize admin client
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseAdmin;
}

const AcceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
});

/**
 * POST /api/tenants/invitations/accept
 * Accept an invitation and join the tenant
 */
export async function POST(request: NextRequest) {
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

    // Parse request
    const body = await request.json();
    const validation = AcceptInvitationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    // Find invitation
    const { data: invitation, error: inviteError } = await getSupabaseAdmin()
      .from('tenant_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'PENDING')
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      await getSupabaseAdmin()
        .from('tenant_invitations')
        .update({ status: 'EXPIRED' })
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      );
    }

    // Check if email matches
    if (user.email !== invitation.email) {
      return NextResponse.json(
        {
          error: 'This invitation was sent to a different email address',
          invitedEmail: invitation.email,
          currentEmail: user.email,
        },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', invitation.tenant_id)
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      // Mark invitation as accepted anyway
      await getSupabaseAdmin()
        .from('tenant_invitations')
        .update({ status: 'ACCEPTED', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: 'You are already a member of this tenant' },
        { status: 409 }
      );
    }

    // Create tenant membership
    const { data: membership, error: membershipError } = await getSupabaseAdmin()
      .from('tenant_members')
      .insert({
        tenant_id: invitation.tenant_id,
        user_id: user.id,
        role: invitation.role,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (membershipError) {
      console.error('[Accept Invitation] Failed to create membership:', membershipError);
      return NextResponse.json(
        { error: 'Failed to join tenant' },
        { status: 500 }
      );
    }

    // Update invitation status
    await getSupabaseAdmin()
      .from('tenant_invitations')
      .update({
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('id', invitation.id);

    // Create audit log
    createAuditLog({
      tenantId: invitation.tenant_id,
      userId: user.id,
      action: 'JOIN',
      entityType: 'TENANT_MEMBER',
      entityId: membership.id,
      metadata: {
        invitationId: invitation.id,
        role: invitation.role,
      },
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    }).catch((err) => {
      console.error('[Accept Invitation] Failed to create audit log:', err);
    });

    // Get tenant details
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', invitation.tenant_id)
      .single();

    return NextResponse.json({
      success: true,
      tenant: tenant || { id: invitation.tenant_id },
      role: invitation.role,
    });
  } catch (error) {
    console.error('[Accept Invitation] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
