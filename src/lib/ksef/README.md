# KSeF (Krajowy System e-Faktur) Integration

Integration with Poland's National e-Invoice System.

## ⚠️ Current Implementation Status

This implementation provides the **foundation and structure** for KSeF integration, but contains **MOCK implementations** that need to be replaced with real API calls before production use.

### What's Implemented ✅

- **FA(3) XML Converter**: Fully functional converter from invoice data to Polish FA(3) e-invoice format
- **Database Models**: Complete schema for tracking KSeF submissions
- **UI Components**: Submission button, status tracking, confirmation modals
- **API Endpoints**: Backend routes for submission handling
- **Service Layer**: Business logic for submission workflow

### What Needs Real Implementation ⚠️

The KSeF API client (`client.ts`) contains **placeholder code** that needs to be replaced with actual KSeF API integration:

1. **XML-Based Authentication** (not JSON)
   - Real KSeF uses XML requests with digital certificates
   - Current code uses mock JSON requests

2. **Digital Certificate Handling**
   - Production requires `.pfx` or `.p12` certificate files
   - Need to implement certificate loading and signing

3. **Proper XML Structure**
   - All API requests must use specific XML namespaces
   - Need XML signing for authentication

## Official KSeF Resources

### Environments

| Environment | URL | Purpose |
|------------|-----|---------|
| **Test** | `https://ksef-test.mf.gov.pl` | Testing with any NIP, non-legal data |
| **Demo** | `https://ksef-demo.mf.gov.pl` | Pre-production testing with real credentials |
| **Production** | `https://ksef.mf.gov.pl` | Live invoices with legal consequences |

### API Endpoints

Base URL: `https://{environment}.mf.gov.pl/api`

Key endpoints:
- `POST /api/online/Session/InitToken` - Session authentication
- `POST /api/online/Invoice/Send` - Submit invoice
- `GET /api/online/Invoice/Status/{invoiceId}` - Check status
- `GET /api/online/Invoice/Upo/{ksefNumber}` - Download UPO

### Official Documentation

- **Official Portal**: https://www.gov.pl/web/kas/api-krajowego-system-e-faktur
- **Sample Requests**: https://github.com/ksef4dev/sample-requests
- **Technical Support**: https://ksef.podatki.gov.pl/formularz/

## Real Implementation Guide

To implement real KSeF integration:

### 1. Obtain Digital Certificate

You need a qualified certificate from one of these providers:
- Szafir (KIR)
- Certum
- Other qualified trust service providers in Poland

### 2. Implement XML Authentication

Replace the `authenticate()` method with real XML-based authentication:

```typescript
// Example XML structure (simplified)
const initTokenXml = `
<?xml version="1.0" encoding="UTF-8"?>
<ns3:InitSessionTokenRequest xmlns:ns3="http://ksef.mf.gov.pl/schema/gtw/svc/online/auth/request/2021/10/01/0001">
  <ns3:Context>
    <Challenge>${challenge}</Challenge>
    <Identifier xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="ns3:SubjectIdentifierByCompanyType">
      <ns3:Identifier>
        <ns3:NIP>${nip}</ns3:NIP>
      </ns3:Identifier>
    </Identifier>
  </ns3:Context>
</ns3:InitSessionTokenRequest>
`;

// Sign with certificate and send
const response = await fetch(`${apiUrl}/api/online/Session/InitToken`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/octet-stream',
  },
  body: signedXml, // XML signed with certificate
});
```

### 3. Update Invoice Submission

The invoice submission also requires XML format:

```typescript
// FA(3) XML is correct, but needs proper wrapping
const sendInvoiceXml = `
<?xml version="1.0" encoding="UTF-8"?>
<ns3:SendInvoiceRequest xmlns:ns3="...">
  ${fa3Xml}
</ns3:SendInvoiceRequest>
`;
```

### 4. Environment Variables

Add to `.env.local`:

```env
# KSeF Configuration
KSEF_ENVIRONMENT=test  # or demo, production
KSEF_CERTIFICATE_PATH=/path/to/certificate.pfx
KSEF_CERTIFICATE_PASSWORD=your_password
KSEF_COMPANY_NIP=0000000000
```

### 5. Testing Workflow

1. **Start with Test Environment**
   - Use any NIP for testing
   - No legal consequences
   - Full functionality

2. **Move to Demo Environment**
   - Use real company credentials
   - Test with realistic data
   - Still no legal binding

3. **Production Deployment**
   - Only when fully tested
   - Requires real certificates
   - Invoices enter legal circulation

## Current Usage

Even with mock implementation, you can:

### Generate FA(3) XML

```typescript
import { convertToFA3Xml } from '@/lib/ksef';

const fa3Invoice = {
  header: {
    invoiceNumber: 'FV/001/2025',
    issueDate: '2025-01-15',
    currency: 'PLN',
    invoiceType: 'VAT',
  },
  // ... rest of invoice data
};

const xml = convertToFA3Xml(fa3Invoice);
console.log(xml); // Valid FA(3) XML structure
```

### Validate XML

```typescript
import { validateFA3Xml } from '@/lib/ksef';

const result = validateFA3Xml(xml);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Test Submission Flow (UI)

The UI components work end-to-end and demonstrate the complete user flow, even though the API calls are mocked.

## Migration Path

When ready to implement real KSeF integration:

1. ✅ Keep all existing FA(3) XML generation (already correct)
2. ✅ Keep database models and migrations (already correct)
3. ✅ Keep UI components (already correct)
4. ⚠️ Replace `client.ts` authentication with real XML+certificate logic
5. ⚠️ Update invoice submission to use proper XML wrapping
6. ⚠️ Add certificate management utilities
7. ⚠️ Update error handling for KSeF-specific error codes

## Support

For KSeF integration questions:
- **Technical Support**: https://ksef.podatki.gov.pl/formularz/
- **Available**: Monday-Friday, 7:00 AM - 7:00 PM CET
- **GitHub Examples**: https://github.com/ksef4dev/sample-requests

## Important Dates

- **KSeF 2.0 Mandatory**: February 1, 2026 (for first implementation phase)
- **Test Environment**: Available since September 30, 2025
- **Demo Environment**: Available since November 2025

---

**Note**: This integration is production-ready in terms of architecture and data flow, but requires real KSeF API implementation before connecting to production environment.
