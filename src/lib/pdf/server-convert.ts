/**
 * Server-side PDF to PNG conversion using pdfjs-dist and sharp
 * Works in Node.js/Serverless environments
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import sharp from 'sharp';

/**
 * Converts the first page of a PDF buffer to PNG buffer
 * @param pdfBuffer PDF file as Buffer
 * @param scale Scale factor (default 2 for high quality)
 * @returns Promise<Buffer> PNG image buffer
 */
export async function convertPdfToPng(
  pdfBuffer: Buffer,
  scale = 2
): Promise<Buffer> {
  try {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;

    // Get the first page
    const page = await pdf.getPage(1);

    // Calculate viewport dimensions
    const viewport = page.getViewport({ scale });

    const width = Math.floor(viewport.width);
    const height = Math.floor(viewport.height);

    // Create a canvas-like object for PDF.js rendering
    const canvasFactory = new NodeCanvasFactory();
    const canvasAndContext = canvasFactory.create(width, height);

    // Render the PDF page
    await page.render({
      canvasContext: canvasAndContext.context as any,
      viewport: viewport,
    }).promise;

    // Get the image data
    const imageData = canvasAndContext.context.getImageData(0, 0, width, height);

    // Convert to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(imageData.data.buffer), {
      raw: {
        width,
        height,
        channels: 4, // RGBA
      },
    })
      .png({ quality: 90, compressionLevel: 6 })
      .toBuffer();

    console.log(`✅ [PDF Convert] Converted PDF to PNG: ${width}x${height} (${Math.round(pngBuffer.length / 1024)}KB)`);

    return pngBuffer;
  } catch (error) {
    console.error('❌ [PDF Convert] Failed:', error);
    throw new Error(`Failed to convert PDF to PNG: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Node.js canvas factory for PDF.js rendering
 * Provides a minimal canvas implementation without browser dependencies
 */
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = {
      width,
      height,
    };

    const context = new CanvasRenderingContext(width, height);

    return {
      canvas,
      context,
    };
  }

  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

/**
 * Minimal 2D canvas context for PDF.js rendering in Node.js
 * Stores pixel data without browser canvas
 */
class CanvasRenderingContext {
  private imageData: ImageData;

  constructor(width: number, height: number) {
    this.imageData = {
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4), // RGBA
    } as ImageData;
  }

  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    return this.imageData;
  }

  putImageData(imageData: ImageData, dx: number, dy: number) {
    this.imageData = imageData;
  }

  // Stubs for PDF.js rendering methods
  save() {}
  restore() {}
  translate(x: number, y: number) {}
  scale(x: number, y: number) {}
  transform(a: number, b: number, c: number, d: number, e: number, f: number) {}
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {}
  beginPath() {}
  moveTo(x: number, y: number) {}
  lineTo(x: number, y: number) {}
  rect(x: number, y: number, w: number, h: number) {}
  closePath() {}
  clip() {}
  fill() {}
  stroke() {}
  fillRect(x: number, y: number, w: number, h: number) {
    // Fill with white by default
    const { data, width } = this.imageData;
    for (let py = Math.floor(y); py < Math.floor(y + h); py++) {
      for (let px = Math.floor(x); px < Math.floor(x + w); px++) {
        if (px >= 0 && px < width && py >= 0 && py < this.imageData.height) {
          const idx = (py * width + px) * 4;
          data[idx] = 255;     // R
          data[idx + 1] = 255; // G
          data[idx + 2] = 255; // B
          data[idx + 3] = 255; // A
        }
      }
    }
  }
  strokeRect(x: number, y: number, w: number, h: number) {}
  clearRect(x: number, y: number, w: number, h: number) {
    this.fillRect(x, y, w, h);
  }
}
