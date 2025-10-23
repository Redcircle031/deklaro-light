/**
 * Contract Test: GET /api/ocr/status/{job_id}
 * @see specs/002-ocr-pipeline/contracts/job-status.yaml
 * TODO: Implement full test suite once endpoint is created
 */

import { describe, it } from 'vitest';

describe('GET /api/ocr/status/{job_id} - Contract Tests', () => {
  it.todo('should return QUEUED status with queue_position');
  it.todo('should return PROCESSING status with current_step and progress');
  it.todo('should return COMPLETED status with extracted_data and confidence_scores');
  it.todo('should return FAILED status with error message and retry_count');
  it.todo('should return 404 when job_id does not exist');
});
