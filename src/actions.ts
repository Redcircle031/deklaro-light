'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { PrismaClient, UserRole } from '@prisma/client'
import { TENANT_COOKIE_NAME } from '@/lib/tenant/constants'

const prisma = new PrismaClient()

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
}

export async function createTenant(prevState: any, formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: 'You must be logged in to create a tenant.' }
  }

  const tenantName = formData.get('tenantName') as string
  if (!tenantName || tenantName.trim().length < 3) {
    return { message: 'Tenant name must be at least 3 characters long.' }
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
    return { message: 'A tenant with this name already exists. Please choose another name.' }
  }

  revalidatePath('/', 'layout')
  redirect(`/dashboard`)
}

export async function inviteUser(prevState: any, formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: 'You must be logged in to invite users.' }
  }

  const email = formData.get('email') as string
  const role = formData.get('role') as UserRole

  if (!email || !Object.values(UserRole).includes(role)) {
    return { message: 'Invalid email or role provided.' }
  }

  const activeTenantId = cookieStore.get(TENANT_COOKIE_NAME)?.value
  if (!activeTenantId) {
    return { message: 'No active tenant selected.' }
  }

  // Check if the current user has permission to invite
  const currentUserTenant = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId: activeTenantId, userId: user.id } },
  })

  if (!currentUserTenant || currentUserTenant.role !== 'OWNER') {
    return { message: 'You do not have permission to invite users to this tenant.' }
  }

  // Use the admin client to invite a new user
  const supabaseAdmin = createClient(cookieStore, { admin: true })
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      tenant_id: activeTenantId,
      role: role,
    },
    redirectTo: '/dashboard', // User will be redirected here after accepting
  })

  if (error) {
    console.error('Error inviting user:', error)
    return { message: `Failed to invite user: ${error.message}` }
  }

  revalidatePath('/dashboard/settings/users')
  return {
    message: `Invitation sent successfully to ${email}.`,
    success: true,
  }
}

export async function removeUser(prevState: any, formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return { message: 'You must be logged in to remove users.' }
  }

  const userIdToRemove = formData.get('userId') as string
  const activeTenantId = cookieStore.get(TENANT_COOKIE_NAME)?.value

  if (!userIdToRemove || !activeTenantId) {
    return { message: 'Invalid request.' }
  }

  // Security Check 1: Current user must be an OWNER
  const currentUserMembership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId: activeTenantId, userId: currentUser.id } },
  })

  if (!currentUserMembership || currentUserMembership.role !== 'OWNER') {
    return { message: 'You do not have permission to remove users.' }
  }

  // Security Check 2: Prevent self-removal if the user is the last OWNER
  if (currentUser.id === userIdToRemove) {
    const ownerCount = await prisma.tenantUser.count({
      where: {
        tenantId: activeTenantId,
        role: 'OWNER',
      },
    })

    if (ownerCount <= 1) {
      return { message: 'You cannot remove the last owner of the tenant.' }
    }
  }

  try {
    await prisma.tenantUser.delete({
      where: {
        tenantId_userId: {
          tenantId: activeTenantId,
          userId: userIdToRemove,
        },
      },
    })

    // Note: This only removes the user from the tenant, not from the entire system.
    // The user can still log in but will no longer have access to this tenant.
    // A more complex cleanup (e.g., removing from Supabase Auth if they have no other tenants)
    // could be handled in a separate background job.

  } catch (error) {
    console.error('Error removing user:', error)
    return { message: 'Failed to remove user from the tenant.' }
  }

  revalidatePath('/dashboard/settings/users')
  return { message: 'User removed successfully.', success: true }
}

export async function updateUserRole(prevState: any, formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return { message: 'You must be logged in to update roles.' }
  }

  const userIdToUpdate = formData.get('userId') as string
  const newRole = formData.get('role') as UserRole
  const activeTenantId = cookieStore.get(TENANT_COOKIE_NAME)?.value

  if (!userIdToUpdate || !newRole || !activeTenantId || !Object.values(UserRole).includes(newRole)) {
    return { message: 'Invalid request.' }
  }

  // Security Check 1: Current user must be an OWNER
  const currentUserMembership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId: activeTenantId, userId: currentUser.id } },
  })

  if (!currentUserMembership || currentUserMembership.role !== 'OWNER') {
    return { message: 'You do not have permission to change user roles.' }
  }

  // Security Check 2: Prevent self-demotion if the user is the last OWNER
  if (currentUser.id === userIdToUpdate && newRole !== 'OWNER') {
    const ownerCount = await prisma.tenantUser.count({
      where: {
        tenantId: activeTenantId,
        role: 'OWNER',
      },
    })

    if (ownerCount <= 1) {
      return { message: 'You cannot change your role as you are the last owner.' }
    }
  }

  try {
    await prisma.tenantUser.update({
      where: {
        tenantId_userId: {
          tenantId: activeTenantId,
          userId: userIdToUpdate,
        },
      },
      data: { role: newRole },
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    return { message: 'Failed to update user role.' }
  }

  revalidatePath('/dashboard/settings/users')
  return { message: 'User role updated successfully.', success: true }
}

export async function createStripeCheckoutSession(prevState: any, formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: 'You must be logged in to manage billing.' }
  }

  const activeTenantId = cookieStore.get(TENANT_COOKIE_NAME)?.value
  if (!activeTenantId) {
    return { message: 'No active tenant selected.' }
  }

  // In a real application, you would initialize Stripe here
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  // Placeholder logic for creating a checkout session
  try {
    // const session = await stripe.checkout.sessions.create({ ... });
    // const checkoutUrl = session.url;

    // For this example, we'll use a placeholder URL.
    const checkoutUrl = 'https://stripe.com/docs/testing' // Replace with actual session URL

    if (!checkoutUrl) {
      return { message: 'Could not create a checkout session. Please try again.' }
    }

    redirect(checkoutUrl)
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return { message: 'An error occurred while connecting to our billing provider.' }
  }
}

export async function createBankAccount(prevState: any, formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: 'You must be logged in to add a bank account.' }
  }

  const companyId = formData.get('companyId') as string
  const number = formData.get('number') as string
  const bankName = formData.get('bankName') as string | null
  const activeTenantId = cookieStore.get(TENANT_COOKIE_NAME)?.value

  if (!companyId || !number || !activeTenantId) {
    return { message: 'Invalid request. Missing required fields.' }
  }

  // Security Check: Verify user has access to this tenant
  const membership = await prisma.tenantUser.findFirst({
    where: { userId: user.id, tenantId: activeTenantId },
  })

  if (!membership) {
    return { message: 'You do not have permission to perform this action.' }
  }

  // Security Check: Verify the company belongs to the active tenant
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId: activeTenantId },
  })

  if (!company) {
    return { message: 'Company not found in your tenant.' }
  }

  try {
    // Get the current number of accounts to set the order for the new one
    const count = await prisma.bankAccount.count({
      where: { companyId },
    })

    await prisma.bankAccount.create({
      data: {
        companyId,
        number,
        bankName,
        order: count, // Append to the end of the list
      },
    })
  } catch (error) {
    // Handle unique constraint violation gracefully
    return { message: 'This bank account number already exists for this company.' }
  }

  revalidatePath(`/dashboard/companies/${companyId}`) // Or wherever bank accounts are displayed
  return { message: 'Bank account added successfully.', success: true, reset: true }
}

export async function updateBankAccount(prevState: any, formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: 'You must be logged in to edit a bank account.' }
  }

  const bankAccountId = formData.get('bankAccountId') as string
  const companyId = formData.get('companyId') as string
  const number = formData.get('number') as string
  const bankName = formData.get('bankName') as string | null
  const activeTenantId = cookieStore.get(TENANT_COOKIE_NAME)?.value

  if (!bankAccountId || !companyId || !number || !activeTenantId) {
    return { message: 'Invalid request. Missing required fields.' }
  }

  // Security Check: Verify user has access to this tenant
  const membership = await prisma.tenantUser.findFirst({
    where: { userId: user.id, tenantId: activeTenantId },
  })

  if (!membership) {
    return { message: 'You do not have permission to perform this action.' }
  }

  try {
    await prisma.bankAccount.update({
      where: {
        id: bankAccountId,
        company: {
          tenantId: activeTenantId,
        },
      },
      data: {
        number,
        bankName,
      },
    })
  } catch (error) {
    // Handle unique constraint violation gracefully
    return { message: 'This bank account number already exists for this company.' }
  }

  revalidatePath(`/dashboard/companies/${companyId}`)
  return { message: 'Bank account updated successfully.', success: true, reset: true }
}

export async function reorderBankAccounts(prevState: any, formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: 'You must be logged in to reorder accounts.' }
  }

  const companyId = formData.get('companyId') as string
  const orderedIds = JSON.parse(formData.get('orderedIds') as string) as string[]
  const activeTenantId = cookieStore.get(TENANT_COOKIE_NAME)?.value

  if (!companyId || !orderedIds || !Array.isArray(orderedIds) || !activeTenantId) {
    return { message: 'Invalid request.' }
  }

  // Security Check: Verify user has access to this tenant and company
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId: activeTenantId },
  })

  if (!company) {
    return { message: 'You do not have permission to perform this action.' }
  }

  try {
    // Use a transaction to update all orders atomically
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.bankAccount.update({ where: { id }, data: { order: index } }),
      ),
    )
  } catch (error) {
    return { message: 'Failed to reorder bank accounts.' }
  }

  revalidatePath(`/dashboard/companies/${companyId}`)
  return { message: 'Bank account order saved.', success: true }
}

export async function deleteBankAccount(prevState: any, formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: 'You must be logged in to delete a bank account.' }
  }

  const bankAccountId = formData.get('bankAccountId') as string
  const companyId = formData.get('companyId') as string
  const activeTenantId = cookieStore.get(TENANT_COOKIE_NAME)?.value

  if (!bankAccountId || !companyId || !activeTenantId) {
    return { message: 'Invalid request.' }
  }

  // Security Check: Verify user has access to this tenant
  const membership = await prisma.tenantUser.findFirst({
    where: { userId: user.id, tenantId: activeTenantId },
  })

  if (!membership) {
    return { message: 'You do not have permission to perform this action.' }
  }

  try {
    // The `where` clause ensures we can only delete a bank account
    // that belongs to a company within the user's active tenant.
    await prisma.bankAccount.delete({
      where: {
        id: bankAccountId,
        company: {
          id: companyId,
          tenantId: activeTenantId,
        },
      },
    })
  } catch (error) {
    console.error('Error deleting bank account:', error)
    // This could happen if the account is already deleted or if there's a DB issue.
    return { message: 'Failed to delete the bank account.' }
  }

  revalidatePath(`/dashboard/companies/${companyId}`)
  return { message: 'Bank account deleted successfully.', success: true }
}