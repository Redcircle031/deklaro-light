import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { preprocessImage } from '../../src/lib/ocr/pipeline/preprocess';

const SAMPLE_WIDTH = 400;
const SAMPLE_HEIGHT = 200;

async function createSyntheticInvoice() {
  return sharp({
    create: {
      width: SAMPLE_WIDTH,
      height: SAMPLE_HEIGHT,
      channels: 3,
      background: '#ffffff',
    },
  })
    .png()
    .composite([
      {
        input: {
          text: {
            text: 'FV/123/2025\nNIP 123-456-78-90\nKwota: 1234,56 PLN',
            width: SAMPLE_WIDTH - 40,
            height: SAMPLE_HEIGHT - 40,
            align: 'left',
            rgba: true,
          },
        },
        top: 20,
        left: 20,
      },
    ])
    .toBuffer();
}

describe('preprocessImage', () => {
  it('normalises invoice buffer', async () => {
    const sample = await createSyntheticInvoice();
    const { buffer, metadata } = await preprocessImage(sample, {
      rotate: true,
      grayscale: true,
      normalize: true,
      flatten: true,
      trim: false,
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(metadata.width).toBeGreaterThan(0);
    expect(metadata.height).toBeGreaterThan(0);
  });
});

