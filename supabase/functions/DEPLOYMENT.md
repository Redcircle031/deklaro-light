# Edge Functions Deployment Guide

Quick guide for deploying Deklaro's Supabase Edge Functions.

## Prerequisites

1. **Supabase CLI installed**:
   ```bash
   npm install -g supabase
   ```

2. **Supabase project created**: Get your project ref from dashboard

3. **OpenAI API key**: Required for AI extraction

## Step 1: Link Your Project

```bash
cd deklaro/frontend
npx supabase link --project-ref <your-project-ref>
```

You'll be prompted for your database password.

## Step 2: Set Environment Secrets

```bash
# Required for AI Data Extractor
npx supabase secrets set OPENAI_API_KEY=sk-your-api-key-here

# Optional: Specify model (defaults to gpt-4o-mini)
npx supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

## Step 3: Deploy Functions

```bash
# Deploy both functions at once
npx supabase functions deploy

# Or deploy individually
npx supabase functions deploy ocr-processor
npx supabase functions deploy ai-data-extractor
```

## Step 4: Set Up Database Webhooks

Go to your Supabase Dashboard → Database → Webhooks:

### Webhook 1: OCR Processor

- **Name**: `ocr-processor-trigger`
- **Table**: `ocr_jobs`
- **Events**: `INSERT`
- **Conditions**: `status = 'QUEUED'`
- **URL**: `https://<your-project-ref>.supabase.co/functions/v1/ocr-processor`
- **Method**: `POST`
- **Headers**:
  - Key: `Authorization`
  - Value: `Bearer <your-service-role-key>`

### Webhook 2: AI Data Extractor

- **Name**: `ai-extractor-trigger`
- **Table**: `ocr_jobs`
- **Events**: `UPDATE`
- **Conditions**: `status = 'TEXT_EXTRACTED'`
- **URL**: `https://<your-project-ref>.supabase.co/functions/v1/ai-data-extractor`
- **Method**: `POST`
- **Headers**:
  - Key: `Authorization`
  - Value: `Bearer <your-service-role-key>`

## Step 5: Test Deployment

### Test OCR Processor

```bash
curl -i --location --request POST \
  'https://<your-project-ref>.supabase.co/functions/v1/ocr-processor' \
  --header 'Authorization: Bearer <your-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{
    "record": {
      "id": "test-123",
      "invoice_id": "inv-123",
      "status": "QUEUED"
    }
  }'
```

### Test AI Extractor

```bash
curl -i --location --request POST \
  'https://<your-project-ref>.supabase.co/functions/v1/ai-data-extractor' \
  --header 'Authorization: Bearer <your-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{
    "record": {
      "id": "test-123",
      "invoice_id": "inv-123",
      "raw_text": "FV/100/2025\nData wystawienia: 02-01-2025...",
      "status": "TEXT_EXTRACTED"
    }
  }'
```

## Step 6: Monitor Functions

```bash
# View function logs
npx supabase functions logs ocr-processor
npx supabase functions logs ai-data-extractor

# Follow logs in real-time
npx supabase functions logs ocr-processor --follow
```

## Troubleshooting

### Function not deploying
- Check that you're in the correct directory (`deklaro/frontend`)
- Verify project is linked: `npx supabase projects list`
- Ensure you have the latest Supabase CLI: `npm update -g supabase`

### OpenAI API errors
- Verify API key is set: `npx supabase secrets list`
- Check API key is valid at https://platform.openai.com/api-keys
- Ensure you have credits/billing set up

### Webhook not triggering
- Check webhook is enabled in Supabase Dashboard
- Verify the status conditions match (`QUEUED` vs `TEXT_EXTRACTED`)
- Check webhook logs in Dashboard → Database → Webhooks
- Ensure service role key is correct (not anon key!)

### Function timeout
- OCR processing can take 20-30 seconds for large images
- AI extraction typically completes in 2-10 seconds
- Edge Functions have a 150-second timeout by default

## Updating Functions

After making code changes:

```bash
# Deploy updated functions
npx supabase functions deploy ocr-processor
npx supabase functions deploy ai-data-extractor

# Or deploy all at once
npx supabase functions deploy
```

Functions update immediately - no downtime.

## Rollback

To rollback to a previous version:

```bash
# View function versions
npx supabase functions list --project-ref <your-ref>

# Rollback (feature may require specific CLI version)
# Currently best practice: redeploy previous code from git
git checkout <previous-commit>
npx supabase functions deploy
```

## Production Checklist

Before going live:

- [ ] Functions deployed successfully
- [ ] OpenAI API key set with billing enabled
- [ ] Both webhooks created and tested
- [ ] Webhook logs show successful triggers
- [ ] Test complete pipeline with real invoice
- [ ] Monitor function logs for errors
- [ ] Set up error alerting (Sentry/Slack)
- [ ] Document OpenAI API costs and usage limits

## Cost Monitoring

Monitor your costs:

- **OpenAI**: https://platform.openai.com/usage
- **Supabase**: Dashboard → Settings → Billing

Expected costs:
- ~$0.0002 per invoice with gpt-4o-mini
- ~$0.002 per invoice with gpt-4o (10x cost, better accuracy)
- 1000 invoices/month = ~$0.20 (mini) or ~$2.00 (full gpt-4o)
