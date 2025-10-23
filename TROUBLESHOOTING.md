# Troubleshooting Guide

## "Failed to fetch" Error on Signup/Login

### Symptoms
- Clicking "Sign Up" shows "Failed to fetch" error
- Network tab shows failed requests to Supabase
- Console shows TypeError: Failed to fetch

### Common Causes & Solutions

#### 1. Supabase Project Paused ⏸️

**Symptom**: Project inactive due to no activity

**Solution**:
1. Go to https://supabase.com/dashboard
2. Login with your Supabase account
3. Find project: `deljxsvywkbewwsdawqj`
4. Click "Resume Project" if paused
5. Wait 1-2 minutes for project to wake up
6. Try signup again

#### 2. Browser Blocking Requests 🚫

**Symptom**: Ad blockers or extensions blocking Supabase

**Solution**:
```
1. Disable ad blockers (uBlock Origin, AdBlock Plus, etc.)
2. Disable privacy extensions (Privacy Badger, Ghostery, etc.)
3. Try incognito/private browsing mode
4. Try different browser (Chrome, Firefox, Edge)
5. Check browser console for CORS errors
```

#### 3. Network/Firewall Issues 🔥

**Symptom**: Corporate firewall or VPN blocking Supabase

**Solution**:
```
1. Disable VPN temporarily
2. Try different network (mobile hotspot, home WiFi)
3. Check if *.supabase.co is blocked by firewall
4. Contact IT if on corporate network
```

#### 4. Invalid Supabase Configuration ⚙️

**Symptom**: Wrong URL or API key

**Solution**:
1. Check `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://deljxsvywkbewwsdawqj.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
2. Verify URL is correct (check Supabase dashboard)
3. Verify anon key is correct (check Supabase → Settings → API)
4. Restart dev server after changes

---

## Quick Diagnostic

Open browser DevTools (F12) and run:

```javascript
// Test Supabase connection
fetch('https://deljxsvywkbewwsdawqj.supabase.co/auth/v1/health')
  .then(r => console.log('Supabase reachable:', r.status))
  .catch(e => console.error('Supabase unreachable:', e))
```

**Expected**: Status 200 or 401 (means Supabase is alive)
**Problem**: Network error or timeout (means blocked/unreachable)

---

## Workaround: Demo Mode

If you can't fix Supabase access immediately, bypass auth temporarily:

### Step 1: Update Middleware

Edit `src/middleware.ts`:

```typescript
export async function middleware(request: NextRequest) {
  // TEMP: Skip auth for development
  return NextResponse.next();
}
```

### Step 2: Mock Session

Create `src/lib/auth/mock-session.ts`:

```typescript
export const MOCK_SESSION = {
  user: {
    id: 'demo-user-123',
    email: 'demo@example.com',
  },
};
```

### Step 3: Update Components

Use mock session in components that require auth.

**WARNING**: This is for development only! Remove before production.

---

## Still Stuck?

### Check Server Logs

```bash
# Look for errors
cd deklaro/frontend
npm run dev

# Watch for:
# - Supabase connection errors
# - CORS errors
# - Network timeouts
```

### Test Direct API Call

```bash
# From command line
curl https://deljxsvywkbewwsdawqj.supabase.co/auth/v1/health

# Expected: 200 OK or 401 Unauthorized
# Problem: Connection refused, timeout, or DNS error
```

### Contact Support

If none of the above works:

1. **Supabase Support**: https://supabase.com/docs/support
2. **Check Status Page**: https://status.supabase.com
3. **Community Discord**: https://discord.supabase.com

---

## Prevention

### Keep Project Active

Supabase pauses projects after 7 days of inactivity:
- Login to dashboard weekly, or
- Set up auto-ping (Edge Function that runs daily), or
- Upgrade to paid plan (no pausing)

### Monitor Status

- Bookmark: https://status.supabase.com
- Enable notifications for your project
- Set up health check monitoring

---

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Failed to fetch" | Network/CORS issue | Check browser, VPN, firewall |
| "Invalid API key" | Wrong anon key | Check `.env.local` |
| "Project not found" | Wrong URL or deleted | Verify project exists |
| "Too many requests" | Rate limited | Wait and retry |
| "Email rate limit exceeded" | Too many signups | Wait 1 hour |

---

## Success Checklist

Before considering it "working":

- [ ] Can reach https://deljxsvywkbewwsdawqj.supabase.co
- [ ] Project shows "Active" in Supabase dashboard
- [ ] No browser console errors
- [ ] `.env.local` has correct values
- [ ] Dev server running without errors
- [ ] Can signup with test email
- [ ] Receive verification email
- [ ] Can login after verification

---

**Still having issues?** Provide:
1. Browser console errors (screenshot)
2. Network tab details (failed requests)
3. Supabase dashboard status (active/paused)
4. Steps you've tried

I'm here to help! 🚀
