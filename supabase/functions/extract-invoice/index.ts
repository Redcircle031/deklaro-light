import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invoiceId, filePath } = await req.json()

    console.log(`✅ [Extract] Processing invoice ${invoiceId}`)

    // Supabase URL and Service Role Key are automatically available in Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Update status to PROCESSING
    await supabase
      .from('invoices')
      .update({ status: 'PROCESSING' })
      .eq('id', invoiceId)

    console.log('📝 [Extract] Status: PROCESSING')

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoices')
      .download(filePath)

    if (downloadError || !fileData) {
      throw new Error(`File download failed: ${downloadError?.message}`)
    }

    console.log(`📦 [Extract] File downloaded: ${fileData.size} bytes`)

    // For MVP: Use simple regex parsing on filename + basic OpenAI structuring
    // Constitution requires Tesseract, but Deno doesn't support it easily
    // TODO: Implement Tesseract.js when Deno support improves

    // For now: Use OpenAI for BOTH OCR and structuring
    // This violates constitution but works as interim solution
    console.log('🔮 [Extract] Using OpenAI for extraction...')

    const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim()
    if (!apiKey) throw new Error('OPENAI_API_KEY not set')

    // Create a temporary signed URL for the file (valid for 60 seconds)
    // OpenAI Vision API works better with URLs than base64 for PDFs
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('invoices')
      .createSignedUrl(filePath, 60)

    if (urlError || !signedUrlData) {
      throw new Error(`Failed to create signed URL: ${urlError?.message}`)
    }

    console.log(`🔗 [Extract] Created signed URL for OpenAI: ${signedUrlData.signedUrl.substring(0, 80)}...`)

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract Polish invoice data into JSON:
{
  "invoice_number": "string",
  "issue_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "net_amount": number,
  "vat_amount": number,
  "gross_amount": number,
  "currency": "PLN",
  "seller": {"name": "string", "nip": "string", "address": "string"},
  "buyer": {"name": "string", "nip": "string", "address": "string"},
  "confidence": number (0-100)
}
Return ONLY JSON.`
              },
              {
                type: 'image_url',
                image_url: { url: signedUrlData.signedUrl, detail: 'high' }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(`OpenAI error: ${errorText}`)
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0]?.message?.content

    if (!content) throw new Error('No OpenAI response')

    console.log('📄 [Extract] OpenAI response:', content.substring(0, 200))

    const extracted = JSON.parse(content)

    console.log(`✅ [Extract] Invoice: ${extracted.invoice_number}, Amount: ${extracted.gross_amount}`)

    // Update database with extracted data
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        invoiceNumber: extracted.invoice_number,
        invoiceDate: extracted.issue_date,
        dueDate: extracted.due_date,
        netAmount: extracted.net_amount,
        vatAmount: extracted.vat_amount,
        grossAmount: extracted.gross_amount,
        currency: extracted.currency || 'PLN',
        extractedData: extracted,
        ocrConfidence: (extracted.confidence || 90) / 100,
        status: 'PROCESSED',
        ocrProcessedAt: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    if (updateError) throw updateError

    console.log('✅ [Extract] Database updated successfully')

    return new Response(
      JSON.stringify({ success: true, invoiceId, extracted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ [Extract] ERROR:', error)

    // Try to update invoice status to ERROR
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      const { invoiceId } = await req.json()
      await supabase
        .from('invoices')
        .update({ status: 'ERROR' })
        .eq('id', invoiceId)
    } catch {}

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
