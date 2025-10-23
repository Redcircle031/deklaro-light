$env:SUPABASE_ACCESS_TOKEN = "sbp_41f52fb35e628def1d29edeef1c935c1845efdf8"

Write-Host "==============================================="
Write-Host "Deklaro Demo User Setup"
Write-Host "==============================================="
Write-Host ""
Write-Host "This script will:"
Write-Host "1. Create a demo user account"
Write-Host "2. Insert demo tenant and companies"
Write-Host "3. Link the user to the tenant"
Write-Host ""

# Prompt for email and password
$email = Read-Host "Enter email for demo account"
$password = Read-Host "Enter password (min 6 characters)" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host ""
Write-Host "Creating user account..." -ForegroundColor Yellow

# Create user via Supabase API
$createUserUrl = "https://deljxsvywkbewwsdawqj.supabase.co/auth/v1/signup"
$body = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $createUserUrl -Method Post -Body $body -ContentType "application/json" -Headers @{
        "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGp4c3Z5d2tiZXd3c2Rhd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzY3MDEsImV4cCI6MjA3NTQ1MjcwMX0.KYm8_S_eIhBCbljCLsqvAd3Zemq5BgJBRXXGThrI4Ts"
    }

    $userId = $response.user.id
    Write-Host "✓ User created successfully!" -ForegroundColor Green
    Write-Host "  User ID: $userId" -ForegroundColor Cyan
    Write-Host ""

    # Now insert seed data with the user ID
    Write-Host "Inserting demo tenant and companies..." -ForegroundColor Yellow

    $seedSql = @"
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

-- Link user to tenant
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
  '$userId',
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

-- Create usage record
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
"@

    # Save to temp file
    $seedSql | Out-File -FilePath ".\temp-seed.sql" -Encoding UTF8

    # Execute via psql or Supabase CLI
    $dbUrl = "postgresql://postgres:TgbYhnUjm!23@db.deljxsvywkbewwsdawqj.supabase.co:5432/postgres"

    # Try to use psql if available, otherwise show instructions
    try {
        psql $dbUrl -f ".\temp-seed.sql"
        Remove-Item ".\temp-seed.sql"
        Write-Host "✓ Demo data inserted successfully!" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not execute SQL automatically" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please run the following SQL in Supabase SQL Editor:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host $seedSql
        Write-Host ""
    }

    Write-Host ""
    Write-Host "==============================================="
    Write-Host "✓ Setup Complete!" -ForegroundColor Green
    Write-Host "==============================================="
    Write-Host ""
    Write-Host "Demo Account:" -ForegroundColor Cyan
    Write-Host "  Email: $email"
    Write-Host "  Tenant: ACME Accounting"
    Write-Host "  Role: OWNER"
    Write-Host ""
    Write-Host "You can now log in at: http://localhost:3000/login" -ForegroundColor Green

} catch {
    Write-Host "✗ Error creating user: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "The user might already exist. Try logging in with:" -ForegroundColor Yellow
    Write-Host "  Email: $email"
    Write-Host "  URL: http://localhost:3000/login"
}
