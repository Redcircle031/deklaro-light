/**
 * Inngest Client Configuration
 *
 * Initializes Inngest for async job processing.
 * Used for OCR pipeline jobs (PREPROCESS → OCR → AI_EXTRACT → VALIDATE → SAVE).
 *
 * @see https://www.inngest.com/docs
 */

import { Inngest, EventSchemas } from 'inngest';

// Define event schemas for type safety
type Events = {
  'invoice/uploaded': {
    data: {
      invoice_id: string;
      tenant_id: string;
      file_path: string;
    };
  };
  'ocr/job.started': {
    data: {
      job_id: string;
      invoice_id: string;
      tenant_id: string;
    };
  };
  'ocr/job.completed': {
    data: {
      job_id: string;
      invoice_id: string;
      tenant_id: string;
    };
  };
  'ocr/job.failed': {
    data: {
      job_id: string;
      invoice_id: string;
      tenant_id: string;
      error: string;
    };
  };
};

// Create Inngest client
// For local development, Inngest will automatically connect to http://localhost:8288
// For production, set INNGEST_EVENT_KEY environment variable
export const inngest = new Inngest({
  id: 'deklaro-ocr',
  name: 'Deklaro OCR Pipeline',
  schemas: new EventSchemas().fromRecord<Events>(),
  eventKey: process.env.INNGEST_EVENT_KEY, // Optional: only needed for production
  retryFunction: async (attempt) => {
    // Exponential backoff: 2^attempt seconds (2s, 4s, 8s)
    return {
      delay: Math.min(2 ** attempt * 1000, 30000), // Max 30s delay
      maxAttempts: 3,
    };
  },
});

// Export type for use in functions
export type InngestEvent = keyof Events;
