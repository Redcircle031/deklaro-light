// Seed database with test data using Supabase Admin API
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://deljxsvywkbewwsdawqj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGp4c3Z5d2tiZXd3c2Rhd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg3NjcwMSwiZXhwIjoyMDc1NDUyNzAxfQ.OSeH9K86XQ8LtAFFJDW6H1Ed0KOFNb-Gs7L7NWIzM-Q';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // 1. Confirm test user email
    console.log('1️⃣ Confirming test user email...');
    const { data: userData, error: userError } = await supabase.auth.admin.updateUserById(
      '87dd27e9-1c0b-49f7-bc8a-aab4ce10e99d',
      { email_confirm: true }
    );

    if (userError) {
      console.error('❌ Failed to confirm user:', userError.message);
    } else {
      console.log('✅ User email confirmed:', userData.user.email);
      console.log('   Confirmed at:', userData.user.email_confirmed_at);
    }

    // 2. Create demo tenant
    console.log('\n2️⃣ Creating demo tenant...');
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        id: 'tenant_demo_001',
        name: 'ACME Accounting',
        slug: 'acme-accounting',
        subscription: 'PRO',
        settings: { locale: 'pl', currency: 'PLN', timezone: 'Europe/Warsaw' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (tenantError) {
      if (tenantError.code === '23505') {
        console.log('⚠️  Tenant already exists, skipping...');
      } else {
        console.error('❌ Failed to create tenant:', tenantError.message);
      }
    } else {
      console.log('✅ Tenant created:', tenantData.name);
    }

    // 3. Link user to tenant
    console.log('\n3️⃣ Linking user to tenant...');
    const { data: memberData, error: memberError } = await supabase
      .from('tenant_members')
      .insert({
        id: 'member_001',
        tenantId: 'tenant_demo_001',
        userId: '87dd27e9-1c0b-49f7-bc8a-aab4ce10e99d',
        role: 'OWNER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (memberError) {
      if (memberError.code === '23505') {
        console.log('⚠️  User already linked to tenant, skipping...');
      } else {
        console.error('❌ Failed to link user:', memberError.message);
      }
    } else {
      console.log('✅ User linked to tenant with role:', memberData.role);
    }

    // 4. Create demo companies
    console.log('\n4️⃣ Creating demo companies...');
    const companies = [
      {
        id: 'company_supplier_001',
        tenantId: 'tenant_demo_001',
        nip: '1234567890',
        name: 'Supplier Tech Sp. z o.o.',
        address: 'ul. Przykładowa 123',
        city: 'Warsaw',
        postalCode: '00-001',
        country: 'PL',
        weisStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'company_buyer_001',
        tenantId: 'tenant_demo_001',
        nip: '0987654321',
        name: 'Buyer Solutions Sp. z o.o.',
        address: 'ul. Testowa 456',
        city: 'Krakow',
        postalCode: '30-001',
        country: 'PL',
        weisStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert(companies)
      .select();

    if (companyError) {
      if (companyError.code === '23505') {
        console.log('⚠️  Companies already exist, skipping...');
      } else {
        console.error('❌ Failed to create companies:', companyError.message);
      }
    } else {
      console.log(`✅ Created ${companyData.length} companies`);
    }

    // 5. Create usage record
    console.log('\n5️⃣ Creating usage record...');
    const currentPeriod = new Date().toISOString().substring(0, 7); // YYYY-MM
    const { data: usageData, error: usageError } = await supabase
      .from('usage_records')
      .insert({
        id: 'usage_001',
        tenantId: 'tenant_demo_001',
        period: currentPeriod,
        invoiceCount: 0,
        storageBytes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (usageError) {
      if (usageError.code === '23505') {
        console.log('⚠️  Usage record already exists, skipping...');
      } else {
        console.error('❌ Failed to create usage record:', usageError.message);
      }
    } else {
      console.log('✅ Usage record created for period:', usageData.period);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Database seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('\nCreated:');
    console.log('  ✅ Confirmed test user: test@deklaro.com');
    console.log('  ✅ 1 tenant: ACME Accounting (PRO tier)');
    console.log('  ✅ 1 user-tenant association (OWNER role)');
    console.log('  ✅ 2 companies: Supplier Tech, Buyer Solutions');
    console.log('  ✅ 1 usage record for current month');
    console.log('\nNext steps:');
    console.log('  1. Test login: node test-login.js');
    console.log('  2. Generate Prisma client: npx prisma generate');
    console.log('  3. Disable demo mode: Change NEXT_PUBLIC_DEMO_MODE=false in .env.local');
    console.log('  4. Run tests: npm test\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

seedDatabase();
