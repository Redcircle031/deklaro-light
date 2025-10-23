$env:DATABASE_URL = "postgresql://postgres:TgbYhnUjm%2123@db.deljxsvywkbewwsdawqj.supabase.co:6543/postgres?sslmode=require"
$env:DIRECT_URL = "postgresql://postgres:TgbYhnUjm%2123@db.deljxsvywkbewwsdawqj.supabase.co:5432/postgres?sslmode=require"

Write-Host "Testing database connection..."
npx prisma db push --accept-data-loss
