# OCR Pipeline End-to-End Testing Guide

**Date**: 2025-10-21
**Feature**: Backend OCR Pipeline with Inngest Integration
**Status**: ✅ Ready for Testing

---

## 🚀 Quick Start

### Prerequisites

1. ✅ **Inngest Dev Server** running on port 8288
2. ✅ **Next.js Dev Server** running on port 4000
3. ✅ **Supabase** project configured with test data
4. ✅ **OpenAI API Key** in environment variables

### Running Servers

```bash
# Terminal 1: Start Inngest Dev Server
cd deklaro/frontend
npx inngest-cli@latest dev

# Terminal 2: Start Next.js Dev Server
cd deklaro/frontend
npm run dev
```

### Access Points

- **Application**: http://localhost:4000
- **Inngest Dashboard**: http://localhost:8288
- **Test User**: `test@deklaro.com` / `Test123456789`

---

## 📋 Complete OCR Workflow Test

### **Step 1: Login**

1. Navigate to http://localhost:4000/login
2. Enter credentials:
   - Email: `test@deklaro.com`
   - Password: `Test123456789`
3. ✅ **Expected**: Redirect to `/dashboard`

### **Step 2: Upload Invoice**

1. Navigate to **Invoices** page (`/dashboard/invoices`)
2. Click **"Upload Invoice"** button
3. Select a test invoice image (PDF or image file)
4. Fill in basic details (optional):
   - Invoice number
   - Seller/Buyer (optional)
5. Click **"Upload"**
6. ✅ **Expected**: Invoice appears with status `UPLOADED`

### **Step 3: Trigger OCR Processing**

1. Click on the uploaded invoice to open detail view
2. Look for **"Process with OCR"** button (should be visible for `UPLOADED` invoices)
3. Click **"Process with OCR"**
4. ✅ **Expected**:
   - Button disabled
   - Loading indicator appears
   - Status changes to `QUEUED`

**API Call**:
```bash
curl -X POST http://localhost:4000/api/ocr/process \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: <your-tenant-id>" \
  -d '{"invoice_id": "<invoice-id>"}'
```

**Expected Response**:
```json
{
  "job_id": "uuid-here",
  "status": "QUEUED",
  "estimated_completion": "2025-10-21T20:30:00Z",
  "message": "OCR processing started"
}
```

### **Step 4: Monitor Processing Status**

1. **Real-time Polling** - Component automatically polls every 2 seconds
2. **Inngest Dashboard** - Open http://localhost:8288 to see function execution
3. **Watch Progress**:
   - `QUEUED` → Processing starting
   - `PROCESSING` → OCR running (30% progress)
   - `PROCESSING` → AI extraction (60% progress)
   - `PROCESSING` → Validation (80% progress)
   - `PROCESSING` → Saving (90% progress)
   - `COMPLETED` → Done! (100%)

**API Call**:
```bash
curl http://localhost:4000/api/ocr/status/<job-id> \
  -H "x-tenant-id: <your-tenant-id>"
```

**Expected Response (PROCESSING)**:
```json
{
  "job_id": "uuid",
  "invoice_id": "uuid",
  "status": "PROCESSING",
  "current_step": "AI_EXTRACT",
  "progress": 60,
  "started_at": "2025-10-21T20:25:00Z",
  "message": "Processing step: AI_EXTRACT"
}
```

**Expected Response (COMPLETED)**:
```json
{
  "job_id": "uuid",
  "invoice_id": "uuid",
  "status": "COMPLETED",
  "completed_at": "2025-10-21T20:26:30Z",
  "extracted_data": {
    "invoice_number": "FV/2024/001",
    "issue_date": "2024-10-15",
    "seller": {
      "name": "ACME Corp",
      "nip": "1234567890",
      "address": "Warszawa, ul. Przykładowa 1"
    },
    "buyer": {
      "name": "Demo Company",
      "nip": "0987654321",
      "address": "Kraków, ul. Testowa 2"
    },
    "net_amount": 1000.00,
    "vat_amount": 230.00,
    "gross_amount": 1230.00,
    "currency": "PLN"
  },
  "confidence_scores": {
    "invoice_number": 95,
    "issue_date": 92,
    "seller_nip": 88,
    "buyer_nip": 90,
    "net_amount": 85,
    "vat_amount": 87,
    "gross_amount": 89
  },
  "overall_confidence": 89,
  "raw_ocr_text": "FAKTURA VAT FV/2024/001...",
  "ocr_confidence": 87
}
```

### **Step 5: Review Extracted Data**

1. After processing completes, the **Review Form** appears automatically
2. **Verify Extracted Data**:
   - Invoice number
   - Dates (issue date, due date)
   - Seller details (name, NIP, address)
   - Buyer details (name, NIP, address)
   - Amounts (net, VAT, gross)
   - Currency

3. **Check Confidence Indicators**:
   - 🟢 Green (≥90%): High confidence
   - 🟡 Yellow (70-89%): Medium confidence - **review carefully**
   - 🔴 Red (<70%): Low confidence - **requires correction**

4. **Make Corrections** (if needed):
   - Click on fields with low confidence (red background)
   - Edit incorrect values
   - Field turns yellow when edited

5. **View Raw OCR Text** (right panel):
   - See original OCR output
   - Compare with extracted data

### **Step 6: Save Corrections**

1. After reviewing/editing, click **"Save Corrections"**
2. ✅ **Expected**:
   - Success message appears
   - Corrections saved to database
   - Invoice status updates to `REVIEWED`

**API Call**:
```bash
curl -X POST http://localhost:4000/api/invoices/<invoice-id>/review \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: <your-tenant-id>" \
  -d '{
    "corrections": [
      {
        "field_name": "seller_nip",
        "original_value": "1234567890",
        "corrected_value": "1234567899"
      }
    ],
    "notes": "Corrected seller NIP"
  }'
```

**Expected Response**:
```json
{
  "invoice_id": "uuid",
  "corrections_applied": 1,
  "reviewed_at": "2025-10-21T20:28:00Z",
  "reviewed_by": "user-id",
  "updated_data": { ... }
}
```

### **Step 7: Approve Invoice**

1. After saving corrections (or if no corrections needed), click **"Approve Invoice"**
2. ✅ **Expected**:
   - Success message appears
   - Invoice status changes to `VERIFIED`
   - Form becomes **read-only** (all fields disabled)
   - Approval timestamp recorded

**API Call**:
```bash
curl -X POST http://localhost:4000/api/invoices/<invoice-id>/approve \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: <your-tenant-id>"
```

**Expected Response**:
```json
{
  "invoice_id": "uuid",
  "approved_at": "2025-10-21T20:29:00Z",
  "approved_by": "user-id",
  "status": "VERIFIED"
}
```

---

## 🧪 Testing Scenarios

### **Scenario 1: Happy Path** ✅
- Upload clear, high-quality invoice
- All confidence scores > 85%
- No corrections needed
- Direct approval

### **Scenario 2: Low Confidence Fields** ⚠️
- Upload slightly blurry invoice
- Some fields < 70% confidence
- Manual corrections required
- Save corrections → Approve

### **Scenario 3: Failed OCR** ❌
- Upload corrupted/unreadable file
- OCR job fails
- Status shows `FAILED`
- Error message displayed

### **Scenario 4: Duplicate Job Prevention** 🚫
- Trigger OCR on invoice
- Try to trigger again while processing
- Expected: 409 error "OCR job already in progress"

---

## 🔍 Verification Checklist

### API Endpoints
- [ ] POST /api/ocr/process returns 201 with job_id
- [ ] GET /api/ocr/status/[id] returns correct status
- [ ] GET /api/ocr/status/[id] shows progress updates
- [ ] POST /api/invoices/[id]/review saves corrections
- [ ] POST /api/invoices/[id]/approve finalizes invoice

### UI Components
- [ ] ConfidenceIndicator shows correct colors
- [ ] OCRProcessingStatus polls and updates
- [ ] ReviewExtractedData form validates input
- [ ] Low confidence fields highlighted in red
- [ ] Read-only mode after approval

### Inngest Worker
- [ ] Job appears in Inngest Dashboard
- [ ] All 5 steps execute successfully
- [ ] Processing logs created for each step
- [ ] Retries work on failure
- [ ] Job completes within ~30-60 seconds

### Database
- [ ] ocr_jobs record created with QUEUED status
- [ ] ocr_jobs updated to PROCESSING
- [ ] processing_logs entries created (OCR, AI_EXTRACT, VALIDATE, SAVE)
- [ ] invoices table updated with extracted_data
- [ ] ocr_jobs marked as COMPLETED

---

## 🐛 Common Issues & Solutions

### Issue: Inngest worker not executing
**Solution**:
- Check Inngest Dev Server is running on port 8288
- Verify `/api/inngest` endpoint is accessible
- Check Inngest Dashboard for errors

### Issue: OCR confidence very low
**Solution**:
- Use higher quality invoice images
- Ensure invoice is in Polish language
- Check Tesseract.js is configured with Polish language pack

### Issue: AI extraction fails
**Solution**:
- Verify `OPENAI_API_KEY` environment variable is set
- Check OpenAI API quota/billing
- Review raw OCR text quality

### Issue: 500 errors on API calls
**Solution**:
- Check Supabase connection
- Verify tenant_id header is correct
- Check database tables exist (ocr_jobs, processing_logs, invoices)

---

## 📊 Success Metrics

✅ **Pipeline is Working** if:
- OCR job completes in < 60 seconds
- Overall confidence score > 80%
- All 5 processing steps succeed
- No database errors
- Invoice status progresses: UPLOADED → PROCESSING → EXTRACTED → REVIEWED → VERIFIED

---

## 🎯 Next Steps After Testing

1. **Run E2E Tests**: `npm run test:e2e -- ocr-workflow.spec.ts`
2. **Performance Testing**: Process 10 invoices simultaneously
3. **Error Handling**: Test with corrupted files
4. **Load Testing**: Queue 50+ jobs
5. **Production Deployment**: Deploy to Vercel + Inngest Cloud

---

**Last Updated**: 2025-10-21
**Tested By**: AI Assistant
**Status**: ✅ Ready for Manual Testing
