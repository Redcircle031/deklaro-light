$env:SUPABASE_ACCESS_TOKEN = "sbp_41f52fb35e628def1d29edeef1c935c1845efdf8"
$env:DATABASE_URL = "postgresql://postgres:TgbYhnUjm%2123@db.deljxsvywkbewwsdawqj.supabase.co:5432/postgres"
npx supabase db dump --db-url $env:DATABASE_URL --schema public --data-only -t tenants
