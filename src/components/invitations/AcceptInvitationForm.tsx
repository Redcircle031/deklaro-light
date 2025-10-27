'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface InvitationDetails {
  tenantName: string;
  role: string;
  inviterName: string;
  expiresAt: string;
}

export function AcceptInvitationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No invitation token provided');
      return;
    }

    // Verify the user is logged in
    checkAuthAndValidateToken();
  }, [token]);

  async function checkAuthAndValidateToken() {
    try {
      // Check if user is authenticated
      const authResponse = await fetch('/api/auth/session');
      if (!authResponse.ok) {
        setStatus('error');
        setMessage('Please log in or sign up to accept this invitation');
        return;
      }

      // For now, we'll just show a success state
      // In production, you'd validate the token first
      setStatus('loading');
      setMessage('Validating invitation...');

      // Simulate validation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock invitation details (in production, fetch from API)
      setDetails({
        tenantName: 'Example Company',
        role: 'ACCOUNTANT',
        inviterName: 'john@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage('Failed to validate invitation');
    }
  }

  async function handleAccept() {
    if (!token) return;

    setAccepting(true);

    try {
      const response = await fetch('/api/tenants/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Invitation accepted! Redirecting to dashboard...');

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        if (response.status === 410) {
          setStatus('expired');
          setMessage(data.error || 'This invitation has expired');
        } else if (response.status === 409) {
          setStatus('success');
          setMessage('You are already a member of this organization');
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to accept invitation');
        }
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred while accepting the invitation');
    } finally {
      setAccepting(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Invalid Invitation
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          No invitation token was provided in the link.
        </p>
        <a
          href="/login"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Go to Login
        </a>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="text-center">
        <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Loading Invitation
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {message || 'Please wait...'}
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Error
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Log In
          </a>
          <a
            href="/signup"
            className="inline-block bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Sign Up
          </a>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Invitation Expired
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Please contact the person who invited you to request a new invitation.
        </p>
        <a
          href="/dashboard"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Go to Dashboard
        </a>
      </div>
    );
  }

  // Success state - show invitation details
  return (
    <div>
      {message.includes('Redirecting') ? (
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Success!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              You're Invited!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Accept this invitation to join the team
            </p>
          </div>

          {details && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6 space-y-4">
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Organization
                </dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {details.tenantName}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Role
                </dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {details.role}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Invited By
                </dt>
                <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {details.inviterName}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Expires
                </dt>
                <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {new Date(details.expiresAt).toLocaleDateString()}
                </dd>
              </div>
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
          >
            {accepting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept Invitation'
            )}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            By accepting, you agree to join this organization and will have{' '}
            {details?.role.toLowerCase()} access.
          </p>
        </>
      )}
    </div>
  );
}
