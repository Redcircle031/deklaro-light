'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import type { User } from '@supabase/supabase-js'

import { updateUserProfile } from '@/components/tenant/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

const initialState = {
  message: '',
  success: false,
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save Changes'}
    </Button>
  )
}

export function ProfileForm({ user }: { user: User | null }) {
  const [state, formAction] = useFormState(updateUserProfile, initialState)
  const { toast } = useToast()

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.success ? 'Success' : 'Error',
        description: state.message,
        variant: state.success ? 'default' : 'destructive',
      })
    }
  }, [state, toast])

  return (
    <form action={formAction} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" value={user?.email} disabled />
        <p className="text-xs text-slate-500">You cannot change your email address.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          defaultValue={user?.user_metadata?.full_name || ''}
          required
        />
      </div>

      <SubmitButton />
    </form>
  )
}