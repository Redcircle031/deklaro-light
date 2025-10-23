import type { InvoiceExtraction } from './extractor'
import { getOpenAIClient } from './client'

export type InvoiceClassification = {
  type: 'INCOMING' | 'OUTGOING' | 'UNKNOWN'
  confidence: number
  rationale: string
}

const classificationSystemPrompt = `
You are an expert accounting assistant for Polish businesses. Your task is to classify an invoice as 'INCOMING' (a purchase/cost for the company) or 'OUTGOING' (a sale made by the company).

Analyze the provided JSON data, which was extracted from an invoice's OCR text.

Base your decision on the roles of the 'supplier' (sprzedawca) and 'buyer' (nabywca).

1.  If the company receiving the invoice is the 'buyer', it is an 'INCOMING' invoice.
2.  If the company receiving the invoice is the 'supplier', it is an 'OUTGOING' invoice.

Respond with a valid JSON object matching this schema:
\`\`\`json
{
  "type": "'INCOMING' | 'OUTGOING' | 'UNKNOWN'",
  "confidence": "number (0.0 to 1.0)",
  "rationale": "string (a brief explanation for your classification)"
}
\`\`\`
`

/**
 * Classifies an invoice as INCOMING or OUTGOING based on extracted data and tenant information.
 * It first attempts a reliable heuristic based on NIP matching. If that fails, it falls back to an AI model.
 *
 * @param extractedData The structured data extracted from the invoice.
 * @param tenantNip The NIP (tax ID) of the tenant's own company.
 * @param ocrText The raw OCR text, used as a fallback for the AI model.
 * @returns A promise that resolves to the classification result.
 */
export async function classifyInvoiceType(
  extractedData: InvoiceExtraction,
  tenantNip: string,
  ocrText?: string,
): Promise<InvoiceClassification> {
  // 1. Heuristic-based classification (most reliable)
  if (tenantNip) {
    if (extractedData.supplier?.vatId === tenantNip) {
      return {
        type: 'OUTGOING',
        confidence: 1.0,
        rationale: 'Classified as OUTGOING based on matching supplier NIP.',
      }
    }
    if (extractedData.buyer?.vatId === tenantNip) {
      return {
        type: 'INCOMING',
        confidence: 1.0,
        rationale: 'Classified as INCOMING based on matching buyer NIP.',
      }
    }
  }

  // 2. AI-based classification (fallback)
  console.log('Heuristic classification failed, falling back to AI model...')

  const textToAnalyze = ocrText || extractedData.rawText || JSON.stringify({
    supplier: extractedData.supplier,
    buyer: extractedData.buyer,
    header: extractedData.header,
  });

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: classificationSystemPrompt },
        {
          role: 'user',
          content: `The tenant's NIP is ${tenantNip || 'unknown'}. Classify the invoice based on the following data:\n\n${textToAnalyze}`,
        },
      ],
      temperature: 0.1,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('AI model returned an empty response for classification.')
    }

    const classification = JSON.parse(content) as InvoiceClassification
    return classification
  } catch (error) {
    console.error('Error during AI invoice classification:', error)
    return { type: 'UNKNOWN', confidence: 0, rationale: 'AI classification failed.' }
  }
}