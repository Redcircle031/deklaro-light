# 🔧 Deklaro Admin Setup Guide

Administrator guide for configuring KSeF certificates, Stripe payments, and other critical services.

---

## 📋 Table of Contents

1. [KSeF Certificate Setup](#ksef-certificate-setup)
2. [Stripe Configuration](#stripe-configuration)
3. [Email Service Setup](#email-service-setup)
4. [Virus Scanning Configuration](#virus-scanning-configuration)
5. [Error Monitoring](#error-monitoring)
6. [Security Configuration](#security-configuration)
7. [Backup & Recovery](#backup--recovery)

---

## KSeF Certificate Setup

### Overview

KSeF (Krajowy System e-Faktur) requires certificate-based authentication for production. This guide covers obtaining, installing, and configuring your production certificate.

### Obtaining Production Certificate

#### 1. Apply for Certificate

Contact Polish Ministry of Finance or authorized certificate authority:
- Visit: [https://www.gov.pl/web/kas/ksef](https://www.gov.pl/web/kas/ksef)
- Navigate to "Certificates" section
- Apply for production certificate
- Provide required business documentation

**Requirements:**
- Valid NIP (Polish Tax ID)
- Company registration documents
- Authorized signatory documentation

#### 2. Receive Certificate

You'll receive:
- `.pfx` or `.p12` certificate file
- Certificate password
- Validity dates
- Installation instructions

### Installing Certificate

#### Option 1: File-Based (Recommended for Development)

1. **Copy certificate to secure location:**
```bash
mkdir -p /etc/deklaro/certificates
cp your-certificate.pfx /etc/deklaro/certificates/ksef-prod.pfx
chmod 600 /etc/deklaro/certificates/ksef-prod.pfx
```

2. **Set environment variables:**
```bash
# .env.production.local
KSEF_ENVIRONMENT=production
KSEF_USE_CERT_AUTH=true
KSEF_CERT_PATH=/etc/deklaro/certificates/ksef-prod.pfx
KSEF_CERT_PASSWORD=your-certificate-password
```

#### Option 2: Base64 Encoding (Recommended for Production/Docker)

1. **Convert certificate to Base64:**
```bash
cat ksef-prod.pfx | base64 -w 0 > ksef-cert-base64.txt
```

2. **Set environment variable:**
```bash
# .env.production.local
KSEF_ENVIRONMENT=production
KSEF_USE_CERT_AUTH=true
KSEF_CERT_BASE64="<paste base64 string here>"
KSEF_CERT_PASSWORD=your-certificate-password
```

**Advantages of Base64:**
- No file system dependencies
- Works in container environments
- Easier for cloud deployments (Vercel, Railway, etc.)
- Can store in environment secrets

### Verifying Certificate

#### 1. Check Certificate Details

```bash
# Extract certificate info
openssl pkcs12 -info -in ksef-prod.pfx -nodes -passin pass:your-password

# View certificate
openssl pkcs12 -in ksef-prod.pfx -clcerts -nokeys -passin pass:your-password | openssl x509 -noout -text
```

**Check:**
- Subject: Should match your company NIP
- Issuer: Should be recognized authority
- Valid From/To: Should be current
- Key Usage: Should include Digital Signature

#### 2. Test Certificate in Application

```bash
# Start application
npm run dev

# Check logs for certificate loading
# Should see: "✅ KSeF certificate loaded successfully"
# Should NOT see: "❌ Certificate loading failed"
```

#### 3. Test KSeF Authentication

```bash
# Make test API call
curl -X POST http://localhost:4000/api/invoices/ksef/authenticate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-deklaro-tenant-id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"nip":"1234567890"}'

# Expected response:
# {"success":true,"session_token":"...","expires_at":"..."}
```

### Certificate Renewal

**Certificate Expiration Warning:**
- Application logs warning 30 days before expiration
- Check Sentry for alerts
- Plan renewal in advance

**Renewal Process:**
1. Apply for new certificate before expiration
2. Receive new certificate file
3. Update environment variables with new file/password
4. Restart application
5. Verify in logs: "New certificate loaded"

**Zero-Downtime Renewal:**
```bash
# 1. Update env vars with new certificate
# 2. Reload application (depends on platform)

# Docker:
docker-compose restart app

# Vercel:
vercel env add KSEF_CERT_BASE64 production
vercel --prod

# Railway:
railway variables set KSEF_CERT_BASE64="..."
railway up
```

### Troubleshooting

#### "Certificate loading failed"

**Causes:**
- File path incorrect
- Password incorrect
- File corrupted
- Permissions issue

**Debug:**
```bash
# Check file exists
ls -la /etc/deklaro/certificates/ksef-prod.pfx

# Test password
openssl pkcs12 -info -in ksef-prod.pfx -passin pass:YOUR_PASSWORD

# Check file permissions
# Should be 600 or 400
```

#### "Certificate expired"

**Solution:**
```bash
# Check expiration
openssl pkcs12 -in ksef-prod.pfx -passin pass:PASSWORD -nokeys | \
  openssl x509 -noout -enddate

# If expired, renew immediately
```

#### "Authentication failed"

**Checks:**
1. Certificate matches NIP in request
2. Certificate is for correct environment (prod vs test)
3. Certificate not expired
4. KSeF system is operational

**Test KSeF availability:**
```bash
curl https://ksef.mf.gov.pl/api/online/Session/Status
```

---

## Stripe Configuration

### Creating Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Sign up for account
3. Complete business verification
4. Enable payment methods for your country

### Getting API Keys

#### 1. Access Stripe Dashboard

1. Log in to Stripe Dashboard
2. Click "Developers" in left menu
3. Click "API keys"

#### 2. Get Keys

**Test Keys** (for development):
```
Publishable key: pk_test_xxxxxxxxxxxxx
Secret key: sk_test_xxxxxxxxxxxxx
```

**Live Keys** (for production):
```
Publishable key: pk_live_xxxxxxxxxxxxx
Secret key: sk_live_xxxxxxxxxxxxx
```

**⚠️ NEVER commit secret keys to git!**

### Setting Up Products & Prices

#### 1. Create Products

Go to **Products** → **Add product**

**Pro Plan:**
- Name: "Deklaro Pro"
- Description: "500 invoices/month, 5GB storage, 5 users"
- Pricing: $99/month
- Billing: Recurring monthly
- Copy Price ID: `price_xxxPRO`

**Enterprise Plan:**
- Name: "Deklaro Enterprise"
- Description: "Unlimited invoices, storage, and users"
- Pricing: $299/month
- Billing: Recurring monthly
- Copy Price ID: `price_xxxENTERPRISE`

#### 2. Configure Environment Variables

```bash
# .env.production.local

# Stripe Keys
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx

# Price IDs (from Products page)
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxxxxxxxxxx

# Webhook Secret (from webhook configuration)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Configuring Webhooks

#### 1. Create Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click "Add endpoint"
3. Enter endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"

#### 2. Get Webhook Signing Secret

1. Click on created webhook
2. Click "Signing secret" → "Reveal"
3. Copy the secret: `whsec_xxxxxxxxxxxxx`
4. Add to environment variables

#### 3. Test Webhook

Using Stripe CLI:
```bash
# Install Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/vX.X.X/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:4000/api/stripe/webhook

# Trigger test event
stripe trigger customer.subscription.created
```

### Testing Payment Flow

#### 1. Use Test Cards

Stripe provides test cards:

**Successful Payment:**
```
Card: 4242 4242 4242 4242
Exp: Any future date
CVC: Any 3 digits
ZIP: Any valid code
```

**Payment Requires Authentication:**
```
Card: 4000 0025 0000 3155
```

**Declined Card:**
```
Card: 4000 0000 0000 0002
```

**Full list:** [stripe.com/docs/testing](https://stripe.com/docs/testing)

#### 2. Test Subscription Flow

1. Go to your app's pricing page
2. Click "Upgrade to Pro"
3. Use test card 4242 4242 4242 4242
4. Complete checkout
5. Verify:
   - Redirected back to app
   - Subscription shows as active
   - Limits updated

#### 3. Test Customer Portal

1. Go to Billing settings in app
2. Click "Manage Billing"
3. Opens Stripe Customer Portal
4. Verify can:
   - Update payment method
   - View invoices
   - Cancel subscription

### Going Live

#### 1. Activate Your Account

1. Complete Stripe business verification
2. Add bank account for payouts
3. Configure tax settings
4. Set up fraud prevention rules

#### 2. Switch to Live Keys

Replace test keys with live keys in production environment:

```bash
# Production environment variables
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
```

#### 3. Update Webhook

1. Create new webhook for production URL
2. Update `STRIPE_WEBHOOK_SECRET`
3. Test with live mode in Stripe dashboard

#### 4. Enable Payment Methods

In Stripe Dashboard:
- Enable credit/debit cards
- Enable additional payment methods (if desired):
  - Apple Pay
  - Google Pay
  - Bank transfers

### Monitoring & Alerts

#### Set Up Stripe Alerts

1. Go to **Settings** → **Business settings** → **Notifications**
2. Enable alerts for:
   - Failed payments
   - Successful payments
   - Disputes
   - Refunds

#### Monitor in Sentry

Stripe errors are automatically tracked in Sentry:
- View under "Stripe" tag
- Set up alert rules
- Monitor error rates

---

## Email Service Setup

### Resend Configuration

#### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for account
3. Verify email address

#### 2. Add Sending Domain

1. Go to **Domains** → **Add Domain**
2. Enter your domain (e.g., `yourdomain.com`)
3. Add DNS records:

```
# SPF Record
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all

# DKIM Record
Type: TXT
Name: resend._domainkey
Value: [provided by Resend]

# DMARC Record (optional but recommended)
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

4. Wait for verification (can take up to 48 hours)

#### 3. Get API Key

1. Go to **API Keys**
2. Click "Create API Key"
3. Name: "Production"
4. Copy key: `re_xxxxxxxxxxxxx`

#### 4. Configure Environment

```bash
# .env.production.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

#### 5. Test Email Sending

```bash
# Test with curl
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@yourdomain.com",
    "to": "your-email@example.com",
    "subject": "Test Email",
    "html": "<p>This is a test email from Deklaro</p>"
  }'
```

### Email Templates

Templates are in `src/lib/email/`:
- `invitations.ts` - Team invitation emails

**Customizing Templates:**
1. Edit template file
2. Update HTML/CSS
3. Test with development mode
4. Deploy changes

---

## Virus Scanning Configuration

### Option 1: ClamAV (Self-Hosted)

#### Installation

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install clamav clamav-daemon
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

**macOS:**
```bash
brew install clamav
brew services start clamav
```

**Docker:**
```yaml
# docker-compose.yml
services:
  clamav:
    image: clamav/clamav:latest
    ports:
      - "3310:3310"
    restart: unless-stopped
    volumes:
      - clamav-data:/var/lib/clamav

volumes:
  clamav-data:
```

#### Configuration

```bash
# .env.production.local
VIRUS_SCAN_ENABLED=true
VIRUS_SCAN_PROVIDER=clamav
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
```

#### Testing

```bash
# Test ClamAV connection
clamdscan --ping

# Scan test file
echo "X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*" > /tmp/eicar.txt
clamdscan /tmp/eicar.txt

# Should detect: Eicar-Test-Signature
```

### Option 2: VirusTotal (Cloud)

#### 1. Create Account

1. Go to [virustotal.com](https://www.virustotal.com)
2. Create free account
3. Upgrade to paid plan for production

#### 2. Get API Key

1. Go to Profile → API Key
2. Copy key

#### 3. Configure

```bash
# .env.production.local
VIRUS_SCAN_ENABLED=true
VIRUS_SCAN_PROVIDER=virustotal
VIRUSTOTAL_API_KEY=your-api-key-here
```

**Rate Limits:**
- Free: 4 requests/minute
- Premium: 1000 requests/minute

### Disabling Virus Scanning (Not Recommended)

```bash
# .env.production.local
VIRUS_SCAN_ENABLED=false
```

**⚠️ Warning:** Only disable for testing. Production should always have virus scanning enabled.

---

## Error Monitoring

### Sentry Setup

#### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Create account / login
3. Click "Create Project"
4. Select "Next.js"
5. Name: "Deklaro Production"
6. Copy DSN

#### 2. Configure Environment

```bash
# .env.production.local
SENTRY_ENABLED=true
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
```

#### 3. Test Error Tracking

```javascript
// Trigger test error
import * as Sentry from '@sentry/nextjs';

Sentry.captureException(new Error('Test error from Deklaro'));
```

Check Sentry dashboard for error.

#### 4. Configure Alerts

1. Go to project → Alerts
2. Create alert rules:
   - Error rate spike
   - New error types
   - Performance degradation
3. Configure notifications (email, Slack)

---

## Security Configuration

### SSL/TLS Certificate

**Vercel/Railway:** Automatic HTTPS
**Self-hosted:** Use Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Security Headers

Configure in `next.config.js`:

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  }
};
```

### Environment Variables Security

**Never commit:**
- API keys
- Database passwords
- Certificate passwords
- JWT secrets

**Use environment secrets:**
- Vercel: `vercel env add`
- Railway: `railway variables set`
- Docker: Use `.env.production.local` (gitignored)

---

## Backup & Recovery

### Database Backups

**Supabase:** Automatic daily backups

**Manual backup:**
```bash
# Export database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Compress
gzip backup-$(date +%Y%m%d).sql

# Upload to S3/cloud storage
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://your-bucket/backups/
```

### File Storage Backups

```bash
# Backup Supabase storage
supabase storage download --bucket invoices --download-dir ./backups/invoices/

# Sync to cloud storage
rclone sync ./backups/ remote:deklaro-backups/
```

### Automated Backups

Create cron job:

```bash
# /etc/cron.daily/deklaro-backup.sh
#!/bin/bash
set -e

# Backup database
pg_dump $DATABASE_URL | gzip > /backups/db-$(date +%Y%m%d).sql.gz

# Backup storage
supabase storage download --bucket invoices --download-dir /backups/invoices/

# Upload to S3
aws s3 sync /backups/ s3://your-bucket/deklaro-backups/

# Keep only last 30 days locally
find /backups/ -type f -mtime +30 -delete

# Success notification
echo "Backup completed successfully" | mail -s "Deklaro Backup Success" admin@yourdomain.com
```

Make executable:
```bash
chmod +x /etc/cron.daily/deklaro-backup.sh
```

---

## Checklist

### Pre-Production Checklist

- [ ] KSeF production certificate installed and tested
- [ ] Stripe live keys configured
- [ ] Stripe webhook active and tested
- [ ] Resend domain verified
- [ ] Email templates tested
- [ ] Virus scanning enabled and tested
- [ ] Sentry error tracking configured
- [ ] SSL certificate active
- [ ] Security headers configured
- [ ] Database backups scheduled
- [ ] Storage backups scheduled
- [ ] All environment variables set
- [ ] Rate limiting tested
- [ ] Performance testing completed
- [ ] Security audit completed

### Post-Deployment Checklist

- [ ] All services responding
- [ ] Error monitoring active
- [ ] Email delivery working
- [ ] Payment flow tested
- [ ] KSeF submissions working
- [ ] Backups running
- [ ] Alerts configured
- [ ] Team notified
- [ ] Documentation updated

---

## Support

For technical support:
- **Email**: admin@yourdomain.com
- **Issues**: [GitHub Issues](https://github.com/your-org/deklaro-light/issues)
- **Documentation**: See other guides in repo

---

**Last Updated**: 2025-10-27
**Version**: 1.0.0
