import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { TENANT_COOKIE } from '@/lib/tenant/constants';
import { CompanyList } from '@/components/companies/CompanyList';
import { Building2, Plus } from 'lucide-react';
import Link from 'next/link';

const prisma = new PrismaClient();

export const metadata = {
  title: 'Companies | Deklaro',
  description: 'Manage your company directory',
};

// Demo companies for when database is unavailable
const getDemoCompanies = () => [
  {
    id: '1',
    name: 'Acme Corporation Sp. z o.o.',
    nip: '1234567890',
    regon: '123456789',
    krs: '0000123456',
    address: 'ul. Marszałkowska 1',
    city: 'Warszawa',
    postalCode: '00-001',
    country: 'Poland',
    email: 'contact@acme.com',
    phone: '+48 22 123 4567',
    invoiceCount: 45,
    lastInvoiceDate: new Date('2024-01-15').toISOString(),
    totalSpent: 125000.50,
    vatRegistered: true,
    createdAt: new Date('2023-06-01').toISOString(),
  },
  {
    id: '2',
    name: 'Tech Solutions Polska S.A.',
    nip: '9876543210',
    regon: '987654321',
    krs: '0000654321',
    address: 'ul. Krakowska 10',
    city: 'Kraków',
    postalCode: '31-001',
    country: 'Poland',
    email: 'info@techsolutions.pl',
    phone: '+48 12 987 6543',
    invoiceCount: 32,
    lastInvoiceDate: new Date('2024-01-10').toISOString(),
    totalSpent: 87500.00,
    vatRegistered: true,
    createdAt: new Date('2023-08-15').toISOString(),
  },
  {
    id: '3',
    name: 'Green Energy Partners',
    nip: '5555555555',
    regon: '555555555',
    krs: null,
    address: 'al. Jerozolimskie 45',
    city: 'Warszawa',
    postalCode: '00-697',
    country: 'Poland',
    email: 'hello@greenenergy.pl',
    phone: '+48 22 555 5555',
    invoiceCount: 18,
    lastInvoiceDate: new Date('2023-12-20').toISOString(),
    totalSpent: 42300.75,
    vatRegistered: true,
    createdAt: new Date('2023-11-01').toISOString(),
  },
  {
    id: '4',
    name: 'Consulting Group Sp. z o.o.',
    nip: '1111222233',
    regon: '111122223',
    krs: '0000111222',
    address: 'ul. Piękna 20',
    city: 'Wrocław',
    postalCode: '50-001',
    country: 'Poland',
    email: 'office@consulting.pl',
    phone: '+48 71 111 2222',
    invoiceCount: 67,
    lastInvoiceDate: new Date('2024-01-18').toISOString(),
    totalSpent: 215000.00,
    vatRegistered: true,
    createdAt: new Date('2023-03-10').toISOString(),
  },
  {
    id: '5',
    name: 'Digital Media Studio',
    nip: '9999888877',
    regon: '999888877',
    krs: null,
    address: 'ul. Floriańska 5',
    city: 'Kraków',
    postalCode: '31-019',
    country: 'Poland',
    email: 'studio@digitalmedia.pl',
    phone: '+48 12 999 8888',
    invoiceCount: 28,
    lastInvoiceDate: new Date('2024-01-12').toISOString(),
    totalSpent: 63400.25,
    vatRegistered: false,
    createdAt: new Date('2023-09-20').toISOString(),
  },
];

async function getCompanies(tenantId: string) {
  try {
    const companies = await prisma.company.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { invoices: true },
        },
        invoices: {
          select: {
            createdAt: true,
            grossAmount: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return companies.map((company: typeof companies[0]) => {
      const totalSpent = 0; // Would need aggregation query
      const lastInvoice = company.invoices[0];

      return {
        id: company.id,
        name: company.name,
        nip: company.nip,
        regon: company.regon,
        krs: company.krs,
        address: company.address,
        city: company.city,
        postalCode: company.postalCode,
        country: company.country,
        email: company.email,
        phone: company.phone,
        invoiceCount: company._count.invoices,
        lastInvoiceDate: lastInvoice?.createdAt.toISOString() || null,
        totalSpent,
        vatRegistered: true, // Would check VAT registry
        createdAt: company.createdAt.toISOString(),
      };
    });
  } catch (error) {
    // Only log error in production, suppress in demo mode
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      console.error('Failed to fetch companies:', error);
    }
    return getDemoCompanies();
  }
}

export default async function CompaniesPage() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get(TENANT_COOKIE)?.value || 'demo-tenant-1';

  const companies = await getCompanies(tenantId);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Companies
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your company directory and validate NIPs
          </p>
        </div>
        <Link
          href="/dashboard/companies/new"
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Company
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Companies</div>
          <div className="text-2xl font-bold mt-1">{companies.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">VAT Registered</div>
          <div className="text-2xl font-bold mt-1">
            {companies.filter((c: typeof companies[0]) => c.vatRegistered).length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Invoices</div>
          <div className="text-2xl font-bold mt-1">
            {companies.reduce((sum: number, c: typeof companies[0]) => sum + c.invoiceCount, 0)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Active This Month</div>
          <div className="text-2xl font-bold mt-1">
            {companies.filter((c) => {
              if (!c.lastInvoiceDate) return false;
              const lastInvoice = new Date(c.lastInvoiceDate);
              const monthAgo = new Date();
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              return lastInvoice >= monthAgo;
            }).length}
          </div>
        </div>
      </div>

      {/* Company List */}
      <CompanyList companies={companies} />
    </div>
  );
}
