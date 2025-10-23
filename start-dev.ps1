$env:NEXT_PUBLIC_SUPABASE_URL = "https://deljxsvywkbewwsdawqj.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGp4c3Z5d2tiZXd3c2Rhd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzY3MDEsImV4cCI6MjA3NTQ1MjcwMX0.KYm8_S_eIhBCbljCLsqvAd3Zemq5BgJBRXXGThrI4Ts"

Write-Host "Starting dev server with Supabase env vars..." -ForegroundColor Green
Write-Host "  NEXT_PUBLIC_SUPABASE_URL: $env:NEXT_PUBLIC_SUPABASE_URL"
Write-Host ""

npm run dev
