import { NewCompanyForm } from '@/components/companies/NewCompanyForm';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Add New Company | Deklaro',
  description: 'Add a new company to your directory',
};

export default function NewCompanyPage() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/companies"
          className="text-sm text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Back to Companies
        </Link>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Add New Company
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Create a new company manually or validate from VAT registry
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <NewCompanyForm />
      </div>
    </div>
  );
}
