import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { TENANT_COOKIE } from '@/lib/tenant/constants';
import { CompanyDetailView } from '@/components/companies/CompanyDetailView';

const prisma = new PrismaClient();

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: `Company ${id} | Deklaro`,
    description: 'Company details and validation status',
  };
}

// Demo company data
const getDemoCompany = (id: string) => ({
  id,
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
  createdAt: new Date('2023-06-01'),
  updatedAt: new Date('2024-01-15'),
  vatRegistrationDate: new Date('2023-05-15'),
  tenantId: 'demo-tenant-1',
});

async function getCompany(id: string, tenantId: string) {
  try {
    const company = await prisma.company.findFirst({
      where: { id, tenantId },
      include: {
        invoices: {
          select: {
            id: true,
            fileName: true,
            invoiceNumber: true,
            createdAt: true,
            grossAmount: true,
            status: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    return company;
  } catch (error) {
    // Only log error in production, suppress in demo mode
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      console.error('Failed to fetch company:', error);
    }
    return getDemoCompany(id);
  }
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const tenantId = cookieStore.get(TENANT_COOKIE)?.value || 'demo-tenant-1';

  const company = await getCompany(id, tenantId);

  if (!company) {
    notFound();
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <CompanyDetailView company={company} />
    </div>
  );
}
