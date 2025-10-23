# Deklaro Production Deployment Guide

**Last Updated**: 2025-10-23
**Target Platform**: Vercel + Supabase
**Estimated Time**: 30-45 minutes

---

## ✅ Pre-Deployment Checklist

Before deploying to production, ensure:

- [x] Database schema deployed to Supabase
- [x] Test user created and verified
- [x] All environment variables documented
- [x] E2E tests passing (23/24 = 95.8%)
- [ ] Custom domain purchased (if needed)
- [ ] Vercel account created
- [ ] GitHub repository set up

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare GitHub Repository

1. **Initialize Git (if not already done)**
   ```bash
   cd deklaro/frontend
   git init
   git add .
   git commit -m "Initial commit - Deklaro MVP"
   ```

2. **Create GitHub Repository**
   - Go to https://github.com/new
   - Repository name: `deklaro-mvp`
   - Visibility: Private
   - Do NOT initialize with README (we already have code)

3. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/deklaro-mvp.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Deploy to Vercel

#### 2.1: Create Vercel Project

1. **Go to Vercel**
   - Visit https://vercel.com/new
   - Sign in with GitHub
   - Click "Import Project"

2. **Import GitHub Repository**
   - Select `deklaro-mvp` repository
   - Click "Import"

3. **Configure Project**
   ```
   Project Name: deklaro-production
   Framework Preset: Next.js
   Root Directory: deklaro/frontend
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

#### 2.2: Configure Environment Variables

In Vercel dashboard, add these environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://deljxsvywkbewwsdawqj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGp4c3Z5d2tiZXd3c2Rhd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzY3MDEsImV4cCI6MjA3NTQ1MjcwMX0.KYm8_S_eIhBCbljCLsqvAd3Zemq5BgJBRXXGThrI4Ts

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGp4c3Z5d2tiZXd3c2Rhd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg3NjcwMSwiZXhwIjoyMDc1NDUyNzAxfQ.OSeH9K86XQ8LtAFFJDW6H1Ed0KOFNb-Gs7L7NWIzM-Q

# Database
DATABASE_URL=postgresql://postgres.deljxsvywkbewwsdawqj:TgbYhnUjm!23@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

DIRECT_URL=postgresql://postgres.deljxsvywkbewwsdawqj:TgbYhnUjm!23@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_DEMO_MODE=false

# Email Service
RESEND_API_KEY=re_your_resend_api_key

# AI Service
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
```

**⚠️ IMPORTANT**: These are the current development keys. For production:
- Create a NEW Supabase project for production
- Use separate OpenAI API key with rate limits
- Use production Resend API key

#### 2.3: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. Click on deployment URL to verify

---

### Step 3: Configure Custom Domain (Optional)

#### 3.1: Purchase Domain

Recommended registrars:
- Namecheap
- Google Domains
- Cloudflare

Example: `deklaro.com` or `app.deklaro.com`

#### 3.2: Add Domain to Vercel

1. In Vercel dashboard, go to Project Settings > Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `app.deklaro.com`)
4. Click "Add"

#### 3.3: Configure DNS

Add these DNS records at your registrar:

**For root domain** (`deklaro.com`):
```
Type: A
Name: @
Value: 76.76.21.21
```

**For subdomain** (`app.deklaro.com`):
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

Wait 5-60 minutes for DNS propagation.

#### 3.4: Verify SSL

- Vercel automatically provisions SSL certificates
- Visit https://your-domain.com
- Check for 🔒 in browser address bar

---

### Step 4: Configure Monitoring

#### 4.1: Vercel Analytics

1. In Vercel dashboard, go to Analytics tab
2. Click "Enable Analytics"
3. Choose plan (Free tier available)

#### 4.2: Set Up Sentry (Error Monitoring)

1. **Create Sentry Account**
   - Visit https://sentry.io/signup/
   - Create new project (Next.js)

2. **Install Sentry SDK**
   ```bash
   cd deklaro/frontend
   npm install --save @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

3. **Add Sentry DSN to Vercel**
   ```
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   ```

#### 4.3: Uptime Monitoring

1. **Create UptimeRobot Account**
   - Visit https://uptimerobot.com
   - Add new monitor
   - Type: HTTPS
   - URL: https://your-domain.com
   - Interval: 5 minutes

2. **Configure Alerts**
   - Email notifications
   - SMS (optional)
   - Slack webhook (optional)

---

### Step 5: Database Backups

#### 5.1: Supabase Automatic Backups

Supabase Pro plan includes:
- Daily automated backups (7 days retention)
- Point-in-time recovery

#### 5.2: Manual Backup Script

```bash
# Create backup script
cd deklaro/frontend/scripts

# Run manual backup
npx supabase db dump -f backup-$(date +%Y%m%d).sql
```

Add to cron job for weekly backups:
```bash
0 0 * * 0 cd /path/to/deklaro/frontend && npx supabase db dump -f backup-$(date +%Y%m%d).sql
```

---

### Step 6: Update Application URLs

After deployment, update these URLs:

1. **In Vercel Environment Variables**
   ```
   NEXT_PUBLIC_APP_URL=https://your-production-domain.com
   ```

2. **In Supabase Dashboard**
   - Go to Authentication > URL Configuration
   - Add Site URL: `https://your-production-domain.com`
   - Add Redirect URLs:
     ```
     https://your-production-domain.com/auth/callback
     https://your-production-domain.com/dashboard
     ```

3. **Redeploy**
   - In Vercel dashboard, click "Redeploy"
   - Or push a new commit to trigger automatic deployment

---

## 🧪 Post-Deployment Verification

### Checklist

- [ ] Homepage loads without errors
- [ ] Login works with test credentials
- [ ] Dashboard loads correctly
- [ ] Invoice upload works
- [ ] Company management functional
- [ ] OCR processing works
- [ ] Multi-tenant switching works
- [ ] SSL certificate valid
- [ ] Analytics tracking
- [ ] Error monitoring active

### Test Credentials

```
Email: test@deklaro.com
Password: Test123456789
```

### Smoke Test Script

```bash
# 1. Test homepage
curl -I https://your-domain.com

# 2. Test API health
curl https://your-domain.com/api/health

# 3. Test authentication endpoint
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@deklaro.com","password":"Test123456789"}'
```

---

## 🔄 Deployment Pipeline

### Automatic Deployments

Vercel automatically deploys on:
- **Production**: Push to `main` branch
- **Preview**: Push to any other branch or PR

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## 🚨 Rollback Procedure

If deployment fails or has issues:

1. **Instant Rollback in Vercel**
   - Go to Deployments tab
   - Find previous working deployment
   - Click "..." > "Promote to Production"

2. **Via CLI**
   ```bash
   vercel rollback
   ```

3. **Via Git**
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## 📊 Production Checklist

### Before Go-Live

- [ ] Production Supabase project created
- [ ] All environment variables configured
- [ ] Custom domain configured with SSL
- [ ] Monitoring tools active (Vercel, Sentry, UptimeRobot)
- [ ] Database backups configured
- [ ] Tested complete user journey
- [ ] Load testing performed
- [ ] Security headers configured
- [ ] GDPR compliance verified
- [ ] Terms of Service and Privacy Policy published

### After Go-Live

- [ ] Monitor error rates (Sentry)
- [ ] Check performance metrics (Vercel Analytics)
- [ ] Verify uptime (UptimeRobot)
- [ ] Review logs daily for first week
- [ ] Collect user feedback
- [ ] Plan first update/hotfix

---

## 🆘 Troubleshooting

### Build Fails

**Error**: "Module not found"
```bash
# Clear cache and rebuild
vercel --force
```

**Error**: "Environment variable missing"
- Check all required env vars are set in Vercel dashboard
- Redeploy after adding missing variables

### Runtime Errors

**Error**: "Database connection failed"
- Verify DATABASE_URL is correct
- Check Supabase project is not paused
- Verify IP allowlist in Supabase (should allow all)

**Error**: "Authentication failed"
- Check NEXT_PUBLIC_SUPABASE_URL
- Verify SUPABASE_SERVICE_ROLE_KEY
- Check redirect URLs in Supabase dashboard

### Performance Issues

**Slow page loads**
- Check Vercel Analytics for bottlenecks
- Review database query performance
- Enable caching headers
- Use Vercel Edge Functions for global performance

---

## 📝 Additional Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Supabase Production Checklist**: https://supabase.com/docs/guides/platform/going-into-prod
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Sentry Next.js Guide**: https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

## 🎯 Success Criteria

Deployment is considered successful when:

✅ Application accessible at custom domain with SSL
✅ All E2E tests passing in production
✅ Authentication working correctly
✅ Database operations functional
✅ Monitoring and alerts configured
✅ Uptime >99.9% over first 24 hours
✅ No critical errors in Sentry
✅ Average page load <2 seconds

---

**Next Steps**: After successful deployment, proceed to Task 9.2 (Deployment Pipeline) and Task 9.4 (Go-Live Preparation)
