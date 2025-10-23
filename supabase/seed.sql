-- Deklaro Seed Data
-- Run this AFTER creating your first user via signup
-- Replace 'YOUR_USER_ID_HERE' with your actual user UUID from Supabase Auth

-- Insert demo tenant
INSERT INTO "public"."tenants" (
  "id",
  "name",
  "slug",
  "subscription",
  "settings",
  "createdAt",
  "updatedAt"
) VALUES (
  'tenant_demo_001',
  'ACME Accounting',
  'acme-accounting',
  'PRO',
  '{"locale": "pl", "currency": "PLN", "timezone": "Europe/Warsaw"}'::jsonb,
  NOW(),
  NOW()
);

-- Link your user to the demo tenant
INSERT INTO "public"."tenant_members" (
  "id",
  "tenantId",
  "userId",
  "role",
  "createdAt",
  "updatedAt"
) VALUES (
  'member_001',
  'tenant_demo_001',
  '87dd27e9-1c0b-49f7-bc8a-aab4ce10e99d',  -- test@deklaro.com
  'OWNER',
  NOW(),
  NOW()
);

-- Create demo companies
INSERT INTO "tenant"."companies" (
  "id",
  "tenantId",
  "nip",
  "name",
  "address",
  "city",
  "postalCode",
  "country",
  "weisStatus",
  "createdAt",
  "updatedAt"
) VALUES
(
  'company_supplier_001',
  'tenant_demo_001',
  '1234567890',
  'Supplier Tech Sp. z o.o.',
  'ul. Przykładowa 123',
  'Warsaw',
  '00-001',
  'PL',
  'ACTIVE',
  NOW(),
  NOW()
),
(
  'company_buyer_001',
  'tenant_demo_001',
  '0987654321',
  'Buyer Solutions Sp. z o.o.',
  'ul. Testowa 456',
  'Krakow',
  '30-001',
  'PL',
  'ACTIVE',
  NOW(),
  NOW()
);

-- Create usage record for current month
INSERT INTO "public"."usage_records" (
  "id",
  "tenantId",
  "period",
  "invoiceCount",
  "storageBytes",
  "createdAt",
  "updatedAt"
) VALUES (
  'usage_001',
  'tenant_demo_001',
  TO_CHAR(NOW(), 'YYYY-MM'),
  0,
  0,
  NOW(),
  NOW()
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Seed data created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Update the seed data with your user ID:';
  RAISE NOTICE '1. Go to Authentication → Users in Supabase dashboard';
  RAISE NOTICE '2. Copy your user UUID';
  RAISE NOTICE '3. Replace YOUR_USER_ID_HERE in the SQL above';
  RAISE NOTICE '4. Re-run this script';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '- 1 tenant: ACME Accounting (PRO tier)';
  RAISE NOTICE '- 2 companies: Supplier Tech, Buyer Solutions';
  RAISE NOTICE '- 1 usage record for current month';
END $$;
