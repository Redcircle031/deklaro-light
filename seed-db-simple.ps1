$env:SUPABASE_ACCESS_TOKEN = "sbp_41f52fb35e628def1d29edeef1c935c1845efdf8"

Write-Host "Creating demo user..." -ForegroundColor Yellow

$email = "demo@acme-accounting.com"
$password = "Demo123!"

$createUserUrl = "https://deljxsvywkbewwsdawqj.supabase.co/auth/v1/signup"
$body = @{
    email = $email
    password = $password
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri $createUserUrl -Method Post -Body $body -ContentType "application/json" -Headers @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGp4c3Z5d2tiZXd3c2Rhd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzY3MDEsImV4cCI6MjA3NTQ1MjcwMX0.KYm8_S_eIhBCbljCLsqvAd3Zemq5BgJBRXXGThrI4Ts"
} -ErrorAction SilentlyContinue

if ($response -and $response.user) {
    $userId = $response.user.id
    Write-Host "User created: $userId" -ForegroundColor Green

    # Create SQL file with user ID
    $sql = "INSERT INTO public.tenants (id, name, slug, subscription, settings, ""createdAt"", ""updatedAt"") VALUES ('tenant_demo_001', 'ACME Accounting', 'acme-accounting', 'PRO', '{""locale"": ""pl"", ""currency"": ""PLN""}'::jsonb, NOW(), NOW());"
    $sql += "`nINSERT INTO public.tenant_members (id, ""tenantId"", ""userId"", role, ""createdAt"", ""updatedAt"") VALUES ('member_001', 'tenant_demo_001', '$userId', 'OWNER', NOW(), NOW());"
    $sql += "`nINSERT INTO tenant.companies (id, ""tenantId"", nip, name, address, city, ""postalCode"", country, ""weisStatus"", ""createdAt"", ""updatedAt"") VALUES ('company_supplier_001', 'tenant_demo_001', '1234567890', 'Supplier Tech Sp. z o.o.', 'ul. Przykładowa 123', 'Warsaw', '00-001', 'PL', 'ACTIVE', NOW(), NOW());"
    $sql += "`nINSERT INTO tenant.companies (id, ""tenantId"", nip, name, address, city, ""postalCode"", country, ""weisStatus"", ""createdAt"", ""updatedAt"") VALUES ('company_buyer_001', 'tenant_demo_001', '0987654321', 'Buyer Solutions Sp. z o.o.', 'ul. Testowa 456', 'Krakow', '30-001', 'PL', 'ACTIVE', NOW(), NOW());"
    $sql += "`nINSERT INTO public.usage_records (id, ""tenantId"", period, ""invoiceCount"", ""storageBytes"", ""createdAt"", ""updatedAt"") VALUES ('usage_001', 'tenant_demo_001', TO_CHAR(NOW(), 'YYYY-MM'), 0, 0, NOW(), NOW());"

    $sql | Out-File -FilePath "seed-temp.sql" -Encoding UTF8

    Write-Host "Seeding database..." -ForegroundColor Yellow
    npx supabase db execute --file seed-temp.sql --db-url "postgresql://postgres:TgbYhnUjm!23@db.deljxsvywkbewwsdawqj.supabase.co:5432/postgres"

    Remove-Item "seed-temp.sql"

    Write-Host ""
    Write-Host "Setup complete!" -ForegroundColor Green
    Write-Host "Email: $email"
    Write-Host "Password: $password"
    Write-Host "Login at: http://localhost:3000/login"
} else {
    Write-Host "User may already exist. Try: demo@acme-accounting.com / Demo123!" -ForegroundColor Yellow
}
