import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker to use the local worker file
// The worker is copied to public/pdf-worker/ during build
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';
}

/**
 * Converts the first page of a PDF to a PNG image
 * @param pdfFile PDF file to convert
 * @param quality Image quality (0-1), default 0.92
 * @param scale Scale factor for rendering, default 2 (higher = better quality but larger file)
 * @returns Promise<File> PNG image file
 */
export async function convertPdfToImage(
  pdfFile: File,
  quality = 0.92,
  scale = 2
): Promise<File> {
  try {
    // Read the PDF file as array buffer
    const arrayBuffer = await pdfFile.arrayBuffer();

    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Get the first page
    const page = await pdf.getPage(1);

    // Calculate viewport dimensions
    const viewport = page.getViewport({ scale });

    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to get canvas 2D context');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render the PDF page to the canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        'image/png',
        quality
      );
    });

    // Create a new File object from the blob
    const imageName = pdfFile.name.replace(/\.pdf$/i, '.png');
    const imageFile = new File([blob], imageName, { type: 'image/png' });

    console.log(`✅ [PDF Convert] ${pdfFile.name} (${formatBytes(pdfFile.size)}) → ${imageName} (${formatBytes(imageFile.size)})`);

    return imageFile;
  } catch (error) {
    console.error('❌ [PDF Convert] Failed:', error);
    throw new Error(`Failed to convert PDF to image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
}
