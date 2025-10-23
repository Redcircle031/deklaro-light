import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme-accounting' },
    update: {},
    create: {
      name: 'ACME Accounting',
      slug: 'acme-accounting',
      subscription: 'PRO',
      settings: {
        locale: 'pl',
        currency: 'PLN',
        dateFormat: 'DD/MM/YYYY',
      },
    },
  });

  console.log(`✅ Created tenant: ${tenant.name} (${tenant.slug})`);

  // Create demo companies
  const supplierCompany = await prisma.company.upsert({
    where: {
      tenantId_nip: {
        tenantId: tenant.id,
        nip: '1234567890',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      nip: '1234567890',
      name: 'Tech Solutions Sp. z o.o.',
      address: 'ul. Główna 123',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'PL',
      weisStatus: 'ACTIVE',
    },
  });

  const buyerCompany = await prisma.company.upsert({
    where: {
      tenantId_nip: {
        tenantId: tenant.id,
        nip: '9876543210',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      nip: '9876543210',
      name: 'Business Corp Sp. z o.o.',
      address: 'ul. Biznesowa 456',
      city: 'Kraków',
      postalCode: '30-001',
      country: 'PL',
      weisStatus: 'ACTIVE',
    },
  });

  console.log(`✅ Created ${2} demo companies`);

  // Create usage record for current month
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  await prisma.usageRecord.upsert({
    where: {
      tenantId_period: {
        tenantId: tenant.id,
        period,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      period,
      invoiceCount: 0,
      storageBytes: BigInt(0),
    },
  });

  console.log(`✅ Created usage record for period: ${period}`);

  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('Demo data:');
  console.log(`- Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`- Supplier: ${supplierCompany.name} (NIP: ${supplierCompany.nip})`);
  console.log(`- Buyer: ${buyerCompany.name} (NIP: ${buyerCompany.nip})`);
  console.log('');
  console.log('⚠️  To use this data:');
  console.log('1. Create a user in Supabase Auth');
  console.log('2. Add a tenant_members record linking the user to the tenant');
  console.log('3. Log in with that user');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
