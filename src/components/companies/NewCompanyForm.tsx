'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function NewCompanyForm() {
  const router = useRouter();
  const [nip, setNip] = useState('');
  const [autoFill, setAutoFill] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
    companyData?: {
      name?: string;
      regon?: string;
      krs?: string;
      workingAddress?: string;
      residenceAddress?: string;
    };
  } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    regon: '',
    krs: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Poland',
    email: '',
    phone: '',
  });

  const handleValidateNIP = async () => {
    if (!nip || nip.length < 10) return;

    setValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch('/api/nip/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nip }),
      });

      const result = await response.json();
      setValidationResult(result);

      if (result.isValid && result.companyData && autoFill) {
        // Auto-fill form with VAT registry data
        const data = result.companyData;
        setFormData({
          name: data.name || '',
          regon: data.regon || '',
          krs: data.krs || '',
          address: data.workingAddress || data.residenceAddress || '',
          city: '',
          postalCode: '',
          country: 'Poland',
          email: '',
          phone: '',
        });
      }
    } catch {
      setValidationResult({
        isValid: false,
        error: 'Failed to validate NIP',
      });
    } finally{
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to create company
    console.log('Creating company:', { nip, ...formData });
    router.push('/dashboard/companies');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* NIP Validation */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Company Identification</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              NIP (Tax Identification Number)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="1234567890"
                maxLength={10}
                required
                className="flex-1 px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleValidateNIP}
                disabled={validating || nip.length !== 10}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {validating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Validate
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter 10-digit NIP to validate against VAT registry
            </p>
          </div>

          {validationResult ? (
            <div
              className={`p-4 rounded-md flex items-start gap-2 ${
                validationResult.isValid
                  ? 'bg-green-50 dark:bg-green-950/20 text-green-900 dark:text-green-100'
                  : 'bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100'
              }`}
            >
              {validationResult.isValid ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium">
                  {validationResult.isValid ? 'NIP Validated' : 'Validation Failed'}
                </div>
                <div className="text-sm mt-1">
                  {validationResult.isValid
                    ? `Company found: ${validationResult.companyData?.name}`
                    : validationResult.error}
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoFill"
              checked={autoFill}
              onChange={(e) => setAutoFill(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoFill" className="text-sm">
              Auto-fill form with VAT registry data
            </label>
          </div>
        </div>
      </div>

      {/* Company Details */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Company Details</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Company Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">REGON</label>
            <input
              type="text"
              value={formData.regon}
              onChange={(e) => setFormData({ ...formData, regon: e.target.value })}
              className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">KRS</label>
            <input
              type="text"
              value={formData.krs}
              onChange={(e) => setFormData({ ...formData, krs: e.target.value })}
              className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Address</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Street</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Postal Code</label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              placeholder="00-000"
              className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Country</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+48 XX XXX XXXX"
              className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Create Company
        </button>
      </div>
    </form>
  );
}
