# 🚀 Deklaro Deployment Guide

Complete guide for deploying Deklaro to production.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup (Supabase)](#database-setup-supabase)
4. [External Services Configuration](#external-services-configuration)
5. [Application Deployment](#application-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Scaling & Optimization](#scaling--optimization)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying Deklaro, ensure you have:

- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] Git installed and repository cloned
- [ ] Supabase account (for production database)
- [ ] Vercel/Railway/DigitalOcean account (for hosting)
- [ ] Domain name (optional but recommended)
- [ ] Production KSeF certificate (for Polish e-invoicing)
- [ ] Stripe account (for payments)
- [ ] Resend account (for emails)
- [ ] Sentry account (for error monitoring)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/deklaro-light.git
cd deklaro-light
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env.production.local
```

---

## Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down:
   - Project URL
   - Anon/Public Key
   - Service Role Key (keep secret!)

### 2. Run Database Migrations

```bash
# Connect to your Supabase project
npx supabase link --project-ref your-project-ref

# Push schema to production
npx supabase db push
```

### 3. Enable Row Level Security (RLS)

Ensure RLS is enabled on all tables:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
```

### 4. Configure Storage Buckets

Create storage buckets for file uploads:

```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('invoices', 'invoices', false),
  ('documents', 'documents', false);

-- Set up RLS policies for storage
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoices');
```

---

## External Services Configuration

### 1. Sentry (Error Monitoring)

1. Create project at [sentry.io](https://sentry.io)
2. Get your DSN
3. Add to environment:

```bash
SENTRY_ENABLED=true
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
```

### 2. Resend (Email)

1. Create account at [resend.com](https://resend.com)
2. Verify your domain
3. Get API key:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 3. OpenAI (Invoice OCR)

1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add to environment:

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

### 4. Stripe (Payments)

See [ADMIN_SETUP.md](./ADMIN_SETUP.md#stripe-configuration) for detailed Stripe setup.

```bash
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Stripe Price IDs (from your Stripe dashboard)
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxxxxxxxxxx
```

### 5. KSeF (Polish e-Invoice System)

See [ADMIN_SETUP.md](./ADMIN_SETUP.md#ksef-certificate-setup) for detailed KSeF setup.

```bash
KSEF_ENVIRONMENT=production
KSEF_USE_CERT_AUTH=true
KSEF_CERT_PATH=/path/to/production/certificate.pfx
KSEF_CERT_PASSWORD=your-certificate-password

# Or use Base64 encoding:
KSEF_CERT_BASE64=MIIKxxx...xxxxx==
```

### 6. Virus Scanning (Optional but Recommended)

**Option A: ClamAV (Self-hosted)**

```bash
VIRUS_SCAN_ENABLED=true
VIRUS_SCAN_PROVIDER=clamav
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
```

Install ClamAV:
```bash
# Ubuntu/Debian
sudo apt-get install clamav clamav-daemon

# macOS
brew install clamav

# Start daemon
sudo systemctl start clamav-daemon
```

**Option B: VirusTotal (Cloud)**

```bash
VIRUS_SCAN_ENABLED=true
VIRUS_SCAN_PROVIDER=virustotal
VIRUSTOTAL_API_KEY=your-virustotal-api-key
```

---

## Application Deployment

### Option 1: Vercel (Recommended)

#### A. Install Vercel CLI

```bash
npm install -g vercel
```

#### B. Configure Project

```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... add all environment variables
```

#### C. Deploy

```bash
# Deploy to production
vercel --prod
```

#### D. Configure Domain

```bash
# Add custom domain
vercel domains add yourdomain.com
```

---

### Option 2: Docker (Self-hosted)

#### A. Build Docker Image

```bash
# Build production image
docker build -t deklaro:latest .

# Or use docker-compose
docker-compose -f docker-compose.prod.yml build
```

#### B. Run Container

```bash
docker run -d \
  --name deklaro \
  -p 3000:3000 \
  --env-file .env.production.local \
  deklaro:latest
```

#### C. Use Docker Compose (Recommended)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env.production.local
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    volumes:
      - redis-data:/data

  clamav:
    image: clamav/clamav:latest
    ports:
      - "3310:3310"
    restart: unless-stopped

volumes:
  redis-data:
```

Run:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

### Option 3: Railway

#### A. Install Railway CLI

```bash
npm install -g @railway/cli
```

#### B. Deploy

```bash
# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL="your-url"
# ... add all variables

# Deploy
railway up
```

---

## Post-Deployment Verification

### 1. Health Check

Verify the application is running:

```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T12:00:00.000Z"
}
```

### 2. Database Connection

Test database connectivity:

```bash
# Check Supabase connection
curl -X POST https://yourdomain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### 3. Run E2E Tests Against Production

```bash
# Set production URL
export PLAYWRIGHT_BASE_URL=https://yourdomain.com

# Run tests (in test mode, not against real production!)
npm run test:e2e
```

### 4. Test Critical Flows

Manually test:
- [ ] User signup/login
- [ ] Invoice upload
- [ ] OCR processing
- [ ] Company management
- [ ] Team invitations
- [ ] Stripe checkout
- [ ] KSeF submission (with test certificate)

### 5. Monitor Error Logs

Check Sentry dashboard for any errors:
```bash
# View recent errors
open https://sentry.io/organizations/your-org/issues/
```

### 6. Performance Testing

Use Lighthouse or similar tools:

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://yourdomain.com --output html --output-path ./lighthouse-report.html
```

---

## Scaling & Optimization

### 1. Migrate to Redis for Rate Limiting

For high traffic, replace in-memory rate limiting with Redis:

**Install Redis:**
```bash
# Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Or use managed Redis (Upstash, Railway, etc.)
```

**Update environment:**
```bash
REDIS_URL=redis://localhost:6379
# Or for managed Redis:
REDIS_URL=redis://:password@host:port
```

**Update rate limiter** (`src/lib/rate-limit/in-memory-store.ts`):
```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function increment(key: string, windowMs: number) {
  const now = Date.now();
  const resetAt = now + windowMs;

  await redis.set(`rl:${key}`, 1, 'PX', windowMs, 'NX');
  const count = await redis.incr(`rl:${key}`);

  return { count, resetAt };
}
```

### 2. Enable CDN for Static Assets

Configure Vercel/Cloudflare CDN:

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn-domain.com'],
  },
  assetPrefix: process.env.CDN_URL,
};
```

### 3. Database Optimization

**Enable Connection Pooling:**
```bash
# Supabase automatically provides pooling
# Use connection pooler URL:
DATABASE_URL=postgresql://postgres.xxxxx:6543/postgres
```

**Add Database Indexes:**
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX idx_companies_nip ON companies(nip);
```

### 4. Monitoring & Alerts

**Set up Sentry Alerts:**
- Configure alert rules for error spikes
- Set up Slack/email notifications
- Monitor performance metrics

**Application Monitoring:**
```bash
# Add custom metrics
import * as Sentry from '@sentry/nextjs';

Sentry.metrics.increment('invoice.uploaded', 1, {
  tags: { tenant_id: tenantId }
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Database connection failed"

**Check:**
- Environment variables are set correctly
- Supabase project is active
- IP whitelist includes your server IP
- Connection string is correct

**Fix:**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

#### 2. "KSeF certificate invalid"

**Check:**
- Certificate file exists and is readable
- Password is correct
- Certificate is not expired
- Using correct environment (test/production)

**Debug:**
```bash
# Check certificate info
openssl pkcs12 -info -in certificate.pfx -nodes
```

#### 3. "Rate limit errors in logs"

**Check:**
- Rate limits are not too restrictive
- Consider migrating to Redis
- Review rate limit presets

**Adjust limits:**
```typescript
// src/lib/rate-limit/limiter.ts
export const RATE_LIMITS = {
  UPLOAD: { limit: 20, window: 15 * 60 * 1000 }, // Increase from 10 to 20
};
```

#### 4. "Stripe webhook failures"

**Check:**
- Webhook endpoint is publicly accessible
- Webhook secret is correct
- Stripe is sending to correct URL

**Test webhook:**
```bash
# Use Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger payment_intent.succeeded
```

#### 5. "Email delivery failures"

**Check:**
- Resend API key is valid
- Sending domain is verified
- Check Resend dashboard for bounce/spam reports

**Debug:**
```bash
# Test email sending
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@yourdomain.com","to":"you@example.com","subject":"Test","html":"<p>Test</p>"}'
```

#### 6. "High memory usage"

**Solutions:**
- Increase server resources
- Enable image optimization
- Implement caching
- Use Redis for sessions

**Monitor:**
```bash
# Check memory usage
docker stats deklaro

# Node.js memory profiling
node --inspect dist/server.js
```

---

## Security Checklist

Before going live:

- [ ] All environment variables are using production values
- [ ] `.env` files are not committed to git
- [ ] HTTPS is enabled (SSL certificate)
- [ ] Database RLS policies are properly configured
- [ ] API rate limiting is active
- [ ] Virus scanning is enabled
- [ ] Sentry error tracking is active
- [ ] Strong admin passwords set
- [ ] Two-factor authentication enabled for admin accounts
- [ ] Regular backups scheduled (Supabase automatic backups)
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using Prisma/Supabase client)
- [ ] XSS protection enabled

---

## Backup & Recovery

### Database Backups

Supabase provides automatic daily backups. To create manual backup:

```bash
# Export database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup-20251027.sql
```

### File Storage Backups

Backup uploaded files from Supabase Storage:

```bash
# Use Supabase CLI
supabase storage download --bucket invoices --download-dir ./backups/invoices/
```

---

## Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review error logs in Sentry
- Check server resource usage
- Monitor rate limit effectiveness

**Monthly:**
- Review and rotate API keys
- Check for dependency updates
- Review and optimize database queries
- Analyze user metrics

**Quarterly:**
- Security audit
- Performance optimization review
- Cost optimization review
- Update documentation

### Getting Help

- **Documentation**: See other guides in `/docs`
- **Issues**: [GitHub Issues](https://github.com/your-org/deklaro-light/issues)
- **Email**: support@yourdomain.com

---

## Additional Resources

- [API Documentation](./API.md)
- [Admin Setup Guide](./ADMIN_SETUP.md)
- [User Guide](./USER_GUIDE.md)
- [Implementation Report](./IMPLEMENTATION_COMPLETE.md)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Docs](https://vercel.com/docs)

---

**Last Updated**: 2025-10-27
**Version**: 1.0.0
