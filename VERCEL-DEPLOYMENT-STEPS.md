# Vercel Deployment - Step-by-Step Guide

**Project**: Deklaro Invoice Management Platform
**Date**: 2025-10-23
**Prerequisites**: Completed testing phase (23/24 tests passing)

---

## 📋 Prerequisites Checklist

Before deploying, ensure you have:

- [ ] GitHub account
- [ ] Vercel account (free tier is sufficient)
- [ ] Supabase production project created
- [ ] All environment variables ready
- [ ] Latest code pushed to GitHub

---

## Step 1: Prepare GitHub Repository (5 minutes)

### 1.1 Initialize Git (if not already done)

```powershell
cd c:\Users\rober\Desktop\Deklaro_light\deklaro\frontend
git init
```

### 1.2 Create .gitignore

The project already has a `.gitignore` file. Verify it includes:

```
.env.local
.env.production
node_modules/
.next/
playwright-report/
test-results/
```

### 1.3 Create GitHub repository

1. Go to [GitHub](https://github.com/new)
2. Create new repository:
   - **Name**: `deklaro-mvp`
   - **Description**: "AI-powered invoice management platform for Polish SMEs"
   - **Visibility**: Private (recommended) or Public
   - **DO NOT** initialize with README (we already have code)

### 1.4 Push code to GitHub

```powershell
git add .
git commit -m "Production-ready MVP with 95.8% test coverage"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/deklaro-mvp.git
git push -u origin main
```

---

## Step 2: Set Up Vercel Account (3 minutes)

### 2.1 Create Vercel account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. **Choose "Continue with GitHub"** (easiest integration)
4. Authorize Vercel to access your GitHub account

### 2.2 Install Vercel CLI (optional but recommended)

```powershell
npm install -g vercel
vercel login
```

---

## Step 3: Import Project to Vercel (5 minutes)

### 3.1 Import from GitHub

1. In Vercel dashboard, click **"Add New..."** → **"Project"**
2. Find your `deklaro-mvp` repository
3. Click **"Import"**

### 3.2 Configure Project

**Framework Preset**: Next.js (auto-detected)

**Root Directory**: `./` (default)

**Build Command**:
```
npm run build
```

**Output Directory**:
```
.next
```

**Install Command**:
```
npm install
```

### 3.3 Configure Environment Variables

Click **"Environment Variables"** and add ALL of these:

#### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

#### Database Configuration
```
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-YOUR_REGION.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-YOUR_REGION.pooler.supabase.com:5432/postgres
```

#### Application Configuration
```
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
NEXT_PUBLIC_DEMO_MODE=false
```

#### Third-Party Services
```
RESEND_API_KEY=re_your_resend_api_key
OPENAI_API_KEY=sk-proj-your_openai_api_key
```

**Environment Selection**: Select **"Production"**, **"Preview"**, and **"Development"** for all variables

### 3.4 Deploy

Click **"Deploy"** and wait 2-3 minutes for the build to complete.

---

## Step 4: Verify Deployment (5 minutes)

### 4.1 Check Build Logs

Watch the deployment logs in real-time. Look for:

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Creating an optimized production build
```

### 4.2 Visit Your Site

Once deployed, Vercel will show you a URL like:
```
https://deklaro-mvp-abc123.vercel.app
```

### 4.3 Test Critical Paths

1. **Homepage** - Should load without errors
2. **Login** - Navigate to `/login`
3. **Authentication** - Try logging in with test credentials:
   - Email: `test@deklaro.com`
   - Password: `Test123456789`
4. **Dashboard** - Should redirect after login
5. **Invoice Upload** - Test file upload

---

## Step 5: Configure Custom Domain (Optional, 10 minutes)

### 5.1 Purchase Domain

If you don't have one, purchase from:
- [Namecheap](https://www.namecheap.com)
- [Google Domains](https://domains.google)
- [Cloudflare](https://www.cloudflare.com/products/registrar/)

### 5.2 Add Domain to Vercel

1. In Vercel project, go to **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain (e.g., `deklaro.com`)
4. Follow DNS configuration instructions

### 5.3 Configure DNS

Add these records to your DNS provider:

**A Record**:
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

**CNAME Record** (for www):
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

### 5.4 Update Environment Variables

Update `NEXT_PUBLIC_APP_URL` in Vercel:
```
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Redeploy after updating.

---

## Step 6: Set Up Monitoring (15 minutes)

### 6.1 Enable Vercel Analytics

1. In Vercel project, go to **Analytics**
2. Click **"Enable Analytics"**
3. No code changes needed

### 6.2 Set Up Sentry (Error Tracking)

#### Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and sign up
2. Create new project:
   - Platform: **Next.js**
   - Project name: **deklaro-mvp**

#### Install Sentry

```powershell
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

#### Add Sentry DSN to Vercel

In Vercel Environment Variables:
```
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
```

### 6.3 Set Up UptimeRobot

1. Go to [uptimerobot.com](https://uptimerobot.com) and sign up (free)
2. Click **"Add New Monitor"**
3. Configure:
   - **Monitor Type**: HTTPS
   - **Friendly Name**: Deklaro Production
   - **URL**: `https://your-domain.com`
   - **Monitoring Interval**: 5 minutes
4. Add alert contacts (email, SMS)

---

## Step 7: Post-Deployment Verification (10 minutes)

### 7.1 Run Smoke Tests

Use the deployment helper script:

```powershell
cd c:\Users\rober\Desktop\Deklaro_light\deklaro\frontend
.\scripts\deploy-vercel.ps1
```

Or run manual checks:

**Homepage**:
```powershell
curl https://your-domain.com
```

**API Health**:
```powershell
curl https://your-domain.com/api/inngest
```

**Authentication**:
1. Visit `/login`
2. Log in with test credentials
3. Verify redirect to `/dashboard`

### 7.2 Check Logs

In Vercel dashboard:
1. Go to **Deployments**
2. Click your latest deployment
3. Click **"View Function Logs"**
4. Look for any errors

### 7.3 Performance Check

Use [PageSpeed Insights](https://pagespeed.web.dev/):
```
https://pagespeed.web.dev/analysis?url=https://your-domain.com
```

**Target Metrics**:
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.0s
- **Largest Contentful Paint**: < 2.5s

---

## Step 8: Configure CI/CD (Already Done!)

The GitHub Actions workflow is already set up in `.github/workflows/ci.yml`.

### 8.1 Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
```

To get these values:
1. **VERCEL_TOKEN**: Vercel dashboard → Settings → Tokens → Create Token
2. **VERCEL_ORG_ID**: Run `vercel project ls` in terminal
3. **VERCEL_PROJECT_ID**: Found in project settings or `.vercel/project.json`

### 8.2 Test CI/CD

Push a small change to trigger the workflow:

```powershell
git add .
git commit -m "Test CI/CD pipeline"
git push
```

Watch the workflow run in GitHub Actions tab.

---

## Step 9: Configure Database Backups

### 9.1 Enable Supabase Backups

1. Go to Supabase dashboard
2. Navigate to **Settings** → **Database** → **Backups**
3. Enable **Daily Backups** (7-day retention for free tier)

### 9.2 Test Backup Restore

Download a backup and test locally:

```powershell
npx supabase db dump --db-url "your-production-db-url" > backup.sql
```

---

## Step 10: Go Live! 🎉

### 10.1 Final Checklist

- [ ] All environment variables set in Vercel
- [ ] Custom domain configured and SSL working
- [ ] Analytics enabled
- [ ] Monitoring configured (Sentry, UptimeRobot)
- [ ] Database backups enabled
- [ ] CI/CD pipeline working
- [ ] Smoke tests passed
- [ ] Performance metrics acceptable

### 10.2 Announce

Share your production URL with stakeholders:
```
🚀 Deklaro MVP is now live!

Production URL: https://your-domain.com
Test Credentials:
  Email: test@deklaro.com
  Password: Test123456789

Features:
  ✅ Invoice OCR extraction
  ✅ Company management
  ✅ Analytics dashboard
  ✅ Multi-tenant support

Test coverage: 95.8% (23/24 tests passing)
```

---

## Troubleshooting

### Build Fails

**Error**: `Type error: Cannot find module...`

**Solution**: Check that all dependencies are in `package.json` and installed:
```powershell
npm install
npm run build
```

### Environment Variables Not Working

**Error**: `Error: Supabase URL is required`

**Solution**:
1. Verify variables are set in Vercel dashboard
2. Ensure they're selected for the correct environment (Production)
3. Redeploy after updating variables

### 500 Internal Server Error

**Error**: Application crashes on load

**Solution**:
1. Check Vercel function logs
2. Verify database connection strings
3. Check Sentry for detailed error traces

### Authentication Not Working

**Error**: Login redirects to error page

**Solution**:
1. Verify Supabase URLs in environment variables
2. Check Supabase redirect URLs:
   - Go to Supabase → Authentication → URL Configuration
   - Add `https://your-domain.com/auth/callback`
3. Test with incognito mode (clear cookies)

---

## Rollback Procedure

If something goes wrong, you can instantly rollback:

### Via Vercel Dashboard
1. Go to **Deployments**
2. Find previous working deployment
3. Click **"..."** → **"Promote to Production"**

### Via CLI
```powershell
vercel rollback
```

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Watch error rates in Sentry
2. **Gather user feedback** - Share with beta testers
3. **Plan improvements** - Based on usage analytics
4. **Set up billing** - Configure Stripe if monetizing
5. **Scale infrastructure** - Upgrade Supabase/Vercel plans as needed

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

**Estimated Total Time**: 60-90 minutes

**Status**: Ready to deploy! 🚀
