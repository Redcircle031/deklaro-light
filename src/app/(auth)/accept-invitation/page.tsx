/**
 * Accept Invitation Page
 *
 * Allows users to accept tenant invitations via email link.
 */

import { Suspense } from 'react';
import { AcceptInvitationForm } from '@/components/invitations/AcceptInvitationForm';

export const metadata = {
  title: 'Accept Invitation | Deklaro',
  description: 'Accept your invitation to join a team on Deklaro',
};

export default function AcceptInvitationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Deklaro
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Invoice Automation Platform
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <Suspense
            fallback={
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  Loading invitation...
                </p>
              </div>
            }
          >
            <AcceptInvitationForm />
          </Suspense>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Don't have an invitation?{' '}
            <a href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up for free
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
