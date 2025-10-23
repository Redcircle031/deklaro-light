/**
 * OpenAI Client for Invoice Data Extraction
 *
 * Wraps the OpenAI SDK for structured data extraction from OCR text.
 * Uses GPT-4 with JSON mode for reliable structured output.
 *
 * @see specs/002-ocr-pipeline/research.md - OpenAI GPT-4 decision
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

/**
 * OpenAI configuration from environment variables
 */
export const AI_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '2'),
  temperature: 0.1, // Low temperature for consistent extraction
  maxTokens: 2000, // Sufficient for invoice data
};
