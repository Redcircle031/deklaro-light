$env:SUPABASE_ACCESS_TOKEN = "sbp_41f52fb35e628def1d29edeef1c935c1845efdf8"

Write-Host "==============================================="
Write-Host "Deklaro Database Seeding via Supabase CLI"
Write-Host "==============================================="
Write-Host ""

# Create demo user credentials
$email = "demo@acme-accounting.com"
$password = "Demo123!"

Write-Host "Creating demo user account..." -ForegroundColor Yellow
Write-Host "  Email: $email" -ForegroundColor Cyan

# Create user via Supabase API
$createUserUrl = "https://deljxsvywkbewwsdawqj.supabase.co/auth/v1/signup"
$body = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $createUserUrl -Method Post -Body $body -ContentType "application/json" -Headers @{
        "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGp4c3Z5d2tiZXd3c2Rhd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzY3MDEsImV4cCI6MjA3NTQ1MjcwMX0.KYm8_S_eIhBCbljCLsqvAd3Zemq5BgJBRXXGThrI4Ts"
    }

    $userId = $response.user.id
    Write-Host "✓ User created successfully!" -ForegroundColor Green
    Write-Host "  User ID: $userId" -ForegroundColor Cyan
    Write-Host ""

    # Create seed SQL with actual user ID
    Write-Host "Inserting demo tenant and companies..." -ForegroundColor Yellow

    $seedSql = @'
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
  '{0}',
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
'@ -f $userId

    # Save to temp file
    $tempSeedFile = ".\temp-seed-$userId.sql"
    $seedSql | Out-File -FilePath $tempSeedFile -Encoding UTF8 -NoNewline

    # Execute SQL via Supabase CLI
    Write-Host "Executing seed SQL via Supabase CLI..." -ForegroundColor Yellow

    # Use Supabase CLI to execute the SQL
    $result = npx supabase db execute --file $tempSeedFile --db-url "postgresql://postgres:TgbYhnUjm!23@db.deljxsvywkbewwsdawqj.supabase.co:5432/postgres" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Demo data inserted successfully!" -ForegroundColor Green
    } else {
        Write-Host "Result: $result" -ForegroundColor Yellow
    }

    # Clean up temp file
    if (Test-Path $tempSeedFile) {
        Remove-Item $tempSeedFile
    }

    Write-Host ""
    Write-Host "==============================================="
    Write-Host "✓ Setup Complete!" -ForegroundColor Green
    Write-Host "==============================================="
    Write-Host ""
    Write-Host "Demo Account Credentials:" -ForegroundColor Cyan
    Write-Host "  Email:    $email" -ForegroundColor White
    Write-Host "  Password: $password" -ForegroundColor White
    Write-Host "  Tenant:   ACME Accounting" -ForegroundColor White
    Write-Host "  Role:     OWNER" -ForegroundColor White
    Write-Host ""
    Write-Host "Login at: http://localhost:3000/login" -ForegroundColor Green
    Write-Host ""

} catch {
    $errorMsg = $_.Exception.Message

    if ($errorMsg -like "*User already registered*" -or $errorMsg -like "*already exists*") {
        Write-Host "⚠ User already exists" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Use these credentials to log in:" -ForegroundColor Cyan
        Write-Host "  Email:    $email"
        Write-Host "  Password: $password"
        Write-Host "  URL:      http://localhost:3000/login"
    } else {
        Write-Host "✗ Error: $errorMsg" -ForegroundColor Red
    }
}
