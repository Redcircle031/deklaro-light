'use client'

import { useState, useTransition } from 'react'
import { useToast } from '@/components/ui/use-toast'
import type { BankAccount } from '@prisma/client'
import { BankAccountItem } from './BankAccountItem'
import { AddBankAccountForm } from './AddBankAccountForm'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { reorderBankAccounts } from '@/app/tenants/actions'

interface BankAccountListProps {
  companyId: string
  initialAccounts: BankAccount[]
}

export function BankAccountList({ companyId, initialAccounts }: BankAccountListProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active.id !== over?.id) {
      const originalAccounts = [...accounts]
      const oldIndex = accounts.findIndex((acc) => acc.id === active.id)
      const newIndex = accounts.findIndex((acc) => acc.id === over!.id)
      const newOrder = arrayMove(accounts, oldIndex, newIndex)
      setAccounts(newOrder) // Optimistic update

      // Call server action to persist the new order
      startTransition(async () => {
        const formData = new FormData()
        formData.append('companyId', companyId)
        formData.append('orderedIds', JSON.stringify(newOrder.map((acc) => acc.id)))
        const result = await reorderBankAccounts(null, formData)

        if (!result?.success) {
          // On failure, revert the optimistic update and show an error toast.
          setAccounts(originalAccounts)
          toast({
            variant: 'destructive',
            title: 'Reordering Failed',
            description: result?.message || 'Could not save the new order. Please try again.',
          })
        }
      })
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-800">Bank Accounts</h2>
          {isPending && (
            <svg
              className="h-5 w-5 animate-spin text-slate-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          )}
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={accounts} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-slate-100">
            {accounts.length > 0 ? (
              accounts.map((account) => (
                <BankAccountItem key={account.id} account={account} companyId={companyId} />
              ))
            ) : (
              <p className="p-6 text-center text-sm text-slate-500">
                No bank accounts have been added for this company.
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>
      <AddBankAccountForm companyId={companyId} />
    </div>
  )
}