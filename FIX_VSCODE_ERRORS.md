# VSCode TypeScript Errors for Non-Existent File

## Problem Summary

VSCode is showing TypeScript errors for `src/index.ts`, but **this file does not exist on disk**.

The file was correctly moved to `supabase/functions/ocr-processor/index.ts` where it belongs (it's a Deno Edge Function, not a Next.js file).

## Verification

Run these commands to prove the file doesn't exist:

```bash
# This will show "No such file or directory"
ls deklaro/frontend/src/index.ts

# This will show the file in its correct location
ls deklaro/frontend/supabase/functions/ocr-processor/index.ts

# This confirms TypeScript compilation has no errors for src/index.ts
cd deklaro/frontend
npx tsc --noEmit 2>&1 | grep "src/index.ts"
# (Should return nothing)
```

## What Was Fixed

✅ File moved to correct location: `supabase/functions/ocr-processor/index.ts`
✅ `tsconfig.json` updated to exclude `supabase/functions/**/*`
✅ `.vscode/settings.json` created with TypeScript exclusions
✅ All build caches cleared
✅ TypeScript compiler confirms no errors

## The Real Problem

**VSCode's TypeScript language server has cached a reference to a file that no longer exists.**

This is a known VSCode issue where the language server doesn't automatically detect file deletions/moves.

## Solution: Force VSCode to Refresh

### Method 1: Restart TypeScript Server (Try This First)

1. **Close any open tabs** showing `index.ts`
2. Press **`Ctrl+Shift+P`** (Windows/Linux) or **`Cmd+Shift+P`** (Mac)
3. Type: **`TypeScript: Restart TS Server`**
4. Press **Enter**
5. Wait 5-10 seconds

### Method 2: Reload VSCode Window

1. Press **`Ctrl+Shift+P`**
2. Type: **`Developer: Reload Window`**
3. Press **Enter**

### Method 3: Clear VSCode Cache and Restart

Run this PowerShell script:

```powershell
cd deklaro/frontend
.\clear-vscode-cache.ps1
```

Then restart TypeScript server (Method 1).

### Method 4: Nuclear Option

1. **Completely close VSCode** (File → Exit, don't just close the window)
2. Wait 5 seconds
3. **Reopen VSCode**
4. Open your project folder

## Why This Happens

VSCode's TypeScript language server loads file information into memory when it starts:

1. File is read → Stored in memory → TypeScript analyzes it
2. File is moved/deleted → **VSCode doesn't automatically refresh memory**
3. Stale cache → Phantom errors

The language server **must be restarted** to reload file information from disk.

## Still Not Working?

If you've tried all methods above and still see errors:

### Check for Open Tabs

- Look at your open tabs in VSCode
- Is there a tab for `src/index.ts`? **Close it**
- Even phantom tabs (files that don't exist) can cause errors

### Check Workspace Settings

If you opened the wrong folder:
- Make sure you opened `deklaro/frontend` as your workspace root
- NOT `Deklaro_light` (the parent directory)

### Last Resort: Delete VSCode Workspace Storage

Close VSCode, then delete:
```
%APPDATA%\Code\User\workspaceStorage\<random-hash>
```

Then reopen VSCode.

## Technical Details

**Why we moved the file:**

- `src/index.ts` was a Supabase Edge Function (Deno runtime)
- Deno uses URL imports like `https://deno.land/std@0.168.0/http/server.ts`
- These don't work in Node.js/Next.js (which expects `node_modules`)
- Edge Functions belong in `supabase/functions/`, not `src/`

**The actual filesystem:**

```
✅ CORRECT STRUCTURE:
deklaro/frontend/
├── src/                    # Next.js application
│   ├── app/
│   ├── lib/
│   └── components/
└── supabase/
    └── functions/          # Deno Edge Functions
        ├── _shared/
        │   └── cors.ts
        └── ocr-processor/
            └── index.ts    # ← The file is HERE
```

## Confirmation

After restarting TypeScript server, you should see:

- ✅ No errors for `src/index.ts`
- ✅ File no longer appears in problems panel
- ✅ Only real TypeScript errors remain (if any)

---

**Bottom line:** The file doesn't exist. VSCode just needs to be told to refresh its cache.
