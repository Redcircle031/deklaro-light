# Environment Variables Check

## Current Issue

The browser is not receiving the `NEXT_PUBLIC_*` environment variables from `.env.local`.

## Diagnosis

When you see this error in the browser console:
```
Missing or placeholder environment variable: NEXT_PUBLIC_SUPABASE_URL. Using demo mode.
Missing or placeholder environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. Using demo mode.
```

It means Next.js webpack is not passing the environment variables to the browser bundle.

## Solution

**You need to manually run these commands in your terminal:**

```bash
# Navigate to the frontend directory
cd C:\Users\rober\Desktop\Deklaro_light\deklaro\frontend

# Kill all dev servers
npx kill-port 3000 4000 5000

# Remove the build cache completely
rmdir /s /q .next

# Start the dev server fresh
npm run dev
```

## Verify It's Working

Once the server starts, open http://localhost:4000/login in your browser and check the console.

**If working correctly**, you should NOT see:
- "Missing or placeholder environment variable" messages
- "demo.supabase.co" in network requests

**If working correctly**, you SHOULD see:
- Network requests to `https://deljxsvywkbewwsdawqj.supabase.co`
- No environment variable warnings

## Test Credentials

- Email: `test@deklaro.com`
- Password: `Test123456789`

## Current Environment Variables

From `.env.local`:
```
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://deljxsvywkbewwsdawqj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

These ARE correctly set in the file - the issue is webpack caching.
