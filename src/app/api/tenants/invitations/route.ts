/**
 * Tenant Invitations API
 *
 * Handles inviting users to join tenants with specific roles.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit/logger';
import { sendInvitationEmail } from '@/lib/email/invitations';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

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

const InvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['OWNER', 'ACCOUNTANT', 'CLIENT'], {
    errorMap: () => ({ message: 'Role must be OWNER, ACCOUNTANT, or CLIENT' }),
  }),
  message: z.string().optional(),
});

/**
 * POST /api/tenants/invitations
 * Create a new invitation
 */
async function invitationsHandler(request: NextRequest) {
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

    // Get tenant ID
    const tenantId = request.headers.get('x-deklaro-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Check if user is OWNER or ACCOUNTANT (only they can invite)
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ACCOUNTANT')) {
      return NextResponse.json(
        { error: 'Only OWNER and ACCOUNTANT can invite users' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validation = InvitationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, role, message } = validation.data;

    // Check if user is already a member
    const { data: existingUser } = await getSupabaseAdmin()
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      const { data: existingMembership } = await supabase
        .from('tenant_members')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this tenant' },
          { status: 409 }
        );
      }
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await getSupabaseAdmin()
      .from('tenant_invitations')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('email', email)
      .eq('status', 'PENDING')
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 409 }
      );
    }

    // Get tenant name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    // Generate invitation token
    const invitationToken = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    // Create invitation
    const { data: invitation, error: inviteError } = await getSupabaseAdmin()
      .from('tenant_invitations')
      .insert({
        tenant_id: tenantId,
        email,
        role,
        invited_by: user.id,
        token: invitationToken,
        expires_at: expiresAt.toISOString(),
        status: 'PENDING',
        message: message || null,
      })
      .select()
      .single();

    if (inviteError) {
      console.error('[Invitations] Failed to create invitation:', inviteError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Send invitation email
    try {
      await sendInvitationEmail({
        to: email,
        tenantName: tenant?.name || 'Deklaro',
        inviterName: user.email || 'A team member',
        role,
        invitationToken,
        expiresAt,
        message: message || undefined,
      });
    } catch (emailError) {
      console.error('[Invitations] Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    // Create audit log
    createAuditLog({
      tenantId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'INVITATION',
      entityId: invitation.id,
      metadata: {
        email,
        role,
      },
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    }).catch((err) => {
      console.error('[Invitations] Failed to create audit log:', err);
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error('[Invitations] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tenants/invitations
 * List all invitations for the tenant
 */
async function listInvitationsHandler(request: NextRequest) {
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

    // Get tenant ID
    const tenantId = request.headers.get('x-deklaro-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Get invitations
    const { data: invitations, error } = await supabase
      .from('tenant_invitations')
      .select(`
        id,
        email,
        role,
        status,
        created_at,
        expires_at,
        invited_by_user:invited_by(email)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Invitations] Failed to fetch invitations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('[Invitations] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate a secure random invitation token
 */
function generateInvitationToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64url');
}

// Apply rate limiting
export const POST = withRateLimit(
  invitationsHandler,
  RATE_LIMITS.API,
  'tenant-invitations'
);

export const GET = withRateLimit(
  listInvitationsHandler,
  RATE_LIMITS.READ,
  'tenant-invitations-list'
);
