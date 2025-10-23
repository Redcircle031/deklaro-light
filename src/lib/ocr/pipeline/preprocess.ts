import sharp from 'sharp';
import type { Sharp } from 'sharp';

export type PreprocessOptions = {
  rotate?: boolean;
  grayscale?: boolean;
  normalize?: boolean;
  flatten?: boolean;
  trim?: boolean;
  threshold?: boolean;
};

const DEFAULT_OPTIONS: PreprocessOptions = {
  rotate: true,
  grayscale: true,
  normalize: true,
  flatten: true,
  trim: false,
  threshold: false,
};

export type PreprocessResult = {
  buffer: Buffer;
  metadata: Awaited<ReturnType<Sharp['metadata']>>;
};

export async function preprocessImage(
  input: Buffer | ArrayBuffer,
  options: PreprocessOptions = DEFAULT_OPTIONS,
): Promise<PreprocessResult> {
  const buffer = input instanceof Buffer ? input : Buffer.from(new Uint8Array(input));
  let instance = sharp(buffer, { failOn: 'none' });

  if (options.rotate) {
    instance = instance.rotate();
  }

  if (options.trim) {
    instance = instance.trim();
  }

  if (options.flatten) {
    instance = instance.flatten({ background: { r: 255, g: 255, b: 255 } });
  }

  if (options.grayscale) {
    instance = instance.grayscale();
  }

  if (options.normalize) {
    instance = instance.normalize();
  }

  if (options.threshold) {
    instance = instance.threshold(160);
  }

  const [processedBuffer, metadata] = await Promise.all([
    instance.webp({ nearLossless: true, quality: 95 }).toBuffer(),
    instance.metadata(),
  ]);

  return {
    buffer: processedBuffer,
    metadata,
  };
}

