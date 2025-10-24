/**
 * Audit Logging Service
 * Tracks all critical user actions for compliance and security
 * REWRITTEN to use Supabase instead of Prisma
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialize admin Supabase client for audit logging (bypasses RLS)
// This prevents build-time errors when env vars aren't available
let supabaseAdmin: SupabaseClient | null = null;

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

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'SUBMIT'
  | 'DOWNLOAD'
  | 'EXPORT'
  | 'VIEW';

export type AuditEntityType =
  | 'INVOICE'
  | 'COMPANY'
  | 'TENANT'
  | 'USER'
  | 'OCR_JOB'
  | 'KSEF_SUBMISSION'
  | 'SETTINGS';

export interface AuditLogEntry {
  tenantId: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  tenantId: string;
  userId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const now = new Date().toISOString();

    await getSupabaseAdmin()
      .from('audit_logs')
      .insert({
        id: crypto.randomUUID(),
        tenant_id: entry.tenantId,
        user_id: entry.userId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        changes: entry.changes,
        metadata: entry.metadata,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        created_at: now,
      });
  } catch (error) {
    console.error('[Audit] Failed to create audit log:', error);
    // Don't throw - audit logging should never break the main flow
  }
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(filter: AuditLogFilter) {
  let query = getSupabaseAdmin()
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('tenant_id', filter.tenantId)
    .order('created_at', { ascending: false })
    .range(filter.offset || 0, (filter.offset || 0) + (filter.limit || 50) - 1);

  if (filter.userId) {
    query = query.eq('user_id', filter.userId);
  }

  if (filter.action) {
    query = query.eq('action', filter.action);
  }

  if (filter.entityType) {
    query = query.eq('entity_type', filter.entityType);
  }

  if (filter.entityId) {
    query = query.eq('entity_id', filter.entityId);
  }

  if (filter.startDate) {
    query = query.gte('created_at', filter.startDate.toISOString());
  }

  if (filter.endDate) {
    query = query.lte('created_at', filter.endDate.toISOString());
  }

  const { data: logs, count: total, error } = await query;

  if (error) {
    console.error('[Audit] Failed to fetch audit logs:', error);
    return {
      logs: [],
      total: 0,
      limit: filter.limit || 50,
      offset: filter.offset || 0,
    };
  }

  return {
    logs: logs || [],
    total: total || 0,
    limit: filter.limit || 50,
    offset: filter.offset || 0,
  };
}

/**
 * Helper to extract IP address from request headers
 */
export function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    undefined
  );
}

/**
 * Helper to extract user agent from request headers
 */
export function getUserAgent(headers: Headers): string | undefined {
  return headers.get('user-agent') || undefined;
}

/**
 * Helper to diff two objects for audit trail
 */
export function diffObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const oldValue = oldObj[key];
    const newValue = newObj[key];

    if (oldValue !== newValue) {
      changes[key] = {
        from: oldValue,
        to: newValue,
      };
    }
  }

  return changes;
}
