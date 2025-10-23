# KSeF Production Deployment Checklist

**Status**: Mock Implementation Complete - Ready for Production Integration
**Last Updated**: 2025-01-19
**Mandatory Deadline**: February 1, 2026 (for large companies)

---

## 📋 Pre-Deployment Checklist

### Phase 1: Authentication Setup (Week 1-2)

#### ✅ Immediate Actions (Can Do Today)

- [ ] **Create Profil Zaufany Account** (FREE, 30 min)
  - Visit: https://www.gov.pl/web/profilzaufany
  - Verify via online banking (mBank, ING, PKO BP, etc.)
  - Save login credentials securely
  - **Purpose**: Testing and initial access

- [ ] **Access KSeF Test Environment**
  - Visit: https://ksef-test.mf.gov.pl
  - Login with Profil Zaufany
  - Explore the interface
  - Generate test API token

- [ ] **Test Current Implementation**
  - Use test token with current mock implementation
  - Verify UI flow works end-to-end
  - Test FA(3) XML generation with sample data
  - Validate XML output

#### 📦 Certificate Procurement (Week 2-3)

- [ ] **Choose Certificate Provider**
  - **Recommended**: Certum or EuroCert
  - Compare prices and support options
  - Check for any corporate discounts

- [ ] **Gather Required Documents**
  - [ ] Company KRS extract (from https://ekrs.ms.gov.pl/)
  - [ ] Company NIP number
  - [ ] ID of authorized representative
  - [ ] Power of attorney (if needed)
  - [ ] Proof of company address

- [ ] **Order Qualified Electronic Seal**
  - Provider: _______________ (Certum/EuroCert/Other)
  - Order date: _______________
  - Expected delivery: _______________
  - Cost: _______________ PLN/year
  - Certificate password: _______________ (SECURE!)

- [ ] **Complete Identity Verification**
  - Method chosen: [ ] Video verification [ ] In-person
  - Verification date: _______________
  - Verification status: _______________

- [ ] **Receive and Store Certificate**
  - Download `.pfx` or `.p12` file
  - Store in secure location: _______________
  - Backup certificate to: _______________
  - Document password location: _______________
  - Test certificate can be loaded successfully

---

### Phase 2: Technical Implementation (Week 3-4)

#### 🔧 Code Changes Required

- [ ] **Install Required Dependencies**
  ```bash
  npm install node-forge xmldsigjs @xmldom/xmldom
  ```

- [ ] **Create Certificate Loading Utility**
  - Location: `src/lib/ksef/certificate-loader.ts`
  - Features needed:
    - Load `.pfx`/`.p12` from secure storage
    - Parse certificate with password
    - Extract private key
    - Cache for session

- [ ] **Implement XML Signing**
  - Location: `src/lib/ksef/xml-signer.ts`
  - Requirements:
    - Sign XML with certificate
    - Add proper namespaces
    - Validate signature

- [ ] **Update KSeF Client Authentication**
  - File: `src/lib/ksef/client.ts`
  - Replace `authenticate()` method (currently line 62-85)
  - Change from JSON to XML requests
  - Implement proper InitSessionTokenRequest XML
  - Add certificate signing
  - Handle XML responses

- [ ] **Update Invoice Submission**
  - File: `src/lib/ksef/client.ts`
  - Update `submitInvoice()` method (line 94-124)
  - Wrap FA(3) XML in SendInvoiceRequest envelope
  - Sign entire request
  - Parse XML response

- [ ] **Environment Configuration**
  - Add to `.env.production`:
    ```env
    KSEF_ENVIRONMENT=production
    KSEF_CERTIFICATE_PATH=/path/to/company-seal.pfx
    KSEF_CERTIFICATE_PASSWORD=your_secure_password
    KSEF_COMPANY_NIP=your_company_nip
    ```
  - Secure certificate file permissions (600)
  - Use environment variable encryption

#### 🧪 Testing Implementation

- [ ] **Test in Demo Environment**
  - Change environment to `demo`
  - Test authentication with real certificate
  - Submit test invoices
  - Verify status checking
  - Download UPO documents
  - Test error scenarios

- [ ] **Integration Tests**
  - Create test suite: `tests/integration/ksef-real.test.ts`
  - Test authentication flow
  - Test invoice submission
  - Test status checking
  - Test UPO download
  - Test session expiry handling
  - Test retry logic

- [ ] **Load Testing**
  - Test multiple concurrent submissions
  - Verify rate limiting handling
  - Test session token reuse
  - Monitor performance metrics

---

### Phase 3: Database & Infrastructure (Week 4)

#### 💾 Database Configuration

- [ ] **Tenant NIP Storage**
  - Add `nip` field to Tenant model if not exists
  - Migrate existing tenants
  - Add validation for NIP format (10 digits)
  - Create UI for NIP management

- [ ] **Verify Schema**
  - Ensure `KSeFSubmission` table exists
  - Check indexes on `tenantId` and `ksefNumber`
  - Verify `AuditLog` captures KSeF events

- [ ] **Storage for Certificates**
  - Where to store company certificates?
    - Option A: File system (encrypted)
    - Option B: Database (encrypted)
    - Option C: Secret management service (AWS Secrets Manager, etc.)
  - Implement encryption at rest
  - Document access procedures

#### 🔐 Security Measures

- [ ] **Certificate Security**
  - Encrypt certificate files
  - Restrict file system permissions
  - Never commit certificates to git
  - Add to `.gitignore`:
    ```
    *.pfx
    *.p12
    certificates/
    ```

- [ ] **Environment Variables**
  - Use secret management for production
  - Rotate passwords annually
  - Document password recovery process
  - Create backup certificate

- [ ] **Access Control**
  - Limit who can trigger KSeF submissions
  - Require approval before submission
  - Log all KSeF operations to audit log
  - Implement role-based permissions

---

### Phase 4: Deployment Preparation (Week 5)

#### 📚 Documentation

- [ ] **Update API Documentation**
  - Document new environment variables
  - Certificate installation guide
  - Troubleshooting common errors
  - Emergency contact procedures

- [ ] **Create Runbook**
  - How to renew certificate
  - How to handle certificate expiry
  - How to rotate passwords
  - Emergency KSeF access procedures

- [ ] **User Training Materials**
  - How to approve invoices for KSeF
  - What happens after submission
  - How to access UPO documents
  - Common error messages

#### 🚀 Deployment Plan

- [ ] **Staging Environment**
  - Deploy to staging
  - Use demo KSeF environment
  - Run full test suite
  - Verify all integrations

- [ ] **Production Deployment**
  - Schedule deployment window: _______________
  - Backup database before deployment
  - Deploy code changes
  - Install production certificate
  - Configure environment variables
  - Smoke test authentication
  - Monitor for 24 hours

- [ ] **Rollback Plan**
  - How to disable KSeF integration
  - How to revert to manual process
  - Communication plan for users
  - Support escalation contacts

---

### Phase 5: Go-Live (Week 6)

#### ✅ Pre-Launch Checklist

- [ ] **Final Verification**
  - Authenticate successfully in production
  - Submit one test invoice
  - Verify status checking works
  - Download UPO successfully
  - Check audit logs

- [ ] **Monitoring Setup**
  - Set up alerts for submission failures
  - Monitor KSeF API response times
  - Track certificate expiry (alert 30 days before)
  - Dashboard for KSeF submission status

- [ ] **Support Preparation**
  - Train support team
  - Create FAQ document
  - Test error scenarios
  - Document escalation path

#### 🎯 Launch Day

- [ ] **Morning Checks**
  - Verify all systems operational
  - Check KSeF API status
  - Confirm monitoring active
  - Team ready for support

- [ ] **Initial Submissions**
  - Start with small batch (5-10 invoices)
  - Monitor closely
  - Verify UPO receipts received
  - Check for any errors

- [ ] **Full Rollout**
  - Enable for all users
  - Monitor submission volume
  - Track success/failure rates
  - Respond to user feedback

---

## 📝 Code Files to Modify

### Priority 1: Critical (Must Change)

| File | Current Status | Action Required |
|------|---------------|-----------------|
| `src/lib/ksef/client.ts` | Mock JSON implementation | Replace with XML + certificate signing |
| `.env.production` | Not configured | Add KSeF credentials |
| `prisma/schema.prisma` | Missing tenant NIP | Add if not present |

### Priority 2: New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/ksef/certificate-loader.ts` | Load and parse certificates |
| `src/lib/ksef/xml-signer.ts` | Sign XML with certificate |
| `src/lib/ksef/xml-validator.ts` | Validate signed XML |
| `tests/integration/ksef-real.test.ts` | Real API integration tests |

### Priority 3: Nice to Have

| File | Purpose |
|------|---------|
| `src/lib/ksef/certificate-rotation.ts` | Handle certificate renewal |
| `src/lib/ksef/rate-limiter.ts` | Respect KSeF API rate limits |
| `src/lib/ksef/bulk-submitter.ts` | Batch submission optimization |

---

## 🔗 Important Links & Resources

### Official Resources
- **KSeF Portal**: https://ksef.mf.gov.pl
- **Test Environment**: https://ksef-test.mf.gov.pl
- **Demo Environment**: https://ksef-demo.mf.gov.pl
- **API Documentation**: https://www.ksef.dev/api/
- **Support Form**: https://ksef.podatki.gov.pl/formularz/

### Certificate Providers
- **Certum**: https://sklep.certum.pl
- **EuroCert**: https://eurocert.pl
- **KIR (Szafir)**: https://www.elektronicznypodpis.pl

### Developer Resources
- **Sample Requests**: https://github.com/ksef4dev/sample-requests
- **Community**: https://4programmers.net (Polish dev forum)

### Internal Documentation
- **Technical Guide**: `src/lib/ksef/README.md`
- **Authentication Guide**: `src/lib/ksef/AUTHENTICATION_GUIDE.md`
- **This Checklist**: `KSEF_DEPLOYMENT_CHECKLIST.md`

---

## 💰 Budget Estimate

| Item | Cost | Frequency | Notes |
|------|------|-----------|-------|
| Qualified Electronic Seal | 300-800 PLN | Annual | Required for production |
| Certificate Renewal | 300-800 PLN | Every 1-2 years | Same as initial |
| Developer Time | Varies | One-time | ~40-80 hours estimated |
| Testing | Varies | One-time | Include in dev time |
| **Total Year 1** | **500-1,000 PLN** | - | Certificate + implementation |
| **Ongoing Annual** | **300-800 PLN** | Yearly | Certificate renewal only |

---

## ⏰ Timeline Summary

| Phase | Duration | When to Start | Completion Target |
|-------|----------|---------------|-------------------|
| **Authentication Setup** | 2 weeks | Immediately | Week 2 |
| **Technical Implementation** | 2 weeks | Week 3 | Week 4 |
| **Database & Security** | 1 week | Week 4 | Week 5 |
| **Testing & Staging** | 1 week | Week 5 | Week 6 |
| **Production Launch** | 1 week | Week 6 | Week 7 |
| **Total Timeline** | **6-7 weeks** | - | - |

**Recommended Start Date**: At least 3 months before mandatory deadline (Nov 2025)

---

## 🚨 Risk Mitigation

### High Priority Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Certificate delivery delay | Medium | High | Order 2 months early |
| API changes before Feb 2026 | Low | High | Monitor official updates |
| Certificate expiry forgotten | Medium | Critical | Set up 30-day alerts |
| Integration bugs in production | Medium | High | Extensive demo testing |

### Contingency Plans

- **Certificate Issues**: Have backup contact at provider
- **API Downtime**: Queue submissions for retry
- **Integration Failures**: Manual KSeF submission fallback
- **Support Overload**: Escalation path to KSeF support

---

## ✅ Success Criteria

**Before considering deployment complete:**

- [ ] Successfully authenticate with production certificate
- [ ] Submit 10+ test invoices in demo environment
- [ ] Receive UPO documents for all submissions
- [ ] Zero manual intervention required
- [ ] All error scenarios handled gracefully
- [ ] Monitoring and alerts operational
- [ ] Support team trained
- [ ] Rollback plan tested

---

## 📞 Key Contacts

| Role | Name | Contact | Notes |
|------|------|---------|-------|
| KSeF Support | - | https://ksef.podatki.gov.pl/formularz/ | Mon-Fri 7AM-7PM |
| Certificate Provider | - | _____________ | Fill in after ordering |
| Internal Tech Lead | - | _____________ | Who owns this integration? |
| Accounting Contact | - | _____________ | Who validates invoices? |

---

## 📅 Maintenance Schedule

### Monthly
- [ ] Review failed submissions
- [ ] Check certificate expiry date
- [ ] Update any changed NIPs
- [ ] Review audit logs

### Quarterly
- [ ] Test disaster recovery
- [ ] Review and update documentation
- [ ] Check for KSeF API updates
- [ ] Performance optimization review

### Annually
- [ ] Renew certificate (2 months before expiry)
- [ ] Security audit
- [ ] Update compliance documentation
- [ ] Review and update this checklist

---

## 🎓 Team Training Needs

### Developers
- [ ] XML signing and validation
- [ ] Certificate management
- [ ] KSeF API error codes
- [ ] Debugging tools and techniques

### Support Team
- [ ] Common error messages
- [ ] How to check submission status
- [ ] When to escalate to dev team
- [ ] Manual fallback procedures

### Accounting Users
- [ ] Invoice approval workflow
- [ ] KSeF submission button
- [ ] UPO document access
- [ ] What to do if submission fails

---

## 📈 Success Metrics

Track these metrics post-launch:

- **Submission Success Rate**: Target >99%
- **Average Submission Time**: Target <30s
- **UPO Receipt Time**: Target <5 min
- **User Support Tickets**: Target <5/week after month 1
- **Certificate Issues**: Target 0

---

## 🔄 Next Review Date

**Schedule review of this checklist**: _______________

**Assigned to**: _______________

**Status**: [ ] Not Started [ ] In Progress [ ] Completed

---

**Remember**: KSeF becomes mandatory February 1, 2026. Start early, test thoroughly!

**Questions?** Refer to `src/lib/ksef/AUTHENTICATION_GUIDE.md` for detailed setup instructions.
