'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import type { BankAccount } from '@prisma/client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { setDefaultBankAccount, updateBankAccount, deleteBankAccount } from '@/app/tenants/actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

function SetDefaultButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      aria-disabled={pending}
      disabled={pending}
      className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Setting...' : 'Set as default'}
    </button>
  )
}

function EditSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      aria-disabled={pending}
      disabled={pending}
      className="flex h-9 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Saving...' : 'Save Changes'}
    </button>
  )
}

function DeleteSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="destructive"
      aria-disabled={pending}
      disabled={pending}
    >
      {pending ? 'Deleting...' : 'Confirm Delete'}
    </Button>
  )
}

interface BankAccountItemProps {
  account: BankAccount
  companyId: string
}

export function BankAccountItem({ account, companyId }: BankAccountItemProps) {
  const [state, formAction] = useFormState(setDefaultBankAccount, null)
  const [editState, editFormAction] = useFormState(updateBankAccount, null)
  const [deleteState, deleteFormAction] = useFormState(deleteBankAccount, null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: account.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  useEffect(() => {
    if (editState?.reset) {
      setIsEditing(false)
    }
  }, [editState])

  useEffect(() => {
    if (deleteState?.success) {
      setIsDeleteModalOpen(false)
      // Optionally, trigger a toast notification here
    }
  }, [deleteState])

  if (isEditing) {
    return (
      <form action={editFormAction} className="space-y-4 bg-slate-50 p-4">
        <input type="hidden" name="bankAccountId" value={account.id} />
        <input type="hidden" name="companyId" value={companyId} />
        <div>
          <label htmlFor={`number-${account.id}`} className="mb-1 block text-xs font-medium text-slate-600">
            Bank Account Number (IBAN)
          </label>
          <input
            id={`number-${account.id}`}
            name="number"
            type="text"
            required
            defaultValue={account.number}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor={`bankName-${account.id}`} className="mb-1 block text-xs font-medium text-slate-600">
            Bank Name (Optional)
          </label>
          <input
            id={`bankName-${account.id}`}
            name="bankName"
            type="text"
            defaultValue={account.bankName || ''}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => setIsEditing(false)} className="text-sm font-medium text-slate-600">
            Cancel
          </button>
          <EditSubmitButton />
        </div>
        {editState?.message && !editState.success ? <p className="text-sm text-red-500">{editState.message}</p> : null}
      </form>
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center justify-between bg-white p-4 touch-none">
      <div>
        <p className="font-medium text-slate-800">{account.number}</p>
        <p className="text-sm text-slate-500">{account.bankName || 'No bank name'}</p>
      </div>
      <div className="flex items-center gap-4">
        {account.isDefault ? (
          <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
            Default
          </span>
        ) : (
          <form action={formAction} className="m-0">
            <input type="hidden" name="bankAccountId" value={account.id} />
            <input type="hidden" name="companyId" value={companyId} />
            <SetDefaultButton />
          </form>
        )}
        <button onClick={() => setIsEditing(true)} className="text-sm font-semibold text-brand-600 hover:text-brand-500">
          Edit
        </button>

        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogTrigger asChild>
            <button className="text-sm font-semibold text-red-600 transition hover:text-red-500">
              Delete
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure you want to delete this bank account?</DialogTitle>
              <DialogDescription>
                This will permanently remove the account <strong>{account.number}</strong>. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <form action={deleteFormAction} className="flex w-full items-center justify-end gap-2">
                <input type="hidden" name="bankAccountId" value={account.id} />
                <input type="hidden" name="companyId" value={companyId} />
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <DeleteSubmitButton />
              </form>
            </DialogFooter>
            {deleteState?.message && !deleteState.success ? <p className="mt-2 text-center text-sm text-red-500">{deleteState.message}</p> : null}
          </DialogContent>
        </Dialog>

        {state?.message && !state.success ? (
          <p className="text-xs text-red-500">{state.message}</p>
        ) : null}
      </div>
    </div>
  )
}