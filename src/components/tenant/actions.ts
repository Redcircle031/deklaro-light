'use server'

import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'

import { createServerSupabaseClient as createClient } from '@/lib/supabase/server'
import { PrismaClient, UserRole } from '@prisma/client'
import { TENANT_COOKIE } from '@/lib/tenant/constants'

const prisma = new PrismaClient()

/**
 * Creates an audit log entry in the database.
 */
export async function createAuditLog(params: {
  tenantId: string
  userId: string
  action: string
  entityId: string
  entityType: string
  details?: object
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      entityId: params.entityId,
      entityType: params.entityType,
      metadata: params.details,
    },
  })
}

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
}

/**
 * Retrieves the essential context for a server action, including the Supabase client,
 * the authenticated user, and the active tenant ID.
 * It centralizes authentication and tenant checks, throwing an error if context is missing.
 */
async function getActionContext() {
  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to perform this action.')
  }

  const activeTenantId = cookieStore.get(TENANT_COOKIE)?.value
  if (!activeTenantId) {
    throw new Error('No active tenant selected.')
  }

  return { supabase, user, activeTenantId, cookieStore }
}

// Helper function to get tenant context
export async function getTenantContext() {
  const { user, activeTenantId } = await getActionContext()

  if (!activeTenantId) {
    throw new Error('No active tenant selected.')
  }

  return { user, activeTenantId }
}

// Helper function to validate user role
export async function validateUserRole(userId: string, tenantId: string, requiredRole: UserRole) {
  const userMembership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  })

  if (!userMembership || userMembership.role !== requiredRole) {
    throw new Error(`User does not have the required role: ${requiredRole}`)
  }

  return userMembership
}

/**
 * Authorizes that the current user is an OWNER of the active tenant.
 * It also includes a critical check to prevent the last owner from being removed or demoted.
 * @param targetUserId - The ID of the user being acted upon.
 * @param newRole - The proposed new role for the target user (optional, for role changes).
 */
export async function authorizeTenantOwner(targetUserId?: string, newRole?: UserRole) {
  const { user: currentUser, activeTenantId } = await getActionContext()

  const currentUserMembership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId: activeTenantId, userId: currentUser.id } },
  })

  if (!currentUserMembership || currentUserMembership.role !== 'OWNER') {
    throw new Error('You do not have permission to perform this action.')
  }

  // Check if the action targets the current user (self-action) and could leave the tenant without an owner.
  const isSelfAction = currentUser.id === targetUserId
  const isDemotingSelf = isSelfAction && newRole && newRole !== 'OWNER'
  const isRemovingSelf = isSelfAction && !newRole // In the context of removeUser

  if (isDemotingSelf || isRemovingSelf) {
    const ownerCount = await prisma.tenantUser.count({
      where: {
        tenantId: activeTenantId,
        role: 'OWNER',
      },
    })

    if (ownerCount <= 1) {
      throw new Error('You cannot remove or demote the last owner of the tenant.')
    }
  }

  return { currentUser, activeTenantId }
}

// Centralized error handler
function handleError(error: Error, context: string) {
  console.error(`[Error] ${context}:`, error.message)
  // Return a form state object instead of throwing for form actions
  return { message: error.message || 'An unexpected error occurred.', success: false }
}

export async function createTenant(prevState: any, formData: FormData) {
  let user
  try {
    const context = await getActionContext()
    user = context.user
  } catch (error: any) {
    // Use handleError to return a consistent error shape
    return handleError(error, 'Create Tenant')
  }

  const tenantName = formData.get('tenantName') as string
  if (!tenantName || tenantName.trim().length < 3) {
    return { message: 'Tenant name must be at least 3 characters long.', success: false }
  }

  const slug = generateSlug(tenantName)

  try {
    // Use a transaction to ensure both records are created
    await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: slug,
        },
      })

      await tx.tenantUser.create({
        data: {
          tenantId: newTenant.id,
          userId: user.id,
          role: 'OWNER',
        },
      })
    })
  } catch (e) {
    return { message: 'A tenant with this name already exists. Please choose another name.', success: false }
  }

  revalidatePath('/', 'layout')
  redirect(`/dashboard`)
}

export async function inviteUser(prevState: any, formData: FormData) {
  try {
    const { user, activeTenantId, cookieStore } = await getActionContext()

    const email = formData.get('email') as string
    const role = formData.get('role') as UserRole

    if (!email || !Object.values(UserRole).includes(role)) {
      return { message: 'Invalid email or role provided.', success: false }
    }

    // Check if the current user has permission to invite (must be an OWNER)
    await validateUserRole(user.id, activeTenantId, UserRole.OWNER)

    // Use the admin client to invite a new user
    const supabaseAdmin = await createClient(cookieStore)
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        tenant_id: activeTenantId,
        role: role,
      },
      redirectTo: '/dashboard', // User will be redirected here after accepting
    })

    if (error) {
      console.error('Error inviting user:', error)
      return { message: `Failed to invite user: ${error.message}`, success: false }
    }

    await createAuditLog({
      tenantId: activeTenantId,
      userId: user.id,
      action: 'user.invite',
      entityId: data.user.id, // The ID of the newly invited user
      entityType: 'user',
      details: { email, role },
    })

    revalidatePath('/dashboard/settings/users')
    return {
      message: `Invitation sent successfully to ${email}.`,
      success: true,
    }
  } catch (error: any) {
    return handleError(error, 'Invite User')
  }
}

export async function removeUser(prevState: any, formData: FormData) {
  try {
    const userIdToRemove = formData.get('userId') as string
    if (!userIdToRemove) {
      return { message: 'Invalid request: Missing user ID.', success: false }
    }

    const { currentUser, activeTenantId } = await authorizeTenantOwner(userIdToRemove, undefined)

    await prisma.tenantUser.delete({
      where: {
        tenantId_userId: {
          tenantId: activeTenantId,
          userId: userIdToRemove,
        },
      },
    })
    revalidatePath('/dashboard/settings/users')

    await createAuditLog({
      tenantId: activeTenantId,
      userId: currentUser.id,
      action: 'user.remove',
      entityId: userIdToRemove,
      entityType: 'user',
    })
    return { message: 'User removed successfully.', success: true }
  } catch (error: any) {
    return handleError(error, 'Remove User')
  }
}

export async function updateUserRole(prevState: any, formData: FormData) {
  try {
    const userIdToUpdate = formData.get('userId') as string
    const newRole = formData.get('role') as UserRole

    if (!userIdToUpdate || !newRole || !Object.values(UserRole).includes(newRole)) {
      return { message: 'Invalid request.', success: false }
    }

    const { currentUser, activeTenantId } = await authorizeTenantOwner(userIdToUpdate, newRole as UserRole)

    await prisma.tenantUser.update({
      where: {
        tenantId_userId: {
          tenantId: activeTenantId,
          userId: userIdToUpdate,
        },
      },
      data: { role: newRole },
    })

    await createAuditLog({
      tenantId: activeTenantId,
      userId: currentUser.id,
      action: 'user.role.update',
      entityId: userIdToUpdate,
      entityType: 'user',
      details: { newRole },
    })

    revalidatePath('/dashboard/settings/users') // Revalidation should happen after logging
    return { message: 'User role updated successfully.', success: true }
  } catch (error: any) {
    return handleError(error, 'Update User Role')
  }
}

export async function approveInvoice(prevState: any, formData: FormData) {
  try {
    const { user, activeTenantId } = await getActionContext()

    const invoiceId = formData.get('invoiceId') as string
    if (!invoiceId) {
      return { message: 'Invalid request: Missing invoice ID.', success: false }
    }

    // Security Check: Verify user has permission (OWNER or ACCOUNTANT)
    const membership = await prisma.tenantUser.findFirst({
      where: { userId: user.id, tenantId: activeTenantId },
    })

    if (!membership || !['OWNER', 'ACCOUNTANT'].includes(membership.role)) {
      return { message: 'You do not have permission to approve invoices.', success: false }
    }

    // Security Check: Verify invoice belongs to the tenant
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId: activeTenantId },
    })

    if (!invoice) {
      return { message: 'Invoice not found.', success: false }
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'APPROVED' },
    })

    await createAuditLog({
      tenantId: activeTenantId,
      userId: user.id,
      action: 'invoice.approve',
      entityId: invoiceId,
      entityType: 'invoice',
    })

    revalidatePath(`/dashboard/invoices/${invoiceId}/review`)
    return { message: 'Invoice approved successfully.', success: true }
  } catch (error: any) {
    return { message: error.message || 'Failed to approve the invoice.', success: false }
  }
}

export async function getMonthlyInvoiceVolume() {
  const { activeTenantId } = await getActionContext()

  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const result: { month: string; count: bigint }[] = await prisma.$queryRaw`
    SELECT
      to_char(created_at, 'YYYY-MM') as month,
      COUNT(*) as count
    FROM
      tenant.invoices
    WHERE
      tenant_id = ${activeTenantId} AND created_at >= ${twelveMonthsAgo}
    GROUP BY
      month
    ORDER BY
      month ASC;
  `

  // Format data for the chart
  const formattedData = result.map((item) => ({
    name: new Date(item.month + '-02').toLocaleString('default', { month: 'short' }),
    invoices: Number(item.count),
  }))

  return formattedData
}

export async function setActiveTenant(tenantId: string) {
  const cookieStore = await cookies()
  cookieStore.set(TENANT_COOKIE, tenantId, {
    path: '/',
  })
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function getAuditLogs(
  page = 1,
  pageSize = 15,
  sortBy = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
  filters: {
    action?: string
    userId?: string
    startDate?: string
    endDate?: string
  } = {},
) {
  try {
    const { activeTenantId } = await getActionContext()

    // Build the where clause for filtering
    const whereClause: any = {
      tenantId: activeTenantId,
    }
    if (filters.action) {
      whereClause.action = { contains: filters.action, mode: 'insensitive' }
    }
    if (filters.userId) {
      whereClause.userId = { contains: filters.userId, mode: 'insensitive' }
    }
    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {}
      if (filters.startDate) {
        whereClause.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate)
        endDate.setDate(endDate.getDate() + 1) // Make it inclusive of the whole day
        whereClause.createdAt.lte = endDate
      }
    }

    // Validate and sanitize sortBy to prevent invalid column names
    const validSortColumns = ['createdAt', 'action', 'userId', 'entityId', 'entityType']
    const sanitizedSortBy = validSortColumns.includes(sortBy) ? sortBy : 'createdAt'

    // Calculate pagination
    const skip = (page - 1) * pageSize

    // Fetch logs and total count in a transaction
    const [logs, totalCount] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { [sanitizedSortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
      prisma.auditLog.count({
        where: whereClause,
      }),
    ])

    return { logs, totalCount }
  } catch (error: any) {
    return { message: error.message || 'Failed to fetch audit logs.' }
  }
}

export async function exportAuditLogsAsCsv(
  filters: {
    action?: string
    userId?: string
    startDate?: string
    endDate?: string
  } = {},
) {
  try {
    const { activeTenantId } = await getActionContext()

    // Build the where clause for filtering (mirrors getAuditLogs)
    const whereClause: any = {
      tenantId: activeTenantId,
    }
    if (filters.action) {
      whereClause.action = { contains: filters.action, mode: 'insensitive' }
    }
    if (filters.userId) {
      whereClause.userId = { contains: filters.userId, mode: 'insensitive' }
    }
    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {}
      if (filters.startDate) {
        whereClause.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate)
        endDate.setDate(endDate.getDate() + 1) // Make it inclusive of the whole day
        whereClause.createdAt.lte = endDate
      }
    }

    // Fetch ALL matching logs, without pagination
    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (logs.length === 0) {
      return { message: 'No logs found for the selected filters.', success: false }
    }

    // Convert to CSV string
    const csvHeader = 'id,action,userId,entityId,entityType,createdAt,ipAddress\n'
    const csvRows = logs
      .map((log) => {
        // Simple CSV sanitation for fields
        const sanitize = (field: any) => {
          if (field === null || field === undefined) return ''
          const str = String(field)
          return `"${str.replace(/"/g, '""')}"`
        }
        return [log.id, log.action, log.userId, log.entityId, log.entityType, log.createdAt.toISOString(), log.ipAddress]
          .map(sanitize)
          .join(',')
      })
      .join('\n')

    return { csvContent: csvHeader + csvRows, success: true }
  } catch (error: any) {
    return handleError(error, 'Export Audit Logs')
  }
}

export async function updateUserProfile(prevState: any, formData: FormData) {
  try {
    const { supabase } = await getActionContext()

    const fullName = formData.get('fullName') as string

    if (!fullName || fullName.trim().length < 2) {
      return { message: 'Full name must be at least 2 characters long.', success: false }
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
      },
    })

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/settings/profile')
    return { message: 'Profile updated successfully.', success: true }
  } catch (error: any) {
    return handleError(error, 'Update User Profile')
  }
}

export async function updateUserPassword(prevState: any, formData: FormData) {
  try {
    const { supabase } = await getActionContext()

    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
      return { message: 'Passwords do not match.', success: false }
    }

    if (!newPassword || newPassword.length < 8) {
      return { message: 'Password must be at least 8 characters long.', success: false }
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      throw new Error(error.message)
    }

    return { message: 'Password updated successfully.', success: true }
  } catch (error: any) {
    return handleError(error, 'Update User Password')
  }
}