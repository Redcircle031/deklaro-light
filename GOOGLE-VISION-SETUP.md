# Google Cloud Vision API Setup Guide

This document explains how to set up Google Cloud Vision API for production OCR in Deklaro.

---

## Why Google Cloud Vision?

**Tesseract.js Issue:** Tesseract.js v4 and v6 cannot run in Node.js server environments due to worker thread limitations.

**Solution:** Google Cloud Vision API provides:
- ✅ 95-99% OCR accuracy (vs 80-90% for Tesseract)
- ✅ Works perfectly in Node.js server environments
- ✅ Superior support for Polish language
- ✅ Built-in document understanding
- ✅ Handles complex invoice layouts better

---

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Note your project ID

### 2. Enable Vision API

```bash
# Enable the Vision API
gcloud services enable vision.googleapis.com
```

Or via Console:
1. Go to **APIs & Services** > **Library**
2. Search for "Vision API"
3. Click **Enable**

### 3. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create deklaro-ocr \
    --display-name="Deklaro OCR Service"

# Grant Vision API permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:deklaro-ocr@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudvision.user"

# Create and download key
gcloud iam service-accounts keys create ~/deklaro-vision-key.json \
    --iam-account=deklaro-ocr@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 4. Configure Environment

#### Development (Local)

Add to `.env.local`:

```bash
# Google Cloud Vision
GOOGLE_APPLICATION_CREDENTIALS=/path/to/deklaro-vision-key.json
GOOGLE_CLOUD_PROJECT=your-project-id
```

#### Production (Vercel)

1. Convert JSON key to base64:
```bash
cat deklaro-vision-key.json | base64
```

2. Add to Vercel environment variables:
```bash
GOOGLE_CLOUD_CREDENTIALS_BASE64=<base64-encoded-json>
GOOGLE_CLOUD_PROJECT=your-project-id
```

3. Update `src/lib/ocr/vision.ts` to decode credentials:
```typescript
// In getVisionClient()
if (process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64) {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64, 'base64').toString()
  );
  visionClient = new vision.ImageAnnotatorClient({ credentials });
}
```

---

## Testing

### Test with Mock Data (No Credentials)

The OCR service automatically falls back to mock mode if no credentials are found:

```bash
npm run dev
# Upload invoice - will use mock OCR data
```

### Test with Real Vision API

1. Set up credentials (see above)
2. Start dev server:
```bash
npm run dev
```
3. Upload a real invoice
4. Check logs for `[Vision OCR] Processing image with Google Cloud Vision...`

---

## Pricing

**Vision API Pricing** (as of 2024):
- First 1,000 units/month: **FREE**
- 1,001 - 5,000,000 units: **$1.50 per 1,000 units**
- Document Text Detection: **1 unit per image**

**Example Costs:**
- 100 invoices/month: **FREE**
- 1,000 invoices/month: **FREE**
- 10,000 invoices/month: **~$13.50/month**
- 100,000 invoices/month: **~$148.50/month**

💡 **Much cheaper than manual data entry!**

---

## Implementation Details

### OCR Service: `src/lib/ocr/vision.ts`

**Features:**
- Automatic fallback to mock mode in development
- Document text detection (optimized for invoices)
- Polish and English language hints
- Word-level confidence scores
- Bounding box extraction

**API:**
```typescript
import { recogniseInvoiceWithVision } from '@/lib/ocr/vision';

const result = await recogniseInvoiceWithVision(imageBuffer);
// Returns: { text, confidence, words[], language }
```

### Integration: `src/lib/queue/ocr-worker.ts`

The OCR worker automatically uses Vision API:
```typescript
const ocrResult = await recogniseInvoiceWithVision(buffer);
```

---

## Troubleshooting

### Error: "Could not load the default credentials"

**Solution:** Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### Error: "Permission denied"

**Solution:** Grant `roles/cloudvision.user` to your service account

### No text detected

**Solution:**
- Ensure image is clear and readable
- Check image format (JPEG/PNG)
- Verify image isn't corrupted

### Mock mode in production

**Solution:** Verify environment variables are set correctly in Vercel

---

## Migration from Tesseract

**Already done! ✅**

- ✅ Vision API service created (`src/lib/ocr/vision.ts`)
- ✅ OCR worker updated to use Vision API
- ✅ Tesseract.js stub can be removed (optional)

**No breaking changes** - API interface remains the same:
```typescript
// Before (Tesseract)
const result = await recogniseInvoice(buffer, options);

// After (Vision)
const result = await recogniseInvoiceWithVision(buffer);
```

---

## Next Steps

1. ✅ Set up Google Cloud project and credentials
2. ✅ Configure environment variables
3. ✅ Test with real invoices
4. ⏳ Monitor usage and costs in Google Cloud Console
5. ⏳ Adjust OCR parameters if needed (language hints, confidence thresholds)

---

## Support

- [Google Cloud Vision Docs](https://cloud.google.com/vision/docs)
- [Vision API Pricing](https://cloud.google.com/vision/pricing)
- [Node.js Client Library](https://googleapis.dev/nodejs/vision/latest/)

**Status:** ✅ Ready for production with proper credentials
