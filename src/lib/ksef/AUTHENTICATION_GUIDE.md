# KSeF Authentication Methods - Complete Guide

This guide explains how to obtain the necessary credentials to authenticate with the KSeF (Krajowy System e-Faktur) API in Poland.

## Authentication Options

KSeF supports **4 authentication methods**:

| Method | Best For | Cost | Setup Time | API Support |
|--------|----------|------|------------|-------------|
| **Profil Zaufany** | Individual/Small Business | FREE | 30 min | ✅ Yes (limited) |
| **Qualified Electronic Signature (QES)** | Individuals | ~150-400 PLN/year | 1-3 days | ✅ Yes |
| **Qualified Electronic Seal** | Companies | ~300-800 PLN/year | 3-5 days | ✅ Yes (recommended) |
| **KSeF Certificate** | KSeF-specific | FREE* | After Nov 1, 2025 | ✅ Yes |

*Requires another authentication method first

---

## Option 1: Profil Zaufany (Trusted Profile) - FREE ⭐

**Best for**: Testing, individual entrepreneurs, small businesses

### What is Profil Zaufany?

Free government-issued digital identity that lets you authenticate to Polish government services, including KSeF.

### How to Get It

#### Method A: Online (Fastest - 30 minutes)

1. **Visit** https://www.gov.pl/web/profilzaufany
2. **Click** "Załóż Profil Zaufany" (Create Trusted Profile)
3. **Provide** your PESEL number and personal data
4. **Confirm** via one of:
   - **Internet banking** (mBank, ING, PKO BP, Santander, etc.) - Instant!
   - **ePUAP** account
   - **Existing qualified signature**

#### Method B: In Person

1. Visit any public office (US, ZUS, NFZ)
2. Bring your ID/passport
3. They'll verify and activate your profile on the spot

### Using Profil Zaufany with KSeF API

⚠️ **Important Limitations**:
- ✅ Works for individual entrepreneurs
- ✅ Works for testing
- ⚠️ Limited for bulk operations
- ⚠️ Not recommended for companies (use QES instead)

**API Integration**:
- Use OAuth 2.0 flow with Profil Zaufany
- Session tokens expire after 1 hour
- Best for manual/small-scale operations

### Step-by-Step Setup (Free)

```bash
1. Create Profil Zaufany account (FREE)
   → https://www.gov.pl/web/profilzaufany

2. Register for KSeF test environment
   → https://ksef-test.mf.gov.pl

3. Login with Profil Zaufany

4. Generate API token in KSeF panel

5. Use token for API authentication
```

---

## Option 2: Qualified Electronic Signature (QES) - For Individuals

**Best for**: Individual entrepreneurs, freelancers, professionals

### What is QES?

A cryptographic signature with legal binding power, issued by certified providers.

### Qualified Certificate Providers in Poland

All 5 providers are government-approved:

| Provider | Website | Price | Notes |
|----------|---------|-------|-------|
| **Certum (Asseco)** | https://sklep.certum.pl | ~150-300 PLN/year | Most popular, good support |
| **KIR (Szafir)** | https://www.elektronicznypodpis.pl | ~200-400 PLN/year | Bank integration |
| **EuroCert** | https://eurocert.pl | ~180-350 PLN/year | English support |
| **PWPW** | https://www.pwpw.pl | ~250-400 PLN/year | Government printer |
| **Cencert** | https://www.cencert.pl | ~200-380 PLN/year | Professional focus |

### How to Get QES

#### Step 1: Choose Provider

I recommend **Certum** or **EuroCert** for best API integration support.

#### Step 2: Order Certificate

1. Visit provider's website
2. Choose "Qualified Electronic Signature" (not simple signature!)
3. Select validity period: 1 year or 2 years
4. Purchase (~150-400 PLN)

#### Step 3: Identity Verification

**Option A: Video Verification** (Fastest - same day)
- Most providers now offer video verification
- Prepare: ID/passport + good internet connection
- Schedule appointment (usually available same day)
- 15-minute video call to verify identity

**Option B: In-Person Verification**
- Visit certification center
- Bring original ID/passport
- Complete verification on-site

#### Step 4: Receive Certificate

- Download `.pfx` or `.p12` file (contains your private key)
- **IMPORTANT**: Save the password securely!
- Install on your computer/server

### Using QES with KSeF API

```typescript
// Example implementation (simplified)
import fs from 'fs';
import forge from 'node-forge';

// Load certificate
const pfxData = fs.readFileSync('path/to/certificate.pfx');
const pfxAsn1 = forge.asn1.fromDer(pfxData.toString('binary'));
const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, 'your-password');

// Get private key
const privateKey = pfx.getBags({
  bagType: forge.pki.oids.pkcs8ShroudedKeyBag
})[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;

// Sign XML request
const signedXml = signXmlWithCertificate(requestXml, privateKey);
```

---

## Option 3: Qualified Electronic Seal - For Companies ⭐ RECOMMENDED

**Best for**: Companies, organizations, high-volume operations

### What is Qualified Electronic Seal?

Like QES but for organizations/companies (not individuals). This is **RECOMMENDED** for production KSeF API integration.

### Differences from QES

| Feature | QES (Personal) | Seal (Company) |
|---------|----------------|----------------|
| Owner | Individual person | Company/Organization |
| NIP | Personal tax ID | Company NIP |
| API Use | Limited | Full support |
| Cost | ~150-400 PLN/year | ~300-800 PLN/year |

### How to Get Qualified Seal

#### Step 1: Prepare Documents

You need:
- ✅ KRS extract (for companies) or CEIDG confirmation (for sole traders)
- ✅ Company NIP
- ✅ ID of authorized representative
- ✅ Power of attorney (if representative ≠ company president)

#### Step 2: Order from Provider

Same providers as QES:
- **Certum**: https://sklep.certum.pl/certum-commercial-eseal
- **EuroCert**: https://eurocert.pl/pieczec-kwalifikowana/
- **Others**: Check their corporate/business sections

#### Step 3: Company Verification

1. Provider verifies company in KRS/CEIDG registry
2. Verifies authorized representative identity (video or in-person)
3. Issues seal certificate to company

#### Step 4: Receive Certificate

- Download company seal certificate (`.pfx`/`.p12`)
- Store securely (this represents your company!)
- Install on production servers

### Production Setup

```typescript
// Environment variables
KSEF_ENVIRONMENT=production
KSEF_SEAL_PATH=/secure/path/company-seal.pfx
KSEF_SEAL_PASSWORD=secure-password
KSEF_COMPANY_NIP=1234567890

// Load in code
const sealCert = await loadQualifiedSeal(
  process.env.KSEF_SEAL_PATH,
  process.env.KSEF_SEAL_PASSWORD
);
```

---

## Option 4: KSeF Certificate - FREE (Available from Nov 1, 2025)

**Best for**: KSeF-specific operations, after initial setup

### What is KSeF Certificate?

Free certificate issued by KSeF itself, specifically for invoice operations.

### Requirements

⚠️ To get a KSeF certificate, you **MUST first authenticate** with one of:
- Profil Zaufany
- Qualified Electronic Signature
- Qualified Electronic Seal

### How to Get It

**Available from**: November 1, 2025

1. Login to KSeF with existing authentication method
2. Navigate to certificate management
3. Request KSeF certificate
4. Choose validity period (up to 2 years)
5. Download certificate

### Benefits

- ✅ FREE
- ✅ Specifically designed for KSeF
- ✅ Can be used instead of QES/Seal for invoice operations
- ✅ Renewable every 2 years

---

## Recommended Path for Your Application

### For Development/Testing (Now)

```
1. Create Profil Zaufany (FREE, 30 min)
   ↓
2. Access KSeF Test Environment
   ↓
3. Generate test API tokens
   ↓
4. Develop and test integration
```

### For Production (Before Feb 2026)

```
1. Order Qualified Seal (~300-800 PLN)
   ↓
2. Complete company verification (3-5 days)
   ↓
3. Implement certificate-based authentication
   ↓
4. Test in Demo environment
   ↓
5. Deploy to Production
   ↓
6. Optional: Generate KSeF Certificate for ongoing use
```

---

## Quick Start Guide

### Immediate Testing (Today)

1. **Get Profil Zaufany** (30 minutes, FREE)
   - Visit: https://www.gov.pl/web/profilzaufany
   - Confirm via your bank's online banking

2. **Access KSeF Test**
   - Visit: https://ksef-test.mf.gov.pl
   - Login with Profil Zaufany
   - Use ANY company NIP for testing (e.g., 0000000000)

3. **Generate Test Token**
   - In KSeF panel → API section
   - Generate authorization token
   - Copy for use in API calls

4. **Test API Integration**
   - Use token for authentication
   - Submit test invoices
   - Verify flow works

### Production Preparation (2-4 weeks)

1. **Order Qualified Seal** (Week 1)
   - Choose provider (recommend Certum or EuroCert)
   - Purchase company seal
   - Cost: ~300-800 PLN/year

2. **Complete Verification** (Week 1-2)
   - Schedule video verification
   - Or visit certification center
   - Provide company documents

3. **Implement Real Authentication** (Week 2-3)
   - Replace mock code with real certificate handling
   - Implement XML signing
   - Test in Demo environment

4. **Go Live** (Week 4)
   - Switch to production environment
   - Monitor first submissions
   - Generate KSeF certificate for ongoing use

---

## Cost Summary

| Phase | Method | Cost | Timeline |
|-------|--------|------|----------|
| **Testing** | Profil Zaufany | FREE | 30 min |
| **Production** | Qualified Seal | 300-800 PLN/year | 3-5 days |
| **Long-term** | KSeF Certificate | FREE | After setup |

**Total Investment**: ~300-800 PLN/year + implementation time

---

## Support & Resources

### Official KSeF Support
- **Website**: https://ksef.podatki.gov.pl/formularz/
- **Hours**: Mon-Fri, 7:00 AM - 7:00 PM CET
- **Email**: Via online form

### Certificate Provider Support
- **Certum**: https://www.certum.pl/support
- **EuroCert**: https://eurocert.pl/en/contact/

### Developer Resources
- **API Documentation**: https://www.ksef.dev/api/
- **Sample Code**: https://github.com/ksef4dev/sample-requests
- **Community**: Polish developer forums (4programmers.net)

---

## Recommended Next Steps

1. ✅ **Today**: Create Profil Zaufany account
2. ✅ **This Week**: Access KSeF test environment and generate test token
3. ✅ **This Month**: Order Qualified Seal from Certum or EuroCert
4. ✅ **Next Month**: Implement real certificate-based authentication
5. ✅ **Before Feb 2026**: Go live with production integration

---

**Questions?** The KSeF technical support team is very helpful - don't hesitate to use the online support form!
