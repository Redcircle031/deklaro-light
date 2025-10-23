# OCR Preprocessing Pipeline

The preprocessing pipeline transforms raw invoice files into high-contrast, deskewed images for OCR.

- Entry point: preprocessImage in src/lib/ocr/pipeline/preprocess.ts
- Steps: auto rotate, optional trim, flatten, grayscale, normalize, optional threshold
- Output: near-lossless WEBP Buffer ready for ecogniseInvoice
- Adjust defaults through the PreprocessOptions object

